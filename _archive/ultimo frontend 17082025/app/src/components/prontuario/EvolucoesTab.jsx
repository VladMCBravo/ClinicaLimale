// src/components/prontuario/EvolucoesTab.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, CircularProgress, Paper, TextField, Typography, Grid } from '@mui/material';

// Função para formatar a data de forma amigável
const formatarData = (dataString) => {
  return new Date(dataString).toLocaleString('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
};

export default function EvolucoesTab({ pacienteId }) {
  const [evolucoes, setEvolucoes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para o formulário de nova evolução
  const [subjetivo, setSubjetivo] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [avaliacao, setAvaliacao] = useState('');
  const [plano, setPlano] = useState('');

  const fetchEvolucoes = useCallback(async () => {
    setIsLoading(true);
    const token = sessionStorage.getItem('authToken');
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/pacientes/${pacienteId}/evolucoes/`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Falha ao buscar evoluções.');
      const data = await response.json();
      setEvolucoes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [pacienteId]);

  useEffect(() => {
    fetchEvolucoes();
  }, [fetchEvolucoes]);

  const resetForm = () => {
    setSubjetivo('');
    setObjetivo('');
    setAvaliacao('');
    setPlano('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const token = sessionStorage.getItem('authToken');
    const evolucaoData = { notas_subjetivas: subjetivo, notas_objetivas: objetivo, avaliacao, plano };

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/pacientes/${pacienteId}/evolucoes/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify(evolucaoData),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(JSON.stringify(errData));
      }
      resetForm(); // Limpa o formulário
      fetchEvolucoes(); // Recarrega a lista de evoluções
    } catch (err) {
      alert(`Erro ao salvar: ${err.message}`);
    }
  };

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Typography color="error">Erro: {error}</Typography>;
  }

  return (
    <Box>
      {/* SEÇÃO 1: FORMULÁRIO PARA NOVA EVOLUÇÃO */}
      <Paper component="form" onSubmit={handleSubmit} sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Registrar Nova Evolução (SOAP)</Typography>
        <Grid container spacing={2}>
          <Grid xs={12}><TextField label="Subjetivo (S)" value={subjetivo} onChange={(e) => setSubjetivo(e.target.value)} multiline rows={3} fullWidth /></Grid>
          <Grid xs={12}><TextField label="Objetivo (O)" value={objetivo} onChange={(e) => setObjetivo(e.target.value)} multiline rows={3} fullWidth /></Grid>
          <Grid xs={12}><TextField label="Avaliação (A)" value={avaliacao} onChange={(e) => setAvaliacao(e.target.value)} multiline rows={3} fullWidth /></Grid>
          <Grid xs={12}><TextField label="Plano (P)" value={plano} onChange={(e) => setPlano(e.target.value)} multiline rows={3} fullWidth /></Grid>
        </Grid>
        <Button type="submit" variant="contained" sx={{ mt: 2 }}>Salvar Evolução</Button>
      </Paper>

      {/* SEÇÃO 2: HISTÓRICO DE EVOLUÇÕES */}
      <Typography variant="h6" gutterBottom>Histórico de Evoluções</Typography>
      {evolucoes.length === 0 ? (
        <Typography>Nenhuma evolução registrada para este paciente.</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {evolucoes.map(evo => (
            <Paper key={evo.id} variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="textSecondary">
                {formatarData(evo.data_atendimento)} - Dr(a). {evo.medico_nome || 'Não informado'}
              </Typography>
              <Typography variant="body1" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                <b>S:</b> {evo.notas_subjetivas}
                {'\n'}<b>O:</b> {evo.notas_objetivas}
                {'\n'}<b>A:</b> {evo.avaliacao}
                {'\n'}<b>P:</b> {evo.plano}
              </Typography>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
}