// src/components/prontuario/AnamneseTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, CircularProgress, TextField, Typography } from '@mui/material';
import apiClient from '../../api/axiosConfig';

const initialFormData = { queixa_principal: '', historia_doenca_atual: '', historico_medico_pregresso: '' };

export default function AnamneseTab({ pacienteId }) {
  const [anamnese, setAnamnese] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // 1. A URL agora é uma constante visível para todo o componente
  const apiUrl = `/prontuario/pacientes/${pacienteId}/anamnese/`;

  // 2. A função de busca de dados volta para fora, envolvida em useCallback
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(apiUrl);
      setAnamnese(response.data);
      setFormData(response.data);
      setIsEditing(false);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        setAnamnese(null);
        setFormData(initialFormData);
        setIsEditing(true);
      } else {
        console.error("Erro ao buscar anamnese:", error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl]); // Depende da apiUrl (que depende do pacienteId)

  // 3. O useEffect agora chama a função fetchData
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (anamnese) {
        await apiClient.put(apiUrl, formData);
      } else {
        await apiClient.post(apiUrl, formData);
      }
      // 4. Agora o handleSave consegue chamar o fetchData sem erro
      fetchData(); 
    } catch (error) {
      console.error("Erro ao salvar anamnese:", error.response?.data || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // O resto do seu componente JSX continua o mesmo
  if (isLoading) return <CircularProgress />;

  if (!isEditing && anamnese) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>Queixa Principal</Typography>
        <Typography paragraph>{anamnese.queixa_principal}</Typography>
        <Typography variant="h6" gutterBottom>História da Doença Atual</Typography>
        <Typography paragraph>{anamnese.historia_doenca_atual}</Typography>
        <Typography variant="h6" gutterBottom>História Médica Pregressa</Typography>
        <Typography paragraph>{anamnese.historico_medico_pregresso}</Typography>
        <Button variant="contained" onClick={() => setIsEditing(true)}>Editar</Button>
      </Box>
    );
  }

  return (
    <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField label="Queixa Principal (QP)" name="queixa_principal" value={formData.queixa_principal} onChange={(e) => setFormData({ ...formData, queixa_principal: e.target.value })} multiline rows={4} required />
      <TextField label="História da Doença Atual (HDA)" name="historia_doenca_atual" value={formData.historia_doenca_atual} onChange={(e) => setFormData({ ...formData, historia_doenca_atual: e.target.value })} multiline rows={6} required />
      <TextField label="História Médica Pregressa (HMP)" name="historico_medico_pregresso" value={formData.historico_medico_pregresso} onChange={(e) => setFormData({ ...formData, historico_medico_pregresso: e.target.value })} multiline rows={4} />
      <Box>
        <Button variant="contained" onClick={handleSave} disabled={isLoading}>Salvar Anamnese</Button>
        {anamnese && <Button sx={{ml: 2}} onClick={() => { setIsEditing(false); setFormData(anamnese); }}>Cancelar</Button>}
      </Box>
    </Box>
  );
}