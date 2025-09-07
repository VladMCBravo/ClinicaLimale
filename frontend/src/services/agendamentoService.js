// src/services/agendamentoService.js - VERSÃO ATUALIZADA

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

// --- FUNÇÃO ALTERADA ---
// Agora busca TODOS os dados necessários para o modal de uma só vez.
const getModalData = () => {
    const fetchPacientes = apiClient.get('/pacientes/');
    const fetchProcedimentos = apiClient.get('/faturamento/procedimentos/');
    // --- NOVAS BUSCAS ADICIONADAS ---
    const fetchMedicos = apiClient.get('/usuarios/usuarios/?cargo=medico');
    const fetchEspecialidades = apiClient.get('/usuarios/especialidades/');
    
    // O Promise.all vai esperar todas as 4 requisições terminarem.
    return Promise.all([fetchPacientes, fetchProcedimentos, fetchMedicos, fetchEspecialidades]);
};

export const agendamentoService = {
    getAgendamentos,
    getAgendamentosHoje,
    createAgendamento,
    updateAgendamento,
    getModalData, // <-- Exportamos a função atualizada
};