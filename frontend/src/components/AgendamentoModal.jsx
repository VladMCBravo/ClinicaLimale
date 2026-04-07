// src/components/AgendamentoModal.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Button, CircularProgress, Autocomplete, FormControl, InputLabel, Select, MenuItem,
  Box, Typography, Divider, Chip, Grid, Switch, FormControlLabel
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete'; // Importando ícone
import PersonAddIcon from '@mui/icons-material/PersonAdd'; // <--- ADICIONE ESTA LINHA
import { agendamentoService } from '../services/agendamentoService';
import { pacienteService } from '../services/pacienteService';
import { useSnackbar } from '../contexts/SnackbarContext';
import { IMaskInput } from 'react-imask'; // Necessário para a máscara
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/pt-br';
import { createFilterOptions } from '@mui/material/Autocomplete';

// Configurações do Dayjs
dayjs.extend(customParseFormat);
dayjs.locale('pt-br');

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
    // MUDANÇA: Agora suportamos lista
    procedimento: null, // Mantido para compatibilidade se editar 1 só
    procedimentos: [],  // Novo campo para múltiplos
    sala: null,
    isento_cobranca: false, // <--- NOVO
    motivo_isencao: ''      // <--- NOVO
});

// --- COMPONENTE DE MÁSCARA (DATA + HORA) ---
const TextMaskDateTime = React.forwardRef(function TextMaskDateTime(props, ref) {
  const { onChange, ...other } = props;
  return (
    <IMaskInput
      {...other}
      mask="00/00/0000 00:00" // Máscara DD/MM/AAAA HH:MM
      definitions={{
        '0': /[0-9]/,
      }}
      inputRef={ref}
      onAccept={(value) => onChange({ target: { name: props.name, value } })}
      overwrite
    />
  );
});

const filter = createFilterOptions();

