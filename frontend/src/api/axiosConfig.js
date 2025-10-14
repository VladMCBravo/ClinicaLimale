// src/api/axiosConfig.js
import axios from 'axios';

// FORÇANDO URL DO AWS BACKEND
const API_BASE_URL = 'https://clinicalimale.onrender.com/api';

console.log('API_BASE_URL:', API_BASE_URL);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
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