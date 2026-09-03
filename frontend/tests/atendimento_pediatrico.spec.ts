import { test, expect } from '@playwright/test';

// Altere para a URL base onde seu React roda localmente
const BASE_URL = 'http://localhost:3000';

test.describe('Fluxo de Atendimento Pediátrico', () => {
  
  test('Deve preencher anamnese pediátrica e salvar com sucesso', async ({ page }) => {
    // 1. Login no sistema
    await page.goto(`${BASE_URL}/login`);
    
    // Substitua 'SEU_USUARIO_AQUI' pelo login de um médico que existe no seu banco local (ex: 'daniel')
    await page.getByRole('textbox', { name: 'Nome de Usuário' }).fill('Daniel'); 
    
    // Substitua 'SUA_SENHA_AQUI' pela senha real desse usuário (ex: '123456')
    await page.getByRole('textbox', { name: 'Senha' }).fill('Med@123');
    
    await page.getByRole('button', { name: 'Entrar' }).click();

    // 2. Aguarda a página carregar verificando um elemento real da tela (Best Practice)
    await expect(page.getByText('Olá, Dr. Limberg')).toBeVisible();
    
    // 3. Seleciona o paciente real que apareceu na sua lista da coluna esquerda
    await page.getByRole('button', { name: /Joao Eduardo Pereira da Silva/i }).click();

    // 4. Interação com o Histórico Pediátrico
    // PRIMEIRO: Clica na aba Histórico para revelar o conteúdo
    await page.getByRole('tab', { name: 'Histórico' }).click();

    // DEPOIS: Expande o accordion de Alimentação
    await page.getByText('Alimentação (0-6 Meses)').click();
    
    // Clica no botão de preenchimento automático que você criou
    await page.click('button:has-text("Preencher Normalidade")');

    // 5 e 6. Intercepta a rede E clica no botão simultaneamente (Best Practice)
    const [response] = await Promise.all([
      page.waitForResponse(res => 
        res.url().includes('/api/prontuario/pacientes/') && 
        res.url().includes('/anamnese/') && 
        res.request().method() === 'PATCH'
      ),
      // O Regex /Salvar Atendimento|Atualizar Atendimento/i aceita os dois estados do botão
      page.getByRole('button', { name: /Salvar Atendimento|Atualizar Atendimento/i }).click()
    ]);

    // 7. Asserções (Validações)
    expect(response.status()).toBe(200);
    
    // Verifica se a UI deu o feedback correto para o médico usando role de acessibilidade
    const snackbar = page.getByRole('alert');
    // O Regex aceita tanto a palavra "salvo" quanto "atualizado"
    await expect(snackbar).toHaveText(/Atendimento (salvo|atualizado) com sucesso!/i);
    await expect(snackbar).toBeVisible();
  });

});