// src/pages/ProntuarioPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import { Box, Typography, Paper, Tabs, Tab, CircularProgress } from '@mui/material';

// --- Importe os componentes das abas que você criou ---
import AnamneseTab from '../components/prontuario/AnamneseTab';
import EvolucoesTab from '../components/prontuario/EvolucoesTab';
import PrescricoesTab from '../components/prontuario/PrescricoesTab'; 
import AtestadosTab from '../components/prontuario/AtestadosTab'; 
import AnexosTab from '../components/prontuario/AnexosTab'; // <-- IMPORTE O NOVO COMPONENTE

// Componente auxiliar para painel de abas (continua o mesmo)
function TabPanel(props) {
  const { children, value, index } = props;
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ProntuarioPage() {
  const { pacienteId } = useParams();
  const [paciente, setPaciente] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    apiClient.get(`/pacientes/${pacienteId}/`)
      .then(response => {
        setPaciente(response.data);
        setError(null);
      })
      .catch(err => {
        console.error("Erro ao buscar dados do prontuário:", err);
        setError("Paciente não encontrado ou falha na comunicação.");
        setPaciente(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [pacienteId]);

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

  if (error) {
    return (
      <Paper sx={{ p: 3, margin: 'auto', textAlign: 'center' }}>
        <Typography variant="h6" color="error">{error}</Typography>
      </Paper>
    );
  }

  if (!paciente) {
    return null;
  }

  return (
    <Paper sx={{ p: 2, margin: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        Prontuário de: {paciente.nome_completo}
      </Typography>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(event, newValue) => setActiveTab(newValue)}>
          <Tab label="Anamnese" />
          <Tab label="Evoluções" />
          <Tab label="Prescrições" />
          <Tab label="Atestados" /> 
          <Tab label="Anexos" /> 
        </Tabs>
      </Box>
      
      {/* Agora estamos renderizando os componentes reais dentro das abas */}
      <TabPanel value={activeTab} index={0}>
        <AnamneseTab pacienteId={paciente.id} />
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        <EvolucoesTab pacienteId={paciente.id} />
      </TabPanel>
      <TabPanel value={activeTab} index={2}>
        <PrescricoesTab pacienteId={paciente.id} />
      </TabPanel>
      <TabPanel value={activeTab} index={3}>
        <AtestadosTab pacienteId={paciente.id} />
      </TabPanel>
      <TabPanel value={activeTab} index={4}>
        {/* ADICIONE O NOVO PAINEL COM O COMPONENTE */}
        <AnexosTab pacienteId={paciente.id} />
      </TabPanel>
    </Paper>
  );
}