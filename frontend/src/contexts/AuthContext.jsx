// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axiosConfig';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

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

export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(getUserFromStorage());
    const [loading, setLoading] = useState(false);
    // Mantemos o token também no estado do Context, assim componentes
    // como o Navbar que fazem `const { token } = useAuth()` também funcionam.
    const [token, setToken] = useState(sessionStorage.getItem('authToken'));

    const login = useCallback(async (username, password) => {
        setLoading(true);
        try {
            const response = await apiClient.post('/auth/login/', { username, password });
            const { token: authToken, user: userData } = response.data;

            if (authToken && userData) {
                sessionStorage.setItem('authToken', authToken);
                sessionStorage.setItem('userData', JSON.stringify(userData));

                setUser(getUserFromStorage());
                setToken(authToken);

                navigate('/');
                return true;
            }
            return false;
        } catch (error) {
            console.error("Erro no login:", error);
            return false;
        } finally {
            setLoading(false);
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
            setToken(null);
            navigate('/login');
            setLoading(false);
        }
    }, [navigate]);

    const value = useMemo(
        () => ({ user, token, loading, login, logout }),
        [user, token, loading, login, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
