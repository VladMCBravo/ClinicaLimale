// src/pages/AgendaPage.jsx
import React from 'react';
import AgendaPrincipal from '../components/agenda/AgendaPrincipal';
import { Box } from '@mui/material';

export default function AgendaPage() {
  // Esta página agora apenas renderiza o componente principal da agenda
  // sem nenhum filtro, mostrando a agenda completa.
  return (
    <Box sx={{ p: 2, height: 'calc(100vh - 64px)' }}>
        <AgendaPrincipal />
    </Box>
  );
}