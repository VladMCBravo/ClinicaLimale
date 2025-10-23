// src/components/prontuario/ProntuarioCompleto.jsx - VERSÃO FINALIZADA

import React, { useState, Suspense, lazy, useEffect } from 'react'; // 1. Adicione 'useEffect'
import { Box, Tabs, Tab, CircularProgress, Paper, Typography } from '@mui/material';
import ModalHistoricoEvolucao from './ModalHistoricoEvolucao';

// 2. Imports para buscar dados
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';

// Imports dos componentes das abas
const AnamneseTab = lazy(() => import('./AnamneseTab')); 
const PrescricoesTab = lazy(() => import('./PrescricoesTab'));
const AtestadosTab = lazy(() => import('./AtestadosTab')); 
const EvolucaoTab = lazy(() => import('./EvolucoesTab')); // Nome da var e do arquivo batendo
const DocumentosTab = lazy(() => import('./DocumentosTab')); 

// Componente auxiliar para renderizar o conteúdo da aba
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`prontuario-tabpanel-${index}`}
      aria-labelledby={`prontuario-tab-${index}`}
      {...other}
      style={{ height: '100%' }}
    >
      {value === index && (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// 3. Receba a nova prop 'onEvolucaoSalva' que virá do PainelMedicoPage
export default function ProntuarioCompleto({ agendamento, modalHistoricoId, onCloseHistoricoModal, onEvolucaoSalva }) {
  const [tabIndex, setTabIndex] = useState(0); 
  const { showSnackbar } = useSnackbar(); // 4. Adicione o Snackbar

  // 5. Lógica para buscar a Anamnese
  const [anamneseData, setAnamneseData] = useState(null);
  const [isLoadingAnamnese, setIsLoadingAnamnese] = useState(false);

  const pacienteId = agendamento?.paciente;
  const especialidade = agendamento?.especialidade?.nome || 'ClinicaGeral';

  // 6. Hook para buscar a anamnese do paciente
  useEffect(() => {
    // Reseta os dados ao trocar de paciente (quando 'agendamento' muda)
    setAnamneseData(null); 
    if (pacienteId) {
      setIsLoadingAnamnese(true);
      // Busca a anamnese
      apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`)
        .then(res => {
          setAnamneseData(res.data);
        })
        .catch(err => {
          // Um 404 aqui é normal (paciente sem anamnese ainda), não mostre erro
          if (err.response && err.response.status !== 404) {
            showSnackbar('Erro ao buscar anamnese.', 'error');
          }
        })
        .finally(() => setIsLoadingAnamnese(false));
    }
  }, [pacienteId, showSnackbar]); // Depende do pacienteId

  // 7. Função para recarregar a anamnese após salvar
  const handleAnamneseSalva = () => {
    setIsLoadingAnamnese(true);
    apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`)
      .then(res => setAnamneseData(res.data))
      .catch(err => showSnackbar('Erro ao recarregar anamnese.', 'error'))
      .finally(() => setIsLoadingAnamnese(false));
  };
  
  const handleChange = (event, newIndex) => {
    setTabIndex(newIndex);
  };

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

      {/* Abas de Navegação (sem alteração) */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Tabs value={tabIndex} onChange={handleChange} aria-label="Abas do Prontuário" variant="scrollable" scrollButtons="auto">
          <Tab label="Evolução" id="prontuario-tab-0" />
          <Tab label="Anamnese" id="prontuario-tab-1" />
          <Tab label="Prescrições" id="prontuario-tab-2" />
          <Tab label="Atestados" id="prontuario-tab-3" />
          <Tab label="Documentos" id="prontuario-tab-4" />
        </Tabs>
      </Box>

      {/* 8. SEU CÓDIGO, AGORA PREENCHIDO */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
          
          <TabPanel value={tabIndex} index={0}>
            <EvolucaoTab 
              pacienteId={pacienteId} 
              especialidade={especialidade}
              onEvolucoesSalva={onEvolucaoSalva} // Passa a prop recebida
            />
          </TabPanel>
          
          <TabPanel value={tabIndex} index={1}>
            {/* Só renderiza a anamnese se o carregamento tiver terminado */}
            {!isLoadingAnamnese ? (
              <AnamneseTab 
                pacienteId={pacienteId} 
                especialidade={especialidade}
                initialAnamnese={anamneseData} // Passa os dados buscados (ou null)
                onAnamneseSalva={handleAnamneseSalva} // Passa a função de recarregar
              />
            ) : <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}
          </TabPanel>

          <TabPanel value={tabIndex} index={2}>
            <PrescricoesTab pacienteId={pacienteId} />
          </TabPanel>

          <TabPanel value={tabIndex} index={3}>
            <AtestadosTab pacienteId={pacienteId} />
          </TabPanel>

          <TabPanel value={tabIndex} index={4}>
            {/* Substitui a <Typography> pelo componente real */}
            <DocumentosTab pacienteId={pacienteId} />
          </TabPanel>

        </Suspense>
      </Box>

      {/* Modal (sem alteração) */}
      {modalHistoricoId && (
        <ModalHistoricoEvolucao 
          evolucaoId={modalHistoricoId}
          onClose={onCloseHistoricoModal}
        />
      )}
    </Paper>
  );
}