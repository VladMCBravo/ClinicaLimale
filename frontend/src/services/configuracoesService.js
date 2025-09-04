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

export const configuracoesService = {
    getEspecialidades,
    createEspecialidade,
    updateEspecialidade,
    deleteEspecialidade,
};