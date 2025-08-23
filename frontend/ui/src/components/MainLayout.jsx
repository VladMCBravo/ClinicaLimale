// src/components/MainLayout.jsx - VERSÃO FINAL E CORRIGIDA
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { Box } from '@mui/material'; // 1. Importe o componente Box

export default function MainLayout() {
  return (
    // 2. O contentor principal agora é um flex container vertical
    // que ocupa 100% da altura da janela (100vh).
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Navbar />
      {/* 3. A área de conteúdo principal é instruída a crescer
          e ocupar todo o espaço restante. */}
      <Box 
        component="main" 
        className="content" // Pode manter a sua classe se tiver estilos associados
        sx={{ 
          flexGrow: 1, // Faz esta caixa expandir para preencher o espaço
          p: 2, // Adiciona um padding geral para a área de conteúdo
          height: 'calc(100vh - H_DA_NAVBAR)', // O cálculo será implícito pelo flexGrow
          overflow: 'hidden' // Garante que esta área também não crie scrollbars
        }}
      >
        <Outlet /> {/* Aqui é onde a sua AgendaPage será renderizada */}
      </Box>
    </Box>
  );
}