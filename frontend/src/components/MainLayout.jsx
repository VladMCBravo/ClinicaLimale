// src/components/MainLayout.jsx - VERSÃO FINAL
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { Box } from '@mui/material';

export default function MainLayout() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Navbar />
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1,
          // Permite que páginas com conteúdo longo tenham a sua própria barra de rolagem
          overflowY: 'auto', 
          backgroundColor: '#f0f2f5'
        }}
      >
        {/* As páginas filhas agora controlam o seu próprio padding */}
        <Outlet />
      </Box>
    </Box>
  );
}