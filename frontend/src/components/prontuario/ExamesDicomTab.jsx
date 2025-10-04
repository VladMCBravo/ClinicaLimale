// src/components/prontuario/ExamesDicomTab.jsx

import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/axiosConfig';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  List, 
  ListItem, 
  ListItemText,
  Paper,
  Divider
} from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import DicomViewer from '../dicom/DicomViewer'; // <-- 1. IMPORTE O DICOM VIEWER

export default function ExamesDicomTab({ pacienteId }) {
  const [exames, setExames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedExame, setSelectedExame] = useState(null); // <-- 2. ESTADO PARA O EXAME SELECIONADO
  const { showSnackbar } = useSnackbar();

  const fetchExames = useCallback(async () => {
    setIsLoading(true);
    try {
      // --- 3. AJUSTE A URL PARA A ROTA CORRETA ---
      const response = await apiClient.get(`/integracao/pacientes/${pacienteId}/exames/`);
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

  const handleSelectExame = (exame) => {
    setSelectedExame(exame);
  };

  const handleCloseViewer = () => {
    setSelectedExame(null);
  };

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  }
  
  // --- 4. LÓGICA DE RENDERIZAÇÃO CONDICIONAL ---
  if (selectedExame) {
    // Se um exame estiver selecionado, mostre o viewer
    return <DicomViewer exame={selectedExame} onClose={handleCloseViewer} />;
  }

  // Se nenhum exame estiver selecionado, mostre a lista
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Exames de Imagem</Typography>
      {exames.length === 0 ? (
        <Typography>Nenhum exame de imagem encontrado para este paciente.</Typography>
      ) : (
        <List>
          {exames.map((exame, index) => (
            <React.Fragment key={exame.id}>
              <ListItem 
                button 
                onClick={() => handleSelectExame(exame)}
              >
                <ListItemText 
                  primary={exame.study_description || "Exame sem descrição"}
                  secondary={`Data: ${new Date(exame.study_date).toLocaleDateString('pt-BR')}`} 
                />
              </ListItem>
              {index < exames.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      )}
    </Paper>
  );
}