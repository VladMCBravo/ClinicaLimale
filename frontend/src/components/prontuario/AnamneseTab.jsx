// src/components/prontuario/AnamneseTab.jsx - VERSÃO APRIMORADA
import React, { useState, useEffect, useCallback } from 'react';
import { 
    Box, Button, CircularProgress, TextField, Typography, 
    Paper, FormGroup, FormControlLabel, Checkbox 
} from '@mui/material';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext'; // Assumindo que você usa o SnackbarContext

const initialFormData = { queixa_principal: '', historia_doenca_atual: '', historico_medico_pregresso: '' };

export default function AnamneseTab({ pacienteId, especialidade = 'Cardiologia' }) { // <-- Adicionamos especialidade como prop
  const { showSnackbar } = useSnackbar();
  const [anamnese, setAnamnese] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // --- NOVOS ESTADOS PARA AS OPÇÕES CLÍNICAS ---
  const [opcoesHDA, setOpcoesHDA] = useState([]);
  const [selecoesHDA, setSelecoesHDA] = useState(new Set()); // Usar Set é mais eficiente

  const apiUrl = `/prontuario/pacientes/${pacienteId}/anamnese/`;

  const fetchData = useCallback(async () => {
    // ... (A sua função fetchData para buscar a anamnese existente continua igual)
    // Por simplicidade, vou replicá-la aqui.
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
        showSnackbar('Erro ao carregar dados da anamnese.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, showSnackbar]);

  // --- NOVO: FUNÇÃO PARA BUSCAR AS OPÇÕES CLÍNICAS DA API ---
  const fetchOpcoes = useCallback(async () => {
    if (!especialidade) return; // Não busca se não houver especialidade
    try {
      const response = await apiClient.get(`/prontuario/opcoes-clinicas/`, {
        params: {
          especialidade: especialidade,
          area_clinica: 'HDA'
        }
      });
      setOpcoesHDA(response.data);
    } catch (error) {
      console.error("Erro ao buscar opções clínicas:", error);
      showSnackbar('Erro ao carregar opções de anamnese.', 'error');
    }
  }, [especialidade, showSnackbar]);


  useEffect(() => {
    fetchData();
    fetchOpcoes();
  }, [fetchData, fetchOpcoes]);

  // --- NOVO: HANDLER PARA ATUALIZAR ESTADO QUANDO UMA CHECKBOX MUDA ---
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
    
    // Atualiza o texto narrativo com base nas seleções
    const textoNarrativo = opcoesHDA
      .filter(opt => newSelecoes.has(opt.id))
      .map(opt => opt.descricao)
      .join('. ') + '.'; // Junta as frases com um ponto final.

    setFormData(prev => ({ ...prev, historia_doenca_atual: textoNarrativo }));
  };

  const handleSave = async () => {
    // ... Sua lógica de salvar continua a mesma, pois o formData já está atualizado.
    setIsLoading(true);
    try {
      const dataToSend = {
        ...formData,
        // Opcional: Se quiser salvar os IDs para análise de dados no futuro,
        // você precisaria adicionar um campo no seu modelo Anamnese para recebê-los.
        // opcoes_selecionadas_ids: Array.from(selecoesHDA) 
      };

      if (anamnese) {
        await apiClient.put(apiUrl, dataToSend);
      } else {
        await apiClient.post(apiUrl, dataToSend);
      }
      showSnackbar('Anamnese salva com sucesso!', 'success');
      fetchData(); 
    } catch (error) {
      console.error("Erro ao salvar anamnese:", error.response?.data || error.message);
      showSnackbar('Erro ao salvar anamnese.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <CircularProgress />;

  // Se não estiver editando, mostra a visualização normal
  if (!isEditing && anamnese) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>Queixa Principal</Typography>
        <Typography paragraph>{anamnese.queixa_principal || 'Não informado'}</Typography>
        <Typography variant="h6" gutterBottom>História da Doença Atual</Typography>
        <Typography paragraph>{anamnese.historia_doenca_atual || 'Não informado'}</Typography>
        <Typography variant="h6" gutterBottom>História Médica Pregressa</Typography>
        <Typography paragraph>{anamnese.historico_medico_pregresso || 'Não informado'}</Typography>
        <Button variant="contained" onClick={() => setIsEditing(true)}>Editar</Button>
      </Box>
    );
  }

  // Formulário de Criação/Edição
  return (
    <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField 
        label="Queixa Principal (QP)" 
        name="queixa_principal" 
        value={formData.queixa_principal} 
        onChange={(e) => setFormData({ ...formData, queixa_principal: e.target.value })} 
        multiline rows={3} required 
      />
      
      {/* --- NOVA SEÇÃO COM OPÇÕES CLÍNICAS --- */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Opções para História da Doença Atual (HDA)
        </Typography>
        <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {opcoesHDA.length > 0 ? opcoesHDA.map((opcao) => (
            <FormControlLabel
              key={opcao.id}
              control={
                <Checkbox
                  checked={selecoesHDA.has(opcao.id)}
                  onChange={handleHdaCheckboxChange}
                  name={String(opcao.id)}
                />
              }
              label={opcao.descricao}
            />
          )) : <Typography variant="body2" color="text.secondary">Nenhuma opção rápida encontrada para esta especialidade.</Typography>}
        </FormGroup>
        
        <TextField 
          label="Texto da História da Doença Atual (HDA)"
          name="historia_doenca_atual" 
          value={formData.historia_doenca_atual} 
          onChange={(e) => setFormData({ ...formData, historia_doenca_atual: e.target.value })} 
          multiline rows={6} required fullWidth 
        />
      </Paper>

      <TextField 
        label="História Médica Pregressa (HMP)" 
        name="historico_medico_pregresso" 
        value={formData.historico_medico_pregresso} 
        onChange={(e) => setFormData({ ...formData, historico_medico_pregresso: e.target.value })} 
        multiline rows={4} 
      />

      <Box>
        <Button variant="contained" onClick={handleSave} disabled={isLoading}>Salvar Anamnese</Button>
        {anamnese && <Button sx={{ml: 2}} onClick={() => { setIsEditing(false); setFormData(anamnese); }}>Cancelar</Button>}
      </Box>
    </Box>
  );
}