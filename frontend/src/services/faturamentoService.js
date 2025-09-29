// src/services/faturamentoService.js - VERSÃO COMPLETA E ATUALIZADA

import apiClient from '../api/axiosConfig';

// --- Funções para Procedimentos e Preços (já existentes) ---
const getProcedimentos = () => apiClient.get('/faturamento/procedimentos/');
const updateProcedimento = (id, data) => apiClient.put(`/faturamento/procedimentos/${id}/`, data);
const definirPrecoConvenio = (procedimentoId, data) => apiClient.post(`/faturamento/procedimentos/${procedimentoId}/definir-preco-convenio/`, data);
const getPlanosConvenio = () => apiClient.get('/faturamento/planos/');
const uploadTuss = (formData) => {
    // O segundo argumento é o 'data', que é o nosso FormData com o arquivo.
    // O terceiro argumento são as 'options', onde definimos o cabeçalho correto para upload de arquivos.
    return apiClient.post('/faturamento/procedimentos/upload-tuss/', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};
// --- Funções para Pagamentos Pendentes ---
const getPagamentosPendentes = () => apiClient.get('/faturamento/pagamentos-pendentes/');

// --- Funções para Despesas ---
const getDespesas = () => apiClient.get('/faturamento/despesas/');
const getCategoriasDespesa = () => apiClient.get('/faturamento/categorias-despesa/');
const createDespesa = (data) => apiClient.post('/faturamento/despesas/', data);
// Para o formulário de Lançamento Avulso
const createLancamentoAvulso = (data) => {
    return apiClient.post('/faturamento/lancamento-avulso/', data);
};

// --- Funções para Relatórios ---
const getRelatorioFinanceiro = () => apiClient.get('/faturamento/relatorios/financeiro/');

// --- Funções para Faturamento de Convênios ---
const getConvenios = () => apiClient.get('/faturamento/convenios/');
const getAgendamentosFaturaveis = (params) => apiClient.get('/faturamento/agendamentos-faturaveis/', { params });
const gerarLoteFaturamento = (data) => apiClient.post('/faturamento/gerar-lote/', data, { responseType: 'blob' });
// --- NOVA FUNÇÃO PARA O DASHBOARD ---
const getDashboardFinanceiro = () => apiClient.get('/faturamento/dashboard-financeiro/');
// Busca as cobranças pendentes para um paciente específico
const getCobrancasPendentes = (pacienteId) => {
    return apiClient.get(`/faturamento/pacientes/${pacienteId}/cobrancas-pendentes/`);
};

// Atualiza um pagamento (ex: para marcar como 'Pago')
const updatePagamento = (pagamentoId, data) => {
    // Usamos PATCH para uma atualização parcial (apenas o status e forma de pagamento)
    return apiClient.patch(`/faturamento/pagamentos/${pagamentoId}/`, data);
};


export const faturamentoService = {
    // Procedimentos
    getProcedimentos,
    updateProcedimento,
    definirPrecoConvenio,
    getPlanosConvenio,
    uploadTuss,
    // Pagamentos
    getPagamentosPendentes,
    getCobrancasPendentes,
    updatePagamento,
    // Despesas
    getDespesas,
    getCategoriasDespesa,
    createDespesa,
    createLancamentoAvulso,
    // Relatórios
    getRelatorioFinanceiro,
    // Faturamento
    getConvenios,
    getAgendamentosFaturaveis,
    gerarLoteFaturamento,
    getDashboardFinanceiro, // <-- ADICIONE AQUI
};