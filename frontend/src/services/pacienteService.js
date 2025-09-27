// src/services/pacienteService.js
import apiClient from '../api/axiosConfig';

// Assumindo que você já tem funções como estas:
const getPacientes = () => apiClient.get('/pacientes/');
const getPacienteDetalhes = (id) => apiClient.get(`/pacientes/${id}/`);

// ADICIONE ESTA NOVA FUNÇÃO
const createPaciente = (pacienteData) => {
    return apiClient.post('/pacientes/', pacienteData);
};

export const pacienteService = {
    getPacientes,
    getPacienteDetalhes,
    createPaciente, // <-- EXPORTE A NOVA FUNÇÃO
};