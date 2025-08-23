// src/components/AgendamentoModal.jsx - VERSÃO FINAL E CORRIGIDA

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Button, CircularProgress, Autocomplete, FormControl, InputLabel, Select, MenuItem,
  Box, Typography, Divider
} from '@mui/material';
import apiClient from '../api/axiosConfig';
import { useSnackbar } from '../contexts/SnackbarContext';

export default function AgendamentoModal({ open, onClose, onSave, editingEvent, initialData }) {
  const { showSnackbar } = useSnackbar();
  
  const getInitialFormData = () => ({
    paciente: null,
    data_hora_inicio: '',
    data_hora_fim: '',
    status: 'Confirmado',
    tipo_consulta: 'Rotina',
    plano_utilizado: null,
    tipo_atendimento: 'Particular', // <-- 1. Adicionado ao estado inicial
    observacoes: '',
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [pacientes, setPacientes] = useState([]);
  const [loadingPacientes, setLoadingPacientes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pacienteDetalhes, setPacienteDetalhes] = useState(null);

  useEffect(() => {
    if (open) {
      setLoadingPacientes(true);
      apiClient.get('/pacientes/').then(response => { setPacientes(response.data); })
        .catch(error => console.error("Erro ao buscar lista de pacientes:", error))
        .finally(() => setLoadingPacientes(false));
    } else {
      setFormData(getInitialFormData());
      setPacienteDetalhes(null);
    }
  }, [open]);
  
  useEffect(() => {
    if (initialData && !editingEvent) {
        setFormData(prev => ({ ...prev, data_hora_inicio: new Date(initialData.start).toISOString().slice(0, 16) }));
    }
    // Lógica de edição pode ser adicionada aqui se necessário, mas a prioridade é a criação
  }, [initialData, editingEvent]);

  // --- 2. LÓGICA DE DEFINIÇÃO AUTOMÁTICA CORRIGIDA ---
  const handlePacienteChange = (event, pacienteSelecionado) => {
    if (pacienteSelecionado) {
      apiClient.get(`/pacientes/${pacienteSelecionado.id}/`).then(response => {
        const detalhes = response.data;
        setPacienteDetalhes(detalhes);
        
        const tipoAtendimentoPadrao = detalhes.plano_convenio ? 'Convenio' : 'Particular';

        setFormData(prevFormData => ({
            ...prevFormData,
            paciente: pacienteSelecionado,
            plano_utilizado: detalhes.plano_convenio,
            tipo_atendimento: tipoAtendimentoPadrao // <-- Define o tipo automaticamente
        }));
      });
    } else {
      setPacienteDetalhes(null);
      setFormData(prevFormData => ({ 
          ...prevFormData, 
          paciente: null, 
          plano_utilizado: null, 
          tipo_atendimento: 'Particular' 
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // 3. Garantimos que todos os dados corretos são enviados
    const submissionData = {
      ...formData,
      paciente: formData.paciente ? formData.paciente.id : null,
    };

    try {
      if (editingEvent) {
        await apiClient.put(`/agendamentos/${editingEvent.id}/`, submissionData);
        showSnackbar('Agendamento atualizado com sucesso!', 'success');
      } else {
        await apiClient.post('/agendamentos/', submissionData);
        showSnackbar('Agendamento criado com sucesso!', 'success');
      }
      onSave();
    } catch (error) {
      console.error("Erro ao salvar agendamento:", error.response?.data);
      showSnackbar('Erro ao salvar agendamento.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // O seu JSX está quase perfeito, apenas garanta que o 'value' do Autocomplete está correto
  const pacienteSelecionadoNoForm = pacientes.find(p => p.id === formData.paciente?.id) || null;

  return (
     <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{editingEvent ? 'Editar Agendamento' : 'Novo Agendamento'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '10px !important' }}>
          <Autocomplete
            options={pacientes}
            getOptionLabel={(option) => option.nome_completo || ''}
            value={pacienteSelecionadoNoForm} // <-- Usar a variável calculada
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onChange={handlePacienteChange}
            loading={loadingPacientes}
            renderInput={(params) => (
              <TextField {...params} label="Selecione o Paciente" required />
            )}
          />
          
          {pacienteDetalhes && pacienteDetalhes.plano_convenio_detalhes && (
            <Box sx={{ p: 1.5, backgroundColor: '#f5f5f5', borderRadius: 1, border: '1px solid #e0e0e0' }}>
              <Typography variant="body2" color="text.secondary">
                Plano do Paciente: <strong>{pacienteDetalhes.plano_convenio_detalhes.convenio_nome} - {pacienteDetalhes.plano_convenio_detalhes.nome}</strong>
              </Typography>
            </Box>
          )}

          <Divider />

          <FormControl fullWidth>
            <InputLabel>Tipo de Atendimento</InputLabel>
            <Select
                name="tipo_atendimento"
                value={formData.tipo_atendimento} // <-- Agora lê do estado
                label="Tipo de Atendimento"
                onChange={(e) => setFormData({...formData, tipo_atendimento: e.target.value})}
            >
                <MenuItem value="Particular">Particular</MenuItem>
                <MenuItem value="Convenio" disabled={!formData.plano_utilizado}>
                    Convênio
                </MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Início" type="datetime-local" name="data_hora_inicio"
            value={formData.data_hora_inicio}
            onChange={(e) => setFormData({...formData, data_hora_inicio: e.target.value})}
            InputLabelProps={{ shrink: true }} required
          />
           <TextField
            label="Fim" type="datetime-local" name="data_hora_fim"
            value={formData.data_hora_fim}
            onChange={(e) => setFormData({...formData, data_hora_fim: e.target.value})}
            InputLabelProps={{ shrink: true }} required
          />
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select name="status" value={formData.status} label="Status" onChange={(e) => setFormData({...formData, status: e.target.value})}>
              <MenuItem value="Agendado">Agendado</MenuItem>
              <MenuItem value="Confirmado">Confirmado</MenuItem>
              <MenuItem value="Cancelado">Cancelado</MenuItem>
              <MenuItem value="Realizado">Realizado</MenuItem>
              <MenuItem value="Não Compareceu">Não Compareceu</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting || !formData.paciente}>
            {isSubmitting ? <CircularProgress size={24} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}