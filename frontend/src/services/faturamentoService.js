// src/services/faturamentoService.js
import apiClient from '../api/axiosConfig';

export const faturamentoService = {
    // --- PROCEDIMENTOS ---
    getProcedimentos: () => apiClient.get('/faturamento/procedimentos/'),
    createProcedimento: (data) => apiClient.post('/faturamento/procedimentos/', data),
    updateProcedimento: (id, data) => apiClient.patch(`/faturamento/procedimentos/${id}/`, data),
    deleteProcedimento: (id) => apiClient.delete(`/faturamento/procedimentos/${id}/`),
    
    // Upload da Tabela TUSS (Formato CSV)
    uploadTuss: (formData) => {
        return apiClient.post('/faturamento/procedimentos/upload-tuss/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    definirPrecoConvenio: (procedimentoId, data) => apiClient.post(`/faturamento/procedimentos/${procedimentoId}/definir-preco-convenio/`, data),
    getPlanosConvenio: () => apiClient.get('/faturamento/planos/'),

    // --- NOVA API UNIFICADA (RESOLVE O ERRO E O SUMIÇO DE DADOS) ---
    getTransacoes: (params) => apiClient.get('/faturamento/transacoes/', { params }),
    renegociarDivida: (data) => apiClient.post('/faturamento/transacoes/renegociar/', data),
    baixarMultiplo: (id, data) => apiClient.post(`/faturamento/transacoes/${id}/baixar-multiplo/`, data),

    // --- PAGAMENTOS (RECEITAS) ---
    // Aceita params para filtros (?status=Pago&data_inicio=...)
    getPagamentos: (params) => apiClient.get('/faturamento/pagamentos/', { params }),
    getPagamentosPendentes: () => apiClient.get('/faturamento/pagamentos-pendentes/'),
    getCobrancasPendentes: (pacienteId) => apiClient.get(`/faturamento/pacientes/${pacienteId}/cobrancas-pendentes/`),
    updatePagamento: (pagamentoId, data) => apiClient.patch(`/faturamento/pagamentos/${pagamentoId}/`, data),
    deletePagamento: (id) => apiClient.delete(`/faturamento/pagamentos/${id}/`),

    // Lançamento Avulso
    createLancamentoAvulso: (data) => apiClient.post('/faturamento/lancamento-avulso/', data),

    // --- DESPESAS ---
    getDespesas: () => apiClient.get('/faturamento/despesas/'),
    getCategoriasDespesa: () => apiClient.get('/faturamento/categorias-despesa/'),
    createDespesa: (data) => apiClient.post('/faturamento/despesas/', data),
    updateDespesa: (id, data) => apiClient.patch(`/faturamento/despesas/${id}/`, data),
    deleteDespesa: (id) => apiClient.delete(`/faturamento/despesas/${id}/`),

    // Função auxiliar para baixa rápida de despesa (usada no botão Check)
    alternarPagamento: (id, data) => apiClient.patch(`/faturamento/despesas/${id}/`, data),

    // --- FATURAMENTO / CONVÊNIOS ---
    getConvenios: () => apiClient.get('/faturamento/convenios/'),
    getAgendamentosFaturaveis: (params) => apiClient.get('/faturamento/agendamentos-faturaveis/', { params }),
    gerarLoteFaturamento: (data) => apiClient.post('/faturamento/gerar-lote/', data, { responseType: 'blob' }),

    // --- DASHBOARD E RELATÓRIOS ---
    getDashboardFinanceiro: () => apiClient.get('/faturamento/dashboard-financeiro/'),
    getProjecaoFinanceira: () => apiClient.get('/faturamento/projecao-caixa/'),
    getRelatorioFinanceiro: () => apiClient.get('/faturamento/relatorios/financeiro/'),
    
};