// src/services/faturamentoService.js
import apiClient from '../api/axiosConfig';

// --- Funções para Procedimentos ---
const createProcedimento = (data) => apiClient.post('/faturamento/procedimentos/', data);
const deleteProcedimento = (id) => apiClient.delete(`/faturamento/procedimentos/${id}/`);
const getProcedimentos = () => apiClient.get('/faturamento/procedimentos/');
const updateProcedimento = (id, data) => apiClient.patch(`/faturamento/procedimentos/${id}/`, data);
const definirPrecoConvenio = (procedimentoId, data) => apiClient.post(`/faturamento/procedimentos/${procedimentoId}/definir-preco-convenio/`, data);
const getPlanosConvenio = () => apiClient.get('/faturamento/planos/');

const uploadTuss = (formData) => {
    return apiClient.post('/faturamento/procedimentos/upload-tuss/', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

// --- Funções para Pagamentos ---

// 1. ESTA É A FUNÇÃO NOVA QUE FALTAVA:
const getPagamentos = (params) => apiClient.get('/faturamento/pagamentos/', { params }); // <<< NOVO: Aceita filtros (?status=Pago)

const getPagamentosPendentes = () => apiClient.get('/faturamento/pagamentos-pendentes/');
const getCobrancasPendentes = (pacienteId) => apiClient.get(`/faturamento/pacientes/${pacienteId}/cobrancas-pendentes/`);
const updatePagamento = (pagamentoId, data) => apiClient.patch(`/faturamento/pagamentos/${pagamentoId}/`, data);
const deletePagamento = (id) => apiClient.delete(`/faturamento/pagamentos/${id}/`);

// --- Funções para Despesas ---
const getDespesas = () => apiClient.get('/faturamento/despesas/');
const getCategoriasDespesa = () => apiClient.get('/faturamento/categorias-despesa/');
const createDespesa = (data) => apiClient.post('/faturamento/despesas/', data);
const updateDespesa = (id, data) => apiClient.put(`/faturamento/despesas/${id}/`, data);
const deleteDespesa = (id) => apiClient.delete(`/faturamento/despesas/${id}/`);

// Para o formulário de Lançamento Avulso
const createLancamentoAvulso = (data) => apiClient.post('/faturamento/lancamento-avulso/', data);

// --- Funções para Relatórios ---
const getRelatorioFinanceiro = () => apiClient.get('/faturamento/relatorios/financeiro/');

// --- Funções para Faturamento de Convênios ---
const getConvenios = () => apiClient.get('/faturamento/convenios/');
const getAgendamentosFaturaveis = (params) => apiClient.get('/faturamento/agendamentos-faturaveis/', { params });
const gerarLoteFaturamento = (data) => apiClient.post('/faturamento/gerar-lote/', data, { responseType: 'blob' });

// --- Funções para o Dashboard ---
const getDashboardFinanceiro = () => apiClient.get('/faturamento/dashboard-financeiro/');
const getProjecaoFinanceira = () => apiClient.get('/faturamento/projecao-caixa/');

export const faturamentoService = {
    // Procedimentos
    getProcedimentos,
    createProcedimento,
    deleteProcedimento,
    updateProcedimento,
    definirPrecoConvenio,
    getPlanosConvenio,
    uploadTuss,
    
    // Pagamentos
    getPagamentos, // <<< NÃO ESQUEÇA DE ADICIONAR AQUI
    getPagamentosPendentes,
    getCobrancasPendentes,
    updatePagamento,
    deletePagamento,
    
    // Despesas
    getDespesas,
    getCategoriasDespesa,
    createDespesa,
    updateDespesa,
    deleteDespesa,
    createLancamentoAvulso,
    
    // Relatórios
    getRelatorioFinanceiro,
    
    // Faturamento
    getConvenios,
    getAgendamentosFaturaveis,
    gerarLoteFaturamento,
    
    // Dashboard
    getDashboardFinanceiro,
    getProjecaoFinanceira,
};