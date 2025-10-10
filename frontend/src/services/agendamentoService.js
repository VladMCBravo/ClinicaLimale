// src/services/agendamentoService.js
import apiClient from '../api/axiosConfig';

const getAgendamentos = (medicoId, especialidadeId) => {
    const params = new URLSearchParams();
    if (medicoId) {
        params.append('medico_id', medicoId);
    }
    if (especialidadeId) {
        params.append('especialidade_id', especialidadeId);
    }
    const queryString = params.toString();
    const url = `/agendamentos/${queryString ? `?${queryString}` : ''}`;
    return apiClient.get(url);
};

const getAgendamentosHoje = (medicoId) => {
    const params = new URLSearchParams();
    if (medicoId) {
        params.append('medico_id', medicoId);
    }
    const queryString = params.toString();
    const url = `/agendamentos/hoje/${queryString ? `?${queryString}` : ''}`;
    return apiClient.get(url);
};
// ADICIONE A NOVA FUNÇÃO ABAIXO
const getListaEspera = () => {
    return apiClient.get('/agendamentos/espera/');
};
// <<-- NOVA FUNÇÃO ADICIONADA AQUI -->>
const getSalas = () => {
    return apiClient.get('/agendamentos/salas/');
};
const createAgendamento = (data) => apiClient.post('/agendamentos/', data);
const updateAgendamento = (id, data) => apiClient.put(`/agendamentos/${id}/`, data);
const verificarCapacidade = (inicio, fim) => {
    const params = new URLSearchParams({ inicio, fim });
    return apiClient.get(`/agendamentos/verificar-capacidade/?${params.toString()}`);
};



const getModalData = () => {
    const fetchPacientes = apiClient.get('/pacientes/');
    const fetchProcedimentos = apiClient.get('/faturamento/procedimentos/');
    const fetchMedicos = apiClient.get('/usuarios/usuarios/?cargo=medico');
    const fetchEspecialidades = apiClient.get('/usuarios/especialidades/');
    return Promise.all([fetchPacientes, fetchProcedimentos, fetchMedicos, fetchEspecialidades]);
};

// ADICIONE A NOVA FUNÇÃO ABAIXO
const verificarDisponibilidade = ({ data, medicoId, especialidadeId }) => {
    const params = new URLSearchParams();
    params.append('data', data); // Formato YYYY-MM-DD
    if (medicoId) {
        params.append('medico_id', medicoId);
    }
    if (especialidadeId) {
        params.append('especialidade_id', especialidadeId);
    }
    
    /// A CORREÇÃO ESTÁ AQUI: 'disponiveis' em vez de 'disponisponiveis'
    const url = `/agendamentos/horarios-disponiveis/?${params.toString()}`;
    
    return apiClient.get(url);
};

const getMinhaAgenda = () => {
    // Este endpoint deve corresponder ao que você criou no backend
    return apiClient.get('/agendamentos/minha-agenda/'); 
};

export const agendamentoService = {
    getAgendamentos,
    getAgendamentosHoje,
    getListaEspera,
    getSalas, // <-- Exporte a nova função
    createAgendamento,
    updateAgendamento,
    getModalData,
    verificarCapacidade,
    verificarDisponibilidade,
    getMinhaAgenda  
};