// src/components/AdminRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const AdminRoute = () => {
  const { user, loading } = useAuth();

  // 1. Evita redirecionar enquanto o login está sendo verificado
  if (loading) return null; 

  // 2. Proteção extra: se o user for nulo, joga pro login
  if (!user) return <Navigate to="/login" replace />;

  // 3. Verifica a flag do sistema
  const isAdmin = user.isAdmin || user.cargo === 'admin';

  // 4. Se for admin, libera. Se não for, joga pra raiz (o App.js resolve o destino final)
  return isAdmin ? <Outlet /> : <Navigate to="/" replace />;
};

export default AdminRoute;