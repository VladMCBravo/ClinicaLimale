// Crie este arquivo em: src/components/prontuario/ProntuarioCompleto.jsx

import React, { useState, Suspense, lazy } from 'react';
import { Box, Tabs, Tab, CircularProgress, Paper, Typography } from '@mui/material';

// 1. Importe os componentes que serão o CONTEÚDO de cada aba.
// Usamos lazy loading (carregamento sob demanda) para performance.
const AnamneseTab = lazy(() => import('./AnamneseTab')); //
const PrescricoesTab = lazy(() => import('./PrescricoesTab')); //
const AtestadosTab = lazy(() => import('./AtestadosTab')); //

// 2. Vamos criar o "loader" da aba de Evolução no próximo passo. Por enquanto, vamos importá-lo.
const EvolucaoTab = lazy(() => import('./EvolucaoTab')); 

// (Vamos criar um componente simples para Documentos também)
const DocumentosTab = lazy(() => import('./DocumentosTab')); 

// Componente auxiliar para renderizar o conteúdo da aba (padrão do Material-UI)
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`prontuario-tabpanel-${index}`}
      aria-labelledby={`prontuario-tab-${index}`}
      {...other}
      style={{ height: '100%' }} // Garante que o painel ocupe a altura
    >
      {value === index && (
        // O padding é aplicado aqui para que o conteúdo não cole nas bordas
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Este é o componente principal que será chamado pelo PainelMedicoPage
export default function ProntuarioCompleto({ agendamento }) {
  const [tabIndex, setTabIndex] = useState(0); // A aba "Evolução" (index 0) será a padrão

  const handleChange = (event, newIndex) => {
    setTabIndex(newIndex);
  };

  // Extrai os dados do agendamento
  const pacienteId = agendamento?.paciente;
  const especialidade = agendamento?.especialidade?.nome || 'ClinicaGeral';

  // Se nenhum paciente estiver selecionado, exibe uma mensagem
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
    // Paper (fundo branco) que contém as abas e o conteúdo
    <Paper elevation={2} sx={{ 
      width: '100%', 
      height: '100%', // Ocupa toda a altura da coluna da direita
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden' // Impede o scroll no container
    }}>

      {/* 1. As Abas de Navegação */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Tabs value={tabIndex} onChange={handleChange} aria-label="Abas do Prontuário" variant="scrollable" scrollButtons="auto">
          <Tab label="Evolução" id="prontuario-tab-0" />
          <Tab label="Anamnese" id="prontuario-tab-1" />
          <Tab label="Prescrições" id="prontuario-tab-2" />
          <Tab label="Atestados" id="prontuario-tab-3" />
          <Tab label="Documentos" id="prontuario-tab-4" />
        </Tabs>
      </Box>

      {/* 2. O Conteúdo das Abas (que terá seu próprio scroll) */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
          
          <TabPanel value={tabIndex} index={0}>
            <EvolucaoTab 
              pacienteId={pacienteId} 
              especialidade={especialidade}
              // Passaremos a prop para recarregar o histórico quando salvar
              // onEvolucaoSalva={...} 
            />
          </TabPanel>
          
          <TabPanel value={tabIndex} index={1}>
            <AnamneseTab 
              pacienteId={pacienteId} 
              especialidade={especialidade}
              // Você buscará a anamnese inicial dentro deste componente
              // initialAnamnese={...} 
              // onAnamneseSalva={...}
            />
          </TabPanel>

          <TabPanel value={tabIndex} index={2}>
            <PrescricoesTab pacienteId={pacienteId} />
          </TabPanel>

          <TabPanel value={tabIndex} index={3}>
            <AtestadosTab pacienteId={pacienteId} />
          </TabPanel>

          <TabPanel value={tabIndex} index={4}>
            {/* Você precisará criar este componente `DocumentosTab` */}
            {/* <DocumentosTab pacienteId={pacienteId} /> */}
            <Typography>Área de Documentos</Typography>
          </TabPanel>

        </Suspense>
      </Box>
    </Paper>
  );
}