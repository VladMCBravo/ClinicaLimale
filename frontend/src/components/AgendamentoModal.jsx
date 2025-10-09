// src/components/AgendamentoModal.jsx - VERSÃO CORRIGIDA E ROBUSTA

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Button, CircularProgress, Autocomplete, FormControl, Box, Grid
} from '@mui/material';
import { agendamentoService } from '../services/agendamentoService';
import { useSnackbar } from '../contexts/SnackbarContext';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs from 'dayjs';

const getInitialFormData = () => ({
    paciente: null, data_hora_inicio: null, data_hora_fim: null, status: 'Agendado',
    tipo_atendimento: 'Particular', plano_utilizado: null, observacoes: '',
    tipo_visita: 'Primeira Consulta', modalidade: 'Presencial', especialidade: null,
    medico: null, procedimento: null, sala: null
});

export default function AgendamentoModal({ open, onClose, onSave, editingEvent, initialData }) {
    const { showSnackbar } = useSnackbar();
    
    // --- ESTADOS ---
    const [formData, setFormData] = useState(getInitialFormData());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pacientes, setPacientes] = useState([]);
    const [procedimentos, setProcedimentos] = useState([]);
    const [medicos, setMedicos] = useState([]);
    const [especialidades, setEspecialidades] = useState([]);
    const [salas, setSalas] = useState([]);
    const [tipoAgendamento, setTipoAgendamento] = useState('Consulta');

    // Efeito para buscar dados gerais (pacientes, médicos, salas, etc.)
    useEffect(() => {
        if (open) {
            agendamentoService.getModalData()
                .then(([pacientesRes, procedimentosRes, medicosRes, especialidadesRes]) => {
                    setPacientes(pacientesRes.data);
                    setProcedimentos(procedimentosRes.data);
                    setMedicos(medicosRes.data);
                    setEspecialidades(especialidadesRes.data);
                }).catch(error => { showSnackbar("Erro ao carregar dados.", 'error'); });
            
            agendamentoService.getSalas()
                .then(response => setSalas(response.data))
                .catch(error => showSnackbar("Erro ao carregar lista de salas.", 'error'));
        }
    }, [open, showSnackbar]);


    // Efeito para preencher o formulário
    useEffect(() => {
        if (!open) {
            setFormData(getInitialFormData());
            setTipoAgendamento('Consulta');
            return;
        }

        if (editingEvent) {
             // <<-- A CORREÇÃO ESTÁ AQUI -->>
             // Verificamos se 'extendedProps' existe. Se sim, é um evento do FullCalendar.
             // Se não, é um objeto de agendamento puro (vindo da Lista de Espera).
             const isFullCalendarEvent = !!editingEvent.extendedProps;
             const dados = isFullCalendarEvent ? editingEvent.extendedProps : editingEvent;
             
             setTipoAgendamento(dados.tipo_agendamento || 'Consulta');
             setFormData({
                paciente: pacientes.find(p => p.id === dados.paciente) || null,
                data_hora_inicio: dayjs(isFullCalendarEvent ? editingEvent.startStr : dados.data_hora_inicio),
                data_hora_fim: dayjs(isFullCalendarEvent ? editingEvent.endStr : dados.data_hora_fim),
                status: dados.status,
                tipo_atendimento: dados.tipo_atendimento,
                observacoes: dados.observacoes || '',
                tipo_visita: dados.tipo_visita || 'Primeira Consulta',
                modalidade: dados.modalidade || 'Presencial',
                especialidade: especialidades.find(e => e.id === dados.especialidade) || null,
                sala: salas.find(s => s.id === dados.sala) || null,
                medico: medicos.find(m => m.id === dados.medico) || null,
                procedimento: procedimentos.find(p => p.id === dados.procedimento) || null,
                // O plano é buscado em outro useEffect, então não precisa estar aqui.
             });
        } else if (initialData) {
            const startTime = dayjs(initialData.start);
            setFormData(prev => ({ 
                ...prev, 
                data_hora_inicio: startTime,
                data_hora_fim: startTime.add(50, 'minute'),
                sala: initialData.resource ? salas.find(s => s.id === initialData.resource.id) : null,
            }));
        }
    }, [editingEvent, initialData, open, pacientes, procedimentos, medicos, especialidades, salas]); // Dependências estão corretas
    
    // ... (O resto do seu componente, como handleSubmit, useEffect de capacidade, etc., pode permanecer o mesmo)
    
    // Apenas para garantir, aqui está um handleSubmit compatível
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        // Assegura que o ID seja extraído corretamente do objeto antes de enviar
        const submissionData = {
          ...formData,
          sala: formData.sala?.id || null,
          paciente: formData.paciente?.id || null,
          medico: formData.medico?.id || null,
          especialidade: formData.especialidade?.id || null,
          procedimento: formData.procedimento?.id || null,
          tipo_agendamento: tipoAgendamento,
          data_hora_inicio: formData.data_hora_inicio?.toISOString() || null,
          data_hora_fim: formData.data_hora_fim?.toISOString() || null,
        };
        // Remove a propriedade 'plano_utilizado' se ela for um objeto, enviando só o ID
        if (submissionData.plano_utilizado && typeof submissionData.plano_utilizado === 'object') {
            submissionData.plano_utilizado = submissionData.plano_utilizado.id;
        }

        try {
            const eventId = editingEvent?.id;
            const request = eventId
                ? agendamentoService.updateAgendamento(eventId, submissionData)
                : agendamentoService.createAgendamento(submissionData);
            
            await request;
            showSnackbar(eventId ? 'Agendamento atualizado!' : 'Agendamento criado!', 'success');
            onSave();
        } catch (error) {
            const errorData = error.response?.data;
            let errorMsg = 'Erro ao salvar agendamento.';
            if (typeof errorData === 'object' && errorData !== null) {
                 errorMsg = Object.values(errorData).flat()[0];
            }
            showSnackbar(errorMsg, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // JSX do seu componente (sem necessidade de grandes mudanças)
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            {/* ... Seu JSX aqui ... */}
            <form onSubmit={handleSubmit}>
                {/* ... DialogTitle, DialogContent, etc ... */}
                 <DialogActions>
                    <Button onClick={onClose}>Cancelar</Button>
                    <Button type="submit" variant="contained" disabled={isSubmitting || !formData.paciente || !formData.sala}>
                        {isSubmitting ? <CircularProgress size={24} /> : 'Salvar'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}