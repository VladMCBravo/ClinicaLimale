import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, CircularProgress, TextField, Typography, Paper, Accordion, AccordionSummary, AccordionDetails, Select, MenuItem, InputLabel, FormControl, Autocomplete, FormControlLabel, Checkbox } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';

// Uma lista rápida de exemplo (Você pode expandir isso depois)
const listaCIDs = [
    { codigo: 'J03.9', descricao: 'Amigdalite aguda não especificada' },
    { codigo: 'J01.9', descricao: 'Sinusite aguda não especificada' },
    { codigo: 'I10', descricao: 'Hipertensão essencial (primária)' },
    { codigo: 'A09', descricao: 'Diarreia e gastroenterite de origem infecciosa presumível' },
    { codigo: 'N39.0', descricao: 'Infecção do trato urinário de localização não especificada' },
    { codigo: 'M54.5', descricao: 'Dor lombar baixa' },
    { codigo: 'Z11.3', descricao: 'Exame de rastreamento para infecções de transmissão predominantemente sexual' }
];

const initialFormState = { tipo_atestado: '', observacoes: '', cid: null, paciente_autorizou_cid: false };

export default function AtestadosTab({ pacienteId }) {
  const { showSnackbar } = useSnackbar(); 
  const [atestados, setAtestados] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAtestados = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/prontuario/pacientes/${pacienteId}/atestados/`);
      setAtestados(response.data);
    } catch (error) {
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
      const payloadFormatoCorreto = {
          ...formData,
          cid: formData.cid ? formData.cid.codigo : null 
      };

      await apiClient.post(`/prontuario/pacientes/${pacienteId}/atestados/`, payloadFormatoCorreto);
      
      showSnackbar('Atestado salvo com sucesso!', 'success');
      setFormData(initialFormState);
      fetchAtestados();
    } catch (error) {
      showSnackbar('Erro ao salvar atestado.', 'error');
      console.error("Erro ao salvar atestado:", error.response?.data);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGerarPdf = async (atestadoId) => {
    try {
        const response = await apiClient.get(
            `/pdf/atestado/${atestadoId}/`,
            { responseType: 'blob' }
        );
        
        const fileURL = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        window.open(fileURL, '_blank');
        setTimeout(() => URL.revokeObjectURL(fileURL), 100); 
    } catch (error) {
        console.error("Erro ao gerar PDF do atestado:", error);
        showSnackbar('Erro ao gerar PDF do atestado.', 'error');
    }
  };

  // Função auxiliar para descobrir de forma inteligente se é acompanhante
  const descobrirTipoDetalhado = (atestado) => {
    const texto = atestado.observacoes ? atestado.observacoes.toLowerCase() : '';
    
    // Se o banco de dados salvou como Comparecimento, mas tem a palavra acompanhando no texto livre
    if (atestado.tipo_atestado === 'Comparecimento' && texto.includes('acompanhando')) {
        return {
            titulo: 'Declaração de Acompanhante',
            cor: '#d97706' // Laranja/Warning para destacar na tela
        };
    }
    
    // Fallback para os comportamentos normais
    if (atestado.tipo_atestado === 'Afastamento') {
        return { titulo: atestado.tipo_atestado_display || 'Atestado de Afastamento', cor: '#dc2626' }; // Vermelho
    }

    return { 
        titulo: atestado.tipo_atestado_display || atestado.tipo_atestado, 
        cor: '#2563eb' // Azul padrão para comparecimento normal
    };
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

          <Autocomplete
              options={listaCIDs}
              getOptionLabel={(option) => `${option.codigo} - ${option.descricao}`}
              value={formData.cid}
              onChange={(event, newValue) => {
                  setFormData({ ...formData, cid: newValue });
              }}
              renderInput={(params) => (
                  <TextField {...params} label="Buscar Diagnóstico (CID-10)" placeholder="Digite a doença ou código..." />
              )}
              isOptionEqualToValue={(option, value) => option.codigo === value?.codigo}
              clearOnEscape
          />

          <FormControlLabel
              control={
                  <Checkbox 
                      checked={formData.paciente_autorizou_cid} 
                      onChange={(e) => setFormData({ ...formData, paciente_autorizou_cid: e.target.checked })}
                      disabled={!formData.cid} 
                  />
              }
              label="Paciente autoriza a impressão do CID no atestado (Res. CFM nº 1.658/2002)"
          />
          <TextField 
            label="Observações (Texto do atestado, CID, etc.)" 
            value={formData.observacoes} 
            onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} 
            multiline 
            rows={5} 
            required 
            helperText="Se for acompanhante, garanta que a palavra 'acompanhando' esteja no texto para o sistema categorizar corretamente no histórico."
          />
          <Button type="submit" variant="contained" disabled={isLoading} sx={{ alignSelf: 'flex-start' }}>Salvar Atestado</Button>
        </Box>
      </Paper>

      {/* Lista de Atestados Anteriores */}
      <Typography variant="h6" gutterBottom>Histórico de Atestados</Typography>
      {atestados.length > 0 ? (
        atestados.map((atestado) => {
          // Usa nossa função inteligente para pegar título e cor!
          const visual = descobrirTipoDetalhado(atestado);
          
          return (
          <Accordion key={atestado.id} sx={{ mb: 1, borderLeft: `4px solid ${visual.cor}` }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ flexShrink: 0, fontWeight: 'bold' }}>
                {new Date(atestado.data_emissao).toLocaleDateString('pt-BR')}
              </Typography>
              <Typography sx={{ ml: 2, fontWeight: 'bold', color: visual.cor }}>
                {visual.titulo}
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
          )
        })
      ) : (
        <Typography>Nenhum atestado registrado para este paciente.</Typography>
      )}
    </Box>
  );
}