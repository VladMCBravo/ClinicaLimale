// src/components/prontuario/PrescricoesTab.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, Button, CircularProgress, TextField, Typography, 
  Accordion, AccordionSummary, AccordionDetails, IconButton, Divider 
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';

const initialItemState = { medicamento: '', dosagem: '', instrucoes: '' };

export default function PrescricoesTab({ pacienteId }) {
  const { showSnackbar } = useSnackbar();
  const [prescricoes, setPrescricoes] = useState([]);
  const [itens, setItens] = useState([initialItemState]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPrescricoes = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/prontuario/pacientes/${pacienteId}/prescricoes/`);
      setPrescricoes(response.data);
    } catch (error) {
      showSnackbar('Erro ao carregar histórico de prescrições.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [pacienteId, showSnackbar]);

  useEffect(() => {
    if (pacienteId) fetchPrescricoes();
  }, [fetchPrescricoes, pacienteId]);

  const handleItemChange = (index, field, value) => {
    const newItens = [...itens];
    newItens[index][field] = value;
    setItens(newItens);
  };

  const handleAddItem = () => setItens([...itens, { ...initialItemState }]);
  const handleRemoveItem = (index) => setItens(itens.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post(`/prontuario/pacientes/${pacienteId}/prescricoes/`, { itens });
      showSnackbar('Prescrição salva com sucesso!', 'success');
      setItens([initialItemState]);
      fetchPrescricoes();
    } catch (error) {
      showSnackbar('Erro ao salvar a prescrição.', 'error');
    }
  };

  const handleGerarPdf = async (prescricaoId) => {
    try {
        // Chamada direta para a rota de PDF definida no seu backend (urls.py)
        const response = await apiClient.get(
            `/pdf/prescricao/${prescricaoId}/`, 
            { responseType: 'blob' } // CRÍTICO: definir como blob para baixar arquivos
        );

        // Cria uma URL temporária para o PDF
        const fileURL = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        
        // Abre em uma nova aba
        window.open(fileURL, '_blank');
        
        // Limpa a URL para liberar memória
        setTimeout(() => URL.revokeObjectURL(fileURL), 100); 
    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        showSnackbar('Erro ao gerar PDF da prescrição.', 'error');
    }
  };

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress size={24}/></Box>;

  return (
    // Usa a classe tasy-compact-input para forçar os inputs a ficarem pequenos e adequados para barra lateral
    <Box className="tasy-compact-input" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      
      {/* 1. ÁREA DE NOVA PRESCRIÇÃO (Formulário Vertical) */}
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography className="tasy-section-header">Nova Prescrição</Typography>
        
        {itens.map((item, index) => (
          <Box key={index} sx={{ p: 1.5, border: '1px solid #e0e0e0', bgcolor: '#ffffff', position: 'relative' }}>
            {itens.length > 1 && (
              <IconButton size="small" color="error" onClick={() => handleRemoveItem(index)} sx={{ position: 'absolute', top: 0, right: 0 }}>
                <RemoveCircleOutlineIcon fontSize="small" />
              </IconButton>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
                <TextField label="Medicamento" value={item.medicamento} onChange={(e) => handleItemChange(index, 'medicamento', e.target.value)} required fullWidth />
                <TextField label="Dosagem" value={item.dosagem} onChange={(e) => handleItemChange(index, 'dosagem', e.target.value)} required fullWidth />
                <TextField label="Instruções de Uso" value={item.instrucoes} onChange={(e) => handleItemChange(index, 'instrucoes', e.target.value)} required multiline rows={2} fullWidth />
            </Box>
          </Box>
        ))}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Button startIcon={<AddCircleOutlineIcon />} onClick={handleAddItem} size="small" variant="text">
            Adicionar Item
            </Button>
            <Button type="submit" variant="contained" size="small" disableElevation>
            Salvar
            </Button>
        </Box>
      </Box>

      {/* 2. HISTÓRICO DE PRESCRIÇÕES (Flat Accordion) */}
      <Box>
        <Typography className="tasy-section-header">Prescrições Anteriores</Typography>
        {prescricoes.length > 0 ? (
          prescricoes.map(prescricao => (
            <Accordion key={prescricao.id} disableGutters sx={{ border: '1px solid #e0e0e0', mb: 1, '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  {new Date(prescricao.data_prescricao).toLocaleDateString('pt-BR')}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 1.5, pt: 0, bgcolor: '#f8f9fa' }}>
                {prescricao.itens.map((item, idx) => (
                  <Box key={idx} sx={{ mb: 1 }}>
                    <Typography variant="body2" fontWeight="bold">{item.medicamento} - {item.dosagem}</Typography>
                    <Typography variant="caption" color="text.secondary">{item.instrucoes}</Typography>
                    <Divider sx={{ my: 0.5 }} />
                  </Box>
                ))}
                <Button startIcon={<PictureAsPdfIcon />} onClick={() => handleGerarPdf(prescricao.id)} variant="outlined" size="small" fullWidth sx={{ mt: 1 }}>
                  Imprimir PDF
                </Button>
              </AccordionDetails>
            </Accordion>
          ))
        ) : (
          <Typography variant="body2" color="text.secondary">Nenhuma prescrição salva.</Typography>
        )}
      </Box>
    </Box>
  );
}