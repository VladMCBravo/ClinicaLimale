// src/pages/ProntuarioPage.jsx - VERSÃO COM HEADER FIXO DO PACIENTE

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import { Box, Typography, Paper, Tabs, Tab, CircularProgress } from '@mui/material';

import AnamneseTab from '../components/prontuario/AnamneseTab';
import EvolucoesTab from '../components/prontuario/EvolucoesTab';
import PrescricoesTab from '../components/prontuario/PrescricoesTab'; 
import AtestadosTab from '../components/prontuario/AtestadosTab'; 
import AnexosTab from '../components/prontuario/AnexosTab';
import PatientHeader from '../components/PatientHeader'; // NOVO: Importamos o novo componente

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
  
  // NOVO: A verificação de !paciente foi movida para depois do 'loading' para evitar um piscar na tela.
  if (!paciente) {
    return null; 
  }

  return (
    // NOVO: Usamos um Box como container principal para o header e o conteúdo.
    <Box> 
      {/* NOVO: Adicionamos o header do paciente aqui, passando os dados do paciente */}
      <PatientHeader paciente={paciente} />

      <Paper sx={{ p: 2, margin: 'auto' }}>
        {/* ALTERADO: Removemos o Typography com o nome, pois ele já está no header. */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(event, newValue) => setActiveTab(newValue)}>
            <Tab label="Anamnese" />
            <Tab label="Evoluções" />
            <Tab label="Prescrições" />
            <Tab label="Atestados" /> 
            <Tab label="Anexos" /> 
          </Tabs>
        </Box>
        
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
          <AnexosTab pacienteId={paciente.id} />
        </TabPanel>
      </Paper>
    </Box>
  );
}