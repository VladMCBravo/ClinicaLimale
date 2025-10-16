// src/hooks/useAuth.js - VERSÃO CORRIGIDA COM REDIRECIONAMENTO DINÂMICO

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axiosConfig';

const getUserFromStorage = () => {
    try {
        const userDataString = sessionStorage.getItem('userData');
        if (userDataString && userDataString !== 'undefined') {
            const userData = JSON.parse(userDataString);
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
};

export const useAuth = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(getUserFromStorage());

    const memoizedUser = useMemo(() => user, [user]);

    const login = useCallback(async (username, password) => {
        try {
            const response = await apiClient.post('/auth/login/', { username, password });
            const { token, user: userData } = response.data;

            if (token && userData) {
                sessionStorage.setItem('authToken', token);
                sessionStorage.setItem('userData', JSON.stringify(userData));
                
                // Atualiza o estado interno do hook para refletir o usuário logado
                const loggedInUser = getUserFromStorage();
                setUser(loggedInUser);

                // --- CORREÇÃO APLICADA AQUI ---
                // Verifica o cargo do usuário para decidir para onde navegar
                if (loggedInUser.isMedico) {
                    navigate('/'); // Navega para o Painel do Médico
                } else {
                    navigate('/painel'); // Navega para o Painel da Recepção/Admin
                }
                // ▼▼▼ ADICIONE ESTA LINHA ▼▼▼
                window.location.reload(); // Força o recarregamento da página
                
                return true; // Retorna sucesso
            }
            return false;
        } catch (error) {
            console.error("Erro no login:", error);
            return false;
        }
    }, [navigate]);


    const logout = useCallback(async () => {
        try {
            await apiClient.post('/auth/logout/');
        } catch (error) {
            console.error("Erro no logout da API:", error);
        } finally {
            sessionStorage.clear();
            setUser(null);
            navigate('/login');
        }
    }, [navigate]);

    return {
        user: memoizedUser,
        login,
        logout,
    };
};