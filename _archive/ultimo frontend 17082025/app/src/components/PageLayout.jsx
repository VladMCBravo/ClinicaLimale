import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export default function PageLayout({ title, children }) {
  return (
    // O container principal ocupa 100% da altura do seu pai (a área de conteúdo do MainLayout)
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* O Título tem um tamanho fixo e não encolhe */}
      <Typography variant="h4" component="h1" sx={{ mb: 2, flexShrink: 0 }}>
        {title}
      </Typography>
      
      {/* O Paper (quadro branco) agora também é um container flex e cresce para preencher o resto do espaço */}
      <Paper sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </Paper>
    </Box>
  );
}