// src/components/prontuario/ProntuarioCompleto.jsx - VERSÃO FINAL (VISÃO DO USUÁRIO)

import React, { useState, Suspense, lazy, useEffect } from 'react';
import { 
    Box, Tabs, Tab, CircularProgress, Paper, Typography, 
    IconButton, Tooltip // 1. Imports para o botão
} from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam'; // Ícone Telemedicina
import ModalHistoricoEvolucao from './ModalHistoricoEvolucao';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';

// --- Imports dos Componentes das Abas ---
const PrescricoesTab = lazy(() => import('./PrescricoesTab'));
const AtestadosTab = lazy(() => import('./AtestadosTab')); 
const EvolucaoTab = lazy(() => import('./EvolucoesTab')); // O "Super-Formulário" (Atendimento)
const DocumentosTab = lazy(() => import('./DocumentosTab')); 
// 2. Importamos o componente real da aba de Exames
const ExamesDicomTab = lazy(() => import('./ExamesDicomTab')); //

// Componente auxiliar TabPanel
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`prontuario-tabpanel-${index}`}
      aria-labelledby={`prontuario-tab-${index}`}
      {...other}
      // Garante que o painel tente ocupar o espaço disponível
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }} 
    >
      {value === index && (
        // Box interno para padding e scroll, se necessário
        <Box sx={{ p: { xs: 1, sm: 2 }, flexGrow: 1, overflowY: 'auto' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Recebe a prop 'onEvolucaoSalva' do PainelMedicoPage
export default function ProntuarioCompleto({ agendamento, modalHistoricoId, onCloseHistoricoModal, onEvolucaoSalva }) {
  const [tabIndex, setTabIndex] = useState(0); // Aba "Atendimento" como padrão
  const { showSnackbar } = useSnackbar();
  const [telemedicinaVisivel, setTelemedicinaVisivel] = useState(false); // Estado do painel de vídeo
  const [criandoSala, setCriandoSala] = useState(false);
  const pacienteId = agendamento?.paciente;
  const especialidade = agendamento?.especialidade_nome || 'ClinicaGeral';

  // Reseta a telemedicina ao trocar de paciente
  useEffect(() => {
    setTelemedicinaVisivel(false);
  }, [agendamento]);

  const handleChange = (event, newIndex) => {
    setTabIndex(newIndex);
  };
  
  // --- FUNÇÃO DO BOTÃO TELEMEDICINA ATUALIZADA ---
  const handleToggleTelemedicina = () => {
    // Se o painel já está visível, apenas esconda
    if (telemedicinaVisivel) {
      setTelemedicinaVisivel(false);
      return;
    }

    // Se não for agendamento de telemedicina, avise
    if (agendamento?.modalidade !== 'Telemedicina') {
        showSnackbar('Este agendamento não é de telemedicina.', 'warning');
        return;
    }
    
    // Mostra o painel de vídeo (placeholder)
    setTelemedicinaVisivel(true);

    // Lógica para ABRIR/CRIAR a sala (adaptada do TelemedicinaPage.jsx)
    if (agendamento.link_telemedicina) {
      // Se já tem link, abre em nova aba
      window.open(agendamento.link_telemedicina, '_blank');
    } else {
      // Se não tem link, chama a API para criar
      setCriandoSala(true);
      apiClient.post(`/agendamentos/${agendamento.id}/criar-telemedicina/`)
        .then(response => {
          showSnackbar('Sala criada! Abrindo em nova aba...', 'success');
          // ATENÇÃO: Precisamos atualizar o 'agendamento' no PainelMedicoPage para ter o link
          // Por enquanto, apenas abrimos o link recebido
          window.open(response.data.roomUrl, '_blank');
          // Idealmente: chamar uma função passada por prop para atualizar o agendamento no pai
          // ex: onAgendamentoUpdate({ ...agendamento, link_telemedicina: response.data.roomUrl });
        })
        .catch(err => {
          console.error("Erro ao criar sala:", err);
          showSnackbar('Erro ao criar a sala de telemedicina.', 'error');
          setTelemedicinaVisivel(false); // Esconde o painel se falhar
        })
        .finally(() => {
          setCriandoSala(false);
        });
    }
  };
  // --- FIM DA FUNÇÃO ---

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
      overflow: 'hidden' // Impede o scroll no Paper principal
    }}>

      {/* --- CABEÇALHO COM ABAS E BOTÃO TELEMEDICINA --- */}
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
          {/* 3. ABAS ATUALIZADAS */}
          <Tab label="Atendimento" id="prontuario-tab-0" /> 
          <Tab label="Prescrições" id="prontuario-tab-1" />
          <Tab label="Atestados" id="prontuario-tab-2" />
          <Tab label="Documentos" id="prontuario-tab-3" />
          <Tab label="Ver Exames" id="prontuario-tab-4" /> {/* Nova Aba */}
        </Tabs>
        
        {/* BOTÃO DE TELEMEDICINA (com loading) */}
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

      {/* --- ÁREA DE CONTEÚDO (Vídeo + Abas) --- */}
      {/* Usamos flexbox column para empilhar o vídeo e o conteúdo da aba */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}> 
        
        {/* 5. PAINEL DE VÍDEO (Condicional) */}
        {telemedicinaVisivel && (
            <Box sx={{ 
                height: '40vh', // Altura relativa à tela
                minHeight: '250px', // Altura mínima
                backgroundColor: 'grey.900', // Fundo escuro
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0, 
                mb: 1 
            }}>
                <Typography>Área da Telemedicina</Typography>
                {/* Integrar o componente de vídeo aqui */}
            </Box>
        )}

        {/* 6. CONTEÚDO DAS ABAS (com Suspense) */}
        {/* Este Box ocupa o espaço restante e permite scroll interno */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}> 
          <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
            
            {/* Aba 0: Atendimento */}
            <TabPanel value={tabIndex} index={0}>
              <EvolucaoTab 
                pacienteId={pacienteId} 
                especialidade={especialidade}
                onEvolucoesSalva={onEvolucaoSalva} 
              />
            </TabPanel>
            
            {/* Aba 1: Prescrições */}
            <TabPanel value={tabIndex} index={1}>
              <PrescricoesTab pacienteId={pacienteId} />
            </TabPanel>

            {/* Aba 2: Atestados */}
            <TabPanel value={tabIndex} index={2}>
              <AtestadosTab pacienteId={pacienteId} />
            </TabPanel>

            {/* Aba 3: Documentos */}
            <TabPanel value={tabIndex} index={3}>
              <DocumentosTab pacienteId={pacienteId} />
            </TabPanel>
            
            {/* Aba 4: Ver Exames */}
            <TabPanel value={tabIndex} index={4}>
              {/* Usamos o componente real */}
              <ExamesDicomTab pacienteId={pacienteId} />
            </TabPanel>

          </Suspense>
        </Box>
      </Box>

      {/* Modal de Histórico */}
      {modalHistoricoId && (
        <ModalHistoricoEvolucao 
          evolucaoId={modalHistoricoId}
          onClose={onCloseHistoricoModal}
        />
      )}
    </Paper>
  );
}