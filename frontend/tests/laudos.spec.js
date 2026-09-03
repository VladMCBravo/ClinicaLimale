// tests/laudos.spec.js
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Fluxo do Copiloto de Laudos (IA Claude)', () => {

  test('Deve barrar o laudo com a IA, exibir discrepâncias e permitir Ignorar e Assinar', async ({ page }) => {
    
    // 1. Setup Inicial e Login
    await page.goto(`${BASE_URL}/login`);
    await page.getByRole('textbox', { name: 'Nome de Usuário' }).fill('Daniel'); 
    await page.getByRole('textbox', { name: 'Senha' }).fill('Med@123');
    await page.getByRole('button', { name: 'Entrar' }).click();

    // 2. Navegar para a página de Laudos e preencher o básico
    await page.goto(`${BASE_URL}/laudos`);
    
    // Como a página tem um confirm nativo do navegador ("Atenção: Após finalizado..."), 
    // precisamos instruir o Playwright a aceitá-lo automaticamente
    page.on('dialog', dialog => dialog.accept());

    // 3. MOCK DA API: Intercepta a criação do Laudo para não criar lixo no banco
    await page.route('**/api/prontuario/laudos-async/', async route => {
      const json = { id: 9999, status: 'PROCESSANDO' };
      await route.fulfill({ json, status: 202 });
    });

    // 4. MOCK DO POLLING (A Mágica da IA)
    // Vamos contar quantas vezes o polling foi chamado para mudar a resposta
    let pollingCount = 0;
    await page.route('**/api/prontuario/laudos/9999/status/', async route => {
      pollingCount++;
      
      if (pollingCount === 1) {
        // Primeira checagem: O Claude barrou o laudo!
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
        // Segunda checagem (após o médico clicar em Ignorar e Assinar): Sucesso!
        await route.fulfill({
          json: {
            id: 9999,
            status: 'FINALIZADO',
            arquivo_url: '/media/laudos/teste.pdf',
            credenciais: { codigo: 'PCT-123', senha: 'ABC' }
          },
          status: 200
        });
      }
    });

    // 5. Ação: Preenche a senha no modal de revisão e clica em Salvar
    // (Assumindo que você abriu a prévia)
    await page.getByRole('button', { name: 'Finalizar' }).click();
    await page.getByPlaceholder('Digite a senha...').fill('Med@123');
    await page.getByRole('button', { name: /SALVAR E FINALIZAR/i }).click();

    // 6. Validação 1: O modal da IA deve aparecer na tela
    const modalIA = page.getByText('Revisão Sugerida');
    await expect(modalIA).toBeVisible();
    await expect(page.getByText('O JSON indica ovário DIREITO')).toBeVisible();

    // 7. Ação: Clica no botão de forçar a assinatura (Ignorar)
    await page.getByRole('button', { name: 'Ignorar e Assinar' }).click();

    // 8. Validação 2: O polling roda de novo (pollingCount = 2) e o modal de Sucesso aparece
    await expect(page.getByText('Laudo Salvo com Sucesso!')).toBeVisible();
    await expect(page.getByText('PCT-123')).toBeVisible(); // Credencial gerada
  });

});