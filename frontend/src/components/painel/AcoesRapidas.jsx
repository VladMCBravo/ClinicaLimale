import React from 'react';
import { Button, Paper, Typography, Box } from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import AddCardIcon from '@mui/icons-material/AddCard';

export default function AcoesRapidas() {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Ações Rápidas</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
        <Button variant="contained" startIcon={<PersonAddIcon />}>
          Novo Paciente
        </Button>
        <Button variant="outlined" startIcon={<EventAvailableIcon />}>
          Verificar Disponibilidade
        </Button>
         <Button variant="outlined" startIcon={<AddCardIcon />} color="secondary">
          Lançamento no Caixa
        </Button>
      </Box>
    </Paper>
  );
}