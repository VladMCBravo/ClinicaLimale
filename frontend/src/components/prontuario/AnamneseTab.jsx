// src/components/prontuario/AnamneseTab.jsx - VERSÃO COM CAMPOS DE GINECOLOGIA

import React, { useState, useEffect } from 'react';
import { Box, Button, CircularProgress, TextField, Typography, Paper, FormGroup, FormControlLabel, Checkbox, Grid, Divider } from '@mui/material';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';

export default function AnamneseTab({ pacienteId, especialidade, initialAnamnese, onAnamneseSalva }) {
  const { showSnackbar } = useSnackbar();
  
  // O estado inicial agora inclui o objeto aninhado 'ginecologica'
  const [formData, setFormData] = useState(initialAnamnese || { 
      queixa_principal: '', historia_doenca_atual: '', historico_medico_pregresso: '',
      ginecologica: {} // Inicia o objeto para os dados ginecológicos
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [opcoesHDA, setOpcoesHDA] = useState([]);
  const [selecoesHDA, setSelecoesHDA] = useState(new Set());
  
  useEffect(() => {
    // Garante que o estado aninhado exista
    const defaultData = { 
        queixa_principal: '', historia_doenca_atual: '', historico_medico_pregresso: '',
        ginecologica: {}
    };
    setFormData(initialAnamnese || defaultData);

    // 2. Busca as opções de checkbox.
    const fetchOpcoes = async () => {
      try {
        const response = await apiClient.get(`/prontuario/opcoes-clinicas/`, {
          params: { especialidade, area_clinica: 'HDA' }
        });
        setOpcoesHDA(response.data);
      } catch (error) {
        showSnackbar('Erro ao carregar opções de anamnese.', 'error');
      }
    };
    fetchOpcoes();
  }, [initialAnamnese, especialidade, showSnackbar]);

  const handleFieldChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };
// NOVO: Handler para os campos aninhados de ginecologia
  const handleGinecoChange = (event) => {
    setFormData(prev => ({
        ...prev,
        ginecologica: {
            ...prev.ginecologica,
            [event.target.name]: event.target.value
        }
    }));
  };
  const handleHdaCheckboxChange = (event) => {
    const opcaoId = parseInt(event.target.name, 10);
    const isChecked = event.target.checked;
    const newSelecoes = new Set(selecoesHDA);

    if (isChecked) {
      newSelecoes.add(opcaoId);
    } else {
      newSelecoes.delete(opcaoId);
    }
    setSelecoesHDA(newSelecoes);

    const textoNarrativo = opcoesHDA
      .filter(opt => newSelecoes.has(opt.id))
      .map(opt => opt.descricao)
      .join('. ');
      
    setFormData(prev => ({ ...prev, historia_doenca_atual: textoNarrativo ? textoNarrativo + '.' : '' }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const apiUrl = `/prontuario/pacientes/${pacienteId}/anamnese/`;
    try {
      if (initialAnamnese) { // Se existia uma anamnese, atualiza (PUT)
        await apiClient.put(apiUrl, formData);
      } else { // Se não, cria uma nova (POST)
        await apiClient.post(apiUrl, formData);
      }
      showSnackbar('Anamnese salva com sucesso!', 'success');
      
      // AVISA A PÁGINA PRINCIPAL para recarregar tudo!
      if (onAnamneseSalva) {
        onAnamneseSalva();
      }
    } catch (error) {
      showSnackbar('Erro ao salvar anamnese.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Este componente agora é SEMPRE um formulário, sem modo de visualização.
  return (
    <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField 
        label="Queixa Principal (QP)" 
        name="queixa_principal" 
        value={formData.queixa_principal} 
        onChange={handleFieldChange} 
        multiline 
        rows={3} 
        required 
      />
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>Opções para História da Doença Atual (HDA)</Typography>
        <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {opcoesHDA.length > 0 ? opcoesHDA.map((opcao) => (
            <FormControlLabel
              key={opcao.id}
              control={
                <Checkbox checked={selecoesHDA.has(opcao.id)} onChange={handleHdaCheckboxChange} name={String(opcao.id)} />
              }
              label={opcao.descricao}
            />
          )) : <Typography variant="body2" color="text.secondary">Nenhuma opção rápida encontrada para esta especialidade.</Typography>}
        </FormGroup>
        <TextField 
          label="Texto da História da Doença Atual (HDA)" 
          name="historia_doenca_atual" 
          value={formData.historia_doenca_atual}
          onChange={handleFieldChange}
          multiline 
          rows={6} 
          required 
          fullWidth 
        />
      </Paper>      
      <TextField 
        label="História Médica Pregressa (HMP)" 
        name="historico_medico_pregresso" 
        value={formData.historico_medico_pregresso}
        onChange={handleFieldChange}
        multiline 
        rows={4} 
      />
      {especialidade === 'Ginecologia' && (
        <Paper variant="outlined" sx={{ p: 2, mt: 2, borderColor: 'secondary.main' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Anamnese Ginecológica e Obstétrica</Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <TextField label="DUM (Última Menstruação)" name="dum" type="date" value={formData.ginecologica?.dum || ''} onChange={handleGinecoChange} InputLabelProps={{ shrink: true }} fullWidth size="small" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <TextField label="Idade da Menarca" name="menarca_idade" type="number" value={formData.ginecologica?.menarca_idade || ''} onChange={handleGinecoChange} fullWidth size="small" />
                </Grid>
                <Grid item xs={12} sm={4} md={2}><TextField label="Gesta" name="gesta" type="number" value={formData.ginecologica?.gesta || ''} onChange={handleGinecoChange} fullWidth size="small" /></Grid>
                <Grid item xs={12} sm={4} md={2}><TextField label="Para" name="para" type="number" value={formData.ginecologica?.para || ''} onChange={handleGinecoChange} fullWidth size="small" /></Grid>
                <Grid item xs={12} sm={4} md={2}><TextField label="Abortos" name="abortos" type="number" value={formData.ginecologica?.abortos || ''} onChange={handleGinecoChange} fullWidth size="small" /></Grid>
                
                <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>

                <Grid item xs={12} sm={6}>
                    <TextField label="Antecedentes Ginecológicos" name="antecedentes_ginecologicos" value={formData.ginecologica?.antecedentes_ginecologicos || ''} onChange={handleGinecoChange} multiline rows={4} fullWidth size="small" />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField label="Antecedentes Obstétricos" name="antecedentes_obstetricos" value={formData.ginecologica?.antecedentes_obstetricos || ''} onChange={handleGinecoChange} multiline rows={4} fullWidth size="small" />
                </Grid>
            </Grid>
        </Paper>
      )}
      <Box>
        <Button variant="contained" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <CircularProgress size={24} /> : (initialAnamnese ? 'Atualizar Anamnese' : 'Salvar Anamnese')}
        </Button>
      </Box>
    </Box>
  );
}