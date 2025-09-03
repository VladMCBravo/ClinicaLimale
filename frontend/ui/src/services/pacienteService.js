// src/services/pacienteService.js
import apiClient from '../api/axiosConfig';

const getPacienteDetalhes = (pacienteId) => {
    return apiClient.get(`/pacientes/${pacienteId}/`);
};

export const pacienteService = {
    getPacienteDetalhes,
};