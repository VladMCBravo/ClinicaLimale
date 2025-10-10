// src/pages/PainelMedico/PainelMedicoPage.jsx - VERSÃO CORRIGIDA

import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import FilaDeAtendimento from './FilaDeAtendimento';
import ProntuarioCompleto from '../../components/prontuario/ProntuarioCompleto';
import HistoricoConsultas from '../../components/prontuario/HistoricoConsultas';

export default function PainelMedicoPage() {
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState(null);

  const handleSelecionarAgendamento = (agendamento) => {
    setAgendamentoSelecionado(agendamento);
  };

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', p: 2, gap: 2, backgroundColor: '#f4f6f8' }}>
      
      {/* --- COLUNA DA ESQUERDA (IMPLEMENTAÇÃO CORRETA) --- */}
      <Box sx={{ width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ flex: 1, minHeight: '200px' }}>
              <FilaDeAtendimento onPacienteSelect={handleSelecionarAgendamento} />
          </Box>
          {agendamentoSelecionado && (
              <Box sx={{ flex: 1, minHeight: '200px' }}>
                  <HistoricoConsultas pacienteId={agendamentoSelecionado.paciente} />
              </Box>
          )}
      </Box>

      {/* --- COLUNA DA DIREITA (LÓGICA RE-ADICIONADA) --- */}
      <Box sx={{ flexGrow: 1, minHeight: 0 }}>
        {agendamentoSelecionado ? (
          // Se um paciente está selecionado, mostra o prontuário
          <ProntuarioCompleto agendamento={agendamentoSelecionado} />
        ) : (
          // Se não, mostra a mensagem de boas-vindas
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