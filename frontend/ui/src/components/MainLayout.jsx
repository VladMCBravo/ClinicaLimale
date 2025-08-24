// src/components/MainLayout.jsx - VERSÃO FINAL COM SCROLL CORRETO

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
          // --- A CORREÇÃO ESTÁ AQUI ---
          // Em vez de 'hidden', usamos 'auto' para o eixo Y (vertical).
          // Isto fará com que uma barra de rolagem apareça DENTRO da área de conteúdo,
          // mas apenas se o conteúdo for maior que a tela.
          overflowY: 'auto',
        }}
      >
        {/* Adicionamos um contentor interno para gerir o padding,
            garantindo que o layout funcione em todas as páginas */}
        <Box sx={{ p: 2 }}>
            <Outlet />
        </Box>
      </Box>
    </Box>
  );
}