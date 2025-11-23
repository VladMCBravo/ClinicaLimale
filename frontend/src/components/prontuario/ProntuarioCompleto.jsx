// src/components/prontuario/ProntuarioCompleto.jsx

import React, { useState, Suspense, lazy, useEffect, useCallback } from 'react';
import { 
    Box, Tabs, Tab, CircularProgress, Paper, Typography, 
    IconButton, Tooltip 
} from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam'; 
import CloseIcon from '@mui/icons-material/Close'; 

import ModalHistoricoEvolucao from './ModalHistoricoEvolucao'; 
import apiClient from '../../api/axiosConfig'; 
import { useSnackbar } from '../../contexts/SnackbarContext'; 

// --- Imports das Abas ---
const PrescricoesTab = lazy(() => import('./PrescricoesTab')); 
const RelatoriosTab = lazy(() => import('./RelatoriosTab'));
const EvolucaoTab = lazy(() => import('./EvolucoesTab')); 
const DocumentosTab = lazy(() => import('./DocumentosTab')); 
const ExamesDicomTab = lazy(() => import('./ExamesDicomTab'));
// Importamos a nova estação que criamos
const EstacaoLaudo = lazy(() => import('../laudos/EstacaoLaudo'));

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      style={{ display: value !== index ? 'none' : 'block', height: '100%' }} 
      id={`prontuario-tabpanel-${index}`}
      aria-labelledby={`prontuario-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: { xs: 1, sm: 2 }, height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function ProntuarioCompleto({ agendamento, modalHistoricoId, onCloseHistoricoModal, onEvolucaoSalva }) {
  const [tabIndex, setTabIndex] = useState(0); 
  const { showSnackbar } = useSnackbar();
  const [telemedicinaVisivel, setTelemedicinaVisivel] = useState(false); 
  const [criandoSala, setCriandoSala] = useState(false);
  const [linkSalaAtual, setLinkSalaAtual] = useState(agendamento?.link_telemedicina || null); 
  const [consultaAtualId, setConsultaAtualId] = useState(null);

  const pacienteId = agendamento?.paciente;
  const especialidade = agendamento?.especialidade_nome || 'ClinicaGeral';

  // Lógica para decidir se mostra a aba de Laudo (Opcional)
  // Se o agendamento for do tipo "EXAME" ou a especialidade for "Radiologia", mostramos a aba 5 em destaque
  const isExame = agendamento?.tipo === 'EXAME' || ['Radiologia', 'Ultrassonografia'].includes(especialidade);

  useEffect(() => {
    setTelemedicinaVisivel(false);
    setLinkSalaAtual(agendamento?.link_telemedicina || null);
    setConsultaAtualId(null); 
  }, [pacienteId, agendamento?.link_telemedicina]);

  const handleChange = (event, newIndex) => { setTabIndex(newIndex); };
  
  const handleToggleTelemedicina = () => {
    if (telemedicinaVisivel) {
      setTelemedicinaVisivel(false);
      return;
    }
    if (agendamento?.modalidade !== 'Telemedicina') {
        showSnackbar('Este agendamento não é de telemedicina.', 'warning');
        return;
    }
    setTelemedicinaVisivel(true);
    if (linkSalaAtual) return; 

    setCriandoSala(true);
    apiClient.post(`/agendamentos/${agendamento.id}/criar-telemedicina/`)
      .then(response => {
        const roomUrl = response.data.roomUrl;
        showSnackbar('Sala criada com sucesso!', 'success');
        setLinkSalaAtual(roomUrl); 
      })
      .catch(err => {
        console.error("Erro ao criar sala:", err);
        showSnackbar('Erro ao criar a sala de telemedicina.', 'error');
        setTelemedicinaVisivel(false); 
      })
      .finally(() => {
        setCriandoSala(false);
      });
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
    <Paper elevation={2} sx={{ 
      width: '100%', 
      height: '100%',
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>

      <Box sx={{ 
          borderBottom: 1, 
          borderColor: 'divider', 
          flexShrink: 0,
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          pr: 1 
      }}>
        <Tabs value={tabIndex} onChange={handleChange} aria-label="Abas do Prontuário" variant="scrollable" scrollButtons="auto">
          <Tab label="Atendimento" id="prontuario-tab-0" /> 
          <Tab label="Prescrições" id="prontuario-tab-1" />
          <Tab label="Atestado/Relatório" id="prontuario-tab-2" />
          <Tab label="Documentos" id="prontuario-tab-3" />
          
          {/* RENOMEADO: Para deixar claro que é consulta de histórico */}
          <Tab label="Histórico de Imagens" id="prontuario-tab-4" /> 
          
          {/* NOVA ABA: Focada na ação de laudar agora */}
          {/* Destaque visual se for um exame */}
          <Tab 
            label="Realizar Laudo" 
            id="prontuario-tab-5" 
            style={{ color: isExame ? '#1976d2' : 'inherit', fontWeight: isExame ? 'bold' : 'normal' }}
          /> 
        </Tabs>
        
        <Tooltip title={telemedicinaVisivel ? "Fechar Painel de Vídeo" : "Iniciar Telemedicina"}>
          <span> 
            <IconButton 
              onClick={handleToggleTelemedicina} 
              color={telemedicinaVisivel ? "secondary" : "primary"}
              disabled={agendamento?.modalidade !== 'Telemedicina' || criandoSala}
              size="small"
            >
              {criandoSala ? <CircularProgress size={20} color="inherit" /> : <VideocamIcon />}
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}> 
        
        {telemedicinaVisivel && (
            <Box sx={{ 
                height: '40vh', 
                minHeight: '250px', 
                backgroundColor: 'grey.900', 
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                flexShrink: 0, 
                mb: 1 
            }}>
                <IconButton 
                    onClick={() => setTelemedicinaVisivel(false)} 
                    sx={{position: 'absolute', top: 5, right: 5, color: 'white', zIndex: 1}}
                    size="small"
                >
                    <CloseIcon fontSize="small"/>
                </IconButton>
                
                {criandoSala ? (
                    <CircularProgress color="inherit" />
                ) : linkSalaAtual ? (
                    <iframe 
                        src={linkSalaAtual} 
                        allow="camera; microphone; fullscreen; speaker; display-capture"
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        title="Sala de Telemedicina"
                    ></iframe>
                ) : (
                    <Typography>Erro ao carregar link da sala.</Typography>
                )}
            </Box>
        )}

        <Box sx={{ flexGrow: 1, overflowY: 'auto', position: 'relative' }}>
          <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
            
            <TabPanel value={tabIndex} index={0}>
              <EvolucaoTab 
                pacienteId={pacienteId} 
                especialidade={especialidade} 
                onEvolucoesSalva={handleEvolucaoSalvaChain}
              />
            </TabPanel>
            <TabPanel value={tabIndex} index={1}>
              <PrescricoesTab pacienteId={pacienteId} />
            </TabPanel>
            <TabPanel value={tabIndex} index={2}>
              <RelatoriosTab 
                pacienteId={pacienteId} 
                especialidade={especialidade} 
                consultaAtualId={consultaAtualId}
              />
            </TabPanel>
            <TabPanel value={tabIndex} index={3}>
              <DocumentosTab pacienteId={pacienteId} />
            </TabPanel>
            
            {/* ABA 4: Apenas Visualização (Lista de exames anteriores) */}
            <TabPanel value={tabIndex} index={4}>
              <ExamesDicomTab pacienteId={pacienteId} />
            </TabPanel>
            
            {/* ABA 5: Estação de Trabalho (Split Screen: Imagem + Editor) */}
            <TabPanel value={tabIndex} index={5}>
                <EstacaoLaudo 
                    pacienteId={pacienteId}
                    agendamento={agendamento}
                />
            </TabPanel>

          </Suspense>
        </Box>
      </Box>

      {modalHistoricoId && (
        <ModalHistoricoEvolucao 
          pacienteId={pacienteId} 
          evolucaoId={modalHistoricoId}
          onClose={onCloseHistoricoModal}
        />
      )}
    </Paper>
  );
}