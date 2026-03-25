// src/hooks/useAuth.js

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
    // Adicionado: Estado de loading para as Rotas Protegidas usarem
    const [loading, setLoading] = useState(false); 

    const memoizedUser = useMemo(() => user, [user]);

    const login = useCallback(async (username, password) => {
        setLoading(true); // Inicia o loading
        try {
            const response = await apiClient.post('/auth/login/', { username, password });
            const { token, user: userData } = response.data;
            
            if (token && userData) {
                sessionStorage.setItem('authToken', token);
                sessionStorage.setItem('userData', JSON.stringify(userData));
                
                const loggedInUser = getUserFromStorage();
                setUser(loggedInUser);

                // O controlador de tráfego no App.js vai resolver o destino final!
                navigate('/'); 
                
                return true; 
            }
            return false;
        } catch (error) {
            console.error("Erro no login:", error);
            return false;
        } finally {
            setLoading(false); // Finaliza o loading
        }
    }, [navigate]);

    const logout = useCallback(async () => {
        setLoading(true);
        try {
            await apiClient.post('/auth/logout/');
        } catch (error) {
            console.error("Erro no logout da API:", error);
        } finally {
            sessionStorage.clear();
            localStorage.removeItem('laudos_rascunho_auto_save');
            setUser(null);
            navigate('/login');
            setLoading(false);
        }
    }, [navigate]);

    return {
        user: memoizedUser,
        loading, // Adicionado ao retorno
        login,
        logout,
    };
};