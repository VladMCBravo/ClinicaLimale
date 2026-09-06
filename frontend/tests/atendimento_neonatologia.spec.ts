import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Fluxo de Atendimento Neonatal e Documentos', () => {
  
  test('Deve preencher anamnese neonatal, salvar e emitir atestado', async ({ page }) => {
    
    // ==========================================
    // 1. SETUP E NAVEGAÇÃO INICIAL
    // ==========================================
    await page.goto(`${BASE_URL}/login`);
    await page.getByRole('textbox', { name: 'Nome de Usuário' }).fill('Daniel'); 
    await page.getByRole('textbox', { name: 'Senha' }).fill('Med@123');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText('Olá, Dr. Limberg')).toBeVisible();
    
    // ✅ BOA PRÁTICA E2E: Seleciona dinamicamente o PRIMEIRO paciente da lista
    // Ele procura pela lista na tela e clica no primeiro botão/item disponível.
    // Lembrete: É obrigatório ter pelo menos 1 paciente agendado no dia para o teste passar!
    await page.getByRole('list').first().getByRole('button').first().click();

    // ==========================================
    // 2. PREENCHIMENTO DO HISTÓRICO NEONATAL
    // ==========================================
    await page.getByRole('tab', { name: 'Histórico' }).click();

    // Como existem vários botões "Preencher Normalidade" na Neonatologia, 
    // usamos o .first() para clicar no primeiro (1. História Pré-Natal)
    await page.getByRole('button', { name: 'Preencher Normalidade' }).first().click();

    // Intercepta e Salva a Evolução/Histórico
    const [patchResponse] = await Promise.all([
      page.waitForResponse(res => 
        res.url().includes('/api/prontuario/pacientes/') && 
        res.url().includes('/anamnese/') && 
        res.request().method() === 'PATCH'
      ),
      page.getByRole('button', { name: /Salvar Atendimento|Atualizar Atendimento/i }).click()
    ]);

    expect(patchResponse.status()).toBe(200);
    await expect(page.getByRole('alert')).toHaveText(/Atendimento (salvo|atualizado) com sucesso!/i);

    // ==========================================
    // 3. EMISSÃO DE RELATÓRIOS/ATESTADOS (BARRA LATERAL)
    // ==========================================
    // Clica no botão da barra de ferramentas
    await page.getByRole('button', { name: 'Atestados/Relatórios' }).click();

    // Aguarda a aba direita deslizar e ficar visível buscando o título correto
    await expect(page.getByRole('heading', { name: 'ATESTADOS' })).toBeVisible();

    // Preenche o título
    await page.getByRole('textbox', { name: 'Título do Relatório' }).fill('Atestado de Comparecimento Pediátrico');

    // 1. Seleciona o primeiro modelo disponível no dropdown
    await page.getByRole('combobox', { name: 'Selecione um Modelo' }).click();
    await page.getByRole('option').first().click(); 
    
    // 2. Clica para gerar o texto (Isso abre o modal do Editor)
    await page.getByRole('button', { name: 'Gerar Prévia' }).click();

    // 3. Confirma o texto dentro do modal recém-aberto
    await page.getByRole('button', { name: 'Concluir Edição' }).click();

    // 4. Agora sim, com o modal fechado, o botão "Salvar Relatório" estará liberado para clique!
    const [postRelatorioResponse] = await Promise.all([
      page.waitForResponse(res => 
        res.url().includes('/relatorios/') && 
        res.request().method() === 'POST'
      ),
      page.getByRole('button', { name: 'Salvar Relatório' }).click()
    ]);

    // Valida se o backend criou o relatório com sucesso (HTTP 201 Created)
    expect(postRelatorioResponse.status()).toBe(201);

  });

});