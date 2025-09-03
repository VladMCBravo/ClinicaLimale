// src/services/agendamentoService.js
import apiClient from '../api/axiosConfig';

const getAgendamentos = () => {
    return apiClient.get('/agendamentos/');
};

const getAgendamentosHoje = () => {
    return apiClient.get('/agendamentos/hoje/');
};

const createAgendamento = (data) => {
    return apiClient.post('/agendamentos/', data);
};

const updateAgendamento = (id, data) => {
    return apiClient.put(`/agendamentos/${id}/`, data);
};

// Função para buscar os dados necessários para o modal de uma só vez
const getModalData = () => {
    const fetchPacientes = apiClient.get('/pacientes/');
    const fetchProcedimentos = apiClient.get('/faturamento/procedimentos/');
    return Promise.all([fetchPacientes, fetchProcedimentos]);
};

export const agendamentoService = {
    getAgendamentos,
    getAgendamentosHoje,
    createAgendamento,
    updateAgendamento,
    getModalData,
};