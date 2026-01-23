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

  // --- DASHBOARD EXECUTIVO ---
  getPainelExecutivo: () => {
    return apiClient.get('/dashboard/executivo/');
  }
};