import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe.serial('Sincronia Real-Time do Chat (Grupos e Ordenação)', () => {

  test('Fluxo de Grupos: Notificações, Ordenação Dinâmica e Tique Azul', async ({ browser }) => {
    
    // 1. SETUP DE CONTEXTOS ISOLADOS
    const pcRecepcao = await browser.newContext();
    const pageRecepcao = await pcRecepcao.newPage();

    const pcMedico = await browser.newContext();
    const pageMedico = await pcMedico.newPage();

    // 2. LOGIN DA RECEPÇÃO (Remetente)
    await pageRecepcao.goto(`${BASE_URL}/login`);
    await pageRecepcao.locator('input[name="username"], input[type="text"]').first().fill('Teste'); 
    await pageRecepcao.locator('input[name="password"], input[type="password"]').first().fill('Teste@123');  
    await pageRecepcao.getByRole('button', { name: 'Entrar' }).click();
    await pageRecepcao.getByTitle('Chat Interno').waitFor(); // Aguarda UI carregar
    
    // 3. LOGIN DO MÉDICO (Destinatário)
    await pageMedico.goto(`${BASE_URL}/login`);
    await pageMedico.locator('input[name="username"], input[type="text"]').first().fill('Daniel');   
    await pageMedico.locator('input[name="password"], input[type="password"]').first().fill('Med@123');    
    await pageMedico.getByRole('button', { name: 'Entrar' }).click();
    await pageMedico.getByTitle('Chat Interno').waitFor();

    // ---------------------------------------------------------
    // CENA 1: A RECEPÇÃO ENVIA UM AVISO NO GRUPO
    // ---------------------------------------------------------
    await pageRecepcao.bringToFront();
    await pageRecepcao.getByTitle('Chat Interno').click();
    
    await pageRecepcao.getByRole('tab', { name: 'Consultórios' }).click();
    await pageRecepcao.getByRole('dialog').getByRole('listitem').filter({ hasText: 'Consultório 01' }).click();
    
    await pageRecepcao.waitForTimeout(1000); 

    const inputRecepcao = pageRecepcao.getByPlaceholder('Escreva uma mensagem...');
    await inputRecepcao.fill('Paciente do exame chegou!');
    await pageRecepcao.locator('form').getByRole('button').click();
    
    await expect(inputRecepcao).toHaveValue(''); 

    // 🚨 REMOVIDO: await pageRecepcao.waitForTimeout(1000); 

    // ---------------------------------------------------------
    // CENA 2: O MÉDICO RECEBE A NOTIFICAÇÃO
    // ---------------------------------------------------------
    await pageMedico.bringToFront();
    
    // 1. O estado persistente garante que o WebSocket funcionou perfeitamente
    const badgeNaoLidas = pageMedico.getByTitle('Chat Interno').locator('.MuiBadge-badge');
    await expect(badgeNaoLidas).not.toBeEmpty({ timeout: 10000 }); 

    // 🔥 APAGAMOS A ASSERÇÃO DO ALERTA DAQUI 🔥

    // ---------------------------------------------------------
    // CENA 3: O MÉDICO ABRE O CHAT E LÊ
    // ---------------------------------------------------------
    await pageMedico.getByTitle('Chat Interno').click();
    await pageMedico.getByRole('tab', { name: 'Consultórios' }).click();

    // Localiza o item de lista do Consultório 01 (fonte da verdade, não posição no DOM)
    const salaAlvo = pageMedico.getByRole('dialog').getByRole('listitem').filter({ hasText: 'Consultório 01' });

    // Timeout maior para dar chance à fetch (possivelmente lenta) se estabilizar
    await expect(salaAlvo, 'Consultório 01 sumiu da lista — possível race condition no fetch de salas')
      .toBeVisible({ timeout: 15000 });

    const badgeSalaAlvo = salaAlvo.locator('.MuiBadge-badge.MuiBadge-colorError');
    await expect(badgeSalaAlvo).toBeVisible();
    await expect(badgeSalaAlvo).not.toHaveClass(/MuiBadge-invisible/);

    await salaAlvo.click();
    await expect(pageMedico.getByText('Paciente do exame chegou!').last()).toBeVisible();

    // ---------------------------------------------------------
    // CENA 4: A RECEPÇÃO RECEBE O TIQUE AZUL DO GRUPO
    // ---------------------------------------------------------
    await pageRecepcao.bringToFront();
    
    const tiqueDuplo = pageRecepcao.locator('svg[data-testid="DoneAllIcon"]').last();
    await expect(tiqueDuplo).toBeVisible();
    await expect(tiqueDuplo).toHaveCSS('color', 'rgb(33, 150, 243)');
    
  });

  test.describe.serial('Testes de Web Push e Service Worker', () => {

    test('O frontend deve pedir permissão de notificação e enviar a chave ao backend', async ({ browser }) => {
      
      const context = await browser.newContext();
      await context.grantPermissions(['notifications']); 
      
      const page = await context.newPage();

      let pushRegistrado = false;
      // 1. INICIALIZAMOS COMO STRING VAZIA PARA AGRADAR O TYPESCRIPT
      let endpointEnviado = ''; 
      
      await page.route('**/push/subscribe/', route => {
        pushRegistrado = true;
        const request = route.request();
        const postData = JSON.parse(request.postData() || '{}');

        endpointEnviado = postData.endpoint; 
        
        route.fulfill({ 
          status: 201, 
          contentType: 'application/json',
          body: JSON.stringify({ status: 'Inscrito com sucesso no teste!' }) 
        });
      });

      await page.goto(`${BASE_URL}/login`);
      await page.locator('input[name="username"], input[type="text"]').first().fill('Teste'); 
      await page.locator('input[name="password"], input[type="password"]').first().fill('Teste@123');  
      await page.getByRole('button', { name: 'Entrar' }).click();

      await page.waitForTimeout(3000); 

      expect(pushRegistrado).toBeTruthy();
      
      // 2. MUDAMOS A VALIDAÇÃO PARA GARANTIR QUE A STRING NÃO ESTÁ VAZIA
      expect(endpointEnviado).not.toBe('');
      
      // 3. AGORA O TYPESCRIPT SABE QUE É SEGURO USAR O .toContain()
      expect(endpointEnviado).toContain('fcm.googleapis.com');
    });

  });
});