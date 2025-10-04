// src/components/prontuario/ExamesDicomTab.jsx

import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/axiosConfig'; // Ajuste o caminho se necessário
import { 
  Box, 
  Typography, 
  CircularProgress, 
  List, 
  ListItem, 
  ListItemText,
  Paper
} from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';

export default function ExamesDicomTab({ pacienteId }) {
  const [exames, setExames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showSnackbar } = useSnackbar();

  const fetchExames = useCallback(async () => {
    setIsLoading(true);
    try {
      // ATENÇÃO: Este endpoint ainda precisa ser criado no Django!
      const response = await apiClient.get(`/pacientes/${pacienteId}/exames_dicom/`);
      setExames(response.data);
    } catch (error) {
      console.error("Erro ao buscar exames DICOM:", error);
      showSnackbar('Falha ao carregar exames de imagem.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [pacienteId, showSnackbar]);

  useEffect(() => {
    fetchExames();
  }, [fetchExames]);

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Exames de Imagem</Typography>
      {exames.length === 0 ? (
        <Typography>Nenhum exame de imagem encontrado para este paciente.</Typography>
      ) : (
        <List>
          {exames.map((exame) => (
            <ListItem 
              button 
              key={exame.id} 
              // No futuro, o onClick aqui abrirá o DicomViewer
              onClick={() => alert(`Abrir exame: ${exame.study_description}`)}
            >
              <ListItemText 
                primary={exame.study_description || "Exame sem descrição"}
                secondary={`Data: ${new Date(exame.study_date).toLocaleDateString('pt-BR')}`} 
              />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
}