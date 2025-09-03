// src/components/AgendamentoModal.jsx - VERSÃO FINAL E REFATORADA

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Button, CircularProgress, Autocomplete, FormControl, InputLabel, Select, MenuItem,
  Box, Typography
} from '@mui/material';

// 1. IMPORTAMOS OS DOIS SERVIÇOS QUE VAMOS USAR
import { agendamentoService } from '../services/agendamentoService';
import { pacienteService } from '../services/pacienteService'; 
import { useSnackbar } from '../contexts/SnackbarContext';

export default function AgendamentoModal({ open, onClose, onSave, editingEvent, initialData }) {
    const { showSnackbar } = useSnackbar();
    
    const getInitialFormData = () => ({
        paciente: null, data_hora_inicio: '', data_hora_fim: '', status: 'Confirmado',
        procedimento: null, plano_utilizado: null, tipo_atendimento: 'Particular', observacoes: '',
        tipo_visita: 'Primeira Consulta', // <-- NOVO
        modalidade: 'Presencial',        // <-- NOVO
    });

    const [formData, setFormData] = useState(getInitialFormData());
    const [pacientes, setPacientes] = useState([]);
    const [procedimentos, setProcedimentos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pacienteDetalhes, setPacienteDetalhes] = useState(null);

    useEffect(() => {
        if (open) {
            setLoading(true);
            agendamentoService.getModalData()
                .then(([pacientesResponse, procedimentosResponse]) => {
                    setPacientes(pacientesResponse.data);
                    setProcedimentos(procedimentosResponse.data);
                }).catch(error => { showSnackbar("Erro ao carregar dados.", 'error'); })
                .finally(() => setLoading(false));
        }
    }, [open, showSnackbar]);
    

    useEffect(() => {
        if (!open) {
            setFormData(getInitialFormData());
            setPacienteDetalhes(null);
            return;
        }

        if (editingEvent && pacientes.length > 0 && procedimentos.length > 0) {
            const dados = editingEvent.extendedProps;
            const pacienteObj = pacientes.find(p => p.id === dados.paciente) || null;
            const procedimentoObj = procedimentos.find(p => p.id === dados.procedimento) || null;
            
            if (pacienteObj) {
                setFormData({
                    ...getInitialFormData(),
                    paciente: pacienteObj,
                    data_hora_inicio: editingEvent.startStr.slice(0, 16),
                    data_hora_fim: editingEvent.endStr ? editingEvent.endStr.slice(0, 16) : '',
                    status: dados.status,
                    procedimento: procedimentoObj,
                    plano_utilizado: dados.plano_utilizado,
                    tipo_atendimento: dados.tipo_atendimento,
                    observacoes: dados.observacoes || '',
                });
                // 2. CORREÇÃO DA LINHA 65: Usando o novo serviço de paciente
                pacienteService.getPacienteDetalhes(pacienteObj.id).then(res => setPacienteDetalhes(res.data));
            }
        } else if (initialData) {
            setFormData(prev => ({ ...prev, data_hora_inicio: new Date(initialData.start).toISOString().slice(0, 16) }));
        }
    }, [editingEvent, initialData, pacientes, procedimentos, open]);

    const handlePacienteChange = useCallback((event, pacienteSelecionado) => {
        if (pacienteSelecionado) {
            // 3. CORREÇÃO DA LINHA 75: Usando o novo serviço de paciente
            pacienteService.getPacienteDetalhes(pacienteSelecionado.id).then(response => {
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

     const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const submissionData = {
          ...formData,
          paciente: formData.paciente?.id || null,
          procedimento: formData.procedimento?.id || null,
          tipo_consulta: formData.procedimento ? formData.procedimento.descricao : 'Consulta',
          // 2. Os novos campos (tipo_visita e modalidade) já estarão aqui por causa do ...formData
        };

        try {
            const request = editingEvent 
                ? agendamentoService.updateAgendamento(editingEvent.id, submissionData)
                : agendamentoService.createAgendamento(submissionData);
            
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

        const valorDoProcedimento = useMemo(() => {
        const { paciente, procedimento, tipo_atendimento } = formData;
        
        if (!procedimento) return null; // Se não há procedimento, não há valor

        if (tipo_atendimento === 'Convenio' && pacienteDetalhes?.plano_convenio) {
            const precoConvenio = procedimento.valores_convenio.find(
                vc => vc.plano_convenio.id === pacienteDetalhes.plano_convenio
            );
            if (precoConvenio) {
                return `Valor (Convênio): R$ ${precoConvenio.valor}`;
            } else {
                return "Valor não definido para este plano.";
            }
        }
        // Se for particular ou não encontrar preço de convênio, mostra o particular
        return `Valor (Particular): R$ ${procedimento.valor_particular}`;

    }, [formData.procedimento, formData.tipo_atendimento, pacienteDetalhes]);

    // O JSX (a parte visual) continua exatamente o mesmo
    return (
     <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        {/* ... todo o seu JSX permanece aqui ... */}
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
            {valorDoProcedimento && (
        <Box sx={{ p: 1.5, backgroundColor: '#e3f2fd', borderRadius: 1, mt: -1 }}>
            <Typography variant="body2" color="primary.main" sx={{ fontWeight: 'bold' }}>
                {valorDoProcedimento}
            </Typography>
        </Box>
    )}
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
<FormControl fullWidth>
                        <InputLabel>Modalidade</InputLabel>
                        <Select
                            name="modalidade"
                            value={formData.modalidade}
                            label="Modalidade"
                            onChange={(e) => setFormData({...formData, modalidade: e.target.value})}
                        >
                            <MenuItem value="Presencial">Presencial (na clínica)</MenuItem>
                            <MenuItem value="Telemedicina">Telemedicina</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl fullWidth>
                        <InputLabel>Tipo da Visita</InputLabel>
                        <Select
                            name="tipo_visita"
                            value={formData.tipo_visita}
                            label="Tipo da Visita"
                            onChange={(e) => setFormData({...formData, tipo_visita: e.target.value})}
                        >
                            <MenuItem value="Primeira Consulta">Primeira Consulta</MenuItem>
                            <MenuItem value="Retorno">Retorno</MenuItem>
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
                <MenuItem value="Aguardando Pagamento">Aguardando Pagamento</MenuItem>
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