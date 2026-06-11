// src/components/prontuario/ProntuarioCompleto.jsx

import React, { useState, Suspense, lazy, useEffect, useCallback } from 'react';
import { 
    Box, CircularProgress, Paper, Typography, 
    IconButton, Tooltip, Divider 
} from '@mui/material';

// Ícones para a nova Barra Lateral Direita
import VideocamIcon from '@mui/icons-material/Videocam'; 
import CloseIcon from '@mui/icons-material/Close'; 
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy'; // Prescrições
import DescriptionIcon from '@mui/icons-material/Description'; // Atestado/Relatório
import FolderIcon from '@mui/icons-material/Folder'; // Documentos
import ImageIcon from '@mui/icons-material/Image'; // Imagens
import AssignmentIcon from '@mui/icons-material/Assignment'; // Laudos
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'; // <-- NOVO: Ícone de PDF

import ModalHistoricoEvolucao from './ModalHistoricoEvolucao';
import HistoricoLaudosModal from '../laudos/HistoricoLaudosModal'; // <-- NOVO: Importa o Modal

import apiClient from '../../api/axiosConfig'; 
import { useSnackbar } from '../../contexts/SnackbarContext'; 

// --- Imports das Abas (Agora renderizadas no painel lateral direito) ---
const PrescricoesTab = lazy(() => import('./PrescricoesTab')); 
const RelatoriosTab = lazy(() => import('./RelatoriosTab'));
const EvolucaoTab = lazy(() => import('./EvolucoesTab')); 
const DocumentosTab = lazy(() => import('./DocumentosTab')); 
const ExamesDicomTab = lazy(() => import('./ExamesDicomTab'));
const LaudosTab = lazy(() => import('../laudos/LaudosTab'));
const TelemedicinaTab = lazy(() => import('./TelemedicinaTab'));

