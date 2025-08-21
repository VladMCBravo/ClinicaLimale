// src/hooks/useAuth.js
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axiosConfig';

export const useAuth = () => {
    const navigate = useNavigate();

    // useMemo garante que esta lógica só rode quando necessário, otimizando a performance.
    const user = useMemo(() => {
        try {
            const userDataString = sessionStorage.getItem('userData');
            if (userDataString && userDataString !== 'undefined') {
                const userData = JSON.parse(userDataString);
                // Adiciona a propriedade 'isAdmin' para facilitar as verificações
                userData.isAdmin = userData.cargo === 'admin';
                return userData;
            }
        } catch (error) {
            console.error("Erro ao processar dados do usuário:", error);
            // Se houver erro, limpa a sessão para evitar loops de erro
            sessionStorage.clear();
            return null;
        }
        return null; // Retorna null se não houver dados
    }, []);

    const logout = async () => {
        try {
            await apiClient.post('/auth/logout/');
        } catch (error) {
            console.error("Erro no logout da API:", error);
        } finally {
            sessionStorage.clear(); // Limpa toda a sessão
            navigate('/login');
        }
    };

    return {
        user,
        logout,
    };
};