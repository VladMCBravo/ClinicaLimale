// src/components/AgendamentoModal.jsx - VERSÃO COM VERIFICAÇÃO DE CAPACIDADE

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Button, CircularProgress, Autocomplete, FormControl, InputLabel, Select, MenuItem,
  Box, Typography, Divider, Chip // Chip foi importado para o indicador
} from '@mui/material';
import { agendamentoService } from '../services/agendamentoService';
import { pacienteService } from '../services/pacienteService';
import { useSnackbar } from '../contexts/SnackbarContext';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs from 'dayjs';

const getInitialFormData = () => ({
    paciente: null,
    data_hora_inicio: null,
    data_hora_fim: null,
    status: 'Agendado',
    tipo_atendimento: 'Particular',
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
    const [pacienteDetalhes, setPacienteDetalhes] = useState(null);
    const [tipoAgendamento, setTipoAgendamento] = useState('Consulta');

    // --- NOVO ESTADO PARA CONTROLE DE CAPACIDADE ---
    const [capacidade, setCapacidade] = useState({ consultas: 0, procedimentos: 0, loading: false });

    // Efeito para buscar dados gerais (pacientes, médicos, etc.)
    useEffect(() => {
        if (open) {
            agendamentoService.getModalData()
                .then(([pacientesRes, procedimentosRes, medicosRes, especialidadesRes]) => {
                    setPacientes(pacientesRes.data);
                    setProcedimentos(procedimentosRes.data.filter(p => p.descricao.toLowerCase() !== 'consulta'));
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
             const dados = editingEvent.extendedProps;
             // Lógica para preencher o form no modo de edição
             setTipoAgendamento(dados.tipo_agendamento || 'Consulta');
             setFormData({
                paciente: pacientes.find(p => p.id === dados.paciente) || null,
                data_hora_inicio: dayjs(editingEvent.startStr),
                data_hora_fim: dayjs(editingEvent.endStr),
                status: dados.status,
                tipo_atendimento: dados.tipo_atendimento,
                plano_utilizado: dados.plano_utilizado,
                observacoes: dados.observacoes || '',
                tipo_visita: dados.tipo_visita || 'Primeira Consulta',
                modalidade: dados.modalidade || 'Presencial', // <-- Preenche a modalidade
                especialidade: especialidades.find(e => e.id === dados.especialidade) || null,
                medico: medicos.find(m => m.id === dados.medico) || null,
                procedimento: procedimentos.find(p => p.id === dados.procedimento) || null,
             });
        } else if (initialData) {
            // Lógica para criação
            const startTime = dayjs(initialData.start);
            setFormData(prev => ({ 
                ...prev, 
                data_hora_inicio: startTime,
                data_hora_fim: startTime.add(50, 'minute') // <-- PREENCHE AUTOMATICAMENTE AQUI TAMBÉM
            }));
        }
    }, [editingEvent, initialData, open, pacientes, procedimentos, medicos, especialidades]);
    
    // --- NOVO EFEITO PARA VERIFICAR A CAPACIDADE DO HORÁRIO ---
    useEffect(() => {
        if (open && formData.data_hora_inicio && formData.data_hora_fim) {
            setCapacidade(prev => ({ ...prev, loading: true }));
            
            const inicioISO = formData.data_hora_inicio.toISOString();
            const fimISO = formData.data_hora_fim.toISOString();
            
            agendamentoService.verificarCapacidade(inicioISO, fimISO)
                .then(response => {
                    setCapacidade({
                        consultas: response.data.consultas_agendadas,
                        procedimentos: response.data.procedimentos_agendados,
                        loading: false
                    });
                })
                .catch(err => {
                    console.error("Erro ao verificar capacidade", err);
                    setCapacidade({ consultas: 0, procedimentos: 0, loading: false });
                });
        }
    }, [open, formData.data_hora_inicio, formData.data_hora_fim]); // Roda sempre que as datas mudam
    
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
    }, [tipoAgendamento, formData.especialidade, formData.procedimento, formData.tipo_atendimento]); // Lista de dependências corrigida

    // --- NOVA FUNÇÃO PARA RENDERIZAR O INDICADOR DE CAPACIDADE ---
    const renderCapacidadeInfo = () => {
        const CAPACIDADE_CONSULTAS = 3;
        const CAPACIDADE_PROCEDIMENTOS = 1;

        // Se estiver editando, subtrai 1 da contagem atual para não contar o próprio agendamento
        const countAjustadoConsultas = editingEvent && tipoAgendamento === 'Consulta' ? Math.max(0, capacidade.consultas -1) : capacidade.consultas;
        const countAjustadoProcedimentos = editingEvent && tipoAgendamento === 'Procedimento' ? Math.max(0, capacidade.procedimentos - 1) : capacidade.procedimentos;

        const consultasDisponiveis = CAPACIDADE_CONSULTAS - countAjustadoConsultas;
        const procedimentosDisponiveis = CAPACIDADE_PROCEDIMENTOS - countAjustadoProcedimentos;

        return (
            <Box sx={{ p: 1.5, backgroundColor: '#f0f4f8', borderRadius: 1, display: 'flex', gap: 2, alignItems: 'center', mt: 1, mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Disponibilidade:</Typography>
                {capacidade.loading ? <CircularProgress size={20} /> : (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip 
                            label={`Consultas: ${consultasDisponiveis}`}
                            color={consultasDisponiveis > 0 ? "success" : "error"}
                            size="small" variant="outlined"
                        />
                        <Chip 
                            label={`Procedimentos: ${procedimentosDisponiveis}`}
                            color={procedimentosDisponiveis > 0 ? "success" : "error"}
                            size="small" variant="outlined"
                        />
                    </Box>
                )}
            </Box>
        );
    };
    
    return (
     <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>{editingEvent ? 'Editar Agendamento' : 'Novo Agendamento'}</DialogTitle>
      
        <form onSubmit={handleSubmit}>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '10px !important' }}>
            
                {/* ... Autocomplete do Paciente (sem alteração) ... */}
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
                    
                    {/* --- CAMPO DE MODALIDADE ADICIONADO AQUI --- */}
                    <FormControl fullWidth>
                        <InputLabel>Modalidade</InputLabel>
                        <Select name="modalidade" value={formData.modalidade} label="Modalidade"
                            onChange={(e) => setFormData({...formData, modalidade: e.target.value})} >
                            <MenuItem value="Presencial">Presencial (na clínica)</MenuItem>
                                <MenuItem value="Telemedicina">Telemedicina</MenuItem>
                            </Select>
                        </FormControl>
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
                
                {/* --- MUDANÇA NA LÓGICA DE DATAS --- */}
                <DateTimePicker label="Início" value={formData.data_hora_inicio}
                    onChange={(newValue) => {
                        setFormData({ 
                            ...formData, 
                            data_hora_inicio: newValue, 
                            // Se a data de início for alterada, recalcula a data de fim
                            data_hora_fim: newValue ? newValue.add(50, 'minute') : null 
                        });
                    }} />
                
                <DateTimePicker label="Fim" value={formData.data_hora_fim}
                    onChange={(newValue) => setFormData({ ...formData, data_hora_fim: newValue })} />
                {/* --- INDICADOR DE CAPACIDADE ADICIONADO AQUI --- */}
                {formData.data_hora_inicio && renderCapacidadeInfo()}
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