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
          // Garante que o contentor tenha uma altura de referência
          position: 'relative', 
        }}
      >
        {/* Este Box interno gere o scroll e o padding */}
        <Box sx={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          overflowY: 'auto',
          p: 2, // Padding aplicado aqui
        }}>
            <Outlet />
        </Box>
      </Box>
    </Box>
  );
}