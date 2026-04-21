// src/services/prontuarioService.js
import apiClient from '../api/axiosConfig';

const getAnamnese = (pacienteId) => {
    // A API da Anamnese geralmente é o ponto de partida, pois contém os alertas.
    return apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`);
};

// NOVA FUNÇÃO: Envia o PDF para receber a máscara do backend
const aplicarMascaraPdf = (formData) => {
    return apiClient.post('/prontuario/aplicar-mascara/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob' // Fundamental para não corromper o PDF
    });
};

export const prontuarioService = {
    getAnamnese,
    aplicarMascaraPdf, // <--- Não esquecer de exportar a função
};