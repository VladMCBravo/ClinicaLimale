// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  // 1. Verifica se o token de autenticação existe no sessionStorage
  const token = sessionStorage.getItem('authToken');

  // 2. Se o token existir, renderiza o conteúdo da página (usando <Outlet />).
  //    Se não existir, redireciona para a página de login.
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;