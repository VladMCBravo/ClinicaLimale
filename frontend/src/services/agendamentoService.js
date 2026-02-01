// src/services/agendamentoService.js - VERSÃO REVISADA E CORRIGIDA
import apiClient from '../api/axiosConfig';

const getAgendamentos = (medicoId, especialidadeId) => {
    const params = new URLSearchParams();
    if (medicoId) params.append('medico_id', medicoId);
    if (especialidadeId) params.append('especialidade_id', especialidadeId);
    const queryString = params.toString();
    return apiClient.get(`/agendamentos/${queryString ? `?${queryString}` : ''}`);
};

const getAgendamentosHoje = (medicoId) => {
    const params = new URLSearchParams();
    if (medicoId) params.append('medico_id', medicoId);
    const queryString = params.toString();
    return apiClient.get(`/agendamentos/hoje/${queryString ? `?${queryString}` : ''}`);
};

const getListaEspera = () => {
    return apiClient.get('/agendamentos/espera/');
};

// --- FUNÇÃO QUE ESTAVA FALTANDO PARA O DASHBOARD ---
const getDashboardKPIs = () => {
    return apiClient.get('/agendamentos/dashboard/kpi/');
};

const getSalas = () => {
    return apiClient.get('/agendamentos/salas/');
};

const createSala = (data) => apiClient.post('/agendamentos/salas/', data);
const updateSala = (id, data) => apiClient.put(`/agendamentos/salas/${id}/`, data);
const deleteSala = (id) => apiClient.delete(`/agendamentos/salas/${id}/`);

const createAgendamento = (data) => apiClient.post('/agendamentos/', data);
const updateAgendamento = (id, data) => apiClient.patch(`/agendamentos/${id}/`, data);
const deleteAgendamento = (id) => apiClient.delete(`/agendamentos/${id}/`);

// --- CORREÇÃO: Adicionado parâmetro salaId opcional ---
const verificarCapacidade = (inicio, fim, salaId = null) => {
    const params = new URLSearchParams({ inicio, fim });
    if (salaId) {
        params.append('sala', salaId);
    }
    return apiClient.get(`/agendamentos/verificar-capacidade/?${params.toString()}`);
};

const getModalData = () => {
    return Promise.all([
        apiClient.get('/pacientes/'),
        apiClient.get('/faturamento/procedimentos/'),
        apiClient.get('/usuarios/usuarios/?cargo=medico'),
        apiClient.get('/usuarios/especialidades/')
    ]);
};

const verificarDisponibilidade = ({ data, medicoId, especialidadeId }) => {
    const params = new URLSearchParams();
    params.append('data', data);
    if (medicoId) params.append('medico_id', medicoId);
    if (especialidadeId) params.append('especialidade_id', especialidadeId);
    
    return apiClient.get(`/agendamentos/horarios-disponiveis/?${params.toString()}`);
};

const getMinhaAgenda = () => {
    return apiClient.get('/agendamentos/minha-agenda/'); 
};

export const agendamentoService = {
    getAgendamentos,
    getAgendamentosHoje,
    getListaEspera,
    getDashboardKPIs, // <--- NÃO ESQUEÇA DE EXPORTAR AQUI
    getSalas,
    createSala,
    updateSala,
    deleteSala,
    createAgendamento,
    updateAgendamento,
    deleteAgendamento,
    getModalData,
    verificarCapacidade,
    verificarDisponibilidade,
    getMinhaAgenda  
};