// src/hooks/useAuth.js - VERSÃO CORRIGIDA COM REDIRECIONAMENTO DINÂMICO

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axiosConfig';

const getUserFromStorage = () => {
    try {
        const userDataString = sessionStorage.getItem('userData');
        console.log('[DEBUG] Dados do usuário no sessionStorage:', userDataString); // DEBUG
        if (userDataString && userDataString !== 'undefined') {
            const userData = JSON.parse(userDataString);
            userData.isAdmin = userData.cargo === 'admin';
            userData.isRecepcao = userData.cargo === 'recepcao';
            userData.isMedico = userData.cargo === 'medico';
            console.log('[DEBUG] Objeto do usuário processado:', userData); // DEBUG
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
            console.log('[DEBUG] Tentando fazer login com o usuário:', username); // DEBUG
            const response = await apiClient.post('/auth/login/', { username, password });
            const { token, user: userData } = response.data;
            console.log('[DEBUG] Resposta da API de login:', response.data); // DEBUG
            
            if (token && userData) {
                sessionStorage.setItem('authToken', token);
                sessionStorage.setItem('userData', JSON.stringify(userData));
                
                // Atualiza o estado interno do hook para refletir o usuário logado
                const loggedInUser = getUserFromStorage();
                setUser(loggedInUser);

                // --- CORREÇÃO APLICADA AQUI ---
                // Verifica o cargo do usuário para decidir para onde navegar
                if (loggedInUser.isMedico) {
                    console.log('[DEBUG] Usuário é Médico. Redirecionando para /'); // DEBUG
                    navigate('/'); // Navega para o Painel do Médico
                } else {
                    console.log(`[DEBUG] Usuário é ${loggedInUser.cargo}. Redirecionando para /painel`); // DEBUG
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