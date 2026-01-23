import api from './api';

const crmService = {
  // --- KANBAN ---
  getKanban: async () => {
    const response = await api.get('/crm/ciclos/kanban/');
    return response.data;
  },

  moverFase: async (cicloId, novaFase) => {
    const response = await api.post(`/crm/ciclos/${cicloId}/mover_fase/`, {
      nova_fase: novaFase
    });
    return response.data;
  },

  // --- DETALHES DO CICLO ---
  getCicloDetalhe: async (id) => {
    const response = await api.get(`/crm/ciclos/${id}/`);
    return response.data;
  },

  // --- DASHBOARD EXECUTIVO ---
  getPainelExecutivo: async () => {
    const response = await api.get('/dashboard/executivo/');
    return response.data;
  }
};

export default crmService;