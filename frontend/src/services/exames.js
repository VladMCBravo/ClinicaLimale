import axios from 'axios';

// URL do seu Backend no Render
const API_URL = 'https://clinicalimale.onrender.com/api';

export const acessarExame = async (codigo, senha) => {
  try {
    const response = await axios.post(`${API_URL}/exames/acessar/`, {
      codigo_acesso: codigo,
      senha_acesso: senha
    });
    return response.data;
  } catch (error) {
    // Tratamento de erro amigável
    if (error.response && error.response.status === 404) {
      throw new Error("Exame não encontrado com este código.");
    }
    if (error.response && error.response.status === 403) {
      throw new Error("Senha incorreta.");
    }
    throw new Error("Erro ao buscar resultados. Tente novamente.");
  }
};

// No arquivo exames.js
const getAuthHeader = () => {
  // MUDANÇA: troque localStorage por sessionStorage e 'token' por 'authToken'
  const token = sessionStorage.getItem('authToken'); 
  return { headers: { Authorization: `Token ${token}` } };
};

export const listarPendentes = async () => {
  const response = await axios.get(`${API_URL}/exames/pendentes/`, getAuthHeader());
  return response.data;
};

export const vincularPaciente = async (exameId, pacienteId) => {
  const response = await axios.post(
    `${API_URL}/exames/${exameId}/vincular/`, 
    { paciente_id: pacienteId },
    getAuthHeader()
  );
  return response.data;
};