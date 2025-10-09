// src/components/prontuario/AnamneseTab.jsx - VERSÃO FINAL E CORRETA

import React, { useState, useEffect } from 'react';
import { 
    Box, Button, CircularProgress, TextField, Typography, 
    Paper, FormGroup, FormControlLabel, Checkbox 
} from '@mui/material';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';

export default function AnamneseTab({ pacienteId, especialidade = 'Cardiologia', initialAnamnese, onAnamneseSalva }) {
  const { showSnackbar } = useSnackbar();
  
  // O estado do formulário é a única fonte da verdade aqui.
  // Ele começa com os dados recebidos da página principal (initialAnamnese) ou em branco.
  const [formData, setFormData] = useState(initialAnamnese || { queixa_principal: '', historia_doenca_atual: '', historico_medico_pregresso: '' });
  
  const [isSaving, setIsSaving] = useState(false);
  const [opcoesHDA, setOpcoesHDA] = useState([]);
  const [selecoesHDA, setSelecoesHDA] = useState(new Set());
  
  // Apenas UM useEffect, muito mais simples!
  useEffect(() => {
    // 1. Atualiza o formulário se a prop initialAnamnese mudar.
    setFormData(initialAnamnese || { queixa_principal: '', historia_doenca_atual: '', historico_medico_pregresso: '' });

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
      <Box>
        <Button variant="contained" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <CircularProgress size={24} /> : (initialAnamnese ? 'Atualizar Anamnese' : 'Salvar Anamnese')}
        </Button>
      </Box>
    </Box>
  );
}