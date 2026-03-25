// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; // Importe o seu contexto

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  // 1. Segura a renderização enquanto o AuthContext valida o token na API
  if (loading) return null; // (Você pode trocar por um <LoadingSpinner /> se preferir)

  // 2. Só libera a rota se o objeto `user` existir e estiver validado
  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;