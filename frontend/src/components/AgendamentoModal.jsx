// src/components/AgendamentoModal.jsx - VERSÃO CORRIGIDA E SEGURA

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Button, CircularProgress, Autocomplete, FormControl, InputLabel, Select, MenuItem,
  Box, Typography, Divider
} from '@mui/material';
import { agendamentoService } from '../services/agendamentoService';
import { pacienteService } from '../services/pacienteService'; // Importado para detalhes do paciente
import { useSnackbar } from '../contexts/SnackbarContext';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs from 'dayjs';

const getInitialFormData = () => ({
    paciente: null,
    data_hora_inicio: null,
    data_hora_fim: null,
    status: 'Agendado', // <-- VALOR INICIAL SEGURO (Aguardando Pagamento)
    tipo_atendimento: 'Particular', // <-- CAMPO REINTEGRADO
    plano_utilizado: null,
    observacoes: '',
    tipo_visita: 'Primeira Consulta',
    modalidade: 'Presencial',
    especialidade: null,
    medico: null,
    procedimento: null,
});

export default function AgendamentoModal({ open, onClose, onSave, editingEvent, initialData }) {
    const { showSnackbar } = useSnackbar();
    
    // --- ESTADOS ---
    const [formData, setFormData] = useState(getInitialFormData());
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // --- ESTADOS PARA DADOS DA API ---
    const [pacientes, setPacientes] = useState([]);
    const [procedimentos, setProcedimentos] = useState([]);
    const [medicos, setMedicos] = useState([]);
    const [especialidades, setEspecialidades] = useState([]);
    const [pacienteDetalhes, setPacienteDetalhes] = useState(null); // Para dados do convênio
    
    const [tipoAgendamento, setTipoAgendamento] = useState('Consulta');

    // Efeito para buscar todos os dados quando o modal abre
    useEffect(() => {
        if (open) {
            agendamentoService.getModalData()
                .then(([pacientesRes, procedimentosRes, medicosRes, especialidadesRes]) => {
                    setPacientes(pacientesRes.data);
                    setProcedimentos(procedimentosRes.data.filter(p => p.descricao.toLowerCase() !== 'consulta')); // Filtra "consulta" dos procedimentos
                    setMedicos(medicosRes.data);
                    setEspecialidades(especialidadesRes.data);
                }).catch(error => { showSnackbar("Erro ao carregar dados.", 'error'); });
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
             // Lógica para edição
        } else if (initialData) {
            // Lógica para criação
            setFormData(prev => ({ ...prev, data_hora_inicio: dayjs(initialData.start) }));
        }
    }, [editingEvent, initialData, open]);
    
    // --- LÓGICA PARA ATUALIZAR DADOS QUANDO UM PACIENTE É SELECIONADO ---
    const handlePacienteChange = useCallback((event, pacienteSelecionado) => {
        setFormData(prev => ({ ...prev, paciente: pacienteSelecionado }));
        if (pacienteSelecionado) {
            pacienteService.getPacienteDetalhes(pacienteSelecionado.id).then(response => {
                const detalhes = response.data;
                setPacienteDetalhes(detalhes);
                // Define o tipo de atendimento e plano baseado nos dados do paciente
                setFormData(currentFormData => ({
                    ...currentFormData,
                    tipo_atendimento: detalhes.plano_convenio ? 'Convenio' : 'Particular',
                    plano_utilizado: detalhes.plano_convenio || null,
                }));
            });
        } else {
            setPacienteDetalhes(null);
            setFormData(currentFormData => ({ ...currentFormData, tipo_atendimento: 'Particular', plano_utilizado: null }));
        }
    }, []);


    // --- LÓGICA DE SUBMISSÃO FINAL ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        const submissionData = {
          ...formData,
          tipo_agendamento: tipoAgendamento,
          paciente: formData.paciente?.id || null,
          medico: formData.medico?.id || null,
          especialidade: formData.especialidade?.id || null,
          procedimento: formData.procedimento?.id || null,
          data_hora_inicio: formData.data_hora_inicio ? formData.data_hora_inicio.toISOString() : null,
          data_hora_fim: formData.data_hora_fim ? formData.data_hora_fim.toISOString() : null,
        };

        try {
            const request = editingEvent 
                ? agendamentoService.updateAgendamento(editingEvent.id, submissionData)
                : agendamentoService.createAgendamento(submissionData);
            
            await request;
            showSnackbar(editingEvent ? 'Agendamento atualizado!' : 'Agendamento criado!', 'success');
            onSave();
        } catch (error) {
            const errorData = error.response?.data;
            const errorMsg = typeof errorData === 'object' ? Object.values(errorData).flat()[0] : 'Erro ao salvar agendamento.';
            showSnackbar(errorMsg, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const valorExibido = useMemo(() => {
        if (formData.tipo_atendimento === 'Particular') {
            if (tipoAgendamento === 'Consulta' && formData.especialidade?.valor_consulta) {
                return `Valor (Particular): R$ ${formData.especialidade.valor_consulta}`;
            }
            if (tipoAgendamento === 'Procedimento' && formData.procedimento?.valor_particular) {
                return `Valor (Particular): R$ ${formData.procedimento.valor_particular}`;
            }
        }
        // A lógica de valor por convênio é mais complexa e pode ser adicionada aqui se necessário
        return null;
    }, [tipoAgendamento, formData]);

    
    return (
     <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>{editingEvent ? 'Editar Agendamento' : 'Novo Agendamento'}</DialogTitle>
      
        <form onSubmit={handleSubmit}>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '10px !important' }}>
            
                <Autocomplete options={pacientes} getOptionLabel={(p) => p.nome_completo || ''}
                    value={formData.paciente} isOptionEqualToValue={(o, v) => o.id === v.id}
                    onChange={handlePacienteChange}
                    renderInput={(params) => (<TextField {...params} label="Paciente" required />)} />
                
                {pacienteDetalhes?.plano_convenio_detalhes && (
                    <Box sx={{ p: 1.5, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            Plano: <strong>{pacienteDetalhes.plano_convenio_detalhes.convenio_nome} - {pacienteDetalhes.plano_convenio_detalhes.nome}</strong>
                        </Typography>
                    </Box>
                )}

                <FormControl fullWidth>
                    <InputLabel>Tipo de Agendamento</InputLabel>
                    <Select value={tipoAgendamento} label="Tipo de Agendamento"
                        onChange={(e) => setTipoAgendamento(e.target.value)} >
                        <MenuItem value="Consulta">Consulta</MenuItem>
                        <MenuItem value="Procedimento">Procedimento</MenuItem>
                    </Select>
                </FormControl>

                <Divider />

                {tipoAgendamento === 'Consulta' ? (
                    <>
                        <Autocomplete options={especialidades} getOptionLabel={(e) => e.nome || ''}
                            value={formData.especialidade} isOptionEqualToValue={(o, v) => o.id === v.id}
                            onChange={(e, value) => setFormData({ ...formData, especialidade: value, medico: null })}
                            renderInput={(params) => <TextField {...params} label="Especialidade" required />} />

                        <Autocomplete 
                            options={medicos.filter(m => formData.especialidade ? m.especialidades.includes(formData.especialidade.id) : true)}
                            getOptionLabel={(m) => m.first_name + ' ' + m.last_name}
                            value={formData.medico} isOptionEqualToValue={(o, v) => o.id === v.id}
                            onChange={(e, value) => setFormData({ ...formData, medico: value })}
                            disabled={!formData.especialidade}
                            renderInput={(params) => <TextField {...params} label="Médico" required />} />
                    </>
                ) : (
                    <Autocomplete options={procedimentos} getOptionLabel={(p) => p.descricao || ''}
                        value={formData.procedimento} isOptionEqualToValue={(o, v) => o.id === v.id}
                        onChange={(e, value) => setFormData({ ...formData, procedimento: value })}
                        renderInput={(params) => (<TextField {...params} label="Procedimento" required />)} />
                )}
                
                {/* --- CAMPO DE TIPO DE ATENDIMENTO REINTEGRADO --- */}
                <FormControl fullWidth>
                    <InputLabel>Tipo de Atendimento</InputLabel>
                    <Select name="tipo_atendimento" value={formData.tipo_atendimento} label="Tipo de Atendimento"
                        onChange={(e) => setFormData({...formData, tipo_atendimento: e.target.value})}>
                        <MenuItem value="Particular">Particular</MenuItem>
                        <MenuItem value="Convenio" disabled={!pacienteDetalhes?.plano_convenio}>Convênio</MenuItem>
                    </Select>
                </FormControl>

                {valorExibido && (
                    <Box sx={{ p: 1.5, backgroundColor: '#e3f2fd', borderRadius: 1, mt: -1 }}>
                        <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'bold' }}>{valorExibido}</Typography>
                    </Box>
                )}
                
                <DateTimePicker label="Início" value={formData.data_hora_inicio}
                    onChange={(value) => setFormData({ ...formData, data_hora_inicio: value, data_hora_fim: value ? value.add(50, 'minute') : null })} />
                
                <DateTimePicker label="Fim" value={formData.data_hora_fim}
                    onChange={(value) => setFormData({ ...formData, data_hora_fim: value })} />
                
                {/* --- CAMPO DE STATUS REINTEGRADO --- */}
                <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select name="status" value={formData.status} label="Status" onChange={(e) => setFormData({...formData, status: e.target.value})}>
                        <MenuItem value="Agendado">Agendado (Aguardando Pagamento)</MenuItem>
                        <MenuItem value="Confirmado">Confirmado (Pago)</MenuItem>
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