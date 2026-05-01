// src/components/MainLayout.jsx - VERSÃO FINAL
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { Box } from '@mui/material';

export default function MainLayout() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* O Navbar agora fica preso no topo */}
      <Navbar />
      
      {/* Área Principal (Outlet) */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1,
          // MUDANÇA CRUCIAL AQUI: 
          // Retirado o overflowY: 'auto' daqui.
          // Agora o Layout Pai é "rígido". As barras de rolagem
          // devem nascer DENTRO das páginas (como em PacientesPage e LaudosPage)
          overflow: 'hidden', 
          backgroundColor: '#f0f2f5',
          height: 'calc(100vh - 64px)' // Altura exata sobrando abaixo da Navbar
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}