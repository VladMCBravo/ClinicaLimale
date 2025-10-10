// src/pages/PainelMedico/PainelMedicoPage.jsx

import React, { useState } from 'react';
import { Box } from '@mui/material';
import FilaDeAtendimento from './FilaDeAtendimento'; // Vamos criar este
import ProntuarioContainer from './ProntuarioContainer'; // E este

export default function PainelMedicoPage() {
  // Este estado é o "cérebro" da página. Guarda o ID do paciente ativo.
  const [pacienteSelecionado, setPacienteSelecionado] = useState(null);

  // Esta função será chamada pelo componente da fila quando um paciente for clicado.
  const handleSelecionarPaciente = (agendamento) => {
    setPacienteSelecionado(agendamento);
  };

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', p: 2, gap: 2, backgroundColor: '#f4f6f8' }}>
      
      {/* Coluna da Esquerda: A lista de pacientes do dia */}
      <Box sx={{ width: '350px', flexShrink: 0 }}>
        <FilaDeAtendimento onPacienteSelect={handleSelecionarPaciente} />
      </Box>

      {/* Coluna da Direita: Onde o prontuário aparecerá */}
      <Box sx={{ flexGrow: 1, minHeight: 0 }}>
        <ProntuarioContainer agendamentoSelecionado={pacienteSelecionado} />
      </Box>
      
    </Box>
  );
}