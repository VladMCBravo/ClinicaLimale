// src/pages/PainelMedico/PainelMedicoPage.jsx - VERSÃO FINAL ATUALIZADA

import React, { useState, useEffect,Suspense, lazy } from 'react'; // 1. Importe Suspense e lazy
import { Box, CircularProgress } from '@mui/material';
import { useLocation } from 'react-router-dom';
import FilaDeAtendimento from './FilaDeAtendimento';
import HistoricoConsultas from '../../components/prontuario/HistoricoConsultas'; // 2. Verifique este caminho

// 3. Importe o NOVO ProntuarioCompleto com lazy loading
const ProntuarioCompleto = lazy(() => import('../../components/prontuario/ProntuarioCompleto'));

export default function PainelMedicoPage() {
  const location = useLocation(); // Hook para ler os dados vindos da Agenda
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState(null);
  // A lógica de controle do modal (que você já tinha) é perfeita.
  const [modalHistoricoId, setModalHistoricoId] = useState(null);

// Efeito para detectar redirecionamento vindo da Agenda
  useEffect(() => {
      if (location.state && location.state.pacienteId) {
          setAgendamentoSelecionado({
              id: location.state.agendamentoId, // Pode ser null se for acesso direto, tratar no Prontuario
              paciente: location.state.pacienteId
          });
          
          // Limpa o state do histórico do navegador para evitar loop ao dar F5
          window.history.replaceState({}, document.title);
      }
  }, [location]);

  const handleOpenHistoricoModal = (evolucaoId) => setModalHistoricoId(evolucaoId);
  const handleCloseHistoricoModal = () => setModalHistoricoId(null);

  const handleSelecionarAgendamento = (agendamento) => {
    setModalHistoricoId(null); // Fecha modal ao trocar de paciente
    setAgendamentoSelecionado(agendamento);
  };
  

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', p: 2, gap: 2, backgroundColor: '#f4f6f8' }}>
      
      {/* Coluna da Fila e Histórico */}
      <Box sx={{ width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ flex: 1, minHeight: '200px' }}>
              <FilaDeAtendimento onPacienteSelect={handleSelecionarAgendamento} />
          </Box>
          {agendamentoSelecionado && (
              <Box sx={{ flex: 1, minHeight: '200px' }}>
                  <HistoricoConsultas 
                      key={`hist-${agendamentoSelecionado.paciente}`}
                      pacienteId={agendamentoSelecionado.paciente} 
                      onConsultaClick={handleOpenHistoricoModal}
                  />
              </Box>
          )}
      </Box>

      {/* Coluna do Prontuário */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Suspense fallback={<Box sx={{display:'flex', justifyContent:'center', mt:4}}><CircularProgress /></Box>}>
          <ProntuarioCompleto 
            key={agendamentoSelecionado ? agendamentoSelecionado.id : 'default'} 
            agendamento={agendamentoSelecionado} 
            modalHistoricoId={modalHistoricoId}
            onCloseHistoricoModal={handleCloseHistoricoModal}
          />
        </Suspense>
      </Box>
      
    </Box>
  );
}