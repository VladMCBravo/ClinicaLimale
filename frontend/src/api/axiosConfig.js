// src/api/axiosConfig.js
import axios from 'axios';

const apiClient = axios.create({
  // ESTA LINHA É A MAIS IMPORTANTE
  baseURL: process.env.REACT_APP_API_URL || 'http://98.88.80.53:8000/api',
});

// Interceptor para adicionar o token de autenticação em todas as requisições
apiClient.interceptors.request.use(config => {
  const token = sessionStorage.getItem('authToken'); // Ou de onde você salvar o token
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

export default apiClient;