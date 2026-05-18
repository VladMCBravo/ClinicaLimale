// src/components/AgendamentoModal.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Button, CircularProgress, Autocomplete, FormControl, InputLabel, Select, MenuItem,
  Box, Typography, Divider, Chip, Grid, Switch, FormControlLabel, Paper, Alert, Tooltip
} from '@mui/material';

// --- ÍCONES (Adicionados para o banho de loja) ---
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import MedicalInformationOutlinedIcon from '@mui/icons-material/MedicalInformationOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import AttachMoneyOutlinedIcon from '@mui/icons-material/AttachMoneyOutlined';

import { agendamentoService } from '../services/agendamentoService';
import { faturamentoService } from '../services/faturamentoService';
import { pacienteService } from '../services/pacienteService';
import { configuracoesService } from '../services/configuracoesService'; // Adicione nas importações do topo
import { useSnackbar } from '../contexts/SnackbarContext';
import { IMaskInput } from 'react-imask';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/pt-br';

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
    procedimento: null, 
    procedimentos: [],  
    sala: null,
    isento_cobranca: false, 
    motivo_isencao: ''      
});

const TextMaskDateTime = React.forwardRef(function TextMaskDateTime(props, ref) {
  const { onChange, ...other } = props;
  return (
    <IMaskInput
      {...other}
      mask="00/00/0000 00:00" 
      definitions={{ '0': /[0-9]/ }}
      inputRef={ref}
      onAccept={(value) => onChange({ target: { name: props.name, value } })}
      overwrite
    />
  );
});

