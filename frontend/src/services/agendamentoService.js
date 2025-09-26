// src/services/agendamentoService.js
import apiClient from '../api/axiosConfig';

const getAgendamentos = (medicoId, especialidadeId) => {
    const params = new URLSearchParams();
    if (medicoId) {
        params.append('medico_id', medicoId);
    }
    if (especialidadeId) {
        params.append('especialidade_id', especialidadeId);
    }
    const queryString = params.toString();
    const url = `/agendamentos/${queryString ? `?${queryString}` : ''}`;
    return apiClient.get(url);
};

const getAgendamentosHoje = () => apiClient.get('/agendamentos/hoje/');
const createAgendamento = (data) => apiClient.post('/agendamentos/', data);
const updateAgendamento = (id, data) => apiClient.put(`/agendamentos/${id}/`, data);
const verificarCapacidade = (inicio, fim) => {
    const params = new URLSearchParams({ inicio, fim });
    return apiClient.get(`/agendamentos/verificar-capacidade/?${params.toString()}`);
};

const getModalData = () => {
    const fetchPacientes = apiClient.get('/pacientes/');
    const fetchProcedimentos = apiClient.get('/faturamento/procedimentos/');
    const fetchMedicos = apiClient.get('/usuarios/usuarios/?cargo=medico');
    const fetchEspecialidades = apiClient.get('/usuarios/especialidades/');
    return Promise.all([fetchPacientes, fetchProcedimentos, fetchMedicos, fetchEspecialidades]);
};

export const agendamentoService = {
    getAgendamentos,
    getAgendamentosHoje,
    createAgendamento,
    updateAgendamento,
    getModalData,
    verificarCapacidade,
};