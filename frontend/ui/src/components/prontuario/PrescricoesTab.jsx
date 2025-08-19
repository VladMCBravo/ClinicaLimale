// src/components/prontuario/PrescricoesTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, CircularProgress, TextField, Typography, Paper, Accordion, AccordionSummary, AccordionDetails, IconButton, Divider } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import apiClient from '../../api/axiosConfig';

const initialItemState = { medicamento: '', dosagem: '', instrucoes: '' };

export default function PrescricoesTab({ pacienteId }) {
  const [prescricoes, setPrescricoes] = useState([]);
  const [itens, setItens] = useState([initialItemState]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPrescricoes = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/pacientes/${pacienteId}/prescricoes/`);
      setPrescricoes(response.data);
    } catch (error) {
      console.error("Erro ao buscar prescrições:", error);
    } finally {
      setIsLoading(false);
    }
  }, [pacienteId]);

  useEffect(() => {
    fetchPrescricoes();
  }, [fetchPrescricoes]);

  const handleItemChange = (index, event) => {
    const newItens = [...itens];
    newItens[index][event.target.name] = event.target.value;
    setItens(newItens);
  };

  const handleAddItem = () => {
    setItens([...itens, { ...initialItemState }]);
  };

  const handleRemoveItem = (index) => {
    const newItens = itens.filter((_, i) => i !== index);
    setItens(newItens);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const dataToSend = { itens: itens };
    try {
      await apiClient.post(`/pacientes/${pacienteId}/prescricoes/`, dataToSend);
      setItens([initialItemState]); // Limpa o formulário
      fetchPrescricoes(); // Recarrega a lista
    } catch (error) {
      console.error("Erro ao salvar prescrição:", error.response?.data);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGerarPdf = (prescricaoId) => {
    // Abre o PDF em uma nova aba. O apiClient lida com a URL base e autenticação.
    window.open(`http://127.0.0.1:8000/api/prescricoes/${prescricaoId}/pdf/`, '_blank');
  };


  if (isLoading && prescricoes.length === 0) return <CircularProgress />;

  return (
    <Box>
      {/* Formulário para Nova Prescrição */}
      <Paper component="form" onSubmit={handleSave} elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Gerar Nova Prescrição</Typography>
        {itens.map((item, index) => (
          <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
            <TextField name="medicamento" label="Medicamento" value={item.medicamento} onChange={e => handleItemChange(index, e)} required fullWidth />
            <TextField name="dosagem" label="Dosagem" value={item.dosagem} onChange={e => handleItemChange(index, e)} required />
            <TextField name="instrucoes" label="Instruções" value={item.instrucoes} onChange={e => handleItemChange(index, e)} required fullWidth />
            <IconButton onClick={() => handleRemoveItem(index)} color="error" disabled={itens.length <= 1}>
              <RemoveCircleOutlineIcon />
            </IconButton>
          </Box>
        ))}
        <Button startIcon={<AddCircleOutlineIcon />} onClick={handleAddItem}>Adicionar Medicamento</Button>
        <Button type="submit" variant="contained" disabled={isLoading} sx={{ display: 'block', mt: 2 }}>Salvar Prescrição</Button>
      </Paper>

      {/* Lista de Prescrições Anteriores */}
      <Typography variant="h6" gutterBottom>Histórico de Prescrições</Typography>
      {prescricoes.length > 0 ? (
        prescricoes.map(prescricao => (
          <Accordion key={prescricao.id}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ flexShrink: 0, fontWeight: 'bold' }}>
                {new Date(prescricao.data_prescricao).toLocaleDateString('pt-BR')}
              </Typography>
              <Typography sx={{ ml: 2, color: 'text.secondary' }}>Dr(a). {prescricao.medico}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {prescricao.itens.map((item, index) => (
                <Box key={index} sx={{ mb: 1 }}>
                  <Typography variant="subtitle2">{item.medicamento} - {item.dosagem}</Typography>
                  <Typography variant="body2" sx={{ pl: 1 }}>{item.instrucoes}</Typography>
                  <Divider sx={{ mt: 1 }} />
                </Box>
              ))}
              <Button 
                startIcon={<PictureAsPdfIcon />} 
                onClick={() => handleGerarPdf(prescricao.id)}
                variant="outlined"
                size="small"
                sx={{ mt: 2 }}
              >
                Gerar PDF
              </Button>
            </AccordionDetails>
          </Accordion>
        ))
      ) : (
        <Typography>Nenhuma prescrição registrada para este paciente.</Typography>
      )}
    </Box>
  );
}