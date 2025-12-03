// src/services/pacienteService.js
import apiClient from '../api/axiosConfig';

// O backend espera GET /api/pacientes/
export const getPacientes = () => {
    return apiClient.get('/pacientes/');
};

export const getPacienteDetalhes = (id) => {
    return apiClient.get(`/pacientes/${id}/`);
};

export const createPaciente = (pacienteData) => {
    return apiClient.post('/pacientes/', pacienteData);
};

// Não precisa mais do export default ou export const pacienteService = {...}