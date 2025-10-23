// src/pages/PainelMedico/PainelMedicoPage.jsx - VERSÃO FINAL ATUALIZADA

import React, { useState, Suspense, lazy } from 'react'; // 1. Importe Suspense e lazy
import { Box, Typography, CircularProgress } from '@mui/material';
import FilaDeAtendimento from './FilaDeAtendimento';
import HistoricoConsultas from '../../components/prontuario/HistoricoConsultas'; // 2. Verifique este caminho

// 3. Importe o NOVO ProntuarioCompleto com lazy loading
const ProntuarioCompleto = lazy(() => import('../../components/prontuario/ProntuarioCompleto'));

export default function PainelMedicoPage() {
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState(null);
  
  // A lógica de controle do modal (que você já tinha) é perfeita.
  const [modalHistoricoId, setModalHistoricoId] = useState(null);
  const handleOpenHistoricoModal = (evolucaoId) => setModalHistoricoId(evolucaoId);
  const handleCloseHistoricoModal = () => setModalHistoricoId(null);

  const handleSelecionarAgendamento = (agendamento) => {
    setModalHistoricoId(null); // Fecha modal ao trocar de paciente
    setAgendamentoSelecionado(agendamento);
  };

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', p: 2, gap: 2, backgroundColor: '#f4f6f8' }}>
      
      {/* --- COLUNA DA ESQUERDA (Sem alteração estrutural) --- */}
      <Box sx={{ width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ flex: 1, minHeight: '200px' }}>
              <FilaDeAtendimento onPacienteSelect={handleSelecionarAgendamento} />
          </Box>
          {agendamentoSelecionado && (
              <Box sx={{ flex: 1, minHeight: '200px' }}>
                  {/* 4. Renderiza o HistoricoConsultas atualizado */}
                  <HistoricoConsultas 
                      key={`hist-${agendamentoSelecionado.paciente}`}
                      pacienteId={agendamentoSelecionado.paciente} 
                      // 5. Passa a função para abrir o modal
                      onConsultaClick={handleOpenHistoricoModal}
                  />
              </Box>
          )}
      </Box>

      {/* --- COLUNA DA DIREITA (ÁREA DE ATENDIMENTO) --- */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {/* 6. Renderiza o NOVO ProntuarioCompleto (com as abas) */}
        <Suspense fallback={<CircularProgress />}>
          <ProntuarioCompleto 
            // A 'key' garante que o componente resete ao trocar de paciente
            key={agendamentoSelecionado ? agendamentoSelecionado.id : 'sem-paciente'} 
            agendamento={agendamentoSelecionado} 
            
            // 7. Passa o estado e a função de fechar para o Prontuário
            modalHistoricoId={modalHistoricoId}
            onCloseHistoricoModal={handleCloseHistoricoModal}
          />
        </Suspense>
      </Box>
      
    </Box>
  );
}