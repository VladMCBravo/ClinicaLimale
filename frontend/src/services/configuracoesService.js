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

const getJornadas = (medicoId = null) => {
    // --- USA O NOVO ENDPOINT E PERMITE FILTRAR ---
    const params = new URLSearchParams();
    if (medicoId) {
        params.append('medico_id', medicoId);
    }
    return apiClient.get(`/jornadas/?${params.toString()}`);
};

const createJornada = (data) => {
    return apiClient.post('/jornadas/', data);
};

const updateJornada = (id, data) => {
    return apiClient.put(`/jornadas/${id}/`, data);
};

const deleteJornada = (id) => {
    return apiClient.delete(`/jornadas/${id}/`);
};

// --- ADICIONE ESTA FUNÇÃO PARA BUSCAR OS MÉDICOS ---
const getMedicos = () => {
    return apiClient.get('/usuarios/usuarios/?cargo=medico');
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
    getMedicos,
};