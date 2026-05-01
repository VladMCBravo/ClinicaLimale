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
          flex: 1, // Substitui flexGrow e height calc
          minHeight: 0, // CRUCIAL para evitar transbordamento vertical
          display: 'flex', // Faz o container interno ser flex também
          flexDirection: 'column',
          backgroundColor: '#f0f2f5'
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}