// src/hooks/useAuth.js
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axiosConfig';

export const useAuth = () => {
    const navigate = useNavigate();

    // --- LÓGICA DE LEITURA CORRIGIDA E SEGURA ---
    let user = null; // Inicia como nulo por padrão

    try {
        const userDataString = sessionStorage.getItem('userData');
        // Só tenta o 'parse' se a string realmente existir e tiver conteúdo válido
        if (userDataString && userDataString !== 'undefined' && userDataString !== 'null') {
            user = JSON.parse(userDataString);
        }
    } catch (error) {
        console.error("Erro ao ler dados do usuário do sessionStorage. Limpando sessão.", error);
        // Se houver qualquer erro na leitura, limpa a sessão para evitar problemas futuros
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('userData');
        user = null;
    }
    // -----------------------------------------

    if (user) {
        user.isAdmin = user.cargo === 'admin';
    }

    const logout = async () => {
        try {
            await apiClient.post('/auth/logout/');
        } catch (error) {
            console.error("Erro no logout da API, mas prosseguindo com logout local:", error);
        } finally {
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('userData');
            navigate('/login');
        }
    };

    return {
        user,
        logout,
    };
};