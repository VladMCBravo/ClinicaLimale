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
        sx={{ 
          flexGrow: 1,
          overflowY: 'auto', // Permite scroll apenas nas páginas que precisam
          backgroundColor: '#f0f2f5'
        }}
      >
        <Outlet /> {/* As páginas filhas agora controlam o seu próprio padding */}
      </Box>
    </Box>
  );
}