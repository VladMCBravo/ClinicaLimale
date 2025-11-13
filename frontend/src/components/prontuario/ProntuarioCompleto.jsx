// src/components/prontuario/ProntuarioCompleto.jsx - VÍDEO INTEGRADO

import React, { useState, Suspense, lazy, useEffect } from 'react';
import { 
    Box, Tabs, Tab, CircularProgress, Paper, Typography, 
    IconButton, Tooltip, Link // Adicione Link
} from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam'; 
import CloseIcon from '@mui/icons-material/Close'; // Ícone para fechar painel

// --- CORREÇÃO DE IMPORTAÇÃO ---
// Removidas as extensões de arquivo (.js e .jsx)
// Esta é a prática padrão do Create React App (react-scripts)
import ModalHistoricoEvolucao from './ModalHistoricoEvolucao'; 
import apiClient from '../../api/axiosConfig'; 
import { useSnackbar } from '../../contexts/SnackbarContext'; 

// --- Imports das Abas (sem extensões) ---
const PrescricoesTab = lazy(() => import('./PrescricoesTab')); 
// const AtestadosTab = lazy(() => import('./AtestadosTab')); // <-- MUDANÇA AQUI: Removido
const RelatoriosTab = lazy(() => import('./RelatoriosTab'));  // <-- MUDANÇA AQUI: Adicionado
const EvolucaoTab = lazy(() => import('./EvolucoesTab')); 
const DocumentosTab = lazy(() => import('./DocumentosTab')); 
const ExamesDicomTab = lazy(() => import('./ExamesDicomTab'));
// --- FIM DA CORREÇÃO DE IMPORTAÇÃO ---


// --- COMPONENTE TabPanel CORRIGIDO ---
// Garante que painéis inativos não ocupem espaço
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      // Usa 'hidden' para esconder, mas garante que não ocupe espaço se não for o ativo
      style={{ display: value !== index ? 'none' : 'block', height: '100%' }} 
      id={`prontuario-tabpanel-${index}`}
      aria-labelledby={`prontuario-tab-${index}`}
      {...other}
    >
      {/* Renderiza o conteúdo APENAS se for o índice ativo */}
      {value === index && (
        <Box sx={{ p: { xs: 1, sm: 2 }, height: '100%' }}> {/* Mantém padding e altura */}
          {children}
        </Box>
      )}
    </div>
  );
}
// --- FIM DO TabPanel ---

