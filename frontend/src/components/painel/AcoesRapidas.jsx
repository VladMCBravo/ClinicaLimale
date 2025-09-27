// src/components/painel/AcoesRapidas.jsx
import React from 'react';
import { Button, Paper, Typography, Box } from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import AddCardIcon from '@mui/icons-material/AddCard';

// O componente agora recebe props para cada ação específica
export default function AcoesRapidas({ onNovoPacienteClick, onVerificarClick, onCaixaClick }) {
  return (
    <Paper sx={{ p: 2 }} variant="outlined">
      <Typography variant="h6" gutterBottom>Ações Rápidas</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
        <Button 
            variant="contained" 
            startIcon={<PersonAddIcon />}
            onClick={onNovoPacienteClick} // <-- MUDANÇA: Chama a nova prop
            size="small"
        >
          Novo Paciente
        </Button>
        <Button 
            variant="outlined" 
            startIcon={<EventAvailableIcon />}
            onClick={onVerificarClick} // <-- CONECTANDO O BOTÃO
            size="small"
        >
          Verificar Disponibilidade
        </Button>
         <Button 
            variant="outlined" 
            startIcon={<AddCardIcon />} 
            color="secondary"
            // onClick={onCaixaClick} // Para uso futuro
            size="small"
        >
          Lançamento no Caixa
        </Button>
      </Box>
    </Paper>
  );
}