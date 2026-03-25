// src/api/axiosConfig.js
import axios from 'axios';

// Agora ele lê a variável de ambiente correta (Production ou Preview)
const API_BASE_URL = process.env.REACT_APP_API_URL;

console.log('USANDO API_BASE_URL:', API_BASE_URL);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// 1. INTERCEPTOR DE REQUISIÇÃO (O crachá - Já estava perfeito)
apiClient.interceptors.request.use(config => {
  const token = sessionStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// 2. INTERCEPTOR DE RESPOSTA (A nova barreira de segurança)
apiClient.interceptors.response.use(
  (response) => {
    // Se deu sucesso (200, 201), deixa passar normalmente
    return response;
  },
  (error) => {
    // Se o backend gritar "401 Não Autorizado" (Token expirado ou inválido)
    if (error.response && error.response.status === 401) {
      console.warn("Sessão expirada. Deslogando o usuário por segurança.");
      
      // Limpa os dados do navegador
      sessionStorage.clear();
      localStorage.removeItem('laudos_rascunho_auto_save');
      
      // Chuta para o login apenas se já não estiver na tela de login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Repassa o erro para o componente que fez a chamada lidar (ex: exibir um Toast)
    return Promise.reject(error);
  }
);

export default apiClient;