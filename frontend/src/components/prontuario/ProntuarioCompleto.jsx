// src/components/prontuario/ProntuarioCompleto.jsx (REESTRUTURADO PARA SPLIT-PANE)

import React, { useState, Suspense, lazy, useEffect, useCallback } from 'react';
import { 
    Box, Tabs, Tab, CircularProgress, Paper, Typography, 
    IconButton, Tooltip, Divider 
} from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam'; 
import CloseIcon from '@mui/icons-material/Close'; 
import MenuOpenIcon from '@mui/icons-material/MenuOpen'; // Novo ícone para expandir a tela de apoio

import ModalHistoricoEvolucao from './ModalHistoricoEvolucao'; 
import apiClient from '../../api/axiosConfig'; 
import { useSnackbar } from '../../contexts/SnackbarContext'; 

// --- Imports das Abas (Agora tratadas como Ferramentas) ---
const PrescricoesTab = lazy(() => import('./PrescricoesTab')); 
const RelatoriosTab = lazy(() => import('./RelatoriosTab'));
const EvolucaoTab = lazy(() => import('./EvolucoesTab')); 
const DocumentosTab = lazy(() => import('./DocumentosTab')); 
const ExamesDicomTab = lazy(() => import('./ExamesDicomTab'));
const LaudosTab = lazy(() => import('../laudos/LaudosTab'));

export default function ProntuarioCompleto({ agendamento, modalHistoricoId, onCloseHistoricoModal, onEvolucaoSalva }) {
  // O menu de ferramentas de apoio
  const [ferramentaAtiva, setFerramentaAtiva] = useState(null); 
  const { showSnackbar } = useSnackbar();
  const [telemedicinaVisivel, setTelemedicinaVisivel] = useState(false); 
  const [criandoSala, setCriandoSala] = useState(false);
  const [linkSalaAtual, setLinkSalaAtual] = useState(agendamento?.link_telemedicina || null); 
  const [consultaAtualId, setConsultaAtualId] = useState(null);

  const pacienteId = agendamento?.paciente;
  const especialidade = agendamento?.especialidade_nome || 'ClinicaGeral';
  const isExame = agendamento?.tipo === 'EXAME' || ['Radiologia', 'Ultrassonografia'].includes(especialidade);

  // Se for exame de imagem, podemos já abrir o painel lateral na opção de Laudos (índice 4)
  useEffect(() => { 
      if (isExame) {
          setFerramentaAtiva(4); 
      }
  }, [isExame]);

  useEffect(() => {
    setTelemedicinaVisivel(false);
    setLinkSalaAtual(agendamento?.link_telemedicina || null);
    setConsultaAtualId(null); 
    // Fecha o painel lateral ao trocar de paciente para limpar a tela
    setFerramentaAtiva(null); 
  }, [pacienteId, agendamento?.link_telemedicina]);

  const handleFerramentaChange = (event, newIndex) => { 
      // Se clicar na mesma ferramenta, fecha o painel lateral. Se clicar em outra, muda o conteúdo.
      setFerramentaAtiva(prev => prev === newIndex ? null : newIndex); 
  };
  
  const handleToggleTelemedicina = () => {
      // (Lógica da telemedicina mantida inalterada)
      // ...
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
    <Paper elevation={2} sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* BARRA DE MENU (Agora controla as ferramentas da coluna direita) */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 1 }}>
        
        {/* Adicionado botão para fechar o painel de ferramentas caso esteja aberto */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {ferramentaAtiva !== null && (
                <Tooltip title="Fechar painel de apoio">
                    <IconButton onClick={() => setFerramentaAtiva(null)} sx={{ ml: 1, mr: 1 }}>
                        <MenuOpenIcon sx={{ transform: 'rotate(180deg)' }} />
                    </IconButton>
                </Tooltip>
            )}

            <Tabs value={ferramentaAtiva} onChange={handleFerramentaChange} aria-label="Ferramentas de Apoio" variant="scrollable" scrollButtons="auto">
            {/* O índice 0 foi removido das ferramentas pois o Atendimento é a tela principal */}
            <Tab label="Prescrições" value={0} />
            <Tab label="Atestado/Relatório" value={1} />
            <Tab label="Documentos" value={2} />
            <Tab label="Histórico de Imagens" value={3} /> 
            <Tab 
                label="Laudos" 
                value={4}
                style={{ color: isExame ? '#1976d2' : 'inherit', fontWeight: isExame ? 'bold' : 'normal' }}
            /> 
            </Tabs>
        </Box>
        
        <Tooltip title={telemedicinaVisivel ? "Fechar Painel de Vídeo" : "Iniciar Telemedicina"}>
          <span> 
            <IconButton onClick={handleToggleTelemedicina} disabled={agendamento?.modalidade !== 'Telemedicina' || criandoSala} size="small">
              {criandoSala ? <CircularProgress size={20} color="inherit" /> : <VideocamIcon />}
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* ÁREA PRINCIPAL (Layout Dividido) */}
      <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}> 
        
        {/* COLUNA ESQUERDA: Sempre visível e contém o SOAP/Atendimento */}
        <Box sx={{ 
            flexGrow: 1, // Ocupa todo o espaço quando o painel de apoio está fechado
            width: ferramentaAtiva !== null ? '50%' : '100%', // Reduz a largura se o apoio abrir
            overflowY: 'auto', 
            transition: 'width 0.3s ease', // Animação suave
            p: 2
        }}>
             <EvolucaoTab 
                pacienteId={pacienteId} 
                especialidade={especialidade} 
                onEvolucoesSalva={handleEvolucaoSalvaChain}
              />
        </Box>

        {/* DIVISOR (Aparece apenas quando uma ferramenta está aberta) */}
        {ferramentaAtiva !== null && <Divider orientation="vertical" flexItem />}

        {/* COLUNA DIREITA: Painel de Apoio (Abre apenas se uma ferramenta for selecionada) */}
        {ferramentaAtiva !== null && (
            <Box sx={{ 
                width: '50%', // Define a largura fixa para a ferramenta
                overflowY: 'auto', 
                backgroundColor: '#fafafa', // Uma cor de fundo sutilmente diferente para destacar que é uma área auxiliar
                p: 2
            }}>
                <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
                    {/* Renderiza o componente correspondente à ferramenta ativa sem desmontar o EvolucaoTab */}
                    {ferramentaAtiva === 0 && <PrescricoesTab pacienteId={pacienteId} />}
                    {ferramentaAtiva === 1 && <RelatoriosTab pacienteId={pacienteId} especialidade={especialidade} consultaAtualId={consultaAtualId} />}
                    {ferramentaAtiva === 2 && <DocumentosTab pacienteId={pacienteId} />}
                    {ferramentaAtiva === 3 && <ExamesDicomTab pacienteId={pacienteId} />}
                    {ferramentaAtiva === 4 && <LaudosTab pacienteId={pacienteId} />}
                </Suspense>
            </Box>
        )}
      </Box>
      
      {/* (Lógica do modal histórico omitida para brevidade, mantenha como estava) */}
      
    </Paper>
  );
}