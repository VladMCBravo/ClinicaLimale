// src/components/prontuario/AtestadosTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
    Box, Button, CircularProgress, TextField, Typography, Paper, Accordion, 
    AccordionSummary, AccordionDetails, Select, MenuItem, InputLabel, FormControl 
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext'; // 1. IMPORTE O SNACKBAR

const initialFormState = { tipo_atestado: '', observacoes: '' };

export default function AtestadosTab({ pacienteId }) {
  const { showSnackbar } = useSnackbar(); // 2. INICIALIZE O HOOK
  const [atestados, setAtestados] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAtestados = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/prontuario/pacientes/${pacienteId}/atestados/`);
      setAtestados(response.data);
    } catch (error) {
      // MUDANÇA AQUI
      showSnackbar('Erro ao buscar histórico de atestados.', 'error');
      console.error("Erro ao buscar atestados:", error);
    } finally {
      setIsLoading(false);
    }
  }, [pacienteId, showSnackbar]);

  useEffect(() => {
    fetchAtestados();
  }, [fetchAtestados]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await apiClient.post(`/prontuario/pacientes/${pacienteId}/atestados/`, formData);
      showSnackbar('Atestado salvo com sucesso!', 'success'); // Feedback de sucesso
      setFormData(initialFormState);
      fetchAtestados();
    } catch (error) {
      // MUDANÇA AQUI
      showSnackbar('Erro ao salvar atestado.', 'error');
      console.error("Erro ao salvar atestado:", error.response?.data);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGerarPdf = (atestadoId) => {
    // Constrói a URL completa usando a baseURL do apiClient
    const pdfUrl = `${apiClient.defaults.baseURL}/atestados/${atestadoId}/pdf/`;
    window.open(pdfUrl, '_blank');
  };

  if (isLoading && atestados.length === 0) return <CircularProgress />;

  return (
    <Box>
      {/* Formulário para Novo Atestado */}
      <Paper component="form" onSubmit={handleSave} elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Emitir Novo Atestado</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth required>
            <InputLabel id="tipo-atestado-label">Tipo de Atestado</InputLabel>
            <Select
              labelId="tipo-atestado-label"
              value={formData.tipo_atestado}
              label="Tipo de Atestado"
              onChange={(e) => setFormData({ ...formData, tipo_atestado: e.target.value })}
            >
              <MenuItem value="Comparecimento">Atestado de Comparecimento</MenuItem>
              <MenuItem value="Afastamento">Atestado de Afastamento</MenuItem>
              <MenuItem value="Aptidao">Atestado de Aptidão Física</MenuItem>
            </Select>
          </FormControl>
          <TextField 
            label="Observações (Texto do atestado, CID, etc.)" 
            value={formData.observacoes} 
            onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} 
            multiline 
            rows={5} 
            required 
          />
          <Button type="submit" variant="contained" disabled={isLoading} sx={{ alignSelf: 'flex-start' }}>Salvar Atestado</Button>
        </Box>
      </Paper>

      {/* Lista de Atestados Anteriores */}
      <Typography variant="h6" gutterBottom>Histórico de Atestados</Typography>
      {atestados.length > 0 ? (
        atestados.map(atestado => (
          <Accordion key={atestado.id}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ flexShrink: 0, fontWeight: 'bold' }}>
                {new Date(atestado.data_emissao).toLocaleDateString('pt-BR')}
              </Typography>
              <Typography sx={{ ml: 2, color: 'text.secondary' }}>
                {atestado.tipo_atestado_display}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography paragraph>{atestado.observacoes}</Typography>
              <Button 
                startIcon={<PictureAsPdfIcon />} 
                onClick={() => handleGerarPdf(atestado.id)}
                variant="outlined"
                size="small"
              >
                Gerar PDF
              </Button>
            </AccordionDetails>
          </Accordion>
        ))
      ) : (
        <Typography>Nenhum atestado registrado para este paciente.</Typography>
      )}
    </Box>
  );
}