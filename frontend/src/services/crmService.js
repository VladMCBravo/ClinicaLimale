// src/services/crmService.js
import apiClient from '../api/axiosConfig';

export const crmService = {
  // --- KANBAN ---
  // NOVO: Adicionado o parâmetro macroArea
  getKanban: (macroArea = '') => {
    return apiClient.get(`/crm/ciclos/kanban/?macro_area=${macroArea}`);
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

  updateCiclo: (id, dados) => {
    return apiClient.patch(`/crm/ciclos/${id}/`, dados);
  },

  // --- AÇÕES ---
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
  // NOVO: Adicionado o parâmetro macroArea mantendo a sua rota original
  getPainelExecutivo: (macroArea = '') => {
    return apiClient.get(`/dashboard/executivo/?macro_area=${macroArea}`);
  },

  // --- RENTABILIDADE (A NOVA FUNÇÃO) ---
  getRentabilidade: (macroArea = '') => {
    return apiClient.get(`/crm/ciclos/rentabilidade/?macro_area=${macroArea}`);
  },

  // --- DASHBOARD EXECUTIVO ---
  getPainelExecutivo: (macroArea = '') => {
    // Rota alterada para bater no CicloViewSet do CRM
    return apiClient.get(`/crm/ciclos/painel_executivo/?macro_area=${macroArea}`);
  },
};