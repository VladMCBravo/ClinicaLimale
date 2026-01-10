// src/components/AdminRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const AdminRoute = () => {
  const userDataString = sessionStorage.getItem('userData');
  let isAdmin = false;

  if (userDataString) {
    try {
      const user = JSON.parse(userDataString);
      // Verifica se a flag isAdmin existe ou se o cargo é admin
      isAdmin = user.isAdmin === true || user.cargo === 'admin';
    } catch (e) {
      isAdmin = false;
    }
  }

  // Se for admin, mostra a página. Se não, joga para o painel principal (Recepção)
  return isAdmin ? <Outlet /> : <Navigate to="/painel" replace />;
};

export default AdminRoute;