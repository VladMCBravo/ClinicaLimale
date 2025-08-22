// src/components/AgendamentoModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Button, CircularProgress, Autocomplete, FormControl, InputLabel, Select, MenuItem,
  Box, Typography, Divider // <-- Adicionados para layout
} from '@mui/material';
import apiClient from '../api/axiosConfig';
import { useSnackbar } from '../contexts/SnackbarContext';

export default function AgendamentoModal({ open, onClose, onSave, editingEvent, initialData }) {
  const { showSnackbar } = useSnackbar();
  
  // Adicionamos 'plano_utilizado' ao estado inicial do formulário
  const getInitialFormData = () => ({
    paciente: null,
    data_hora_inicio: '',
    data_hora_fim: '',
    status: 'Confirmado',
    tipo_consulta: 'Rotina',
    plano_utilizado: null, // <-- CAMPO CHAVE PARA A INTEGRAÇÃO
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [pacientes, setPacientes] = useState([]);
  const [loadingPacientes, setLoadingPacientes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // --- NOVO ESTADO PARA GUARDAR OS DETALHES DO PACIENTE SELECIONADO ---
  const [pacienteDetalhes, setPacienteDetalhes] = useState(null);

  // Efeito para buscar a lista de pacientes (para o Autocomplete)
  useEffect(() => {
    if (open) {
      setLoadingPacientes(true);
      apiClient.get('/pacientes/')
        .then(response => {
          setPacientes(response.data);
        })
        .catch(error => console.error("Erro ao buscar lista de pacientes:", error))
        .finally(() => setLoadingPacientes(false));
    } else {
      // Limpa o formulário e os detalhes ao fechar o modal
      setFormData(getInitialFormData());
      setPacienteDetalhes(null);
    }
  }, [open]);
  
  // Efeito para preencher o formulário
  useEffect(() => {
    if (editingEvent && pacientes.length > 0) {
      // MODO EDIÇÃO
      const pacienteId = editingEvent.extendedProps.pacienteId;
      const pacienteObj = pacientes.find(p => p.id === pacienteId) || null;
      if (pacienteObj) {
        handlePacienteChange(null, pacienteObj); // Reutiliza a função de busca de detalhes
      }
      setFormData({
        paciente: pacienteObj,
        data_hora_inicio: new Date(editingEvent.startStr).toISOString().slice(0, 16),
        data_hora_fim: editingEvent.endStr ? new Date(editingEvent.endStr).toISOString().slice(0, 16) : '',
        status: editingEvent.extendedProps.status || 'Confirmado',
        tipo_consulta: editingEvent.extendedProps.tipo_consulta || 'Rotina',
        plano_utilizado: editingEvent.extendedProps.plano_utilizado || null,
      });
    } else if (initialData) {
      // MODO CRIAÇÃO
      setFormData(prev => ({ ...prev, data_hora_inicio: new Date(initialData.start).toISOString().slice(0, 16) }));
    }
  }, [editingEvent, initialData, pacientes]);


  // --- NOVA FUNÇÃO PARA BUSCAR DETALHES DO PACIENTE E SEU PLANO ---
  const handlePacienteChange = (event, pacienteSelecionado) => {
    if (pacienteSelecionado) {
      // Busca os detalhes completos do paciente para pegar o plano
      apiClient.get(`/pacientes/${pacienteSelecionado.id}/`).then(response => {
        setPacienteDetalhes(response.data);
        setFormData({
          ...formData,
          paciente: pacienteSelecionado,
          // Pré-popula o agendamento com o plano padrão do paciente
          plano_utilizado: response.data.plano_convenio 
        });
      });
    } else {
      setPacienteDetalhes(null);
      setFormData({ ...formData, paciente: null, plano_utilizado: null });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Garantimos que estamos enviando o ID do paciente e do plano
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
      onSave(); // Recarrega o calendário e fecha o modal
    } catch (error) {
      console.error("Erro ao salvar agendamento:", error.response?.data);
      showSnackbar('Erro ao salvar agendamento.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
     <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{editingEvent ? 'Editar Agendamento' : 'Novo Agendamento'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '10px !important' }}>
          <Autocomplete
            options={pacientes}
            getOptionLabel={(option) => option.nome_completo || ''}
            value={formData.paciente}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onChange={handlePacienteChange} // <-- A MÁGICA ACONTECE AQUI
            loading={loadingPacientes}
            renderInput={(params) => (
              <TextField {...params} label="Selecione o Paciente" required />
            )}
          />
          
          {/* --- BLOCO DE INFORMAÇÕES DO PLANO (FEEDBACK VISUAL) --- */}
          {pacienteDetalhes && pacienteDetalhes.plano_convenio_detalhes && (
            <Box sx={{ p: 1.5, backgroundColor: '#f5f5f5', borderRadius: 1, border: '1px solid #e0e0e0' }}>
              <Typography variant="body2" color="text.secondary">
                Plano do Paciente: <strong>{pacienteDetalhes.plano_convenio_detalhes.convenio_nome} - {pacienteDetalhes.plano_convenio_detalhes.nome}</strong>
              </Typography>
            </Box>
          )}

          <Divider />

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