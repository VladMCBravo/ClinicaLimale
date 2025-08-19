// src/components/ProtectedRoute.jsx

import React from 'react';
import { Navigate } from 'react-router-dom';

// Este componente verifica se o usuário está autenticado.
// Se estiver, ele renderiza a página solicitada (children).
// Se não, ele redireciona para a página de login.
export default function ProtectedRoute({ children }) {
  const token = sessionStorage.getItem('authToken');

  if (!token) {
    // Usuário não autenticado, redireciona para /login
    return <Navigate to="/login" />;
  }

  // Usuário autenticado, renderiza o componente filho
  return children;
}