import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// Usamos test.describe.serial para não rodar paralelamente e bugar o WebSocket
test.describe.serial('Sincronia Real-Time do Chat (2 Navegadores)', () => {

  test('Notificações, Mensagens Não Lidas e Tique Azul', async ({ browser }) => {
    
    // 1. SETUP: CRIANDO "DOIS COMPUTADORES" DIFERENTES
    // Isso cria duas sessões de navegador totalmente isoladas (sem compartilhar cookies)
    const pcRecepcao = await browser.newContext();
    const pageRecepcao = await pcRecepcao.newPage();

    const pcMedico = await browser.newContext();
    const pageMedico = await pcMedico.newPage();

    // 2. LOGIN DA RECEPÇÃO (Janela A)
    await pageRecepcao.goto(`${BASE_URL}/login`);
    await pageRecepcao.locator('input[name="username"], input[type="text"]').first().fill('Teste'); // ✏️ EDITE AQUI
    await pageRecepcao.locator('input[name="password"], input[type="password"]').first().fill('Teste@123');  // ✏️ EDITE AQUI
    await pageRecepcao.getByRole('button', { name: 'Entrar' }).click();
    await pageRecepcao.waitForURL('**/painel'); // Aguarda entrar no sistema
    
    // 3. LOGIN DO MÉDICO (Janela B)
    await pageMedico.goto(`${BASE_URL}/login`);
    await pageMedico.locator('input[name="username"], input[type="text"]').first().fill('Daniel');   // ✏️ EDITE AQUI
    await pageMedico.locator('input[name="password"], input[type="password"]').first().fill('Med@123');    // ✏️ EDITE AQUI
    await pageMedico.getByRole('button', { name: 'Entrar' }).click();
    // ✅ BOA PRÁTICA: Confie na espera automática do seletor. 
    // O Playwright vai esperar o login terminar e o botão do chat aparecer sozinho antes de clicar.
    await pageMedico.getByTitle('Chat Interno').waitFor();

    // ---------------------------------------------------------
    // CENA 1: O MÉDICO ENVIA A MENSAGEM
    // ---------------------------------------------------------
    
    // Médico abre o chat
    await pageMedico.getByTitle('Chat Interno').click();
    
    // Médico seleciona a Recepcionista na lista lateral
    await pageMedico.getByText('Recepção Teste').click(); // ✏️ EDITE AQUI (Ex: 'Maria Recepção')
    
    // Espera de segurança para o WebSocket conectar
    await pageMedico.waitForTimeout(1000); 

    const inputMedico = pageMedico.getByPlaceholder('Escreva uma mensagem...');
    await inputMedico.fill('Olá, o paciente do consultório 1 já chegou?');
    await pageMedico.locator('form').getByRole('button').click();
    
    // Garante que o input limpou (mensagem saiu da tela do médico)
    await expect(inputMedico).toHaveValue('');

    // ---------------------------------------------------------
    // CENA 2: A RECEPÇÃO RECEBE A NOTIFICAÇÃO (Snackbar e Badge)
    // ---------------------------------------------------------
    
    // ✅ BOA PRÁTICA: Traz a tela da Recepção para o foco do sistema operacional.
    // Isso "acorda" a aba e permite que a animação do Snackbar do React aconteça.
    await pageRecepcao.bringToFront();
    
    // 1. O Snackbar deve pular na tela da recepção (que está com o chat fechado)
    await expect(pageRecepcao.getByText(/Nova mensagem de/i)).toBeVisible();

    // 2. O ícone de chat na Navbar deve ganhar a bolinha vermelha com o número 1
    const badgeNaoLidas = pageRecepcao.getByTitle('Chat Interno').locator('.MuiBadge-badge');
    await expect(badgeNaoLidas).not.toBeEmpty(); 

    // ---------------------------------------------------------
    // CENA 3: A RECEPÇÃO ABRE O CHAT E LÊ
    // ---------------------------------------------------------
    
    // Recepção abre o chat
    await pageRecepcao.getByTitle('Chat Interno').click();
    
    // Verifica se a bolinha vermelha também está na lista lateral, ao lado do nome do médico
    await expect(pageRecepcao.locator('.MuiBadge-badge.MuiBadge-colorError').last()).toBeVisible();

    // Recepção clica no nome do médico para abrir a conversa e ler
    await pageRecepcao.getByText('NOME_EXIBICAO_MEDICO').click(); // ✏️ EDITE AQUI (Ex: 'Dr. Daniel')

    // A mensagem tem que aparecer na tela da recepção (Confirmando que o WS recebeu)
    await expect(pageRecepcao.getByText('Olá, o paciente do consultório 1 já chegou?').last()).toBeVisible();

    // ---------------------------------------------------------
    // CENA 4: O MÉDICO RECEBE O TIQUE AZUL DE LEITURA
    // ---------------------------------------------------------
    
    // Agora voltamos para a tela do Médico.
    // Como a Recepção abriu a conversa, o WebSocket enviou o status 'read'.
    // O Material UI injeta automaticamente data-testid="DoneAllIcon" nos ícones.
    const tiqueDuplo = pageMedico.locator('svg[data-testid="DoneAllIcon"]').last();
    
    // O tique duplo precisa estar visível
    await expect(tiqueDuplo).toBeVisible();

    // A cor dele precisa ser o Azul do Material UI (#2196f3 / rgb(33, 150, 243))
    await expect(tiqueDuplo).toHaveCSS('color', 'rgb(33, 150, 243)');
    
  });
});