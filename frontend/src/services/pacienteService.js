import apiClient from '../api/axiosConfig';

// 1. Definição das funções
const getPacientes = () => {
    return apiClient.get('/pacientes/');
};

const getPacienteDetalhes = (id) => {
    return apiClient.get(`/pacientes/${id}/`);
};

const createPaciente = (pacienteData) => {
    return apiClient.post('/pacientes/', pacienteData);
};

// 2. Exportação Nomeada Individual (O jeito moderno - Best Practice)
// Isso permite: import { getPacientes } from ...
export { getPacientes, getPacienteDetalhes, createPaciente };

// 3. Exportação do Objeto Legado (Para corrigir o seu erro atual)
// Isso permite: import { pacienteService } from ...
export const pacienteService = {
    getPacientes,
    getPacienteDetalhes,
    createPaciente
};

// 4. Exportação Default (Por segurança)
export default pacienteService;