// src/services/configuracoesService.js
import apiClient from '../api/axiosConfig';

const getEspecialidades = () => {
    return apiClient.get('/usuarios/especialidades/');
};

const createEspecialidade = (data) => {
    return apiClient.post('/usuarios/especialidades/', data);
};

const updateEspecialidade = (id, data) => {
    return apiClient.put(`/usuarios/especialidades/${id}/`, data);
};

const deleteEspecialidade = (id) => {
    return apiClient.delete(`/usuarios/especialidades/${id}/`);
};

// --- ADICIONE AS FUNÇÕES ABAIXO ---

const getJornadas = () => {
    // Confirme se este endpoint /usuarios/jornadas/ está correto
    return apiClient.get('/usuarios/jornadas/');
};

const createJornada = (data) => {
    return apiClient.post('/usuarios/jornadas/', data);
};

const updateJornada = (id, data) => {
    return apiClient.put(`/usuarios/jornadas/${id}/`, data);
};

const deleteJornada = (id) => {
    return apiClient.delete(`/usuarios/jornadas/${id}/`);
};

export const configuracoesService = {
    getEspecialidades,
    createEspecialidade,
    updateEspecialidade,
    deleteEspecialidade,
    getJornadas,
    createJornada,
    updateJornada,
    deleteJornada,
};