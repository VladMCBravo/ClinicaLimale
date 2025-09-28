// src/components/painel/AcoesRapidas.jsx
import React from 'react'; // É importante ter o import do React
import { Button, Paper, Typography, Box } from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import AddCardIcon from '@mui/icons-material/AddCard';

// 1. Defina o componente como uma função normal (sem o export default aqui)
function AcoesRapidas({ onNovoPacienteClick, onVerificarClick }) {
  console.log("Renderizando AcoesRapidas..."); // Você pode usar isso para ver no console quando ele renderiza
  return (
    <Paper sx={{ p: 2 }} variant="outlined">
      <Typography variant="h6" gutterBottom>Ações Rápidas</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
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
            startIcon={<EventAvailableIcon />}
            onClick={onVerificarClick}
            size="small"
        >
          Verificar Disponibilidade
        </Button>
         <Button 
            variant="outlined" 
            startIcon={<AddCardIcon />} 
            onClick={onCaixaClick} // <-- CONECTANDO O BOTÃO
            color="secondary"
            size="small"
        >
          Lançamento no Caixa
        </Button>
      </Box>
    </Paper>
  );
}

// 2. Exporte a versão 'memorizada' do seu componente
export default React.memo(AcoesRapidas);