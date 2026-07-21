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

const definirPrecoConvenioEspecialidade = (id, data) => {
    return apiClient.post(`/usuarios/especialidades/${id}/definir-preco-convenio/`, data);
};

const deleteEspecialidade = (id) => {
    return apiClient.delete(`/usuarios/especialidades/${id}/`);
};

// --- NOVA FUNÇÃO PARA APLICAR MÁSCARA NO PDF ---
const mascararPdfEspecialidades = (formData) => {
    return apiClient.post('/usuarios/especialidades/mascarar-pdf/', formData, {
        responseType: 'blob', // Crucial para receber o PDF corretamente
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};

// --- ADICIONE AS FUNÇÕES ABAIXO ---

const getJornadas = (medicoId = null) => {
    const params = new URLSearchParams();
    if (medicoId) {
        params.append('medico_id', medicoId);
    }
    // Adicionado /usuarios/
    return apiClient.get(`/usuarios/jornadas/?${params.toString()}`);
};

const createJornada = (data) => {
    // Adicionado /usuarios/
    return apiClient.post('/usuarios/jornadas/', data);
};

const updateJornada = (id, data) => {
    // Adicionado /usuarios/
    return apiClient.put(`/usuarios/jornadas/${id}/`, data);
};

const deleteJornada = (id) => {
    // Adicionado /usuarios/
    return apiClient.delete(`/usuarios/jornadas/${id}/`);
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
    mascararPdfEspecialidades, // <-- Função adicionada aqui
    getJornadas,
    createJornada,
    updateJornada,
    deleteJornada,
    getMedicos,
    definirPrecoConvenioEspecialidade
};