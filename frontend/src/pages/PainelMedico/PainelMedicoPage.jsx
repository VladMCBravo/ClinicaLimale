// src/pages/PainelMedico/PainelMedicoPage.jsx - VERSÃO FINAL

import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import FilaDeAtendimento from './FilaDeAtendimento';
import ProntuarioCompleto from '../../components/prontuario/ProntuarioCompleto';
import HistoricoConsultas from '../../components/prontuario/HistoricoConsultas';

export default function PainelMedicoPage() {
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState(null);
  
  // 1. O estado e as funções de controle do modal agora vivem aqui.
  const [modalHistoricoId, setModalHistoricoId] = useState(null);
  const handleOpenHistoricoModal = (evolucaoId) => setModalHistoricoId(evolucaoId);
  const handleCloseHistoricoModal = () => setModalHistoricoId(null);

  const handleSelecionarAgendamento = (agendamento) => {
    // Ao selecionar um novo paciente, fecha qualquer modal de histórico que esteja aberto
    setModalHistoricoId(null); 
    setAgendamentoSelecionado(agendamento);
  };

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', p: 2, gap: 2, backgroundColor: '#f4f6f8' }}>
      
      {/* --- COLUNA DA ESQUERDA --- */}
      <Box sx={{ width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ flex: 1, minHeight: '200px' }}>
              <FilaDeAtendimento onPacienteSelect={handleSelecionarAgendamento} />
          </Box>
          {agendamentoSelecionado && (
              <Box sx={{ flex: 1, minHeight: '200px' }}>
                  {/* 2. Passa a função para abrir o modal */}
                  <HistoricoConsultas 
                      key={`hist-${agendamentoSelecionado.paciente}`} // Adiciona key para recarregar
                      pacienteId={agendamentoSelecionado.paciente} 
                      onConsultaClick={handleOpenHistoricoModal}
                  />
              </Box>
          )}
      </Box>

      {/* --- COLUNA DA DIREITA --- */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {agendamentoSelecionado ? (
          <ProntuarioCompleto 
            // 3. A 'key' é ESSENCIAL para limpar a anamnese ao trocar de paciente.
            key={agendamentoSelecionado.id} 
            agendamento={agendamentoSelecionado} 
            
            // 4. Passa o estado e a função de fechar para o Prontuário
            modalHistoricoId={modalHistoricoId}
            onCloseHistoricoModal={handleCloseHistoricoModal}
          />
        ) : (
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