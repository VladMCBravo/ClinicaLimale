// src/hooks/useAuth.js
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axiosConfig'; // Importamos para o logout

export const useAuth = () => {
    const navigate = useNavigate();

    // 1. LÊ OS DADOS DO USUÁRIO DO SESSIONSTORAGE
    const userDataString = sessionStorage.getItem('userData');
    const user = userDataString ? JSON.parse(userDataString) : null;

    // Adicionamos uma verificação extra para o isAdmin para a Navbar
    if (user) {
        user.isAdmin = user.cargo === 'admin';
    }

    const logout = async () => {
        try {
            // Tenta fazer o logout na API, mas continua mesmo se falhar
            await apiClient.post('/auth/logout/');
        } catch (error) {
            console.error("Erro no logout da API, mas prosseguindo com logout local:", error);
        } finally {
            // 2. LIMPA TODOS OS DADOS DA SESSÃO
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('userData');
            // Redireciona para a página de login
            navigate('/login');
            console.log('Usuário deslogado!');
        }
    };

    return {
        user, // Retorna o objeto do usuário completo (ou null)
        logout,
    };
};