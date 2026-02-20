// src/components/AdminRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; // Usar o seu hook

const AdminRoute = () => {
  const { user, loading } = useAuth(); // Puxa o usuário do contexto

  if (loading) return null; // Evita redirecionar enquanto o login está sendo verificado

  // Verifica a flag que você já usa no resto do sistema
  const isAdmin = user?.isAdmin || user?.cargo === 'admin';

  return isAdmin ? <Outlet /> : <Navigate to="/painel" replace />;
};

export default AdminRoute;