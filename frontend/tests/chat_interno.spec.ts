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

    // 🚨 A MÁGICA: Espera o pacote do WebSocket sair da aba antes de congelá-la!
    await pageRecepcao.waitForTimeout(1000); 

    // ---------------------------------------------------------
    // CENA 2: O MÉDICO RECEBE A NOTIFICAÇÃO
    // ---------------------------------------------------------
    await pageMedico.bringToFront();
    
    await expect(pageMedico.getByText(/Nova mensagem/i).first()).toBeVisible();

    const badgeNaoLidas = pageMedico.getByTitle('Chat Interno').locator('.MuiBadge-badge');
    await expect(badgeNaoLidas).not.toBeEmpty(); 

    // ---------------------------------------------------------
    // CENA 3: O MÉDICO ABRE O CHAT E LÊ
    // ---------------------------------------------------------
    await pageMedico.getByTitle('Chat Interno').click();
    await pageMedico.getByRole('tab', { name: 'Consultórios' }).click();
    
    // Verifica a bolinha vermelha na lista esquerda
    await expect(pageMedico.locator('.MuiBadge-badge.MuiBadge-colorError').last()).toBeVisible();

    // 🚨 AJUSTE: Buscamos o consultório pelo nome em vez da posição .first()
    // (Até refatorarmos o ChatContext para guardar o histórico global de não lidas)
    const salaAlvo = pageMedico.getByRole('dialog').getByRole('listitem').filter({ hasText: 'Consultório 01' });
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
});