// src/components/AgendamentoModal.jsx - VERSÃO COM EDIÇÃO CORRIGIDA
import React, { useState, useEffect, useCallback } from 'react';
// ... (mantenha todas as suas importações)
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, CircularProgress, Autocomplete, FormControl, InputLabel, Select, MenuItem, Box, Typography, Divider } from '@mui/material';
import apiClient from '../api/axiosConfig';
import { useSnackbar } from '../contexts/SnackbarContext';

export default function AgendamentoModal({ open, onClose, onSave, editingEvent, initialData }) {
    const { showSnackbar } = useSnackbar();
    
    const getInitialFormData = () => ({
        paciente: null, data_hora_inicio: '', data_hora_fim: '', status: 'Confirmado',
        procedimento: null, plano_utilizado: null, tipo_atendimento: 'Particular', observacoes: '',
    });

    const [formData, setFormData] = useState(getInitialFormData());
    const [pacientes, setPacientes] = useState([]);
    const [procedimentos, setProcedimentos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pacienteDetalhes, setPacienteDetalhes] = useState(null);

    // Efeito para buscar dados (sem alterações)
    useEffect(() => {
        if (open) {
            setLoading(true);
            const fetchPacientes = apiClient.get('/pacientes/');
            const fetchProcedimentos = apiClient.get('/faturamento/procedimentos/');
            Promise.all([fetchPacientes, fetchProcedimentos])
                .then(([pacientesResponse, procedimentosResponse]) => {
                    setPacientes(pacientesResponse.data);
                    setProcedimentos(procedimentosResponse.data);
                }).catch(error => { showSnackbar("Erro ao carregar dados.", 'error'); })
                .finally(() => setLoading(false));
        }
    }, [open, showSnackbar]);
    
    // --- LÓGICA DE PREENCHIMENTO REFINADA ---
    useEffect(() => {
        if (!open) {
            setFormData(getInitialFormData());
            setPacienteDetalhes(null);
            return;
        }

        // MODO EDIÇÃO: Tem prioridade
        if (editingEvent && pacientes.length > 0 && procedimentos.length > 0) {
            const dados = editingEvent.extendedProps;
            const pacienteObj = pacientes.find(p => p.id === dados.paciente) || null;
            const procedimentoObj = procedimentos.find(p => p.id === dados.procedimento) || null;
            
            if (pacienteObj) {
                setFormData({
                    paciente: pacienteObj,
                    // Garante que a data/hora original do evento é usada
                    data_hora_inicio: new Date(editingEvent.start).toISOString().slice(0, 16),
                    data_hora_fim: editingEvent.end ? new Date(editingEvent.end).toISOString().slice(0, 16) : '',
                    status: dados.status,
                    procedimento: procedimentoObj,
                    plano_utilizado: dados.plano_utilizado,
                    tipo_atendimento: dados.tipo_atendimento,
                    observacoes: dados.observacoes || '',
                });
                apiClient.get(`/pacientes/${pacienteObj.id}/`).then(res => setPacienteDetalhes(res.data));
            }
        // MODO CRIAÇÃO: Só é executado se não houver um evento para editar
        } else if (initialData) {
            setFormData(prev => ({ 
                ...getInitialFormData(), // Começa com o formulário limpo
                data_hora_inicio: new Date(initialData.start).toISOString().slice(0, 16) 
            }));
        }
    }, [editingEvent, initialData, pacientes, procedimentos, open]);

    // Lógica para definir os padrões quando um paciente é selecionado
    const handlePacienteChange = useCallback((event, pacienteSelecionado) => {
        if (pacienteSelecionado) {
            apiClient.get(`/pacientes/${pacienteSelecionado.id}/`).then(response => {
                const detalhes = response.data;
                setPacienteDetalhes(detalhes);
                const tipoAtendimentoPadrao = detalhes.plano_convenio ? 'Convenio' : 'Particular';
                setFormData(currentFormData => ({
                    ...currentFormData,
                    paciente: pacienteSelecionado,
                    plano_utilizado: detalhes.plano_convenio,
                    tipo_atendimento: tipoAtendimentoPadrao
                }));
            });
        } else {
            setPacienteDetalhes(null);
            setFormData(currentFormData => ({ ...currentFormData, paciente: null, plano_utilizado: null, tipo_atendimento: 'Particular' }));
        }
    }, []);

     // 3. Lógica de submissão atualizada para enviar o ID do procedimento
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const submissionData = {
          ...formData,
          paciente: formData.paciente?.id || null,
          procedimento: formData.procedimento?.id || null, // <-- Enviamos o ID do procedimento
          // O campo 'tipo_consulta' será preenchido no backend se necessário, ou podemos derivá-lo aqui
          tipo_consulta: formData.procedimento ? formData.procedimento.descricao : 'Consulta',
        };

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
            onChange={handlePacienteChange}
            loading={loading}
            renderInput={(params) => (<TextField {...params} label="Selecione o Paciente" required />)}
          />
          
          {pacienteDetalhes?.plano_convenio_detalhes && (
            <Box sx={{ p: 1.5, backgroundColor: '#f5f5f5', borderRadius: 1, border: '1px solid #e0e0e0' }}>
              <Typography variant="body2" color="text.secondary">
                Plano do Paciente: <strong>{pacienteDetalhes.plano_convenio_detalhes.convenio_nome} - {pacienteDetalhes.plano_convenio_detalhes.nome}</strong>
              </Typography>
            </Box>
          )}

          <Divider />
          
          {/* --- 4. SELETOR DE PROCEDIMENTOS SUBSTITUI O CAMPO DE TEXTO ANTIGO --- */}
          <Autocomplete
            options={procedimentos}
            getOptionLabel={(option) => `${option.codigo_tuss} - ${option.descricao}` || ''}
            value={formData.procedimento}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onChange={(event, newValue) => {
                setFormData({ ...formData, procedimento: newValue });
            }}
            loading={loading}
            renderInput={(params) => (<TextField {...params} label="Procedimento" required />)}
          />

          <FormControl fullWidth>
            <InputLabel>Tipo de Atendimento</InputLabel>
            <Select
                name="tipo_atendimento" value={formData.tipo_atendimento} label="Tipo de Atendimento"
                onChange={(e) => setFormData({...formData, tipo_atendimento: e.target.value})}
            >
                <MenuItem value="Particular">Particular</MenuItem>
                <MenuItem value="Convenio" disabled={!formData.plano_utilizado}>Convênio</MenuItem>
            </Select>
          </FormControl>

          <TextField label="Início" type="datetime-local" name="data_hora_inicio" value={formData.data_hora_inicio}
            onChange={(e) => setFormData({...formData, data_hora_inicio: e.target.value})} InputLabelProps={{ shrink: true }} required
          />
           <TextField label="Fim" type="datetime-local" name="data_hora_fim" value={formData.data_hora_fim}
            onChange={(e) => setFormData({...formData, data_hora_fim: e.target.value})} InputLabelProps={{ shrink: true }} required
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