import { test, expect } from '@playwright/test';

// Adapte para a URL do seu frontend local, caso seja diferente
const BASE_URL = 'http://localhost:3000';

test.describe('Fluxo do Copiloto de Laudos (IA Claude)', () => {

  test('Deve barrar o laudo com a IA, exibir discrepâncias e permitir Ignorar e Assinar', async ({ page }) => {
    
    // 1. Setup Inicial e Login
    await page.goto(`${BASE_URL}/login`);
    await page.getByRole('textbox', { name: 'Nome de Usuário' }).fill('Daniel'); 
    await page.getByRole('textbox', { name: 'Senha' }).fill('Med@123');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('Olá, Dr.')).toBeVisible();

    // 2. Navegar para a página de Laudos (ajuste a rota se necessário)
    await page.goto(`${BASE_URL}/laudos`);
    
    // O navegador vai disparar aquele "window.confirm" nativo ("Atenção: Após finalizado...").
    // Precisamos dizer ao robô do Playwright para clicar em "OK" automaticamente.
    page.on('dialog', dialog => dialog.accept());

    // 3. MOCK DA API 1: Intercepta a submissão inicial do formulário
    // Isso impede de criar lixo no banco de dados real durante o teste de UI
    await page.route('**/api/prontuario/laudos-async/', async route => {
      await route.fulfill({ 
          json: { id: 9999, status: 'PROCESSANDO' }, 
          status: 202 
      });
    });

    // 4. MOCK DA API 2: Intercepta o Polling (A Mágica da IA acontece aqui)
    let pollingCount = 0;
    await page.route('**/api/prontuario/laudos/9999/status/', async route => {
      pollingCount++;
      
      if (pollingCount === 1) {
        // Primeira batida: Simulamos que o Claude achou um erro!
        await route.fulfill({
          json: {
            id: 9999,
            status: 'REVISAO_SUGERIDA',
            discrepancias: [
              { campo: 'Lateralidade', aviso: 'O JSON indica ovário DIREITO, mas o texto descreve o ESQUERDO.' }
            ]
          },
          status: 200
        });
      } else {
        // Segunda batida (após o médico forçar): Simulamos o sucesso!
        await route.fulfill({
          json: {
            id: 9999,
            status: 'FINALIZADO',
            arquivo_url: '/media/laudos/teste.pdf',
            credenciais: { codigo: 'PCT-123456', senha: 'SENHA' }
          },
          status: 200
        });
      }
    });

    // 5. Preparação da Tela: Preencher e CLICAR nas opções para preencher o estado do React
    await page.getByRole('button', { name: 'Laudo Avulso (Sem Agendamento)' }).click();
    
    await page.getByPlaceholder('Buscar Paciente...').fill('Maria');
    // Aguarda o dropdown renderizar a resposta da API e clica no paciente (usamos a tag "ID:" como âncora)
    await page.getByText(/ID:/i).first().click();
    
    await page.getByPlaceholder('Médico...').fill('Daniel');
    // Aguarda o dropdown renderizar e clica no médico
    await page.getByText(/Daniel/i).last().click();

    // 👇 APRIMORAMENTO AQUI: Manipulando o FormAbdome
    // 5.1 Muda o dropdown de "Tipo de Exame" para US Geral (ABDOME)
    await page.locator('select').first().selectOption('ABDOME');
    
    // 5.2 O FormAbdome agora está na tela. Vamos preencher o texto do laudo!
    await page.getByPlaceholder('Digite o laudo completo aqui...').fill('Fígado com dimensões normais. Vesícula biliar sem cálculos. Ovário DIREITO com cisto.');

    // 6. Ação: Abre o modal de revisão e envia a assinatura
    await page.getByRole('button', { name: 'Finalizar' }).click();
    await page.getByPlaceholder('Digite a senha...').fill('Med@123');
    await page.getByRole('button', { name: /SALVAR E FINALIZAR/i }).click();

    // 7. Validação 1: O modal Vermelho da IA deve aparecer na tela!
    await expect(page.getByText('Revisão Sugerida')).toBeVisible();
    await expect(page.getByText('O JSON indica ovário DIREITO')).toBeVisible();

    // 8. Ação: Clica no botão de forçar a assinatura
    await page.getByRole('button', { name: 'Ignorar e Assinar' }).click();

    // 9. Validação 2: O modal de Sucesso Verde deve aparecer!
    await expect(page.getByText('Laudo Salvo com Sucesso!')).toBeVisible();
    await expect(page.getByText('PCT-123456')).toBeVisible(); 
  });

});