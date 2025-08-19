// src/hooks/useAuth.js
import { useNavigate } from 'react-router-dom';

// --- SIMULAÇÃO DE DADOS DO USUÁRIO ---
// Alterne entre os dois usuários comentando/descomentando para ver a diferença

// Usuário 1: Administrador
const mockUser = {
    name: 'Dr. Administrador',
    isAdmin: true,
};

// Usuário 2: Usuário Comum
// const mockUser = {
//     name: 'Dra. Carla',
//     isAdmin: false,
// };
// -----------------------------------------

export const useAuth = () => {
    const navigate = useNavigate();

    // Esta função seria chamada para fazer o logout real
    const logout = () => {
        console.log('Usuário deslogado!');
        // Redireciona o usuário para a página de login
        navigate('/login');
    };

    return {
        user: mockUser,
        logout,
    };
};