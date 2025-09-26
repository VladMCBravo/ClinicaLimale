// src/hooks/useAuth.js - VERSÃO MELHORADA COM LÓGICA DE LOGIN

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
    // Usamos useState para que as mudanças no usuário sejam reativas em toda a aplicação
    const [user, setUser] = useState(getUserFromStorage());

    // O useMemo agora depende do estado 'user'
    const memoizedUser = useMemo(() => user, [user]);

    // LÓGICA DE LOGIN AGORA VIVE AQUI
    const login = useCallback(async (username, password) => {
        try {
            const response = await apiClient.post('/auth/login/', { username, password });
            const { token, user: userData } = response.data;

            if (token && userData) {
                sessionStorage.setItem('authToken', token);
                sessionStorage.setItem('userData', JSON.stringify(userData));
                
                // Atualiza o estado interno do hook
                setUser(getUserFromStorage());

                // Navega para o painel
                navigate('/painel');
                return true; // Retorna sucesso
            }
            return false; // Retorna falha se a resposta for incompleta
        } catch (error) {
            console.error("Erro no login:", error);
            return false; // Retorna falha
        }
    }, [navigate]);


    const logout = useCallback(async () => {
        try {
            await apiClient.post('/auth/logout/');
        } catch (error) {
            console.error("Erro no logout da API:", error);
        } finally {
            sessionStorage.clear();
            setUser(null); // Limpa o estado
            navigate('/login');
        }
    }, [navigate]);

    return {
        user: memoizedUser,
        login,
        logout,
    };
};