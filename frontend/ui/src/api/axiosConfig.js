// src/api/axiosConfig.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:8000/api', // A URL base da sua API
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