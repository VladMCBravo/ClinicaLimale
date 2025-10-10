// src/pages/PainelMedico/PainelMedicoPage.jsx - VERSÃO SIMPLIFICADA

import React, { useState } from 'react';
import { Box } from '@mui/material';
import FilaDeAtendimento from './FilaDeAtendimento';
// Importe o novo componente centralizado
import ProntuarioCompleto from '../../components/prontuario/ProntuarioCompleto';

export default function PainelMedicoPage() {
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState(null);

  const handleSelecionarAgendamento = (agendamento) => {
    setAgendamentoSelecionado(agendamento);
  };

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', p: 2, gap: 2, backgroundColor: '#f4f6f8' }}>
      
      <Box sx={{ width: '350px', flexShrink: 0 }}>
        <FilaDeAtendimento onPacienteSelect={handleSelecionarAgendamento} />
      </Box>

      <Box sx={{ flexGrow: 1, minHeight: 0 }}>
        {agendamentoSelecionado ? (
          <ProntuarioCompleto pacienteId={agendamentoSelecionado.paciente.id} />
        ) : (
          /* Mensagem de boas-vindas quando nenhum paciente está selecionado */
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              Selecione um paciente para iniciar o atendimento
            </Typography>
          </Box>
        )}
      </Box>
      
    </Box>
  );
}