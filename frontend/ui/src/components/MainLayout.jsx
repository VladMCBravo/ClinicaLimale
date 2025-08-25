// src/components/MainLayout.jsx

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
          overflowY: 'auto',
          // --- ADICIONE ESTA LINHA ---
          // Define uma cor de fundo padrão para toda a área de conteúdo.
          // O '#f0f2f5' é um cinza claro comum em dashboards.
          backgroundColor: '#f0f2f5', 
        }}
      >
        <Box sx={{ p: 2 }}>
            <Outlet />
        </Box>
      </Box>
    </Box>
  );
}