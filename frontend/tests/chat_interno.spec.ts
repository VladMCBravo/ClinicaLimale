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
    await pageRecepcao.locator('input[name="username"], input[type="text"]').first().fill('superadmin'); 
    await pageRecepcao.locator('input[name="password"], input[type="password"]').first().fill('Admin@123');  
    await pageRecepcao.getByRole('button', { name: 'Entrar' }).click();
    await pageRecepcao.getByTitle('Chat Interno').waitFor(); // Aguarda UI carregar
    
    // 3. LOGIN DO MÉDICO (Destinatário)
    await pageMedico.goto(`${BASE_URL}/login`);
    await pageMedico.locator('input[name="username"], input[type="text"]').first().fill('Teste');   
    await pageMedico.locator('input[name="password"], input[type="password"]').first().fill('Teste@123');    
    await pageMedico.getByRole('button', { name: 'Entrar' }).click();
    // Aguarda o painel principal carregar validando o texto de boas-vindas do usuário
    await expect(pageMedico.getByText('Olá, Dr. Ambrosio')).toBeVisible({ timeout: 15000 });

    // ---------------------------------------------------------
    // CENA 1: A RECEPÇÃO ENVIA UM AVISO NO GRUPO (Consultório 03)
    // ---------------------------------------------------------
    await pageRecepcao.bringToFront();
    await pageRecepcao.getByTitle('Chat Interno').click();
        
    // Recepção abre o Consultório 03[cite: 13]
    const textoConsultorio03Recepcao = pageRecepcao.getByRole('dialog').getByText('Consultório 03 (Ped e Neo)', { exact: true });
    await expect(textoConsultorio03Recepcao).toBeVisible();
    await textoConsultorio03Recepcao.click();
    
    const inputRecepcao = pageRecepcao.getByPlaceholder('Escreva...');
    await inputRecepcao.fill('Paciente do exame chegou!');
    await pageRecepcao.locator('form').getByRole('button').first().click();
    
    await expect(inputRecepcao).toHaveValue(''); 
    
    // Tempo para o browser enviar o pacote via WebSocket antes de mudar de aba
    await pageRecepcao.waitForTimeout(1000); 

    // ---------------------------------------------------------
    // CENA 2 & 3: O MÉDICO ABRE O CHAT E LÊ A NOTIFICAÇÃO (Consultório 03)
    // ---------------------------------------------------------
    await pageMedico.bringToFront();
    
    // Pegamos o botão que abre o Chat Interno na barra do topo
    const botaoChatMedico = pageMedico.getByTitle('Chat Interno');
    await expect(botaoChatMedico).toBeVisible();

    // Em vez de esperar pelo texto "1", verificamos se há UM NÚMERO qualquer dentro da badge.
    // Usamos expressão regular do Playwright para certificar que o crachá contém dígitos [0-9]
    // e está visível (MUI retira o número do DOM ou esconde quando é zero).
    await expect(botaoChatMedico.locator('.MuiBadge-badge'), 'Nenhuma notificação nova computada na Navbar')
      .toHaveText(/[1-9]/, { timeout: 15000 });
    
    // Simplificando a Cena 2: Apenas abrimos o Chat Interno para focar 
    // no elemento da Sidebar, que sabemos ter o DOM perfeitamente renderizado pelo MUI.
    await pageMedico.getByTitle('Chat Interno').click();
    
    // Médico localiza a aba exata do Consultório 03
    const textoConsultorio03Medico = pageMedico.getByRole('dialog').getByText('Consultório 03 (Ped e Neo)', { exact: true });
    await expect(textoConsultorio03Medico).toBeVisible({ timeout: 15000 });

    // Navegamos para cima no DOM (até o ListItem inteiro) para achar a badge
    const salaAlvoListItem = textoConsultorio03Medico.locator('xpath=ancestor::li[1]');
    const badgeSalaAlvo = salaAlvoListItem.locator('.MuiBadge-badge');
    
    // A verdadeira validação: 
    // Esperamos a badge do Consultório 03 ter algum valor numérico > 0 na Sidebar
    await expect(badgeSalaAlvo).toHaveText(/[1-9]/, { timeout: 15000 });

    // Clicamos no texto exato para abrir a conversa
    await textoConsultorio03Medico.click();
    
    // Valida que a mensagem apareceu na tela
    await expect(pageMedico.getByText('Paciente do exame chegou!').last()).toBeVisible({ timeout: 15000 });

    // ---------------------------------------------------------
    // CENA 4: A RECEPÇÃO RECEBE O TIQUE AZUL DO GRUPO
    // ---------------------------------------------------------
    await pageRecepcao.bringToFront();
    
    // O MUI converte as cores de 'sx' para estilos inline ou classes computadas. 
    // Em navegadores (e no Playwright), a cor '#2196f3' é traduzida para 'rgb(33, 150, 243)'.
    // Usamos uma string XPath para achar um SVG que tenha AMBOS: o data-testid E o estilo computado
    // (O Playwright tem a pseudo-classe :has() que resolve isso com elegância sem congelar no DOM antigo)
    
    const tiqueDuploAzul = pageRecepcao.locator('svg[data-testid="DoneAllIcon"]').filter({
      has: pageRecepcao.locator('xpath=self::*[@style="color: rgb(33, 150, 243);" or contains(@class, "color")] | self::*[contains(@style, "color")]') 
    });

    // Maneira Playwright-Nativa robusta: Aguardar até que a validação CSS passe 
    // usando polling automático no próprio locator (em vez de resolver e depois validar)
    await expect(
        pageRecepcao.locator('svg[data-testid="DoneAllIcon"]').last()
    ).toHaveCSS('color', 'rgb(33, 150, 243)', { timeout: 15000 });
    
  });

});