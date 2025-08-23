// src/components/MainLayout.jsx - VERSÃO FINAL E CORRIGIDA
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { Box } from '@mui/material';

export default function MainLayout() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Navbar />
      <Box 
        component="main" 
        className="content"
        sx={{ 
          flexGrow: 1,
          overflow: 'hidden',
          // --- A CORREÇÃO ESTÁ AQUI: REMOVEMOS O PADDING ---
          // p: 2, // Esta linha foi removida.
          // Agora o contentor principal apenas gere a estrutura.
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}