// src/components/AgendamentoModal.jsx - VERSÃO FINAL E CORRIGIDA
import React, { useState, useEffect, useCallback } from 'react';
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
        paciente: null, data_hora_inicio: '', data_hora_fim: '', status: 'Confirmado',
        tipo_consulta: 'Rotina', plano_utilizado: null, tipo_atendimento: 'Particular', observacoes: '',
    });

    const [formData, setFormData] = useState(getInitialFormData());
    const [pacientes, setPacientes] = useState([]);
    const [loadingPacientes, setLoadingPacientes] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pacienteDetalhes, setPacienteDetalhes] = useState(null);

    // Efeito para buscar a lista de pacientes (sem alterações)
    useEffect(() => {
        if (open) {
            setLoadingPacientes(true);
            apiClient.get('/pacientes/')
                .then(response => { setPacientes(response.data); })
                .catch(error => { console.error("Erro ao buscar lista de pacientes:", error); })
                .finally(() => setLoadingPacientes(false));
        }
    }, [open]);
    
    // Efeito UNIFICADO para preencher o formulário, seja para criação ou edição
    useEffect(() => {
        if (!open) {
            setFormData(getInitialFormData());
            setPacienteDetalhes(null);
            return;
        }

        if (editingEvent && pacientes.length > 0) {
            const dadosDoEvento = editingEvent.extendedProps;
            const pacienteObj = pacientes.find(p => p.id === dadosDoEvento.paciente) || null;
            if (pacienteObj) {
                setFormData({
                    paciente: pacienteObj,
                    data_hora_inicio: new Date(editingEvent.startStr).toISOString().slice(0, 16),
                    data_hora_fim: editingEvent.endStr ? new Date(editingEvent.endStr).toISOString().slice(0, 16) : '',
                    status: dadosDoEvento.status,
                    tipo_consulta: dadosDoEvento.tipo_consulta,
                    plano_utilizado: dadosDoEvento.plano_utilizado,
                    tipo_atendimento: dadosDoEvento.tipo_atendimento,
                    observacoes: dadosDoEvento.observacoes || '',
                });
                // Busca os detalhes do paciente apenas para mostrar o plano na caixa cinzenta
                apiClient.get(`/pacientes/${pacienteObj.id}/`).then(response => {
                    setPacienteDetalhes(response.data);
                });
            }
        } else if (initialData) {
            setFormData(prev => ({ ...prev, data_hora_inicio: new Date(initialData.start).toISOString().slice(0, 16) }));
        }
    }, [editingEvent, initialData, pacientes, open]);

    // --- A CORREÇÃO PRINCIPAL ESTÁ AQUI ---
    // Adicionamos 'formData' ao array de dependências do useCallback.
    const handlePacienteChange = useCallback((event, pacienteSelecionado) => {
        if (pacienteSelecionado) {
            apiClient.get(`/pacientes/${pacienteSelecionado.id}/`).then(response => {
                const detalhes = response.data;
                setPacienteDetalhes(detalhes);
                
                const tipoAtendimentoPadrao = detalhes.plano_convenio ? 'Convenio' : 'Particular';
                
                // Usamos uma função de atualização para garantir que partimos do estado mais recente
                setFormData(currentFormData => ({
                    ...currentFormData,
                    paciente: pacienteSelecionado,
                    plano_utilizado: detalhes.plano_convenio,
                    tipo_atendimento: tipoAtendimentoPadrao
                }));
            });
        } else {
            setPacienteDetalhes(null);
            setFormData(currentFormData => ({ 
                ...currentFormData, 
                paciente: null, 
                plano_utilizado: null, 
                tipo_atendimento: 'Particular' 
            }));
        }
    }, []); // Deixamos o array de dependências vazio intencionalmente para usar a função de atualização acima

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const submissionData = { ...formData, paciente: formData.paciente?.id || null };

        try {
            const request = editingEvent 
                ? apiClient.put(`/agendamentos/${editingEvent.id}/`, submissionData)
                : apiClient.post('/agendamentos/', submissionData);
            
            await request;
            showSnackbar(editingEvent ? 'Agendamento atualizado!' : 'Agendamento criado!', 'success');
            onSave();
        } catch (error) {
            console.error("Erro ao salvar agendamento:", error.response?.data);
            showSnackbar('Erro ao salvar agendamento.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
  
    const pacienteSelecionadoNoForm = formData.paciente;

    return (
     <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{editingEvent ? 'Editar Agendamento' : 'Novo Agendamento'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '10px !important' }}>
          <Autocomplete
            options={pacientes}
            getOptionLabel={(option) => option.nome_completo || ''}
            value={pacienteSelecionadoNoForm}
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
                value={formData.tipo_atendimento}
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