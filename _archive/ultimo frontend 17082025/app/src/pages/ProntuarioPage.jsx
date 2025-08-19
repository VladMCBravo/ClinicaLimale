import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Paper, Tabs, Tab, CircularProgress } from '@mui/material';
import PageLayout from '../components/PageLayout'; // A IMPORTAÇÃO QUE FALTAVA

import AnamneseTab from '../components/prontuario/AnamneseTab';
import EvolucoesTab from '../components/prontuario/EvolucoesTab';
import PrescricoesTab from '../components/prontuario/PrescricoesTab';
import AtestadosTab from '../components/prontuario/AtestadosTab';
import AnexosTab from '../components/prontuario/AnexosTab';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3, flexGrow: 1 }}>{children}</Box>}
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
    const fetchPaciente = async () => {
      const token = sessionStorage.getItem('authToken');
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/pacientes/${pacienteId}/`, {
          headers: { 'Authorization': `Token ${token}` },
        });
        if (!response.ok) throw new Error('Paciente não encontrado.');
        const data = await response.json();
        setPaciente(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPaciente();
  }, [pacienteId]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Typography color="error">Erro: {error}</Typography>;
  }

  return (
    // Usamos o PageLayout com o nome do paciente como título
    <PageLayout title={paciente?.nome_completo || 'Carregando Prontuário...'}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab label="Anamnese" />
          <Tab label="Evoluções" />
          <Tab label="Prescrições" />
          <Tab label="Atestados" />
          <Tab label="Exames e Anexos" />
        </Tabs>
      </Box>
      <TabPanel value={activeTab} index={0}><AnamneseTab pacienteId={pacienteId} /></TabPanel>
      <TabPanel value={activeTab} index={1}><EvolucoesTab pacienteId={pacienteId} /></TabPanel>
      <TabPanel value={activeTab} index={2}><PrescricoesTab pacienteId={pacienteId} /></TabPanel>
      <TabPanel value={activeTab} index={3}><AtestadosTab pacienteId={pacienteId} /></TabPanel>
      <TabPanel value={activeTab} index={4}><AnexosTab pacienteId={pacienteId} /></TabPanel>
    </PageLayout>
  );
}