export default function ProntuarioCompleto({ agendamento, modalHistoricoId, onCloseHistoricoModal, onEvolucaoSalva }) {
  const [ferramentaGlobal, setFerramentaGlobal] = useState(null); 
  const [modalHistoricoLaudosOpen, setModalHistoricoLaudosOpen] = useState(false);
  const [consultaAtualId, setConsultaAtualId] = useState(null);

  const pacienteId = agendamento?.paciente;
  const especialidade = agendamento?.especialidade_nome || 'ClinicaGeral';
  const isExame = agendamento?.tipo === 'EXAME' || ['Radiologia', 'Ultrassonografia'].includes(especialidade);

  // Auto-abrir Laudos se for exame
  useEffect(() => { 
      if (isExame) setFerramentaGlobal('laudos'); 
  }, [isExame]);

  useEffect(() => {
    setConsultaAtualId(null); 
    setFerramentaGlobal(null); // Fecha o painel lateral ao trocar de paciente
  }, [pacienteId, agendamento?.link_telemedicina]);

  const toggleFerramenta = (ferramenta) => {
      setFerramentaGlobal(prev => prev === ferramenta ? null : ferramenta);
  };
  
  
  const handleEvolucaoSalvaChain = useCallback((idDaEvolucao) => {
      console.log(`[ProntuarioCompleto] Recebido ID da evolução: ${idDaEvolucao}`);
      if (onEvolucaoSalva) {
          onEvolucaoSalva(); 
      }
      setConsultaAtualId(idDaEvolucao); 
  }, [onEvolucaoSalva]); 

  if (!agendamento) {
    return (
      <Paper sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Selecione um paciente na fila para iniciar o atendimento
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ width: '100%', height: '100%', display: 'flex', overflow: 'hidden' }}>

      {/* ÁREA DE TRABALHO PRINCIPAL (Centro e Direita) */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}> 
        
        {/* COLUNAS DINÂMICAS */}
        <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
          
          {/* COLUNA CENTRAL: Formulário da Especialidade (Sempre visível) */}
          <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 0, transition: 'width 0.3s' }}>
              <EvolucaoTab 
                pacienteId={pacienteId} 
                especialidade={especialidade} 
                onEvolucoesSalva={handleEvolucaoSalvaChain}
              />
          </Box>

          {/* DIVISOR: Aparece apenas se uma ferramenta global estiver aberta */}
          {ferramentaGlobal && <Divider orientation="vertical" flexItem />}

          {/* COLUNA DIREITA (APOIO) */}
          {ferramentaGlobal && (
             <Box sx={{ width: { xs: '100%', md: '45%' }, overflowY: 'auto', bgcolor: '#fafafa', p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" color="primary">
                        {ferramentaGlobal === 'prescricoes' && 'Prescrições Médicas'}
                        {ferramentaGlobal === 'relatorios' && 'Atestados e Relatórios'}
                        {ferramentaGlobal === 'documentos' && 'Documentos do Paciente'}
                        {ferramentaGlobal === 'imagens' && 'Histórico de Imagens'}
                        {ferramentaGlobal === 'laudos' && 'Laudos e Resultados'}
                        {ferramentaGlobal === 'telemedicina' && 'Telemedicina'}
                    </Typography>
                    <IconButton size="small" onClick={() => setFerramentaGlobal(null)}><CloseIcon fontSize="small" /></IconButton>
                </Box>
                <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
                  {ferramentaGlobal === 'prescricoes' && <PrescricoesTab pacienteId={pacienteId} />}
                  {ferramentaGlobal === 'relatorios' && <RelatoriosTab pacienteId={pacienteId} especialidade={especialidade} consultaAtualId={consultaAtualId} />}
                  {ferramentaGlobal === 'documentos' && <DocumentosTab pacienteId={pacienteId} />}
                  {ferramentaGlobal === 'imagens' && <ExamesDicomTab pacienteId={pacienteId} />}
                  {ferramentaGlobal === 'laudos' && <LaudosTab pacienteId={pacienteId} />}
                  {ferramentaGlobal === 'telemedicina' && <TelemedicinaTab agendamento={agendamento} />}
                </Suspense>
             </Box>
          )}

        </Box>
      </Box>

      {/* BARRA DE FERRAMENTAS VERTICAL */}
      <Box sx={{ width: '60px', borderLeft: 1, borderColor: 'divider', bgcolor: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2, gap: 2, flexShrink: 0, zIndex: 10 }}>
          <Tooltip title="Prescrições" placement="left">
              <IconButton color={ferramentaGlobal === 'prescricoes' ? 'primary' : 'default'} onClick={() => toggleFerramenta('prescricoes')}>
                  <LocalPharmacyIcon />
              </IconButton>
          </Tooltip>
          
          <Tooltip title="Atestado/Relatório" placement="left">
              <IconButton color={ferramentaGlobal === 'relatorios' ? 'primary' : 'default'} onClick={() => toggleFerramenta('relatorios')}>
                  <DescriptionIcon />
              </IconButton>
          </Tooltip>

          <Tooltip title="Documentos" placement="left">
              <IconButton color={ferramentaGlobal === 'documentos' ? 'primary' : 'default'} onClick={() => toggleFerramenta('documentos')}>
                  <FolderIcon />
              </IconButton>
          </Tooltip>

          <Tooltip title="Histórico de Imagens" placement="left">
              <IconButton color={ferramentaGlobal === 'imagens' ? 'primary' : 'default'} onClick={() => toggleFerramenta('imagens')}>
                  <ImageIcon />
              </IconButton>
          </Tooltip>

          <Tooltip title="Laudos" placement="left">
              <IconButton color={ferramentaGlobal === 'laudos' ? 'primary' : 'default'} onClick={() => toggleFerramenta('laudos')}>
                  <AssignmentIcon color={isExame && !ferramentaGlobal ? 'info' : 'inherit'} />
              </IconButton>
          </Tooltip>

          <Tooltip title="Baixar Laudos Anteriores" placement="left">
              <IconButton onClick={() => setModalHistoricoLaudosOpen(true)}>
                  <PictureAsPdfIcon color="error" />
              </IconButton>
          </Tooltip>

          <Divider flexItem sx={{ my: 1 }} />

          {/* BOTÃO DE TELEMEDICINA - TRAVA REMOVIDA PARA GARANTIR FUNCIONAMENTO */}
          <Tooltip title="Telemedicina" placement="left">
              <IconButton 
                color={ferramentaGlobal === 'telemedicina' ? 'primary' : 'default'} 
                onClick={() => toggleFerramenta('telemedicina')} 
              >
                  <VideocamIcon />
              </IconButton>
          </Tooltip>
      </Box>

      {/* Modais */}
      {modalHistoricoId && (
        <ModalHistoricoEvolucao 
          pacienteId={pacienteId} 
          evolucaoId={modalHistoricoId}
          onClose={onCloseHistoricoModal}
        />
      )}
      <HistoricoLaudosModal 
          open={modalHistoricoLaudosOpen}
          onClose={() => setModalHistoricoLaudosOpen(false)}
          pacienteId={pacienteId}
          pacienteNome={agendamento?.paciente_nome || 'Paciente'}
      />

    </Paper>
  );
}