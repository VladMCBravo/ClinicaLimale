// src/services/crmService.js - CORRIGIDO (Padrão do Projeto)
import apiClient from '../api/axiosConfig';

export const crmService = {
  // --- KANBAN ---
  getKanban: () => {
    return apiClient.get('/crm/ciclos/kanban/');
  },

  moverFase: (cicloId, novaFase) => {
    return apiClient.post(`/crm/ciclos/${cicloId}/mover_fase/`, {
      nova_fase: novaFase
    });
  },

  // --- DETALHES DO CICLO ---
  getCicloDetalhe: (id) => {
    return apiClient.get(`/crm/ciclos/${id}/`);
  },

  // --- ADICIONE ESTA FUNÇÃO ---
  updateCiclo: (id, dados) => {
    return apiClient.patch(`/crm/ciclos/${id}/`, dados);
  },
  // -----------------------------

  // ADICIONE ISSO:
  addAcao: (dados) => {
    return apiClient.post('/crm/acoes/', dados);
  },
  
  concluirAcao: (id) => {
    return apiClient.post(`/crm/acoes/${id}/concluir/`);
  },

  // --- LISTA DE CICLOS ---
  getCiclos: (params) => {
    return apiClient.get('/crm/ciclos/', { params });
  },

  // --- DASHBOARD EXECUTIVO ---
  getPainelExecutivo: () => {
    return apiClient.get('/dashboard/executivo/');
  }
};