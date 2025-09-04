// src/components/prontuario/EvolucoesTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, CircularProgress, TextField, Typography, Paper, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import apiClient from '../../api/axiosConfig';

const initialFormState = { notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' };

export default function EvolucoesTab({ pacienteId }) {
  const [evolucoes, setEvolucoes] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvolucoes = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/pacientes/${pacienteId}/evolucoes/`);
      setEvolucoes(response.data);
    } catch (error) {
      console.error("Erro ao buscar evoluções:", error);
    } finally {
      setIsLoading(false);
    }
  }, [pacienteId]);

  useEffect(() => {
    fetchEvolucoes();
  }, [fetchEvolucoes]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await apiClient.post(`/pacientes/${pacienteId}/evolucoes/`, formData);
      setFormData(initialFormState); // Limpa o formulário
      fetchEvolucoes(); // Recarrega a lista
    } catch (error) {
      console.error("Erro ao salvar evolução:", error.response?.data);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && evolucoes.length === 0) return <CircularProgress />;

  return (
    <Box>
      {/* Formulário para Nova Evolução */}
      <Paper component="form" onSubmit={handleSave} elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Registrar Nova Evolução (S.O.A.P.)</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Subjetivo (S)" value={formData.notas_subjetivas} onChange={(e) => setFormData({ ...formData, notas_subjetivas: e.target.value })} multiline rows={3} required />
          <TextField label="Objetivo (O)" value={formData.notas_objetivas} onChange={(e) => setFormData({ ...formData, notas_objetivas: e.target.value })} multiline rows={3} required />
          <TextField label="Avaliação (A)" value={formData.avaliacao} onChange={(e) => setFormData({ ...formData, avaliacao: e.target.value })} multiline rows={2} required />
          <TextField label="Plano (P)" value={formData.plano} onChange={(e) => setFormData({ ...formData, plano: e.target.value })} multiline rows={2} required />
          <Button type="submit" variant="contained" disabled={isLoading} sx={{ alignSelf: 'flex-start' }}>Salvar Evolução</Button>
        </Box>
      </Paper>

      {/* Lista de Evoluções Anteriores */}
      <Typography variant="h6" gutterBottom>Histórico de Evoluções</Typography>
      {evolucoes.length > 0 ? (
        evolucoes.map(evolucao => (
          <Accordion key={evolucao.id}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ flexShrink: 0, fontWeight: 'bold' }}>
                {new Date(evolucao.data_atendimento).toLocaleDateString('pt-BR')}
              </Typography>
              <Typography sx={{ ml: 2, color: 'text.secondary' }}>Dr(a). {evolucao.medico}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box>
                <Typography variant="subtitle2">Subjetivo:</Typography>
                <Typography paragraph>{evolucao.notas_subjetivas}</Typography>
                <Typography variant="subtitle2">Objetivo:</Typography>
                <Typography paragraph>{evolucao.notas_objetivas}</Typography>
                <Typography variant="subtitle2">Avaliação:</Typography>
                <Typography paragraph>{evolucao.avaliacao}</Typography>
                <Typography variant="subtitle2">Plano:</Typography>
                <Typography paragraph>{evolucao.plano}</Typography>
              </Box>
            </AccordionDetails>
          </Accordion>
        ))
      ) : (
        <Typography>Nenhuma evolução registrada para este paciente.</Typography>
      )}
    </Box>
  );
}