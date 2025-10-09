// src/components/AgendamentoModal.jsx - VERSÃO COMPLETA E CORRIGIDA

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Button, CircularProgress, Autocomplete, FormControl, InputLabel, Select, MenuItem,
  Box, Typography, Divider, Chip, Grid
} from '@mui/material';
import { agendamentoService } from '../services/agendamentoService';
import { pacienteService } from '../services/pacienteService';
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
    const [pacienteDetalhes, setPacienteDetalhes] = useState(null);
    const [tipoAgendamento, setTipoAgendamento] = useState('Consulta');
    const [capacidade, setCapacidade] = useState({ consultas: 0, procedimentos: 0, loading: false });
    const [isSlotAvailable, setIsSlotAvailable] = useState(true);

    // Efeito para buscar dados gerais (pacientes, médicos, salas, etc.)
    useEffect(() => {
        if (open) {
            agendamentoService.getModalData()
                .then(([pacientesRes, procedimentosRes, medicosRes, especialidadesRes]) => {
                    setPacientes(pacientesRes.data);
                    setProcedimentos(procedimentosRes.data.filter(p => p.descricao.toLowerCase() !== 'consulta'));
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
            setPacienteDetalhes(null);
            return;
        }

        if (editingEvent) {
            // <<-- CORREÇÃO PRINCIPAL APLICADA AQUI -->>
            // Verifica se o evento vem do FullCalendar (tem .extendedProps) ou da Lista de Espera (objeto direto)
            const isFullCalendarEvent = !!editingEvent.extendedProps;
            const dados = isFullCalendarEvent ? editingEvent.extendedProps : editingEvent;

            setTipoAgendamento(dados.tipo_agendamento || 'Consulta');
            setFormData({
                paciente: pacientes.find(p => p.id === dados.paciente) || null,
                data_hora_inicio: dayjs(isFullCalendarEvent ? editingEvent.startStr : dados.data_hora_inicio),
                data_hora_fim: dayjs(isFullCalendarEvent ? editingEvent.endStr : dados.data_hora_fim),
                status: dados.status,
                tipo_atendimento: dados.tipo_atendimento,
                plano_utilizado: dados.plano_utilizado,
                observacoes: dados.observacoes || '',
                tipo_visita: dados.tipo_visita || 'Primeira Consulta',
                modalidade: dados.modalidade || 'Presencial',
                especialidade: especialidades.find(e => e.id === dados.especialidade) || null,
                sala: salas.find(s => s.id === dados.sala) || null,
                medico: medicos.find(m => m.id === dados.medico) || null,
                procedimento: procedimentos.find(p => p.id === dados.procedimento) || null,
            });
        } else if (initialData) {
            // Lógica para criação (já estava correta)
            const startTime = dayjs(initialData.start);
            setFormData(prev => ({ 
                ...prev, 
                data_hora_inicio: startTime,
                data_hora_fim: startTime.add(50, 'minute'),
                sala: initialData.resource ? salas.find(s => s.id === initialData.resource.id) : null,
            }));
        }
    }, [editingEvent, initialData, open, pacientes, procedimentos, medicos, especialidades, salas]);
    
    // ... (o restante dos seus useEffects, handlers e JSX já estavam corretos e foram mantidos abaixo)

    useEffect(() => {
        if (open && formData.data_hora_inicio && formData.data_hora_fim) {
            setCapacidade(prev => ({ ...prev, loading: true }));
            const inicioISO = formData.data_hora_inicio.toISOString();
            const fimISO = formData.data_hora_fim.toISOString();
            agendamentoService.verificarCapacidade(inicioISO, fimISO)
                .then(response => setCapacidade({ consultas: response.data.consultas_agendadas, procedimentos: response.data.procedimentos_agendados, loading: false }))
                .catch(err => { console.error("Erro ao verificar capacidade", err); setCapacidade({ consultas: 0, procedimentos: 0, loading: false }); });
        }
    }, [open, formData.data_hora_inicio, formData.data_hora_fim]);

    useEffect(() => {
        const CAPACIDADE_CONSULTAS = 3;
        const CAPACidade_procedimentos = 1;
        if (!open) return;
        let consultasOcupadas = capacidade.consultas;
        let procedimentosOcupados = capacidade.procedimentos;
        if (editingEvent) {
            const tipoOriginal = editingEvent.extendedProps ? editingEvent.extendedProps.tipo_agendamento : editingEvent.tipo_agendamento;
            if (tipoOriginal === 'Consulta') consultasOcupadas = Math.max(0, consultasOcupadas - 1);
            if (tipoOriginal === 'Procedimento') procedimentosOcupados = Math.max(0, procedimentosOcupados - 1);
        }
        if (tipoAgendamento === 'Consulta') setIsSlotAvailable(consultasOcupadas < CAPACIDADE_CONSULTAS);
        else if (tipoAgendamento === 'Procedimento') setIsSlotAvailable(procedimentosOcupados < CAPACidade_procedimentos);
        else setIsSlotAvailable(true);
    }, [capacidade, tipoAgendamento, editingEvent, open]);

    const handlePacienteChange = useCallback((event, pacienteSelecionado) => {
        setFormData(prev => ({ ...prev, paciente: pacienteSelecionado }));
        if (pacienteSelecionado) {
            pacienteService.getPacienteDetalhes(pacienteSelecionado.id).then(response => {
                const detalhes = response.data;
                setPacienteDetalhes(detalhes);
                setFormData(currentFormData => ({ ...currentFormData, tipo_atendimento: detalhes.plano_convenio ? 'Convenio' : 'Particular', plano_utilizado: detalhes.plano_convenio || null }));
            });
        } else {
            setPacienteDetalhes(null);
            setFormData(currentFormData => ({ ...currentFormData, tipo_atendimento: 'Particular', plano_utilizado: null }));
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const submissionData = {
          ...formData,
          sala: formData.sala?.id || null,
          tipo_agendamento: tipoAgendamento,
          paciente: formData.paciente?.id || null,
          medico: formData.medico?.id || null,
          especialidade: formData.especialidade?.id || null,
          procedimento: formData.procedimento?.id || null,
          data_hora_inicio: formData.data_hora_inicio ? formData.data_hora_inicio.toISOString() : null,
          data_hora_fim: formData.data_hora_fim ? formData.data_hora_fim.toISOString() : null,
        };
        try {
            const eventId = editingEvent?.id;
            const request = eventId ? agendamentoService.updateAgendamento(eventId, submissionData) : agendamentoService.createAgendamento(submissionData);
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
    
    const valorExibido = useMemo(() => {
        if (formData.tipo_atendimento === 'Particular') {
            if (tipoAgendamento === 'Consulta' && formData.especialidade?.valor_consulta) return `Valor (Particular): R$ ${formData.especialidade.valor_consulta}`;
            if (tipoAgendamento === 'Procedimento' && formData.procedimento?.valor_particular) return `Valor (Particular): R$ ${formData.procedimento.valor_particular}`;
        }
        return null;
    }, [tipoAgendamento, formData.especialidade, formData.procedimento, formData.tipo_atendimento]);

    const renderCapacidadeInfo = () => {
        const CAPACIDADE_CONSULTAS = 3;
        const CAPACIDADE_PROCEDIMENTOS = 1;
        const consultasDisponiveis = CAPACIDADE_CONSULTAS - capacidade.consultas;
        const procedimentosDisponiveis = CAPACIDADE_PROCEDIMENTOS - capacidade.procedimentos;
        return (
            <Box sx={{ p: 1.5, backgroundColor: '#f0f4f8', borderRadius: 1, display: 'flex', gap: 2, alignItems: 'center', mt: 1, mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Disponibilidade:</Typography>
                {capacidade.loading ? <CircularProgress size={20} /> : (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip label={`Consultas: ${consultasDisponiveis}`} color={consultasDisponiveis > 0 ? "success" : "error"} size="small" variant="outlined" />
                        <Chip label={`Procedimentos: ${procedimentosDisponiveis}`} color={procedimentosDisponiveis > 0 ? "success" : "error"} size="small" variant="outlined" />
                    </Box>
                )}
            </Box>
        );
    };
    
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" component="div">{editingEvent ? 'Editar Agendamento' : 'Novo Agendamento'}</Typography>
                    {formData.data_hora_inicio && renderCapacidadeInfo()} 
                </Box>
            </DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent dividers sx={{ p: 3 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={7}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                <FormControl fullWidth><Autocomplete options={salas} getOptionLabel={(s) => s.nome || ''} value={formData.sala} isOptionEqualToValue={(o, v) => o.id === v.id} onChange={(e, value) => setFormData(prev => ({...prev, sala: value}))} renderInput={(params) => (<TextField {...params} label="Sala *" size="small" />)} /></FormControl>
                                <FormControl fullWidth><Autocomplete options={pacientes} getOptionLabel={(p) => p.nome_completo || ''} value={formData.paciente} isOptionEqualToValue={(o, v) => o.id === v.id} onChange={handlePacienteChange} renderInput={(params) => (<TextField {...params} label="Paciente *" size="small" />)} /></FormControl>
                                {pacienteDetalhes?.plano_convenio_detalhes && (<Box sx={{ p: 1.5, backgroundColor: '#f5f5f5', borderRadius: 1 }}><Typography variant="body2" color="text.secondary">Plano: <strong>{pacienteDetalhes.plano_convenio_detalhes.convenio_nome} - {pacienteDetalhes.plano_convenio_detalhes.nome}</strong></Typography></Box>)}
                                <Divider sx={{ my: 1 }}><Chip label="Detalhes do Agendamento" size="small" /></Divider>
                                <FormControl fullWidth size="small"><InputLabel>Tipo de Agendamento</InputLabel><Select value={tipoAgendamento} label="Tipo de Agendamento" onChange={(e) => setTipoAgendamento(e.target.value)}><MenuItem value="Consulta">Consulta</MenuItem><MenuItem value="Procedimento">Procedimento</MenuItem></Select></FormControl>
                                {tipoAgendamento === 'Consulta' ? (<><Autocomplete options={especialidades} getOptionLabel={(e) => e.nome || ''} value={formData.especialidade} isOptionEqualToValue={(o, v) => o.id === v.id} onChange={(e, value) => setFormData({ ...formData, especialidade: value, medico: null })} renderInput={(params) => <TextField {...params} label="Especialidade *" size="small" />} /><Autocomplete options={medicos.filter(m => formData.especialidade ? m.especialidades.includes(formData.especialidade.id) : true)} getOptionLabel={(m) => m.first_name + ' ' + m.last_name} value={formData.medico} isOptionEqualToValue={(o, v) => o.id === v.id} onChange={(e, value) => setFormData({ ...formData, medico: value })} disabled={!formData.especialidade} renderInput={(params) => <TextField {...params} label="Médico *" size="small" />} /></>) : (<Autocomplete options={procedimentos} getOptionLabel={(p) => p.descricao || ''} value={formData.procedimento} isOptionEqualToValue={(o, v) => o.id === v.id} onChange={(e, value) => setFormData({ ...formData, procedimento: value })} renderInput={(params) => (<TextField {...params} label="Procedimento *" size="small" />)} />)}
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={5}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                <FormControl fullWidth size="small"><InputLabel>Modalidade</InputLabel><Select name="modalidade" value={formData.modalidade} label="Modalidade" onChange={(e) => setFormData({...formData, modalidade: e.target.value})} ><MenuItem value="Presencial">Presencial (na clínica)</MenuItem><MenuItem value="Telemedicina">Telemedicina</MenuItem></Select></FormControl>
                                <FormControl fullWidth size="small"><InputLabel>Tipo de Atendimento</InputLabel><Select name="tipo_atendimento" value={formData.tipo_atendimento} label="Tipo de Atendimento" onChange={(e) => setFormData({...formData, tipo_atendimento: e.target.value})}><MenuItem value="Particular">Particular</MenuItem><MenuItem value="Convenio" disabled={!pacienteDetalhes?.plano_convenio}>Convênio</MenuItem></Select></FormControl>
                                {valorExibido && (<Box sx={{ p: 1.5, backgroundColor: '#e3f2fd', borderRadius: 1, mt: -1 }}><Typography variant="body2" color="primary.main" sx={{ fontWeight: 'bold' }}>{valorExibido}</Typography></Box>)}
                                <Divider sx={{ my: 1 }}><Chip label="Horário" size="small" /></Divider>
                                <Grid container spacing={2}><Grid item xs={12} sm={6}><DateTimePicker label="Início *" value={formData.data_hora_inicio} onChange={(newValue) => { setFormData({ ...formData, data_hora_inicio: newValue, data_hora_fim: newValue ? newValue.add(50, 'minute') : null }); }} slotProps={{ textField: { size: 'small' } }} /></Grid><Grid item xs={12} sm={6}><DateTimePicker label="Fim *" value={formData.data_hora_fim} onChange={(newValue) => setFormData({ ...formData, data_hora_fim: newValue })} slotProps={{ textField: { size: 'small' } }} /></Grid></Grid>
                                <FormControl fullWidth size="small"><InputLabel>Status</InputLabel><Select name="status" value={formData.status} label="Status" onChange={(e) => setFormData({...formData, status: e.target.value})}><MenuItem value="Agendado">Agendado (Aguardando Pagamento)</MenuItem><MenuItem value="Confirmado">Confirmado (Pago)</MenuItem><MenuItem value="Realizado">Realizado</MenuItem><MenuItem value="Não Compareceu">Não Compareceu</MenuItem></Select></FormControl>
                            </Box>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: '16px 24px' }}>
                    <Button onClick={onClose}>Cancelar</Button>
                    <Button type="submit" variant="contained" disabled={isSubmitting || !formData.paciente || !isSlotAvailable || !formData.sala}>
                        {isSubmitting ? <CircularProgress size={24} /> : 'Salvar'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}