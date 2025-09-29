// src/components/painel/ControlesAgenda.jsx
import React from 'react';
import { Paper, Box, Button, Divider } from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AddCardIcon from '@mui/icons-material/AddCard';
// Reutilizamos o componente de filtros que já existe
import FiltrosAgenda from './FiltrosAgenda'; 

// Este componente recebe todas as props que os dois antigos recebiam
function ControlesAgenda({ onNovoPacienteClick, onCaixaClick, onFiltroChange }) {
  return (
    <Paper sx={{ p: 2 }} variant="outlined">
      {/* Botões de Ação Rápida (sem título) */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Button 
            variant="contained" 
            startIcon={<PersonAddIcon />}
            onClick={onNovoPacienteClick}
            size="small"
        >
          Novo Paciente
        </Button>
         <Button 
            variant="outlined" 
            startIcon={<AddCardIcon />} 
            color="secondary"
            onClick={onCaixaClick}
            size="small"
        >
          Lançamento no Caixa
        </Button>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Filtros da Agenda */}
      <FiltrosAgenda onFiltroChange={onFiltroChange} />
    </Paper>
  );
}

export default React.memo(ControlesAgenda);