// src/components/AgendamentoModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Button, CircularProgress, Autocomplete, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import apiClient from '../api/axiosConfig';

export default function AgendamentoModal({ open, onClose, onSave, editingEvent, initialData }) {
  // --- 1. ADICIONADO 'status' AO ESTADO INICIAL ---
  const [formData, setFormData] = useState({ 
      paciente: null, 
      data_hora_inicio: '', 
      data_hora_fim: '',
      status: 'Confirmado', // Valor padrão para novos agendamentos
      tipo_consulta: 'Rotina' // Valor padrão
  });
  const [pacientes, setPacientes] = useState([]);
  const [loadingPacientes, setLoadingPacientes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Efeito para buscar a lista de pacientes (continua o mesmo)
  useEffect(() => {
    if (open && pacientes.length === 0) {
      setLoadingPacientes(true);
      apiClient.get('/pacientes/').then(response => {
        setPacientes(response.data);
      }).catch(error => console.error("Erro ao buscar lista de pacientes:", error))
      .finally(() => setLoadingPacientes(false));
    }
  }, [open, pacientes.length]);

  // Efeito para preencher o formulário
  useEffect(() => {
    if (open && (pacientes.length > 0 || editingEvent)) { // Ajuste na condição
      if (editingEvent) {
        // MODO EDIÇÃO
        const pacienteObj = pacientes.find(p => p.id === editingEvent.extendedProps.pacienteId) || null;
        setFormData({
          paciente: pacienteObj,
          data_hora_inicio: new Date(editingEvent.startStr).toISOString().slice(0, 16),
          data_hora_fim: editingEvent.endStr ? new Date(editingEvent.endStr).toISOString().slice(0, 16) : '',
          // 2. PREENCHE O STATUS E TIPO DE CONSULTA DO EVENTO EXISTENTE
          status: editingEvent.extendedProps.status || 'Confirmado',
          tipo_consulta: editingEvent.extendedProps.tipo_consulta || 'Rotina'
        });
      } else if (initialData) {
        // MODO CRIAÇÃO
        setFormData({
          paciente: null,
          data_hora_inicio: new Date(initialData.start).toISOString().slice(0, 16),
          data_hora_fim: '',
          status: 'Confirmado',
          tipo_consulta: 'Rotina'
        });
      }
    }
  }, [editingEvent, initialData, open, pacientes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // 3. ADICIONADO 'status' E 'tipo_consulta' AOS DADOS DE ENVIO
    const submissionData = {
      paciente: formData.paciente ? formData.paciente.id : null,
      data_hora_inicio: formData.data_hora_inicio,
      data_hora_fim: formData.data_hora_fim,
      status: formData.status,
      tipo_consulta: formData.tipo_consulta,
    };

    try {
      if (editingEvent) {
        await apiClient.put(`/agendamentos/${editingEvent.id}/`, submissionData);
      } else {
        await apiClient.post('/agendamentos/', submissionData);
      }
      onSave();
    } catch (error) {
      console.error("Erro ao salvar agendamento:", error.response?.data);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const autocompleteValue = pacientes.find(p => p.id === formData.paciente?.id) || null;

  return (
     <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{editingEvent ? 'Editar Agendamento' : 'Novo Agendamento'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '10px !important' }}>
          <Autocomplete
            options={pacientes}
            getOptionLabel={(option) => option.nome_completo || ''}
            value={autocompleteValue}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onChange={(event, newValue) => {
              setFormData({ ...formData, paciente: newValue });
            }}
            loading={loadingPacientes}
            renderInput={(params) => (
              <TextField {...params} label="Selecione o Paciente" variant="outlined" required />
            )}
          />
          <TextField
            name="data_hora_inicio"
            label="Início"
            type="datetime-local"
            value={formData.data_hora_inicio}
            onChange={(e) => setFormData({...formData, data_hora_inicio: e.target.value})}
            InputLabelProps={{ shrink: true }} required
          />
           <TextField
            name="data_hora_fim"
            label="Fim"
            type="datetime-local"
            value={formData.data_hora_fim}
            onChange={(e) => setFormData({...formData, data_hora_fim: e.target.value})}
            InputLabelProps={{ shrink: true }} required
          />
        {/* --- 4. ADICIONADO CAMPO DE SELEÇÃO PARA O STATUS --- */}
          <FormControl fullWidth>
            <InputLabel id="status-select-label">Status</InputLabel>
            <Select
              labelId="status-select-label"
              name="status"
              value={formData.status}
              label="Status"
              onChange={(e) => setFormData({...formData, status: e.target.value})}
            >
              <MenuItem value="Confirmado">Confirmado</MenuItem>
              <MenuItem value="Aguardando">Aguardando</MenuItem>
              <MenuItem value="Atendido">Atendido</MenuItem>
              <MenuItem value="Cancelado">Cancelado</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={24} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}