export default function AgendamentoModal({ open, onClose, onSave, editingEvent, initialData, onAbrirNovoPaciente }) {
    const { showSnackbar } = useSnackbar();

    // --- CONSTANTES DE CAPACIDADE (Definidas no escopo do componente) ---
    const MAX_CONS = 3;
    const MAX_PROC = 1;
    
    // --- ESTADOS ---
    const [formData, setFormData] = useState(getInitialFormData());
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ESTADOS VISUAIS (Faltavam no seu código anterior)
    const [dataInicioVisual, setDataInicioVisual] = useState('');
    const [dataFimVisual, setDataFimVisual] = useState('');
    
    // Dados brutos
    const [pacientes, setPacientes] = useState([]);
    const [procedimentos, setProcedimentos] = useState([]);
    const [medicos, setMedicos] = useState([]);
    const [especialidades, setEspecialidades] = useState([]);
    const [salas, setSalas] = useState([]); 
    const [isEncaixe, setIsEncaixe] = useState(false);
    
    // Dados filtrados/calculados
    const [salasFiltradas, setSalasFiltradas] = useState([]);
    const [pacienteDetalhes, setPacienteDetalhes] = useState(null);
    const [tipoAgendamento, setTipoAgendamento] = useState('Consulta');
    const [capacidade, setCapacidade] = useState({ consultas: 0, procedimentos: 0, loading: false });
    const [bloqueioCapacidade, setBloqueioCapacidade] = useState(false);
    const [isSlotAvailable, setIsSlotAvailable] = useState(true);
    
    // Efeito para buscar dados gerais
    useEffect(() => {
        if (open) {
            agendamentoService.getModalData()
                .then(([pacientesRes, procedimentosRes, medicosRes, especialidadesRes]) => {
                    // ORDENAÇÃO ALFABÉTICA ADICIONADA AQUI
                    const pacientesOrdenados = (pacientesRes.data || []).sort((a, b) => 
                        a.nome_completo.localeCompare(b.nome_completo)
                    );
                    setPacientes(pacientesOrdenados);
                    setProcedimentos(procedimentosRes.data.filter(p => p.descricao.toLowerCase() !== 'consulta'));
                    setMedicos(medicosRes.data);
                    setEspecialidades(especialidadesRes.data);
                }).catch(error => { showSnackbar("Erro ao carregar dados.", 'error'); });
            
            agendamentoService.getSalas()
                .then(response => {
                    setSalas(response.data);
                    setSalasFiltradas(response.data); 
                })
                .catch(error => showSnackbar("Erro ao carregar lista de salas.", 'error'));
        }
    }, [open, showSnackbar]);

    // Efeito para preencher o formulário
    useEffect(() => {
        if (!open) {
            setFormData(getInitialFormData());
            setTipoAgendamento('Consulta');
            setPacienteDetalhes(null);
            setDataInicioVisual('');
            setDataFimVisual('');
            setIsEncaixe(false);
            return;
        }

        if (editingEvent) {
            const isFullCalendarEvent = !!editingEvent.extendedProps;
            const dados = isFullCalendarEvent ? editingEvent.extendedProps : editingEvent;
            const tipo = dados.tipo_agendamento || 'Consulta';
            
            const inicioDayjs = dayjs(isFullCalendarEvent ? editingEvent.startStr : dados.data_hora_inicio);
            const fimDayjs = dayjs(isFullCalendarEvent ? editingEvent.endStr : dados.data_hora_fim);

            setTipoAgendamento(tipo);
            const procEncontrado = procedimentos.find(p => p.id === dados.procedimento) || null;
            
            // Popula form
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
                procedimento: procEncontrado, 
                // Se for procedimento, inicializamos o array com ele para o Autocomplete não vir vazio
                procedimentos: procEncontrado ? [procEncontrado] : [], 
        });

        // Popula VISUAL (String formatada)
            setDataInicioVisual(inicioDayjs.isValid() ? inicioDayjs.format('DD/MM/YYYY HH:mm') : '');
            setDataFimVisual(fimDayjs.isValid() ? fimDayjs.format('DD/MM/YYYY HH:mm') : '');

        } else if (initialData) {
            const startTime = dayjs(initialData.start);
            const endTime = startTime.add(15, 'minute');
            
            setFormData(prev => ({ 
                ...prev, 
                data_hora_inicio: startTime,
                data_hora_fim: endTime, 
                sala: initialData.resource ? salas.find(s => s.id === initialData.resource.id) : null,
                medico: initialData.medicoId ? medicos.find(m => m.id === initialData.medicoId) : null,
                especialidade: initialData.especialidadeId ? especialidades.find(e => e.id === initialData.especialidadeId) : null,
            }));

            // Popula VISUAL
            setDataInicioVisual(startTime.format('DD/MM/YYYY HH:mm'));
            setDataFimVisual(endTime.format('DD/MM/YYYY HH:mm'));
        }
    }, [editingEvent, initialData, open, pacientes, procedimentos, medicos, especialidades, salas]);

    // Filtro Inteligente de Salas (CORRIGIDO PARA MÚLTIPLOS)
    useEffect(() => {
        // 1. Descobrir qual procedimento considerar para o filtro
        // Se tiver um selecionado no modo singular, usa ele. 
        // Se não, pega o primeiro da lista de múltiplos.
        const procParaFiltro = formData.procedimento || (formData.procedimentos.length > 0 ? formData.procedimentos[0] : null);

        if (!procParaFiltro || tipoAgendamento === 'Consulta') {
            setSalasFiltradas(salas);
            return;
        }

        const equipamentoNecessario = procParaFiltro.equipamento_obrigatorio;

        if (equipamentoNecessario) {
            const compativeis = salas.filter(sala => 
                sala.equipamentos && sala.equipamentos.includes(equipamentoNecessario)
            );
            setSalasFiltradas(compativeis);

            // Verifica se a sala atual (se houver) é compatível
            if (formData.sala) {
                const salaTemEquipamento = formData.sala.equipamentos && formData.sala.equipamentos.includes(equipamentoNecessario);
                if (!salaTemEquipamento) {
                    setFormData(prev => ({ ...prev, sala: null }));
                    showSnackbar(`A sala anterior não possui ${equipamentoNecessario}. Selecione uma compatível.`, 'warning');
                }
            }
        } else {
            setSalasFiltradas(salas);
        }
        // Adicionamos formData.procedimentos nas dependências
    }, [formData.procedimento, formData.procedimentos, tipoAgendamento, salas, formData.sala, showSnackbar]);

    // --- HANDLERS DE DATA (DIGITAÇÃO FLUENTE) ---
    
    // Mudança de INÍCIO
    const handleDataInicioChange = (e) => {
        const valorVisual = e.target.value;
        setDataInicioVisual(valorVisual); // Atualiza visual na hora

        // Tenta converter para Dayjs
        if (valorVisual.length === 16) { // DD/MM/AAAA HH:mm tem 16 chars
            const novaDataInicio = dayjs(valorVisual, 'DD/MM/YYYY HH:mm', true);
            
            if (novaDataInicio.isValid()) {
                setFormData(prev => {
                    const novosDados = { ...prev, data_hora_inicio: novaDataInicio };
                    
                    // Recalcula o FIM automaticamente
                    let novaDataFim;
                    if (tipoAgendamento === 'Procedimento' && prev.procedimentos.length > 0) {
                        const minutosTotais = prev.procedimentos.length * 15;
                        novaDataFim = novaDataInicio.add(minutosTotais, 'minute');
                    } else {
                        novaDataFim = novaDataInicio.add(15, 'minute'); // Padrão consulta
                    }
                    
                    novosDados.data_hora_fim = novaDataFim;
                    // Atualiza também o visual do Fim
                    setDataFimVisual(novaDataFim.format('DD/MM/YYYY HH:mm'));
                    
                    return novosDados;
                });
            }
        } else {
            // Se apagou ou está incompleto, invalida o form data para evitar envio errado
            if (formData.data_hora_inicio) {
                setFormData(prev => ({...prev, data_hora_inicio: null}));
            }
        }
    };

    // Mudança de FIM (Manual)
    const handleDataFimChange = (e) => {
        const valorVisual = e.target.value;
        setDataFimVisual(valorVisual);

        if (valorVisual.length === 16) {
            const novaDataFim = dayjs(valorVisual, 'DD/MM/YYYY HH:mm', true);
            if (novaDataFim.isValid()) {
                setFormData(prev => ({ ...prev, data_hora_fim: novaDataFim }));
            }
        } else {
            if (formData.data_hora_fim) {
                setFormData(prev => ({...prev, data_hora_fim: null}));
            }
        }
    };

    // Mudança de PROCEDIMENTOS (Atualiza o tempo final)
    const handleProcedimentosChange = (event, values) => {
        setFormData(prev => {
            const novoState = { ...prev, procedimentos: values };
            
            /// Recalcula FIM se tiver INÍCIO
            if (prev.data_hora_inicio && prev.data_hora_inicio.isValid()) {
                const minutosTotais = values.length * 15;
                const novoFim = prev.data_hora_inicio.add(minutosTotais || 15, 'minute');
                novoState.data_hora_fim = novoFim;
                setDataFimVisual(novoFim.format('DD/MM/YYYY HH:mm'));
            }
            return novoState;
        });
    };
    
    // --- LÓGICA DE CAPACIDADE ATUALIZADA (COM BLINDAGEM) ---
    useEffect(() => {
        const inicioValido = formData.data_hora_inicio && formData.data_hora_inicio.isValid();
        const fimValido = formData.data_hora_fim && formData.data_hora_fim.isValid();
        
        // Extraímos a sala antes do IF
        const salaId = formData.sala ? formData.sala.id : null;

        // A MÁGICA ESTÁ AQUI: Adicionamos o "&& salaId" na condição.
        // O React agora vai "esperar" a sala ser selecionada/carregada antes de verificar!
        if (open && inicioValido && fimValido && salaId) {
            setCapacidade(prev => ({ ...prev, loading: true }));
            
            const inicioISO = formData.data_hora_inicio.toISOString();
            const fimISO = formData.data_hora_fim.toISOString();
            
            agendamentoService.verificarCapacidade(inicioISO, fimISO, salaId)
                .then(response => {
                    setCapacidade({ 
                        consultas: response.data.consultas_agendadas, 
                        procedimentos: response.data.procedimentos_agendados, 
                        loading: false 
                    });
                })
                .catch(err => { 
                    setCapacidade({ consultas: 0, procedimentos: 0, loading: false }); 
                });
        }
    }, [open, formData.data_hora_inicio, formData.data_hora_fim, formData.sala]); // Mantemos o formData.sala aqui

    // Lógica de Bloqueio (CORRIGIDA)
    useEffect(() => {
        if (!open) return;

        let ocupacaoConsultas = capacidade.consultas;
        let ocupacaoProcedimentos = capacidade.procedimentos;

        // Se estamos editando, subtraímos o próprio agendamento da contagem para não contar duplicado
        if (editingEvent) {
            const tipoOriginal = editingEvent.extendedProps ? editingEvent.extendedProps.tipo_agendamento : editingEvent.tipo_agendamento;
            if (tipoOriginal === 'Consulta') ocupacaoConsultas = Math.max(0, ocupacaoConsultas - 1);
            if (tipoOriginal === 'Procedimento') ocupacaoProcedimentos = Math.max(0, ocupacaoProcedimentos - 1);
        }

        let bloqueado = false;
        if (tipoAgendamento === 'Consulta') bloqueado = ocupacaoConsultas >= MAX_CONS;
        else if (tipoAgendamento === 'Procedimento') bloqueado = ocupacaoProcedimentos >= MAX_PROC;

        setBloqueioCapacidade(bloqueado);

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

    // --- VALIDAÇÃO CORRIGIDA ---
    const validarFormulario = () => {
        if (!formData.paciente) return "Selecione um paciente.";
        if (!formData.data_hora_inicio || !formData.data_hora_fim) return "Defina o horário de início e fim.";
        
        //if (!editingEvent && formData.data_hora_inicio.isBefore(dayjs())) {    
        //    return "Não é possível criar agendamentos no passado.";
        //}

        if (formData.data_hora_inicio.isAfter(formData.data_hora_fim)) {
            return "A data de fim deve ser posterior à data de início.";
        }

        if (!formData.sala) return "Selecione uma sala/consultório.";

        if (tipoAgendamento === 'Consulta') {
            if (!formData.especialidade) return "Selecione a especialidade.";
            if (!formData.medico) return "Selecione o médico.";
        } else {
            // VERIFICAÇÃO HÍBRIDA: Aceita Singular OU Plural
            const temProcedimento = formData.procedimento || (formData.procedimentos && formData.procedimentos.length > 0);
            
            if (tipoAgendamento === 'Procedimento') {
            const temProcedimento = formData.procedimento || (formData.procedimentos && formData.procedimentos.length > 0);
            if (!temProcedimento) return "Selecione pelo menos um procedimento.";
            
            // --- NOVA TRAVA DE SEGURANÇA AQUI ---
            if (editingEvent && formData.procedimentos && formData.procedimentos.length > 1) {
                return "Na edição, você só pode alterar o procedimento atual. Para adicionar novos, crie um agendamento separado.";
            }
        }
        }

        if (!isSlotAvailable) return "Não há capacidade disponível para este horário.";

        if (bloqueioCapacidade) {
            if (tipoAgendamento === 'Consulta') return "Limite de consultas simultâneas atingido.";
            if (tipoAgendamento === 'Procedimento') return "A sala de procedimentos já está ocupada.";
        }

        // SE NÃO FOR ENCAIXE, ELE BLOQUEIA. SE FOR, ELE DEIXA PASSAR.
        if (bloqueioCapacidade && !isEncaixe) {
            if (tipoAgendamento === 'Consulta') return "Limite de consultas simultâneas atingido. Marque 'Forçar Encaixe' para ignorar.";
            if (tipoAgendamento === 'Procedimento') return "A sala de procedimentos já está ocupada. Marque 'Forçar Encaixe' para ignorar.";
        }
        
        return null;
    };

    const handleSubmit = async (e) => {
    e.preventDefault();
    
    const erroValidacao = validarFormulario();
    if (erroValidacao) {
        showSnackbar(erroValidacao, 'warning');
        return;
    }

    setIsSubmitting(true);
    
    const submissionData = {
        ...formData,
        sala: formData.sala?.id || null,
        tipo_agendamento: tipoAgendamento,
        paciente: formData.paciente?.id || null,
        medico: formData.medico?.id || null,
        especialidade: formData.especialidade?.id || null,
        data_hora_inicio: formData.data_hora_inicio ? formData.data_hora_inicio.toISOString() : null,
        data_hora_fim: formData.data_hora_fim ? formData.data_hora_fim.toISOString() : null,
    };

    // --- A LIMPEZA CRUCIAL ---
    // Removemos os arrays brutos para que o backend não recuse a requisição
    delete submissionData.procedimentos;

    // LÓGICA DE ENVIO HÍBRIDA
    if (tipoAgendamento === 'Procedimento' && formData.procedimentos.length > 0 && !editingEvent) {
        submissionData.procedimentos_ids = formData.procedimentos.map(p => p.id);
        delete submissionData.procedimento; 
    } else {
        submissionData.procedimento = formData.procedimento?.id || null;
        if (tipoAgendamento === 'Procedimento' && formData.procedimentos.length > 0) {
                submissionData.procedimento = formData.procedimentos[0].id;
        }
    }
    
    // Injetar Isenção
    if (formData.isento_cobranca) {
        submissionData.isento_cobranca = true;
        submissionData.motivo_isencao = formData.motivo_isencao;
        const notaIsencao = `[ISENTO: ${formData.motivo_isencao}]`;
        submissionData.observacoes = submissionData.observacoes 
            ? `${submissionData.observacoes}\n${notaIsencao}` 
            : notaIsencao;
    }

    try {
        const eventId = editingEvent?.id;
        const request = eventId 
            ? agendamentoService.updateAgendamento(eventId, submissionData) 
            : agendamentoService.createAgendamento(submissionData);
        
        await request;
        showSnackbar(eventId ? 'Agendamento atualizado!' : 'Agendamentos criados com sucesso!', 'success');
        onSave();
        onClose(); 
    } catch (error) {
        // --- O NOVO DEDO-DURO DE ERROS ---
        console.error("Erro detalhado do Backend:", error.response?.data);
        const errorMsg = error.response?.data 
            ? JSON.stringify(error.response.data).replace(/[\[\]"{}]/g, '') 
            : "Erro ao processar no servidor.";
        showSnackbar(errorMsg, 'error');
    } finally {
        setIsSubmitting(false);
    }
};

    // --- NOVA LÓGICA: Excluir Agendamento ---
    const handleDelete = async () => {
        if (!editingEvent?.id) return;
        
        if (!window.confirm("Tem certeza que deseja EXCLUIR este agendamento? Esta ação não pode ser desfeita.")) {
            return;
        }

        setIsSubmitting(true);
        try {
            await agendamentoService.deleteAgendamento(editingEvent.id);
            showSnackbar("Agendamento excluído com sucesso.", "success");
            onSave(); // Atualiza a agenda no pai
            onClose(); // Fecha o modal
        } catch (error) {
            console.error(error);
            showSnackbar("Erro ao excluir agendamento.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const valorExibido = useMemo(() => {
        if (formData.tipo_atendimento === 'Particular') {
            if (tipoAgendamento === 'Consulta' && formData.especialidade?.valor_consulta) {
                return `Valor (Particular): R$ ${formData.especialidade.valor_consulta}`;
            }
            if (tipoAgendamento === 'Procedimento') {
                // NOVA LÓGICA: Soma todos os procedimentos do array
                if (formData.procedimentos && formData.procedimentos.length > 0) {
                    const total = formData.procedimentos.reduce((acumulador, procAtual) => {
                        return acumulador + (parseFloat(procAtual.valor_particular) || 0);
                    }, 0);
                    return `Valor Total (Particular): R$ ${total.toFixed(2).replace('.', ',')}`;
                } 
                // Fallback de segurança para o modo singular legado
                else if (formData.procedimento?.valor_particular) {
                    return `Valor (Particular): R$ ${parseFloat(formData.procedimento.valor_particular).toFixed(2).replace('.', ',')}`;
                }
            }
        }
        return null;
    // IMPORTANTE: Adicionamos formData.procedimentos na lista de dependências abaixo
    }, [tipoAgendamento, formData.especialidade, formData.procedimento, formData.procedimentos, formData.tipo_atendimento]);

    const renderCapacidadeInfo = () => {
        let visualConsultas = capacidade.consultas;
        let visualProc = capacidade.procedimentos;
        const corConsultas = visualConsultas >= MAX_CONS ? "error" : "success";
        const corProc = visualProc >= MAX_PROC ? "error" : "success";

        return (
            <Box sx={{ p: 1, bgcolor: '#f5f5f5', borderRadius: 1, display: 'flex', gap: 2, alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666' }}>OCUPAÇÃO:</Typography>
                {capacidade.loading ? <CircularProgress size={16} /> : (
                    <>
                        <Chip label={`Consultas: ${visualConsultas}/${MAX_CONS}`} color={corConsultas} size="small" variant={tipoAgendamento === 'Consulta' ? "filled" : "outlined"} />
                        <Chip label={`Procedimentos: ${visualProc}/${MAX_PROC}`} color={corProc} size="small" variant={tipoAgendamento === 'Procedimento' ? "filled" : "outlined"} />
                    </>
                )}
            </Box>
        );
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">{editingEvent ? 'Editar Agendamento' : 'Novo Agendamento'}</Typography>
                    {formData.data_hora_inicio && renderCapacidadeInfo()}
                </Box>
            </DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent dividers sx={{ p: 3 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={7}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                <FormControl fullWidth>
                                    <Autocomplete 
                                        options={salasFiltradas} 
                                        getOptionLabel={(s) => s.nome || ''} 
                                        value={formData.sala} 
                                        isOptionEqualToValue={(o, v) => o.id === v.id} 
                                        onChange={(e, value) => setFormData(prev => ({...prev, sala: value}))} 
                                        renderInput={(params) => (<TextField {...params} label="Sala *" size="small" error={!formData.sala} />)} 
                                        noOptionsText="Nenhuma sala compatível"
                                    />
                                </FormControl>
                                <FormControl fullWidth><Autocomplete 
                                                            options={pacientes} 
                                                            getOptionLabel={(p) => {
                                                                if (typeof p === 'string') return p;
                                                                if (p.inputValue) return p.inputValue;
                                                                return p.nome_completo || '';
                                                            }} 
                                                            value={formData.paciente} 
                                                            isOptionEqualToValue={(o, v) => o.id === v.id} 
                                                            onChange={(event, newValue) => {
                                                                if (typeof newValue === 'string') {
                                                                    if(onAbrirNovoPaciente) onAbrirNovoPaciente(newValue);
                                                                } else if (newValue && newValue.isNew) {
                                                                    if(onAbrirNovoPaciente) onAbrirNovoPaciente(newValue.inputValue);
                                                                } else {
                                                                    handlePacienteChange(event, newValue);
                                                                }
                                                            }} 
                                                            filterOptions={(options, params) => {
                                                                const filtered = filter(options, params);
                                                                const { inputValue } = params;
                                                                const isExisting = options.some((option) => inputValue.toLowerCase() === option.nome_completo.toLowerCase());
                                                                
                                                                if (inputValue !== '' && !isExisting) {
                                                                    // A MÁGICA: unshift coloca o item no TOPO da lista!
                                                                    filtered.unshift({ 
                                                                        inputValue,
                                                                        nome_completo: `Adicionar "${inputValue}"`,
                                                                        isNew: true
                                                                    });
                                                                }
                                                                return filtered;
                                                            }}
                                                            // --- A MÁGICA VISUAL ACONTECE AQUI ---
                                                            renderOption={(props, option) => {
                                                                const { key, ...optionProps } = props;
                                                                return (
                                                                    <li key={key} {...optionProps} style={{ padding: 0 }}>
                                                                        {option.isNew ? (
                                                                            <Box sx={{ 
                                                                                display: 'flex', alignItems: 'center', width: '100%', 
                                                                                p: 1.5, color: 'primary.main', bgcolor: '#f0f7ff', 
                                                                                fontWeight: 'bold', borderBottom: '1px solid #e0e0e0',
                                                                                transition: '0.2s', '&:hover': { bgcolor: '#e3f2fd' }
                                                                            }}>
                                                                                <PersonAddIcon sx={{ mr: 1.5, fontSize: 20 }} />
                                                                                Cadastrar novo paciente: "{option.inputValue}"
                                                                            </Box>
                                                                        ) : (
                                                                            <Box sx={{ p: 1.5, width: '100%' }}>
                                                                                {option.nome_completo}
                                                                            </Box>
                                                                        )}
                                                                    </li>
                                                                );
                                                            }}
                                                            // -------------------------------------
                                                            renderInput={(params) => (<TextField {...params} label="Paciente *" size="small" error={!formData.paciente} />)} 
                                                        />
                                                            </FormControl>
                                {pacienteDetalhes?.plano_convenio_detalhes && (<Box sx={{ p: 1.5, bgcolor: '#f5f5f5', borderRadius: 1 }}><Typography variant="body2" color="text.secondary">Plano: <strong>{pacienteDetalhes.plano_convenio_detalhes.convenio_nome}</strong></Typography></Box>)}
                                {bloqueioCapacidade && (
                                    <Box sx={{ mt: 1, p: 1, bgcolor: '#fff3e0', borderRadius: 1, border: '1px solid #ffcc80' }}>
                                        <FormControlLabel
                                            control={
                                                <Switch 
                                                    checked={isEncaixe} 
                                                    onChange={(e) => setIsEncaixe(e.target.checked)} 
                                                    color="warning" 
                                                    size="small"
                                                />
                                            }
                                            label={<Typography variant="body2" color="warning.dark" fontWeight="bold">Forçar Encaixe (Ignorar limite de sala)</Typography>}
                                        />
                                    </Box>
                                )}
                                <Divider sx={{ my: 1 }}><Chip label="Detalhes" size="small" /></Divider>
                                <FormControl fullWidth size="small"><InputLabel>Tipo</InputLabel><Select value={tipoAgendamento} label="Tipo" onChange={(e) => setTipoAgendamento(e.target.value)}><MenuItem value="Consulta">Consulta</MenuItem><MenuItem value="Procedimento">Procedimento</MenuItem></Select></FormControl>
                                {tipoAgendamento === 'Consulta' ? (
                                    <>
                                        <Autocomplete options={especialidades} getOptionLabel={(e) => e.nome || ''} value={formData.especialidade} isOptionEqualToValue={(o, v) => o.id === v.id} onChange={(e, value) => setFormData({ ...formData, especialidade: value, medico: null })} renderInput={(params) => <TextField {...params} label="Especialidade *" size="small" />} />
                                        <Autocomplete options={medicos.filter(m => formData.especialidade ? m.especialidades.includes(formData.especialidade.id) : true)} getOptionLabel={(m) => m.first_name + ' ' + m.last_name} value={formData.medico} isOptionEqualToValue={(o, v) => o.id === v.id} onChange={(e, value) => setFormData({ ...formData, medico: value })} disabled={!formData.especialidade} renderInput={(params) => <TextField {...params} label="Médico *" size="small" />} />
                                    </>
                                ) : (
                                    <Autocomplete 
                                        multiple 
                                        options={procedimentos} 
                                        getOptionLabel={(p) => p.descricao || ''} 
                                        value={formData.procedimentos} 
                                        isOptionEqualToValue={(o, v) => o.id === v.id} 
                                        onChange={handleProcedimentosChange}
                                        disableCloseOnSelect
                                        renderInput={(params) => (
                                            <TextField 
                                                {...params} 
                                                label="Procedimentos (Selecione 1 ou mais) *" 
                                                size="small" 
                                                placeholder={formData.procedimentos.length > 0 ? "" : "Selecione..."}
                                            />
                                        )} 
                                        renderTags={(value, getTagProps) =>
                                            value.map((option, index) => (
                                                <Chip variant="outlined" label={option.descricao} size="small" {...getTagProps({ index })} />
                                            ))
                                        }
                                    />
                                )}
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={5}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                <FormControl fullWidth size="small"><InputLabel>Modalidade</InputLabel><Select name="modalidade" value={formData.modalidade} label="Modalidade" onChange={(e) => setFormData({...formData, modalidade: e.target.value})} ><MenuItem value="Presencial">Presencial (na clínica)</MenuItem><MenuItem value="Telemedicina">Telemedicina</MenuItem></Select></FormControl>
                                <FormControl fullWidth size="small"><InputLabel>Tipo de Atendimento</InputLabel><Select name="tipo_atendimento" value={formData.tipo_atendimento} label="Tipo de Atendimento" onChange={(e) => setFormData({...formData, tipo_atendimento: e.target.value})}><MenuItem value="Particular">Particular</MenuItem><MenuItem value="Convenio" disabled={!pacienteDetalhes?.plano_convenio}>Convênio</MenuItem></Select></FormControl>
                                {valorExibido && (<Box sx={{ p: 1.5, backgroundColor: '#e3f2fd', borderRadius: 1, mt: -1 }}><Typography variant="body2" color="primary.main" sx={{ fontWeight: 'bold' }}>{valorExibido}</Typography></Box>)}
                                {/* --- NOVO: BOTÃO E MOTIVO DE ISENÇÃO --- */}
                                <FormControlLabel
                                    control={
                                        <Switch 
                                            checked={formData.isento_cobranca || false} 
                                            onChange={(e) => setFormData({...formData, isento_cobranca: e.target.checked})} 
                                            color="success" 
                                            size="small"
                                        />
                                    }
                                    label={<Typography variant="body2" fontWeight="bold">Isentar Cobrança</Typography>}
                                    sx={{ mt: -1, ml: 0.5 }}
                                />

                                {formData.isento_cobranca && (
                                    <TextField 
                                        label="Motivo da Isenção *" 
                                        size="small" 
                                        fullWidth 
                                        value={formData.motivo_isencao || ''}
                                        onChange={(e) => setFormData({...formData, motivo_isencao: e.target.value})}
                                        required={formData.isento_cobranca}
                                        placeholder="Ex: Conclusão de Exame, Cortesia..."
                                        sx={{ mb: 2 }}
                                    />
                                )}
                                {/* -------------------------------------- */}
                                <Divider sx={{ my: 1 }}><Chip label="Horário" size="small" /></Divider>
                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <TextField
                                            label="Início *"
                                            value={dataInicioVisual} 
                                            onChange={handleDataInicioChange} 
                                            fullWidth
                                            size="small"
                                            placeholder="DD/MM/AAAA HH:MM"
                                            InputProps={{ inputComponent: TextMaskDateTime }} 
                                            helperText="Ex: 13/01/2026 14:00"
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            label="Fim *"
                                            value={dataFimVisual}
                                            onChange={handleDataFimChange}
                                            fullWidth
                                            size="small"
                                            placeholder="DD/MM/AAAA HH:MM"
                                            InputProps={{ inputComponent: TextMaskDateTime }}
                                        />
                                    </Grid>
                                </Grid>
                                <FormControl fullWidth size="small"><InputLabel>Status</InputLabel><Select name="status" value={formData.status} label="Status" onChange={(e) => setFormData({...formData, status: e.target.value})}><MenuItem value="Agendado">Agendado</MenuItem><MenuItem value="Confirmado">Confirmado</MenuItem><MenuItem value="Realizado">Realizado</MenuItem><MenuItem value="Não Compareceu">Não Compareceu</MenuItem></Select></FormControl>
                            </Box>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: '16px 24px', justifyContent: 'space-between' }}>
                    <Box>{editingEvent && (<Button onClick={handleDelete} color="error" startIcon={<DeleteIcon />} disabled={isSubmitting}>Excluir</Button>)}</Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
                        <Button type="submit" variant="contained" disabled={isSubmitting}>{isSubmitting ? <CircularProgress size={24} /> : 'Salvar'}</Button>
                    </Box>
                </DialogActions>
            </form>
        </Dialog>
    );
}