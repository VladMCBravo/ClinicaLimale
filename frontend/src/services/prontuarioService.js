// src/services/prontuarioService.js
import apiClient from '../api/axiosConfig';

const getAnamnese = (pacienteId) => {
    // A API da Anamnese geralmente é o ponto de partida, pois contém os alertas.
    return apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`);
};

// Adicione outras funções conforme necessário...
// const getEvolucoes = (pacienteId) => apiClient.get(`/prontuario/pacientes/${pacienteId}/evolucoes/`);

export const prontuarioService = {
    getAnamnese,
};