const removerAcentos = (str) => {
    if (!str) return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const formatData = (dataString) => {
    if (!dataString) return '-';
    const partes = dataString.split('-'); 
    if(partes.length < 3) return dataString;
    return `${partes[2]}/${partes[1]}/${partes[0]}`; 
};

export default function AgendamentoModal({ open, onClose, onSave, editingEvent, initialData, onAbrirNovoPaciente }) {
    const { showSnackbar } = useSnackbar();

    const MAX_CONS = 3;
    const MAX_PROC = 1;
    
    const [formData, setFormData] = useState(getInitialFormData());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dataInicioVisual, setDataInicioVisual] = useState('');
    const [dataFimVisual, setDataFimVisual] = useState('');
    
    const [pacientes, setPacientes] = useState([]);
    const [procedimentos, setProcedimentos] = useState([]);
    const [planos, setPlanos] = useState([]);
    const [medicos, setMedicos] = useState([]);
    const [especialidades, setEspecialidades] = useState([]);
    const [salas, setSalas] = useState([]); 
    const [isEncaixe, setIsEncaixe] = useState(false);
    const [inputValuePaciente, setInputValuePaciente] = useState('');
    const [isAdmin, setIsAdmin] = useState(false); // <--- NOVO STATE AQUI

    const [salasFiltradas, setSalasFiltradas] = useState([]);
    const [pacienteDetalhes, setPacienteDetalhes] = useState(null);
    const [tipoAgendamento, setTipoAgendamento] = useState('Consulta');
    const [capacidade, setCapacidade] = useState({ consultas: 0, procedimentos: 0, loading: false });
    const [bloqueioCapacidade, setBloqueioCapacidade] = useState(false);
    const [isSlotAvailable, setIsSlotAvailable] = useState(true);
    const [jornadasMedico, setJornadasMedico] = useState([]);
    const [confirmarJornadaOpen, setConfirmarJornadaOpen] = useState(false);

    useEffect(() => {
        let isMounted = true; // Boas práticas para evitar update em componente desmontado

        // Só busca os dados se o Modal estiver ABERTO
        if (open) {
            console.log("[DEBUG - FRONTEND] Modal aberto. Solicitando dados ao servidor...");
            
            agendamentoService.getModalData()
                .then(([pacientesRes, procedimentosRes, medicosRes, especialidadesRes]) => {
                    if (!isMounted) return; // Se fechou antes de carregar, cancela
                    
                    const rawPacientes = pacientesRes.data || [];
                    console.log(`[DEBUG - FRONTEND] Recebeu ${rawPacientes.length} pacientes brutos do backend.`, rawPacientes);

                    // Deduplicação forçada com Log de aviso
                    const pacientesUnicosMap = new Map();
                    rawPacientes.forEach(p => {
                        if (pacientesUnicosMap.has(p.id)) {
                            console.warn(`[DEBUG - FRONTEND] DUPLICATA DELETADA NO FRONTEND: ID ${p.id} - ${p.nome_completo}`);
                        }
                        pacientesUnicosMap.set(p.id, p); 
                    });
                    
                    const pacientesOrdenados = Array.from(pacientesUnicosMap.values()).sort((a, b) => 
                        a.nome_completo.localeCompare(b.nome_completo)
                    );
                    
                    console.log(`[DEBUG - FRONTEND] Lista final após limpeza: ${pacientesOrdenados.length} pacientes.`, pacientesOrdenados);

                    setPacientes(pacientesOrdenados);
                    setProcedimentos(procedimentosRes.data.filter(p => p.descricao.toLowerCase() !== 'consulta'));
                    setMedicos(medicosRes.data);
                    setEspecialidades(especialidadesRes.data);
                }).catch(error => { 
                    console.error("[DEBUG - FRONTEND] Erro ao carregar dados do modal:", error);
                    showSnackbar("Erro ao carregar dados.", 'error'); 
                });
            
            agendamentoService.getSalas()
                .then(response => {
                    setSalas(response.data);
                    setSalasFiltradas(response.data); 
                })
                .catch(error => showSnackbar("Erro ao carregar lista de salas.", 'error'));
            
                // NOVO: Buscar os planos de convênio
            faturamentoService.getPlanosConvenio()
                .then(response => setPlanos(response.data))
                .catch(error => console.error("Erro ao carregar planos", error));
    }
    }, [open, showSnackbar]);

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
            
            setFormData({
                paciente: pacientes.find(p => p.id === dados.paciente) || null,
                data_hora_inicio: inicioDayjs,
                data_hora_fim: fimDayjs,
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
                procedimentos: procEncontrado ? [procEncontrado] : [], 
            });

            setDataInicioVisual(inicioDayjs.isValid() ? inicioDayjs.format('DD/MM/YYYY HH:mm') : '');
            setDataFimVisual(fimDayjs.isValid() ? fimDayjs.format('DD/MM/YYYY HH:mm') : '');

        } else if (initialData) {
            const startTime = dayjs(initialData.start);
            const endTime = startTime.add(15, 'minute');
            
            // --- MODIFICAÇÃO: Força a aba "Consulta" se vier do Drawer com um médico ---
            if (initialData.medicoId) {
                setTipoAgendamento('Consulta');
            }

            setFormData(prev => ({ 
                ...prev, 
                data_hora_inicio: startTime,
                data_hora_fim: endTime, 
                sala: initialData.resource ? salas.find(s => s.id === initialData.resource.id) : null,
                
                // Mapeia os IDs do Drawer para os objetos reais do Select
                medico: initialData.medicoId ? medicos.find(m => m.id === initialData.medicoId) : null,
                especialidade: initialData.especialidadeId ? especialidades.find(e => e.id === initialData.especialidadeId) : null,
            }));

            setDataInicioVisual(startTime.format('DD/MM/YYYY HH:mm'));
            setDataFimVisual(endTime.format('DD/MM/YYYY HH:mm'));
        }
    }, [editingEvent, initialData, open, pacientes, procedimentos, medicos, especialidades, salas]);

    // --- CORREÇÃO: FILTRO INTELIGENTE DE SALAS (Sem Loop) ---
    useEffect(() => {
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

            setFormData(prev => {
                if (prev.sala) {
                    const salaTemEquipamento = prev.sala.equipamentos && prev.sala.equipamentos.includes(equipamentoNecessario);
                    if (!salaTemEquipamento) {
                        showSnackbar(`A sala anterior não possui ${equipamentoNecessario}. Selecione uma compatível.`, 'warning');
                        return { ...prev, sala: null }; 
                    }
                }
                return prev;
            });
        } else {
            setSalasFiltradas(salas);
        }
        // REMOVIDO: formData.sala das dependências
    }, [formData.procedimento, formData.procedimentos, tipoAgendamento, salas, showSnackbar]);

    const handleDataInicioChange = (e) => {
        const valorVisual = e.target.value;
        setDataInicioVisual(valorVisual);

        if (valorVisual.length === 16) { 
            const novaDataInicio = dayjs(valorVisual, 'DD/MM/YYYY HH:mm', true);
            
            if (novaDataInicio.isValid()) {
                setFormData(prev => {
                    const novosDados = { ...prev, data_hora_inicio: novaDataInicio };
                    
                    let novaDataFim;
                    if (tipoAgendamento === 'Procedimento' && prev.procedimentos.length > 0) {
                        const minutosTotais = prev.procedimentos.length * 15;
                        novaDataFim = novaDataInicio.add(minutosTotais, 'minute');
                    } else {
                        novaDataFim = novaDataInicio.add(15, 'minute');
                    }
                    
                    novosDados.data_hora_fim = novaDataFim;
                    setDataFimVisual(novaDataFim.format('DD/MM/YYYY HH:mm'));
                    
                    return novosDados;
                });
            }
        } else {
            if (formData.data_hora_inicio) setFormData(prev => ({...prev, data_hora_inicio: null}));
        }
    };

    const handleDataFimChange = (e) => {
        const valorVisual = e.target.value;
        setDataFimVisual(valorVisual);

        if (valorVisual.length === 16) {
            const novaDataFim = dayjs(valorVisual, 'DD/MM/YYYY HH:mm', true);
            if (novaDataFim.isValid()) setFormData(prev => ({ ...prev, data_hora_fim: novaDataFim }));
        } else {
            if (formData.data_hora_fim) setFormData(prev => ({...prev, data_hora_fim: null}));
        }
    };

    const handleProcedimentosChange = (event, values) => {
        setFormData(prev => {
            const novoState = { ...prev, procedimentos: values };
            
            if (prev.data_hora_inicio && prev.data_hora_inicio.isValid()) {
                const minutosTotais = values.length * 15;
                const novoFim = prev.data_hora_inicio.add(minutosTotais || 15, 'minute');
                novoState.data_hora_fim = novoFim;
                setDataFimVisual(novoFim.format('DD/MM/YYYY HH:mm'));
            }
            return novoState;
        });
    };
    
    useEffect(() => {
        const inicioValido = formData.data_hora_inicio && formData.data_hora_inicio.isValid();
        const fimValido = formData.data_hora_fim && formData.data_hora_fim.isValid();
        const salaId = formData.sala ? formData.sala.id : null;

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
                    
                    // GRAVA A PERMISSÃO DE ADMIN VINDA DO BACKEND
                    if (response.data.is_admin) {
                        setIsAdmin(true);
                    } else {
                        setIsAdmin(false);
                    }
                })
                .catch(err => { setCapacidade({ consultas: 0, procedimentos: 0, loading: false }); });
        }
    }, [open, formData.data_hora_inicio, formData.data_hora_fim, formData.sala]);

    useEffect(() => {
        if (!open) return;
        let ocupacaoConsultas = capacidade.consultas;
        let ocupacaoProcedimentos = capacidade.procedimentos;

        if (editingEvent) {
            const tipoOriginal = editingEvent.extendedProps ? editingEvent.extendedProps.tipo_agendamento : editingEvent.tipo_agendamento;
            if (tipoOriginal === 'Consulta') ocupacaoConsultas = Math.max(0, ocupacaoConsultas - 1);
            if (tipoOriginal === 'Procedimento') ocupacaoProcedimentos = Math.max(0, ocupacaoProcedimentos - 1);
        }

        let bloqueado = false;
        if (tipoAgendamento === 'Consulta') bloqueado = ocupacaoConsultas >= MAX_CONS;
        else if (tipoAgendamento === 'Procedimento') bloqueado = ocupacaoProcedimentos >= MAX_PROC;

        // --- A MÁGICA FINAL: ADMIN PASSA DIRETO ---
        if (isAdmin) {
            bloqueado = false;
        }

        setBloqueioCapacidade(bloqueado);
    }, [capacidade, tipoAgendamento, editingEvent, open, isAdmin]); // <--- NÃO ESQUEÇA DE ADICIONAR isAdmin AQUI NAS DEPENDÊNCIAS

    useEffect(() => {
    if (formData.medico && open) {
        configuracoesService.getJornadas(formData.medico.id)
            .then(res => setJornadasMedico(res.data))
            .catch(err => console.error("Erro ao buscar jornada:", err));
    } else {
        setJornadasMedico([]);
    }
}, [formData.medico, open]);

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

    const validarFormulario = () => {
        if (!formData.paciente) return "Selecione um paciente.";
        if (!formData.data_hora_inicio || !formData.data_hora_fim) return "Defina o horário de início e fim.";
        if (formData.data_hora_inicio.isAfter(formData.data_hora_fim)) return "A data de fim deve ser posterior à data de início.";
        if (!formData.sala) return "Selecione uma sala/consultório.";

        if (tipoAgendamento === 'Consulta') {
            if (!formData.especialidade) return "Selecione a especialidade.";
            if (!formData.medico) return "Selecione o médico.";
        } else {
            const temProcedimento = formData.procedimento || (formData.procedimentos && formData.procedimentos.length > 0);
            if (!temProcedimento) return "Selecione pelo menos um procedimento.";
            if (editingEvent && formData.procedimentos && formData.procedimentos.length > 1) {
                return "Na edição, você só pode alterar o procedimento atual. Para adicionar novos, crie um agendamento separado.";
            }
        }

        if (!isSlotAvailable) return "Não há capacidade disponível para este horário.";
        if (bloqueioCapacidade && !isEncaixe) {
            if (tipoAgendamento === 'Consulta') return "Limite de consultas simultâneas atingido. Marque 'Forçar Encaixe' para ignorar.";
            if (tipoAgendamento === 'Procedimento') return "A sala de procedimentos já está ocupada. Marque 'Forçar Encaixe' para ignorar.";
        }
        
        // Agora a checagem de convênio fica solta e correta:
        if (formData.tipo_atendimento === 'Convenio' && !formData.plano_utilizado) {
            return "Selecione o plano do convênio utilizado pelo paciente.";
        }
        
        return null;
    };

    const verificarDentroDaJornada = (inicioDayjs, fimDayjs) => {
    if (jornadasMedico.length === 0) return false; // Se não tem jornada cadastrada, está fora

    // 1. Traduzir o dia da semana: Day.js (0=Dom, 1=Seg) para Django (0=Seg, 6=Dom)
    const diaSemanaDayjs = inicioDayjs.day();
    const diaSemanaDjango = diaSemanaDayjs === 0 ? 6 : diaSemanaDayjs - 1;

    // 2. Descobrir qual semana do mês é esta data (Ex: dia 8 = 2ª semana)
    const semanaDoMes = Math.ceil(inicioDayjs.date() / 7);

    // 3. Filtrar jornadas que batem com o dia e a semana
    const jornadasValidas = jornadasMedico.filter(j => {
        if (j.dia_da_semana !== diaSemanaDjango || !j.ativo) return false;
        
        // Verifica as semanas
        const semanasConfiguradas = j.semanas_do_mes || [];
        if (semanasConfiguradas.length > 0 && !semanasConfiguradas.includes(semanaDoMes)) {
            return false; // Tem regra de semana, mas não inclui a semana atual
        }
        return true;
    });

    if (jornadasValidas.length === 0) return false;

    // 4. Verificar se o horário se encaixa em ALGUMA das jornadas válidas
    const horaMinutoInicio = inicioDayjs.format('HH:mm');
    const horaMinutoFim = fimDayjs.format('HH:mm');

    return jornadasValidas.some(j => {
        const jornadaInicio = j.hora_inicio.substring(0, 5); // Pega apenas HH:mm
        const jornadaFim = j.hora_fim.substring(0, 5);
        return horaMinutoInicio >= jornadaInicio && horaMinutoFim <= jornadaFim;
    });
};

    // 1. O OPERÁRIO: Esta função apenas envia os dados para o servidor
    const executarSubmitReal = async () => {
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
            is_encaixe: isEncaixe
        };

        delete submissionData.procedimentos;

        if (tipoAgendamento === 'Procedimento' && formData.procedimentos.length > 0 && !editingEvent) {
            submissionData.procedimentos_ids = formData.procedimentos.map(p => p.id);
            delete submissionData.procedimento; 
        } else {
            submissionData.procedimento = formData.procedimento?.id || null;
            if (tipoAgendamento === 'Procedimento' && formData.procedimentos.length > 0) {
                 submissionData.procedimento = formData.procedimentos[0].id;
            }
        }
        
        if (formData.isento_cobranca) {
            submissionData.isento_cobranca = true;
            submissionData.motivo_isencao = formData.motivo_isencao;
            const notaIsencao = `[ISENTO: ${formData.motivo_isencao}]`;
            submissionData.observacoes = submissionData.observacoes ? `${submissionData.observacoes}\n${notaIsencao}` : notaIsencao;
        }

        try {
            const eventId = editingEvent?.id;
            const request = eventId ? agendamentoService.updateAgendamento(eventId, submissionData) : agendamentoService.createAgendamento(submissionData);
            await request;
            showSnackbar(eventId ? 'Agendamento atualizado!' : 'Agendamentos criados com sucesso!', 'success');
            onSave();
            onClose(); 
        } catch (error) {
            console.error("Erro detalhado do Backend:", error.response?.data);
            const errorMsg = error.response?.data ? JSON.stringify(error.response.data).replace(/[\[\]"{}]/g, '') : "Erro ao processar no servidor.";
            showSnackbar(errorMsg, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 2. O PORTEIRO: Disparado quando você clica em "Salvar Agendamento"
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isSubmitting) return; // Evita cliques duplos
        
        const erroValidacao = validarFormulario();
        if (erroValidacao) {
            showSnackbar(erroValidacao, 'warning');
            return;
        }

        // --- TRAVA DE JORNADA ---
        // Se for Consulta e tiver médico e datas selecionadas...
        if (tipoAgendamento === 'Consulta' && formData.medico && formData.data_hora_inicio && formData.data_hora_fim) {
            const dentroDaJornada = verificarDentroDaJornada(formData.data_hora_inicio, formData.data_hora_fim);
            
            // Se estiver FORA da jornada, abre o modal de aviso e INTERROMPE o salvamento
            if (!dentroDaJornada) {
                setConfirmarJornadaOpen(true);
                return; 
            }
        }

        // Se estiver tudo certo (dentro da jornada, ou for um procedimento), salva direto!
        executarSubmitReal();
    };

    const handleDelete = async () => {
        if (!editingEvent?.id) return;
        if (!window.confirm("Tem certeza que deseja EXCLUIR este agendamento? Esta ação não pode ser desfeita.")) return;

        setIsSubmitting(true);
        try {
            await agendamentoService.deleteAgendamento(editingEvent.id);
            showSnackbar("Agendamento excluído com sucesso.", "success");
            onSave(); 
            onClose(); 
        } catch (error) {
            showSnackbar("Erro ao excluir agendamento.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const valorExibido = useMemo(() => {
        if (formData.tipo_atendimento === 'Convenio') {
        return `Faturamento via Convênio`;
    }
        if (formData.tipo_atendimento === 'Particular') {
            if (tipoAgendamento === 'Consulta' && formData.especialidade?.valor_consulta) {
                return `R$ ${formData.especialidade.valor_consulta}`;
            }
            if (tipoAgendamento === 'Procedimento') {
                if (formData.procedimentos && formData.procedimentos.length > 0) {
                    const total = formData.procedimentos.reduce((acumulador, procAtual) => {
                        return acumulador + (parseFloat(procAtual.valor_particular) || 0);
                    }, 0);
                    return `R$ ${total.toFixed(2).replace('.', ',')}`;
                } else if (formData.procedimento?.valor_particular) {
                    return `R$ ${parseFloat(formData.procedimento.valor_particular).toFixed(2).replace('.', ',')}`;
                }
            }
        }
        return null;
    }, [tipoAgendamento, formData.especialidade, formData.procedimento, formData.procedimentos, formData.tipo_atendimento]);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 3, bgcolor: '#fbfcff' } }}>
            
            {/* CABEÇALHO */}
            <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #e0e0e0', bgcolor: '#fff' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight="bold" color="primary.main">
                        {editingEvent ? 'Editar Agendamento' : 'Novo Agendamento'}
                    </Typography>
                    {formData.data_hora_inicio && (
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            {capacidade.loading ? <CircularProgress size={16} /> : (
                                <>
                                    <Chip label={`Consultas: ${capacidade.consultas}/${MAX_CONS}`} color={capacidade.consultas >= MAX_CONS ? "error" : "success"} size="small" variant={tipoAgendamento === 'Consulta' ? "filled" : "outlined"} />
                                    <Chip label={`Procedimentos: ${capacidade.procedimentos}/${MAX_PROC}`} color={capacidade.procedimentos >= MAX_PROC ? "error" : "success"} size="small" variant={tipoAgendamento === 'Procedimento' ? "filled" : "outlined"} />
                                </>
                            )}
                        </Box>
                    )}
                </Box>
            </DialogTitle>

            <form onSubmit={handleSubmit}>
                <DialogContent sx={{ p: 3 }}>
                    <Grid container spacing={3}>
                        
                        {/* COLUNA ESQUERDA: Paciente e Clínico */}
                        <Grid item xs={12} md={7}>
                            
                            {/* CARTÃO DO PACIENTE */}
                            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2, borderColor: '#e0e0e0', bgcolor: '#fff' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'primary.main' }}>
                                    <PersonOutlineIcon sx={{ mr: 1 }} />
                                    <Typography variant="subtitle1" fontWeight="bold">Identificação</Typography>
                                </Box>
                                
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                    <FormControl fullWidth>
                                        <Autocomplete 
                                            options={pacientes} 
                                            ListboxProps={{ style: { maxHeight: 300 } }} 
                                            getOptionLabel={(option) => option.nome_completo || ''} 
                                            value={formData.paciente} 
                                            isOptionEqualToValue={(o, v) => o.id === v.id} 
                                            onChange={handlePacienteChange}                                         
                                            // CORREÇÃO: Removemos a linha "inputValue={inputValuePaciente}"
                                            // Mantemos apenas o onInputChange para pegar o texto para o botão de cadastro, 
                                            // sem interferir no filtro interno do MUI.
                                            onInputChange={(event, newInputValue) => {
                                                setInputValuePaciente(newInputValue || '');
                                            }}
                                            
                                            // 2. A MENSAGEM SE NÃO ACHAR NINGUÉM (Com botão atalho)
                                            noOptionsText={
                                                <Box sx={{ textAlign: 'center', py: 1 }}>
                                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                        Nenhum paciente encontrado.
                                                    </Typography>
                                                    <Button
                                                        variant="outlined"
                                                        size="small"
                                                        startIcon={<PersonAddIcon />}
                                                        onClick={() => {
                                                            if(onAbrirNovoPaciente) onAbrirNovoPaciente(inputValuePaciente);
                                                        }}
                                                    >
                                                        Cadastrar "{inputValuePaciente}"
                                                    </Button>
                                                </Box>
                                            }

                                            // 3. O FILTRO PURO E SIMPLES (Sem gambiarras de botão)
                                            filterOptions={(options, params) => {
                                                const termo = params.inputValue || '';
                                                const inputLimpo = removerAcentos(termo.toLowerCase().trim());
                                                const inputApenasNumeros = termo.replace(/\D/g, '');

                                                // Se o campo estiver vazio, retorna os primeiros 50
                                                if (inputLimpo === '') return options.slice(0, 50);

                                                const filtered = options.filter(option => {
                                                    const nomeBanco = option.nome_completo ? removerAcentos(option.nome_completo.toLowerCase()) : '';
                                                    const matchNome = nomeBanco.includes(inputLimpo);
                                                    
                                                    const cpfBanco = option.cpf ? option.cpf.replace(/\D/g, '') : '';
                                                    const matchCpf = inputApenasNumeros.length > 0 && cpfBanco.startsWith(inputApenasNumeros);

                                                    return matchNome || matchCpf;
                                                });

                                                filtered.sort((a, b) => {
                                                    const nomeA = a.nome_completo ? removerAcentos(a.nome_completo.toLowerCase()) : '';
                                                    const nomeB = b.nome_completo ? removerAcentos(b.nome_completo.toLowerCase()) : '';
                                                    const aComeca = nomeA.startsWith(inputLimpo);
                                                    const bComeca = nomeB.startsWith(inputLimpo);
                                                    
                                                    if (aComeca && !bComeca) return -1;
                                                    if (!aComeca && bComeca) return 1;
                                                    return 0;
                                                });

                                                return filtered.slice(0, 50);
                                            }}
                                            
                                            // 4. O VISUAL DO PACIENTE NA LISTA
                                            renderOption={(props, option) => {
                                                const { key, ...optionProps } = props;
                                                return (
                                                    <li key={key} {...optionProps} style={{ padding: 0 }}>
                                                        <Box sx={{ p: 1.5, width: '100%', display: 'flex', flexDirection: 'column' }}>
                                                            <Typography variant="body1" sx={{ fontWeight: 600, color: '#333' }}>
                                                                {option.nome_completo}
                                                            </Typography>
                                                            <Typography variant="caption" sx={{ color: '#757575', mt: 0.5 }}>
                                                                {option.cpf ? `CPF: ${option.cpf}` : 'Sem CPF'} • {option.data_nascimento ? formatData(option.data_nascimento) : 'Sem data de nasc.'}
                                                            </Typography>
                                                        </Box>
                                                    </li>
                                                );
                                            }}
                                            renderInput={(params) => (<TextField {...params} label="Buscar paciente por nome ou CPF *" size="small" error={!formData.paciente} />)} 
                                        />
                                    </FormControl>

                                    {/* 5. A SUA IDEIA: BOTÃO FIXO AO LADO DA BUSCA */}
                                    <Tooltip title="Cadastrar Novo Paciente">
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            sx={{ minWidth: '40px', width: '40px', height: '40px', p: 0 }}
                                            onClick={() => {
                                                if(onAbrirNovoPaciente) onAbrirNovoPaciente(inputValuePaciente);
                                            }}
                                        >
                                            <PersonAddIcon />
                                        </Button>
                                    </Tooltip>
                                </Box>
                                
                                {pacienteDetalhes?.plano_convenio_detalhes && (
                                    <Alert severity="info" sx={{ mt: 2, py: 0, px: 2 }}>
                                        Plano vinculado: <strong>{pacienteDetalhes.plano_convenio_detalhes.convenio_nome}</strong>
                                    </Alert>
                                )}
                            </Paper>

                            {/* CARTÃO CLÍNICO */}
                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: '#e0e0e0', bgcolor: '#fff' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'primary.main' }}>
                                    <MedicalInformationOutlinedIcon sx={{ mr: 1 }} />
                                    <Typography variant="subtitle1" fontWeight="bold">Dados Clínicos</Typography>
                                </Box>

                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Tipo de Agendamento</InputLabel>
                                        <Select value={tipoAgendamento} label="Tipo de Agendamento" onChange={(e) => setTipoAgendamento(e.target.value)}>
                                            <MenuItem value="Consulta">Consulta</MenuItem>
                                            <MenuItem value="Procedimento">Procedimento</MenuItem>
                                        </Select>
                                    </FormControl>

                                    {tipoAgendamento === 'Consulta' ? (
                                        <>
                                            <Autocomplete options={especialidades} getOptionLabel={(e) => e.nome || ''} value={formData.especialidade} isOptionEqualToValue={(o, v) => o.id === v.id} onChange={(e, value) => setFormData({ ...formData, especialidade: value, medico: null })} renderInput={(params) => <TextField {...params} label="Especialidade *" size="small" />} />
                                            <Autocomplete options={medicos.filter(m => formData.especialidade ? m.especialidades.includes(formData.especialidade.id) : true)} getOptionLabel={(m) => m.first_name + ' ' + m.last_name} value={formData.medico} isOptionEqualToValue={(o, v) => o.id === v.id} onChange={(e, value) => setFormData({ ...formData, medico: value })} disabled={!formData.especialidade} renderInput={(params) => <TextField {...params} label="Médico *" size="small" />} />
                                        </>
                                    ) : (
                                        <>
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
                                                        label={editingEvent ? "Procedimento *" : "Procedimentos (Selecione 1 ou mais) *"} 
                                                        size="small" 
                                                        placeholder={formData.procedimentos.length > 0 ? "" : "Selecione..."}
                                                        helperText={editingEvent ? "Na edição, altere apenas o procedimento atual." : ""}
                                                    />
                                                )} 
                                                renderTags={(value, getTagProps) => value.map((option, index) => ( <Chip variant="filled" color="primary" label={option.descricao} size="small" sx={{ color: '#fff' }} {...getTagProps({ index })} /> ))}
                                            />
                                            {/* NOVO: CAMPO DE MÉDICO PARA PROCEDIMENTOS */}
                                            <Autocomplete 
                                                options={medicos} 
                                                getOptionLabel={(m) => m.first_name + ' ' + m.last_name} 
                                                value={formData.medico} 
                                                isOptionEqualToValue={(o, v) => o.id === v.id} 
                                                onChange={(e, value) => setFormData({ ...formData, medico: value })} 
                                                renderInput={(params) => <TextField {...params} label="Médico Responsável (Opcional)" size="small" />} 
                                            />
                                        </>
                                    )}

                                    <FormControl fullWidth>
                                        <Autocomplete 
                                            options={salasFiltradas} 
                                            getOptionLabel={(s) => s.nome || ''} 
                                            value={formData.sala} 
                                            isOptionEqualToValue={(o, v) => o.id === v.id} 
                                            onChange={(e, value) => setFormData(prev => ({...prev, sala: value}))} 
                                            renderInput={(params) => (<TextField {...params} label="Sala *" size="small" error={!formData.sala} />)} 
                                            noOptionsText="Nenhuma sala compatível com este exame"
                                        />
                                    </FormControl>

                                    {bloqueioCapacidade && (
                                        <Alert severity="warning" sx={{ alignItems: 'center' }}>
                                            <FormControlLabel
                                                control={<Switch checked={isEncaixe} onChange={(e) => setIsEncaixe(e.target.checked)} color="warning" size="small" />}
                                                label={<Typography variant="body2" fontWeight="bold">Forçar Encaixe na Agenda</Typography>}
                                            />
                                        </Alert>
                                    )}
                                </Box>
                            </Paper>
                        </Grid>

                        {/* COLUNA DIREITA: Horário e Financeiro */}
                        <Grid item xs={12} md={5}>
                            
                            {/* CARTÃO HORÁRIO */}
                            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2, borderColor: '#e0e0e0', bgcolor: '#fff' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'primary.main' }}>
                                    <EventAvailableOutlinedIcon sx={{ mr: 1 }} />
                                    <Typography variant="subtitle1" fontWeight="bold">Organização</Typography>
                                </Box>
                                
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField label="Início *" value={dataInicioVisual} onChange={handleDataInicioChange} fullWidth size="small" placeholder="DD/MM/AAAA HH:MM" InputProps={{ inputComponent: TextMaskDateTime }} />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField label="Fim *" value={dataFimVisual} onChange={handleDataFimChange} fullWidth size="small" placeholder="DD/MM/AAAA HH:MM" InputProps={{ inputComponent: TextMaskDateTime }} />
                                    </Grid>
                                </Grid>

                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                                    <FormControl fullWidth size="small"><InputLabel>Modalidade</InputLabel><Select name="modalidade" value={formData.modalidade} label="Modalidade" onChange={(e) => setFormData({...formData, modalidade: e.target.value})} ><MenuItem value="Presencial">Presencial (na clínica)</MenuItem><MenuItem value="Telemedicina">Telemedicina</MenuItem></Select></FormControl>
                                    <FormControl fullWidth size="small"><InputLabel>Status</InputLabel><Select name="status" value={formData.status} label="Status" onChange={(e) => setFormData({...formData, status: e.target.value})}><MenuItem value="Agendado">Agendado</MenuItem><MenuItem value="Confirmado">Confirmado</MenuItem><MenuItem value="Realizado">Realizado</MenuItem><MenuItem value="Não Compareceu">Não Compareceu</MenuItem></Select></FormControl>
                                </Box>
                            </Paper>

                            {/* CARTÃO FINANCEIRO */}
                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: '#e0e0e0', bgcolor: '#fff' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'primary.main' }}>
                                    <AttachMoneyOutlinedIcon sx={{ mr: 1 }} />
                                    <Typography variant="subtitle1" fontWeight="bold">Faturamento</Typography>
                                </Box>

                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <FormControl fullWidth size="small"><InputLabel>Tipo de Atendimento</InputLabel><Select name="tipo_atendimento" value={formData.tipo_atendimento} label="Tipo de Atendimento" onChange={(e) => setFormData({...formData, tipo_atendimento: e.target.value})}><MenuItem value="Particular">Particular</MenuItem>
                                            <MenuItem value="Convenio">Convênio</MenuItem> 
                                            {/* CORREÇÃO: A trava disabled={!pacienteDetalhes?.plano_convenio} foi totalmente removida aqui */}
                                        </Select>
                                    </FormControl>

                                    {/* Campo para selecionar o plano se for Convênio */}
                                    {formData.tipo_atendimento === 'Convenio' && (
                                        <FormControl fullWidth size="small">
                                            <Autocomplete
                                                options={planos}
                                                getOptionLabel={(option) => option.nome || ''}
                                                value={formData.plano_utilizado}
                                                isOptionEqualToValue={(option, value) => option.id === value.id}
                                                onChange={(event, newValue) => setFormData({ ...formData, plano_utilizado: newValue })}
                                                renderInput={(params) => (
                                                    <TextField {...params} label="Plano do Convênio *" error={!formData.plano_utilizado} />
                                                )}
                                            />
                                        </FormControl>
                                    )} {/* CORREÇÃO: Bloco devidamente fechado com ')}' para evitar erros de compilação */}
                                    
                                    {valorExibido && (
                                        <Box sx={{ p: 1.5, backgroundColor: '#e3f2fd', borderRadius: 1, display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="body2" color="text.secondary">Total Previsto:</Typography>
                                            <Typography variant="body2" color="primary.main" fontWeight="bold">{valorExibido}</Typography>
                                        </Box>
                                    )}

                                    <Box sx={{ p: 1.5, bgcolor: formData.isento_cobranca ? '#e8f5e9' : '#f5f5f5', borderRadius: 1, border: formData.isento_cobranca ? '1px solid #a5d6a7' : '1px solid transparent', transition: '0.3s' }}>
                                        <FormControlLabel
                                            control={<Switch checked={formData.isento_cobranca || false} onChange={(e) => setFormData({...formData, isento_cobranca: e.target.checked})} color="success" size="small" />}
                                            label={<Typography variant="body2" fontWeight="bold" color={formData.isento_cobranca ? 'success.dark' : 'text.primary'}>Isentar Cobrança</Typography>}
                                        />
                                        
                                        {formData.isento_cobranca && (
                                            <TextField 
                                                label="Motivo da Isenção *" size="small" fullWidth value={formData.motivo_isencao || ''} onChange={(e) => setFormData({...formData, motivo_isencao: e.target.value})} required={formData.isento_cobranca} placeholder="Ex: Conclusão, Retorno..." sx={{ mt: 2, bgcolor: '#fff' }}
                                            />
                                        )}
                                    </Box>
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </DialogContent>
                
                <DialogActions sx={{ p: 3, borderTop: '1px solid #e0e0e0', bgcolor: '#fff' }}>
                    <Box>{editingEvent && (<Button onClick={handleDelete} color="error" startIcon={<DeleteIcon />} disabled={isSubmitting}>Excluir</Button>)}</Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button onClick={onClose} disabled={isSubmitting} color="inherit">Cancelar</Button>
                        <Button type="submit" variant="contained" disabled={isSubmitting} size="large" sx={{ px: 4, borderRadius: 2 }}>
                            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Salvar Agendamento'}
                        </Button>
                    </Box>
                </DialogActions>
            </form>
            {/* NOVO: MODAL DE ALERTA DE JORNADA */}
            <Dialog 
                open={confirmarJornadaOpen} 
                onClose={() => setConfirmarJornadaOpen(false)}
                PaperProps={{ sx: { borderRadius: 2, minWidth: 400 } }}
            >
                <DialogTitle sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                    Aviso de Fora de Jornada
                </DialogTitle>
                <DialogContent dividers>
                    <Typography>
                        O horário selecionado (<strong>{dataInicioVisual} às {dataFimVisual.substring(11, 16)}</strong>) está <strong>fora da jornada de trabalho</strong> cadastrada para o(a) Dr(a). {formData.medico?.first_name}.
                    </Typography>
                    <Typography sx={{ mt: 2 }}>
                        Deseja forçar este agendamento como uma exceção?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setConfirmarJornadaOpen(false)} color="inherit">
                        Cancelar
                    </Button>
                    <Button 
                        onClick={() => {
                            setConfirmarJornadaOpen(false);
                            executarSubmitReal(); // Executa o submit à força
                        }} 
                        variant="contained" 
                        color="warning"
                    >
                        Sim, Forçar Agendamento
                    </Button>
                </DialogActions>
            </Dialog>
        </Dialog>
    );
}