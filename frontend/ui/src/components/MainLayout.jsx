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
          // Permite que páginas com conteúdo longo tenham a sua própria barra de rolagem
          overflowY: 'auto', 
        }}
      >
        {/* Não colocamos padding aqui. Cada página será responsável pelo seu espaçamento. */}
        <Outlet />
      </Box>
    </Box>
  );
}