import React from 'react';
import { Button, Paper, Typography, Box } from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import AddCardIcon from '@mui/icons-material/AddCard';

export default function AcoesRapidas({ onViewChange }) {
  return (
    <Paper sx={{ p: 2 }} variant="outlined">
      <Typography variant="h6" gutterBottom>Ações Rápidas</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
        <Button 
            variant="contained" 
            startIcon={<PersonAddIcon />}
            onClick={() => onViewChange('novoPaciente')}
            size="small" // <-- ADICIONADO
        >
          Novo Paciente
        </Button>
        <Button 
            variant="outlined" 
            startIcon={<EventAvailableIcon />}
            onClick={() => onViewChange('verificarDisponibilidade')}
            size="small" // <-- ADICIONADO
        >
          Verificar Disponibilidade
        </Button>
         <Button 
            variant="outlined" 
            startIcon={<AddCardIcon />} 
            color="secondary"
            onClick={() => onViewChange('lancamentoCaixa')}
            size="small" // <-- ADICIONADO
        >
          Lançamento no Caixa
        </Button>
      </Box>
    </Paper>
  );
}