// Recebe a prop 'onEvolucaoSalva' do PainelMedicoPage
export default function ProntuarioCompleto({ agendamento, modalHistoricoId, onCloseHistoricoModal, onEvolucaoSalva }) {
  const [tabIndex, setTabIndex] = useState(0); 
  const { showSnackbar } = useSnackbar();
  // 1. RESTAURAMOS o estado do painel de vídeo
  const [telemedicinaVisivel, setTelemedicinaVisivel] = useState(false); 
  const [criandoSala, setCriandoSala] = useState(false);
  // NOVO: Estado para guardar o link da sala (para o iframe)
  const [linkSalaAtual, setLinkSalaAtual] = useState(agendamento?.link_telemedicina || null); 
  // --- 1. ADICIONE O STATE CENTRAL AQUI ---
  const [consultaAtualId, setConsultaAtualId] = useState(null);

  const pacienteId = agendamento?.paciente;
  const especialidade = agendamento?.especialidade_nome || 'ClinicaGeral';
  // Atualiza o link e reseta visibilidade ao trocar de agendamento
  useEffect(() => {
    setTelemedicinaVisivel(false);
    setLinkSalaAtual(agendamento?.link_telemedicina || null);
    setConsultaAtualId(null); // Limpa o ID da consulta ao trocar de agendamento
  }, [agendamento]);

  const handleChange = (event, newIndex) => { setTabIndex(newIndex); };
  
  // --- FUNÇÃO DO BOTÃO TELEMEDICINA CORRIGIDA ---
  const handleToggleTelemedicina = () => {
    // Se está visível, apenas esconde
    if (telemedicinaVisivel) {
      setTelemedicinaVisivel(false);
      // Aqui você adicionaria a lógica para DESCONECTAR da sala Daily.co se necessário
      return;
    }

    // Se não for agendamento de telemedicina, avise
    if (agendamento?.modalidade !== 'Telemedicina') {
        showSnackbar('Este agendamento não é de telemedicina.', 'warning');
        return;
    }
    
    // Mostra o painel (ainda vazio ou com texto)
    setTelemedicinaVisivel(true);

    // Se já temos o link, não faz nada (o iframe vai carregar)
    if (linkSalaAtual) {
        return; 
    }

    // Se NÃO tem link, chama a API para criar
    setCriandoSala(true);
    apiClient.post(`/agendamentos/${agendamento.id}/criar-telemedicina/`)
      .then(response => {
        const roomUrl = response.data.roomUrl;
        showSnackbar('Sala criada com sucesso!', 'success');
        setLinkSalaAtual(roomUrl); // Guarda o link para o iframe
        // Idealmente, notificar o componente pai para atualizar o 'agendamento'
      })
      .catch(err => {
        console.error("Erro ao criar sala:", err);
        showSnackbar('Erro ao criar a sala de telemedicina.', 'error');
        setTelemedicinaVisivel(false); // Esconde o painel se falhar
      })
      .finally(() => {
        setCriandoSala(false);
      });
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
          <Tab label="Atestado/Relatório" id="prontuario-tab-2" /> {/* <-- MUDANÇA AQUI: Nome da aba */}
          <Tab label="Documentos" id="prontuario-tab-3" />
          <Tab label="Ver Exames" id="prontuario-tab-4" /> {/* Nova Aba */}
        </Tabs>
        
        {/* BOTÃO DE TELEMEDICINA */}
        <Tooltip title={telemedicinaVisivel ? "Fechar Painel de Vídeo" : "Iniciar Telemedicina"}>
          <span> 
            <IconButton 
              onClick={handleToggleTelemedicina} 
              color={telemedicinaVisivel ? "secondary" : "primary"}
              // Desabilita se não for telemedicina OU se estiver criando a sala
              disabled={agendamento?.modalidade !== 'Telemedicina' || criandoSala}
              size="small"
            >
              {/* Mostra loading OU o ícone */}
              {criandoSala ? <CircularProgress size={20} color="inherit" /> : <VideocamIcon />}
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* --- ÁREA DE CONTEÚDO (Vídeo + Abas) --- */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}> 
        
        {/* 2. PAINEL DE VÍDEO (RESTAURADO e com iframe/link) */}
        {telemedicinaVisivel && (
            <Box sx={{ 
                height: '40vh', 
                minHeight: '250px', 
                backgroundColor: 'grey.900', 
                color: 'white',
                display: 'flex',
                flexDirection: 'column', // Para o botão fechar
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative', // Para posicionar o botão fechar
                flexShrink: 0, 
                mb: 1 
            }}>
                {/* Botão para fechar o painel */}
                <IconButton 
                    onClick={() => setTelemedicinaVisivel(false)} 
                    sx={{position: 'absolute', top: 5, right: 5, color: 'white', zIndex: 1}}
                    size="small"
                >
                    <CloseIcon fontSize="small"/>
                </IconButton>
                
                {/* Conteúdo do painel: Loading, Iframe ou Mensagem */}
                {criandoSala ? (
                    <CircularProgress color="inherit" />
                ) : linkSalaAtual ? (
                    // Exemplo com IFRAME - pode precisar de ajustes
                    <iframe 
                        src={linkSalaAtual} 
                        allow="camera; microphone; fullscreen; speaker; display-capture"
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        title="Sala de Telemedicina"
                    ></iframe>
                    // Alternativa: Mostrar apenas o link
                    // <Link href={linkSalaAtual} target="_blank" color="inherit">Abrir sala em nova aba</Link>
                ) : (
                    <Typography>Erro ao carregar link da sala.</Typography>
                )}
            </Box>
        )}
        {/* --- CONTEÚDO DAS ABAS (COM LAYOUT CORRIGIDO) --- */}
        {/* Este Box ocupa o espaço restante E permite scroll INTERNO APENAS do conteúdo ativo */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', position: 'relative' }}> {/* Adicionado position relative */}
          <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
            
            {/* Usamos a função TabPanel corrigida para cada aba */}
            <TabPanel value={tabIndex} index={0}>
              {/* --- 3A. PASSE A FUNÇÃO "SETER" PARA O FILHO --- */}
              <EvolucaoTab 
                pacienteId={pacienteId} 
                especialidade={especialidade} 
                // Passa a função onEvolucaoSalva E a nova função para setar o ID
                onEvolucoesSalva={(id) => {
                  onEvolucaoSalva(); // A função original que recarrega o histórico
                  setConsultaAtualId(id); // A nova função que salva o ID
                }}
              />
            </TabPanel>
            <TabPanel value={tabIndex} index={1}>
              <PrescricoesTab pacienteId={pacienteId} />
            </TabPanel>
            <TabPanel value={tabIndex} index={2}>
              {/* --- 3B. PASSE O ID SALVO PARA O RELATÓRIOS TAB --- */}
              <RelatoriosTab 
                pacienteId={pacienteId} 
                especialidade={especialidade} 
                consultaAtualId={consultaAtualId} // <-- AQUI!
              />
            </TabPanel>
            <TabPanel value={tabIndex} index={3}>
              <DocumentosTab pacienteId={pacienteId} />
            </TabPanel>
            <TabPanel value={tabIndex} index={4}>
              <ExamesDicomTab pacienteId={pacienteId} />
            </TabPanel>

          </Suspense>
        </Box>
        {/* --- FIM DO CONTEÚDO DAS ABAS --- */}
      </Box>

      {/* Modal de Histórico (com a correção do pacienteId já aplicada) */}
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