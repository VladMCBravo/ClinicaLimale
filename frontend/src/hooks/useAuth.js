// src/hooks/useAuth.js - VERSÃO CORRIGIDA E MELHORADA

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axiosConfig';

export const useAuth = () => {
    const navigate = useNavigate();

    const user = useMemo(() => {
        try {
            const userDataString = sessionStorage.getItem('userData');
            if (userDataString && userDataString !== 'undefined') {
                const userData = JSON.parse(userDataString);
                
                // ADICIONA FLAGS BOOLEANAS PARA CADA CARGO
                // Isso torna as verificações nos componentes muito mais fáceis e legíveis.
                userData.isAdmin = userData.cargo === 'admin';
                userData.isRecepcao = userData.cargo === 'recepcao';
                userData.isMedico = userData.cargo === 'medico';
                
                return userData;
            }
        } catch (error) {
            console.error("Erro ao processar dados do usuário:", error);
            sessionStorage.clear();
            return null;
        }
        return null;
    }, []);

    const logout = async () => {
        try {
            await apiClient.post('/auth/logout/');
        } catch (error) {
            console.error("Erro no logout da API:", error);
        } finally {
            sessionStorage.clear();
            navigate('/login');
        }
    };

    return {
        user,
        logout,
    };
};