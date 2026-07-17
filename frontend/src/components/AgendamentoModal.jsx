// src/components/AgendamentoModal.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Button, CircularProgress, Autocomplete, FormControl, InputLabel, Select, MenuItem,
  Box, Typography, Chip, Grid, Switch, FormControlLabel, Paper, Alert, Tooltip
} from '@mui/material';

import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import MedicalInformationOutlinedIcon from '@mui/icons-material/MedicalInformationOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import AttachMoneyOutlinedIcon from '@mui/icons-material/AttachMoneyOutlined';

import { agendamentoService } from '../services/agendamentoService';
import { faturamentoService } from '../services/faturamentoService';
import { pacienteService } from '../services/pacienteService';
import { configuracoesService } from '../services/configuracoesService';
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

// 🛠️ TRADUTOR DE UX: Converte erros do Django em mensagens amigáveis
const traduzirErroBackend = (errorData) => {
    if (!errorData) return "Erro inesperado ao conectar com o servidor.";
    if (typeof errorData === 'string') return errorData; // Se já for um texto, retorna ele mesmo

    // Dicionário para traduzir o nome das variáveis do banco para humanos
    const dicionarioCampos = {
        paciente: "Paciente",
        medico: "Médico",
        especialidade: "Especialidade",
        procedimento: "Procedimentos",
        sala: "Sala/Consultório",
        data_hora_inicio: "Horário de Início",
        data_hora_fim: "Horário de Fim",
        plano_utilizado: "Plano do Convênio",
        non_field_errors: "Aviso",
        detail: "Erro de Permissão"
    };

    const mensagens = [];

    // Percorre cada campo que o Django apontou erro
    for (const [campo, detalhes] of Object.entries(errorData)) {
        const nomeCampo = dicionarioCampos[campo] || campo;
        const msgOriginal = Array.isArray(detalhes) ? detalhes[0] : detalhes;
        const msgString = String(msgOriginal).toLowerCase();

        // 1. Mensagens Inteligentes (Como a sua trava de 48h ou conflito de sala)
        if (String(msgOriginal).includes('⚠️')) {
            mensagens.push(msgOriginal);
        }
        // 2. Erros de campos vazios ou nulos
        else if (msgString.includes('obrigatório') || msgString.includes('required') || msgString.includes('null') || msgString.includes('em branco')) {
            mensagens.push(`⚠️ O campo "${nomeCampo}" é obrigatório. Por favor, preencha-o antes de salvar.`);
        }
        // 3. Erros de ID ou Tipo Inválido (O famoso erro da PK ou texto incorreto)
        else if (msgString.includes('pk') || msgString.includes('incorrect_type') || msgString.includes('inválida') || msgString.includes('does not exist')) {
            mensagens.push(`⚠️ Por favor, apague e selecione uma opção válida na lista de "${nomeCampo}".`);
        }
        // 4. Erro de Data
        else if (msgString.includes('date') || msgString.includes('time') || msgString.includes('formato')) {
            mensagens.push(`⚠️ Verifique o formato preenchido no campo "${nomeCampo}".`);
        }
        // Fallback genérico
        else {
            mensagens.push(`⚠️ ${nomeCampo}: ${msgOriginal}`);
        }
    }

    // Retorna a primeira mensagem de erro encontrada para não poluir a tela inteira
    return mensagens.length > 0 ? mensagens[0] : "Erro ao processar a requisição no servidor.";
};

export default function AgendamentoModal({ open, onClose, onSave, editingEvent, initialData, onAbrirNovoPaciente, refreshTrigger }) {
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
    const [convenios, setConvenios] = useState([]);
    const [convenioSelecionado, setConvenioSelecionado] = useState(null); 
    const [medicos, setMedicos] = useState([]);
    const [especialidades, setEspecialidades] = useState([]);
    const [salas, setSalas] = useState([]); 
    const [isEncaixe, setIsEncaixe] = useState(false);
    const [inputValuePaciente, setInputValuePaciente] = useState('');
    const [isAdmin, setIsAdmin] = useState(false); 

    const [salasFiltradas, setSalasFiltradas] = useState([]);
    const [pacienteDetalhes, setPacienteDetalhes] = useState(null);
    const [tipoAgendamento, setTipoAgendamento] = useState('Consulta');
    const [capacidade, setCapacidade] = useState({ consultas: 0, procedimentos: 0, verificacaoPorSala: false, loading: false });
    const [bloqueioCapacidade, setBloqueioCapacidade] = useState(false);
    const [isSlotAvailable, setIsSlotAvailable] = useState(true);
    const [jornadasMedico, setJornadasMedico] = useState([]);
    const [confirmarJornadaOpen, setConfirmarJornadaOpen] = useState(false);
    const [esperandoNovoPaciente, setEsperandoNovoPaciente] = useState(false);

    // Cole isso perto dos outros useEffects
    useEffect(() => {
        // Supondo que você guarde os dados do usuário no localStorage
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const userObj = JSON.parse(userStr);
                // Ajuste 'admin' para o nome exato da role/cargo que você usa
                setIsAdmin(userObj.cargo === 'admin' || userObj.role === 'admin'); 
            } catch (e) {
                console.error("Erro ao ler usuário", e);
            }
        }
    }, []);
    

    useEffect(() => {
        let isMounted = true; 
        if (open) {
            agendamentoService.getModalData()
                .then(([pacientesRes, procedimentosRes, medicosRes, especialidadesRes]) => {
                    if (!isMounted) return; 
                    const rawPacientes = pacientesRes.data || [];
                    const pacientesUnicosMap = new Map();
                    rawPacientes.forEach(p => pacientesUnicosMap.set(p.id, p)); 
                    const pacientesOrdenados = Array.from(pacientesUnicosMap.values()).sort((a, b) => 
                        a.nome_completo.localeCompare(b.nome_completo)
                    );
                    setPacientes(pacientesOrdenados);
                    setProcedimentos(procedimentosRes.data.filter(p => p.descricao.toLowerCase() !== 'consulta'));
                    setMedicos(medicosRes.data);
                    setEspecialidades(especialidadesRes.data);
                }).catch(error => { showSnackbar("Erro ao carregar dados.", 'error'); });
            
            agendamentoService.getSalas()
                .then(response => {
                    if (!isMounted) return;
                    setSalas(response.data);
                    setSalasFiltradas(response.data); 
                }).catch(error => showSnackbar("Erro ao carregar salas.", 'error'));
            
            faturamentoService.getPlanosConvenio().then(response => { if(isMounted) setPlanos(response.data) }).catch(err => console.error(err));
            faturamentoService.getConvenios().then(response => { if(isMounted) setConvenios(response.data) }).catch(err => console.error(err));
        }
        return () => { isMounted = false; };
    }, [open, showSnackbar]);

    useEffect(() => {
        if (open && refreshTrigger > 0) {
            agendamentoService.getModalData().then(([pacientesRes]) => {
                const rawPacientes = pacientesRes.data || [];
                const pacientesUnicosMap = new Map();
                rawPacientes.forEach(p => pacientesUnicosMap.set(p.id, p)); 
                const pacientesOrdenados = Array.from(pacientesUnicosMap.values()).sort((a, b) => 
                    a.nome_completo.localeCompare(b.nome_completo)
                );
                
                setPacientes(pacientesOrdenados);

                if (esperandoNovoPaciente && rawPacientes.length > 0) {
                    const pacienteNovo = rawPacientes.reduce((max, p) => p.id > max.id ? p : max, rawPacientes[0]);
                    if (pacienteNovo) {
                        handlePacienteChange(null, pacienteNovo);
                        setEsperandoNovoPaciente(false); 
                        showSnackbar('Paciente recém-criado vinculado com sucesso!', 'success');
                    }
                }
            });
        }
    }, [refreshTrigger, open, esperandoNovoPaciente]);

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
                    } else { novaDataFim = novaDataInicio.add(15, 'minute'); }
                    novosDados.data_hora_fim = novaDataFim;
                    setDataFimVisual(novaDataFim.format('DD/MM/YYYY HH:mm'));
                    return novosDados;
                });
            }
        } 
    };

    // CORREÇÃO: O 'else' que apagava a data foi removido!
    const handleDataFimChange = (e) => {
        const valorVisual = e.target.value;
        setDataFimVisual(valorVisual);
        if (valorVisual.length === 16) {
            const novaDataFim = dayjs(valorVisual, 'DD/MM/YYYY HH:mm', true);
            if (novaDataFim.isValid()) setFormData(prev => ({ ...prev, data_hora_fim: novaDataFim }));
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
    
    // 1. EFEITO DE CARREGAMENTO IMEDIATO (Abertura Ultra-rápida)
    useEffect(() => {
        if (!open) {
            setFormData(getInitialFormData());
            setTipoAgendamento('Consulta');
            setPacienteDetalhes(null);
            setDataInicioVisual('');
            setDataFimVisual('');
            setIsEncaixe(false);
            setEsperandoNovoPaciente(false);
            return;
        }

        if (editingEvent) {
            const isFullCalendarEvent = !!editingEvent.extendedProps;
            const dados = isFullCalendarEvent ? editingEvent.extendedProps : editingEvent;
            const tipo = dados.tipo_agendamento || 'Consulta';

            setTipoAgendamento(tipo);

            const inicioDayjs = dayjs(isFullCalendarEvent ? editingEvent.startStr : dados.data_hora_inicio);
            const fimDayjs = dayjs(isFullCalendarEvent ? editingEvent.endStr : dados.data_hora_fim);

            // A MÁGICA DA VELOCIDADE: Criamos "objetos provisórios" para a tela não ficar em branco esperando a API
            const procsIds = dados.lista_procedimentos_ids || (dados.procedimento ? [dados.procedimento] : []);

            setFormData({
                paciente: dados.paciente ? { id: dados.paciente, nome_completo: dados.paciente_nome || 'Carregando paciente...' } : null,
                data_hora_inicio: inicioDayjs,
                data_hora_fim: fimDayjs,
                status: dados.status,
                tipo_atendimento: dados.tipo_atendimento,
                plano_utilizado: dados.plano_utilizado,
                observacoes: dados.observacoes || '',
                tipo_visita: dados.tipo_visita || 'Primeira Consulta',
                modalidade: dados.modalidade || 'Presencial',
                especialidade: dados.especialidade ? { id: dados.especialidade, nome: dados.especialidade_nome || 'Carregando especialidade...' } : null,
                sala: dados.sala ? { id: dados.sala, nome: dados.sala_nome || 'Carregando sala...' } : null,
                medico: dados.medico ? { id: dados.medico, first_name: dados.medico_nome || 'Carregando médico...', last_name: '' } : null,
                
                procedimento: procsIds.length > 0 ? { id: procsIds[0], descricao: 'Carregando...' } : null, 
                procedimentos: procsIds.map(id => ({ id, descricao: 'Carregando...' })), 
            });

            setDataInicioVisual(inicioDayjs.isValid() ? inicioDayjs.format('DD/MM/YYYY HH:mm') : '');
            setDataFimVisual(fimDayjs.isValid() ? fimDayjs.format('DD/MM/YYYY HH:mm') : '');
        
        } else if (initialData) {
            const startTime = dayjs(initialData.start);
            const endTime = startTime.add(15, 'minute');
            if (initialData.medicoId) setTipoAgendamento('Consulta');
            
            setFormData(prev => ({ 
                ...prev, 
                data_hora_inicio: startTime,
                data_hora_fim: endTime, 
                sala: initialData.resource ? { id: initialData.resource.id, nome: 'Carregando...' } : null,
                medico: initialData.medicoId ? { id: initialData.medicoId, first_name: 'Carregando...', last_name: '' } : null,
                especialidade: initialData.especialidadeId ? { id: initialData.especialidadeId, nome: 'Carregando...' } : null,
            }));

            setDataInicioVisual(startTime.format('DD/MM/YYYY HH:mm'));
            setDataFimVisual(endTime.format('DD/MM/YYYY HH:mm'));
        }
    }, [editingEvent, initialData, open]); // <-- NOTE QUE REMOVEMOS AS LISTAS PESADAS DAQUI!


    // 2. EFEITO DE HIDRATAÇÃO (Substitui os "Carregando..." pelos dados reais assim que eles chegam do banco)
    useEffect(() => {
        if (!open || (!editingEvent && !initialData)) return;

        setFormData(prev => {
            // Função auxiliar para descobrir se a informação da tela ainda é a provisória
            const isFake = (obj) => obj && (obj.nome_completo?.includes('Carregando') || obj.nome?.includes('Carregando') || obj.first_name?.includes('Carregando') || obj.descricao?.includes('Carregando'));

            // Se for provisório, e a lista da API já chegou, ele puxa o objeto verdadeiro
            const novoPaciente = isFake(prev.paciente) ? (pacientes.find(p => p.id === prev.paciente.id) || prev.paciente) : prev.paciente;
            const novaEspecialidade = isFake(prev.especialidade) ? (especialidades.find(e => e.id === prev.especialidade.id) || prev.especialidade) : prev.especialidade;
            const novoMedico = isFake(prev.medico) ? (medicos.find(m => m.id === prev.medico.id) || prev.medico) : prev.medico;
            const novaSala = isFake(prev.sala) ? (salas.find(s => s.id === prev.sala.id) || prev.sala) : prev.sala;
            
            let novosProcedimentos = prev.procedimentos;
            if (prev.procedimentos.length > 0 && prev.procedimentos.some(p => isFake(p))) {
                novosProcedimentos = prev.procedimentos.map(fakeProc => procedimentos.find(p => p.id === fakeProc.id) || fakeProc);
            }

            return {
                ...prev,
                paciente: novoPaciente,
                especialidade: novaEspecialidade,
                medico: novoMedico,
                sala: novaSala,
                procedimento: novosProcedimentos.length > 0 ? novosProcedimentos[0] : null,
                procedimentos: novosProcedimentos
            };
        });
    }, [pacientes, procedimentos, medicos, especialidades, salas, open]); // Roda silenciosamente em segundo plano

    // Consulta a capacidade/ocupação real no backend sempre que horário ou sala mudam,
    // para saber se é preciso oferecer a opção "Forçar Encaixe" antes de salvar.
    useEffect(() => {
        if (!open) return;
        const inicio = formData.data_hora_inicio;
        const fim = formData.data_hora_fim;
        if (!inicio || !fim || !inicio.isValid() || !fim.isValid()) return;

        let isMounted = true;
        setCapacidade(prev => ({ ...prev, loading: true }));

        agendamentoService.verificarCapacidade(inicio.toISOString(), fim.toISOString(), formData.sala?.id)
            .then(response => {
                if (!isMounted) return;
                const dados = response.data;
                setCapacidade({
                    consultas: dados.consultas_agendadas || 0,
                    procedimentos: dados.procedimentos_agendados || 0,
                    verificacaoPorSala: !!dados.verificacao_por_sala,
                    loading: false
                });
            })
            .catch(() => { if (isMounted) setCapacidade(prev => ({ ...prev, loading: false })); });

        return () => { isMounted = false; };
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

        // O backend bloqueia QUALQUER sobreposição na mesma sala (independente do tipo),
        // a menos que 'Forçar Encaixe' esteja ligado. Reproduz essa regra aqui para que
        // o switch apareça sempre que o salvamento normal seria rejeitado por choque de sala.
        if (!bloqueado && capacidade.verificacaoPorSala && (ocupacaoConsultas + ocupacaoProcedimentos) > 0) {
            bloqueado = true;
        }

        // 🚀 CORREÇÃO: Removemos a linha "if (isAdmin) bloqueado = false;"
        // Agora, mesmo sendo Admin, você VERÁ se a agenda estourou a capacidade!
        setBloqueioCapacidade(bloqueado);
    }, [capacidade, tipoAgendamento, editingEvent, open]); // Note que tiramos o isAdmin da lista final

    useEffect(() => {
        if (formData.medico && open) {
            configuracoesService.getJornadas(formData.medico.id).then(res => setJornadasMedico(res.data)).catch(err => console.error("Erro", err));
        } else { setJornadasMedico([]); }
    }, [formData.medico, open]);

    useEffect(() => {
        if (formData.tipo_atendimento === 'Convenio' && convenios.length > 0 && planos.length > 0) {
            let planoObj = null;
            if (typeof formData.plano_utilizado === 'string') { planoObj = planos.find(p => p.nome === formData.plano_utilizado); } 
            else if (formData.plano_utilizado && formData.plano_utilizado.id) { planoObj = planos.find(p => p.id === formData.plano_utilizado.id); }

            if (planoObj) {
                const empresaObj = convenios.find(c => c.nome === planoObj.convenio_nome);
                setConvenioSelecionado(prev => {
                    if (empresaObj && (!prev || prev.id !== empresaObj.id)) return empresaObj;
                    return prev;
                });
                if (formData.plano_utilizado !== planoObj) setFormData(prev => ({ ...prev, plano_utilizado: planoObj }));
            }
        } else if (formData.tipo_atendimento !== 'Convenio') { setConvenioSelecionado(null); }
    }, [formData.tipo_atendimento, formData.plano_utilizado, convenios, planos]);

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
        if (!formData.data_hora_inicio || typeof formData.data_hora_inicio.isValid !== 'function' || !formData.data_hora_inicio.isValid()) return "Verifique o formato da hora de início.";
        if (!formData.data_hora_fim || typeof formData.data_hora_fim.isValid !== 'function' || !formData.data_hora_fim.isValid()) return "Verifique o formato da hora de fim.";
        if (formData.data_hora_inicio.isAfter(formData.data_hora_fim)) return "A data de fim deve ser posterior à data de início.";
        if (!formData.sala) return "Selecione uma sala/consultório.";

        // UX FIX: O ADMIN IGNORA A TRAVA DO TEMPO E PODE AGENDAR NO PASSADO
        if (!isAdmin) {
            const agora = dayjs();
            const limitePassado = agora.subtract(48, 'hour');
            if (formData.data_hora_inicio.isBefore(limitePassado)) {
                return "Erro: Não é permitido criar agendamentos com mais de 48 horas no passado. Ajuste o horário.";
            }
        }

        if (tipoAgendamento === 'Consulta') {
            if (!formData.especialidade) return "Selecione a especialidade.";
            if (!formData.medico) return "Selecione o médico.";
        } else {
            const temProcedimento = formData.procedimento || (formData.procedimentos && formData.procedimentos.length > 0);
            if (!temProcedimento) return "Selecione pelo menos um procedimento.";
            
            // ATENÇÃO: Aquela trava "Na edição, altere apenas o procedimento atual" foi apagada!
            
            const procParaFiltro = formData.procedimento || (formData.procedimentos.length > 0 ? formData.procedimentos[0] : null);
            if (formData.sala && procParaFiltro && procParaFiltro.equipamento_obrigatorio) {
                if (!formData.sala.equipamentos || !formData.sala.equipamentos.includes(procParaFiltro.equipamento_obrigatorio)) {
                    return `A sala selecionada é incompatível. Falta o equipamento: ${procParaFiltro.equipamento_obrigatorio}.`;
                }
            }
        }

        if (!isSlotAvailable) return "Não há capacidade disponível para este horário.";
        if (bloqueioCapacidade && !isEncaixe) {
            if (tipoAgendamento === 'Consulta') return "Limite de consultas atingido. Forçar Encaixe para ignorar.";
            if (tipoAgendamento === 'Procedimento') return "A sala já está ocupada. Forçar Encaixe para ignorar.";
        }
        if (formData.tipo_atendimento === 'Convenio' && !formData.plano_utilizado) return "Selecione o plano do convênio.";
        return null;
    };

    const verificarDentroDaJornada = (inicioDayjs, fimDayjs) => {
        if (jornadasMedico.length === 0) return false; 
        const diaSemanaDayjs = inicioDayjs.day();
        const diaSemanaDjango = diaSemanaDayjs === 0 ? 6 : diaSemanaDayjs - 1;
        const semanaDoMes = Math.ceil(inicioDayjs.date() / 7);

        const jornadasValidas = jornadasMedico.filter(j => {
            if (j.dia_da_semana !== diaSemanaDjango || !j.ativo) return false;
            const semanasConfiguradas = j.semanas_do_mes || [];
            if (semanasConfiguradas.length > 0 && !semanasConfiguradas.includes(semanaDoMes)) return false; 
            return true;
        });

        if (jornadasValidas.length === 0) return false;
        const horaMinutoInicio = inicioDayjs.format('HH:mm');
        const horaMinutoFim = fimDayjs.format('HH:mm');

        return jornadasValidas.some(j => {
            const jornadaInicio = j.hora_inicio.substring(0, 5); 
            const jornadaFim = j.hora_fim.substring(0, 5);
            return horaMinutoInicio >= jornadaInicio && horaMinutoFim <= jornadaFim;
        });
    };

    const executarSubmitReal = async () => {
        setIsSubmitting(true);
        const submissionData = {
            ...formData,
            sala: formData.sala?.id || null,
            tipo_agendamento: tipoAgendamento,
            paciente: formData.paciente?.id || null,
            medico: formData.medico?.id || null,
            plano_utilizado: formData.plano_utilizado?.id || null,
            data_hora_inicio: formData.data_hora_inicio ? formData.data_hora_inicio.toISOString() : null,
            data_hora_fim: formData.data_hora_fim ? formData.data_hora_fim.toISOString() : null,
            is_encaixe: isEncaixe,
            observacoes: formData.observacoes 
        };

        delete submissionData.procedimentos;

        // --- SOLUÇÃO: LIMPEZA PERFEITA AO TROCAR DE CONSULTA PARA PROCEDIMENTO ---
        if (tipoAgendamento === 'Procedimento') {
            submissionData.especialidade = null; // Garante que a especialidade antiga seja apagada
            if (formData.procedimentos && formData.procedimentos.length > 0) {
                submissionData.procedimentos_ids = formData.procedimentos.map(p => p.id);
                submissionData.procedimento = formData.procedimentos[0].id; // Fallback principal
            } else if (formData.procedimento) {
                submissionData.procedimentos_ids = [formData.procedimento.id];
                submissionData.procedimento = formData.procedimento.id;
            }
        } else if (tipoAgendamento === 'Consulta') {
            submissionData.procedimento = null;
            delete submissionData.procedimentos_ids; // <--- DELETA A VARIÁVEL AQUI
            submissionData.especialidade = formData.especialidade?.id || null;
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
            const errorMsg = traduzirErroBackend(error.response?.data);
            showSnackbar(errorMsg, 'error');
        } finally { setIsSubmitting(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return; 
        const erroValidacao = validarFormulario();
        if (erroValidacao) { showSnackbar(erroValidacao, 'warning'); return; }

        if (tipoAgendamento === 'Consulta' && formData.medico && formData.data_hora_inicio && formData.data_hora_fim) {
            const dentroDaJornada = verificarDentroDaJornada(formData.data_hora_inicio, formData.data_hora_fim);
            if (!dentroDaJornada) { setConfirmarJornadaOpen(true); return; }
        }
        executarSubmitReal();
    };

    const handleDelete = async () => {
        if (!editingEvent?.id) return;
        if (!window.confirm("Deseja CANCELAR este agendamento? Ele ficará salvo no histórico e a cobrança pendente será anulada.")) return;
        
        setIsSubmitting(true);
        try {
            // 👇 CORREÇÃO: Montamos o pacote completo para satisfazer o Django
            const cancelData = {
                ...formData,
                paciente: formData.paciente?.id || null,
                medico: formData.medico?.id || null,
                sala: formData.sala?.id || null,
                especialidade: formData.especialidade?.id || null,
                procedimento: formData.procedimento?.id || null,
                tipo_agendamento: tipoAgendamento,
                data_hora_inicio: formData.data_hora_inicio ? formData.data_hora_inicio.toISOString() : null,
                data_hora_fim: formData.data_hora_fim ? formData.data_hora_fim.toISOString() : null,
                status: 'Cancelado' // <--- O gatilho que aciona o financeiro!
            };

            await agendamentoService.updateAgendamento(editingEvent.id, cancelData);
            
            showSnackbar("Agendamento cancelado com sucesso.", "success");
            onSave(); 
            onClose(); 
        } catch (error) {
            const errorMsg = traduzirErroBackend(error.response?.data);
            showSnackbar(errorMsg, 'error');
        } finally { 
            setIsSubmitting(false); 
        }
    };
    
    const infoFinanceira = useMemo(() => {
        if (formData.tipo_atendimento === 'Convenio' && formData.plano_utilizado) {
            if (tipoAgendamento === 'Procedimento') {
                const listaProcedimentos = formData.procedimentos?.length > 0 ? formData.procedimentos : (formData.procedimento ? [formData.procedimento] : []);
                let totalConvenio = 0; let precoFaltando = false;
                listaProcedimentos.forEach(proc => {
                    const precoPlano = proc.valores_convenio?.find(v => v.plano_convenio?.id === formData.plano_utilizado.id)?.valor;
                    if (precoPlano) totalConvenio += parseFloat(precoPlano); else precoFaltando = true; 
                });
                if (precoFaltando) return { status: 'erro', texto: 'Aviso: Há exames selecionados SEM PREÇO CADASTRADO para este plano.' };
                return { status: 'ok', texto: `Faturar Convênio: R$ ${totalConvenio.toFixed(2).replace('.', ',')}` };
            }
            if (tipoAgendamento === 'Consulta' && formData.especialidade) {
                const precoPlanoConsulta = formData.especialidade.valores_convenio?.find(v => v.plano_convenio_id === formData.plano_utilizado.id || v.plano_convenio?.id === formData.plano_utilizado.id)?.valor;
                if (precoPlanoConsulta) return { status: 'ok', texto: `Faturar Convênio: R$ ${parseFloat(precoPlanoConsulta).toFixed(2).replace('.', ',')}` };
                return { status: 'erro', texto: 'Aviso: PREÇO NÃO CADASTRADO.' };
            }
            return { status: 'ok', texto: `Faturamento via Convênio` };
        }
        if (formData.tipo_atendimento === 'Particular') {
            if (tipoAgendamento === 'Consulta' && formData.especialidade?.valor_consulta) return { status: 'ok', texto: `R$ ${formData.especialidade.valor_consulta}` };
            if (tipoAgendamento === 'Procedimento') {
                if (formData.procedimentos && formData.procedimentos.length > 0) {
                    const total = formData.procedimentos.reduce((acc, proc) => acc + (parseFloat(proc.valor_particular) || 0), 0);
                    return { status: 'ok', texto: `R$ ${total.toFixed(2).replace('.', ',')}` };
                } else if (formData.procedimento?.valor_particular) { return { status: 'ok', texto: `R$ ${parseFloat(formData.procedimento.valor_particular).toFixed(2).replace('.', ',')}` }; }
            }
        }
        return null;
    }, [tipoAgendamento, formData.especialidade, formData.procedimento, formData.procedimentos, formData.tipo_atendimento, formData.plano_utilizado]);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" PaperProps={{ sx: { borderRadius: 3, bgcolor: '#fbfcff' } }}>
            <DialogTitle sx={{ p: 1.5, pb: 1, borderBottom: '1px solid #e0e0e0', bgcolor: '#fff' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight="bold" color="primary.main">
                        {editingEvent ? 'Editar Agendamento' : 'Novo Agendamento'}
                    </Typography>
                    {formData.data_hora_inicio && (
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            {capacidade.loading ? <CircularProgress size={16} /> : (
                                <>
                                    <Chip label={`Consultas: ${capacidade.consultas}/${MAX_CONS}`} color={capacidade.consultas >= MAX_CONS ? "error" : "success"} size="small" variant={tipoAgendamento === 'Consulta' ? "filled" : "outlined"} sx={{ height: 20 }} />
                                    <Chip label={`Procedimentos: ${capacidade.procedimentos}/${MAX_PROC}`} color={capacidade.procedimentos >= MAX_PROC ? "error" : "success"} size="small" variant={tipoAgendamento === 'Procedimento' ? "filled" : "outlined"} sx={{ height: 20 }} />
                                </>
                            )}
                        </Box>
                    )}
                </Box>
            </DialogTitle>

            <form onSubmit={handleSubmit}>
                <DialogContent sx={{ p: 1.5 }}>
                    <Grid container spacing={1.5}>
                        
                        <Grid item xs={12} md={7}>
                            <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, borderRadius: 2, borderColor: '#e0e0e0', bgcolor: '#fff' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: 'primary.main' }}>
                                    <PersonOutlineIcon sx={{ mr: 1, fontSize: 20 }} />
                                    <Typography variant="subtitle2" fontWeight="bold">Identificação</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                    <FormControl fullWidth>
                                        <Autocomplete 
                                            options={pacientes} 
                                            ListboxProps={{ style: { maxHeight: 200 } }} 
                                            getOptionLabel={(option) => option.nome_completo || ''} 
                                            value={formData.paciente} 
                                            isOptionEqualToValue={(o, v) => o.id === v.id} 
                                            onChange={handlePacienteChange}                                         
                                            onInputChange={(event, newInputValue) => setInputValuePaciente(newInputValue || '')}
                                            noOptionsText={
                                                <Box sx={{ textAlign: 'center', py: 1 }}>
                                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Nenhum paciente encontrado.</Typography>
                                                    <Button variant="outlined" size="small" startIcon={<PersonAddIcon />} onClick={() => {
                                                        if(onAbrirNovoPaciente) {
                                                            setEsperandoNovoPaciente(true); 
                                                            onAbrirNovoPaciente(inputValuePaciente);
                                                        }
                                                    }}>
                                                        Cadastrar "{inputValuePaciente}"
                                                    </Button>
                                                </Box>
                                            }
                                            filterOptions={(options, params) => {
                                                const termo = params.inputValue || '';
                                                const inputLimpo = removerAcentos(termo.toLowerCase().trim());
                                                const inputApenasNumeros = termo.replace(/\D/g, '');
                                                if (inputLimpo === '') return options.slice(0, 50);
                                                const filtered = options.filter(option => {
                                                    const nomeBanco = option.nome_completo ? removerAcentos(option.nome_completo.toLowerCase()) : '';
                                                    const matchNome = nomeBanco.includes(inputLimpo);
                                                    const cpfBanco = option.cpf ? option.cpf.replace(/\D/g, '') : '';
                                                    const matchCpf = inputApenasNumeros.length > 0 && cpfBanco.startsWith(inputApenasNumeros);
                                                    return matchNome || matchCpf;
                                                });
                                                return filtered.slice(0, 50);
                                            }}
                                            renderOption={(props, option) => {
                                                const { key, ...optionProps } = props;
                                                return (
                                                    <li key={key} {...optionProps} style={{ padding: 0 }}>
                                                        <Box sx={{ p: 1, width: '100%', display: 'flex', flexDirection: 'column' }}>
                                                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#333' }}>{option.nome_completo}</Typography>
                                                            <Typography variant="caption" sx={{ color: '#757575' }}>{option.cpf ? `CPF: ${option.cpf}` : 'Sem CPF'}</Typography>
                                                        </Box>
                                                    </li>
                                                );
                                            }}
                                            renderInput={(params) => (<TextField {...params} label="Buscar paciente por nome ou CPF *" size="small" error={!formData.paciente} />)} 
                                        />
                                    </FormControl>
                                    <Tooltip title="Cadastrar Novo Paciente">
                                        <Button variant="contained" color="primary" sx={{ minWidth: '40px', width: '40px', height: '40px', p: 0 }} onClick={() => {
                                            if(onAbrirNovoPaciente) {
                                                setEsperandoNovoPaciente(true); 
                                                onAbrirNovoPaciente(inputValuePaciente);
                                            }
                                        }}>
                                            <PersonAddIcon />
                                        </Button>
                                    </Tooltip>
                                </Box>
                                {pacienteDetalhes?.plano_convenio_detalhes && (
                                    <Alert severity="info" sx={{ mt: 1, py: 0, px: 2, '& .MuiAlert-message': { py: 0 } }}>
                                        Plano: <strong>{pacienteDetalhes.plano_convenio_detalhes.convenio_nome}</strong>
                                    </Alert>
                                )}
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, borderRadius: 2, borderColor: '#e0e0e0', bgcolor: '#fff' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: 'primary.main' }}>
                                    <MedicalInformationOutlinedIcon sx={{ mr: 1, fontSize: 20 }} />
                                    <Typography variant="subtitle2" fontWeight="bold">Dados Clínicos</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    
                                    <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Tipo</InputLabel>
                                            <Select value={tipoAgendamento} label="Tipo" onChange={(e) => setTipoAgendamento(e.target.value)}>
                                                <MenuItem value="Consulta">Consulta</MenuItem>
                                                <MenuItem value="Procedimento">Procedimento</MenuItem>
                                            </Select>
                                        </FormControl>

                                        {tipoAgendamento === 'Consulta' && (
                                            <Autocomplete fullWidth options={especialidades} getOptionLabel={(e) => e.nome || ''} value={formData.especialidade} isOptionEqualToValue={(o, v) => o.id === v.id} onChange={(e, value) => setFormData({ ...formData, especialidade: value, medico: null })} renderInput={(params) => <TextField {...params} label="Especialidade *" size="small" />} />
                                        )}
                                    </Box>

                                    <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                                        {tipoAgendamento === 'Consulta' ? (
                                            <Autocomplete fullWidth options={medicos.filter(m => formData.especialidade ? m.especialidades.includes(formData.especialidade.id) : true)} getOptionLabel={(m) => m.first_name + ' ' + m.last_name} value={formData.medico} isOptionEqualToValue={(o, v) => o.id === v.id} onChange={(e, value) => setFormData({ ...formData, medico: value })} disabled={!formData.especialidade} renderInput={(params) => <TextField {...params} label="Médico *" size="small" />} />
                                        ) : (
                                            <Autocomplete fullWidth options={medicos} getOptionLabel={(m) => m.first_name + ' ' + m.last_name} value={formData.medico} isOptionEqualToValue={(o, v) => o.id === v.id} onChange={(e, value) => setFormData({ ...formData, medico: value })} renderInput={(params) => <TextField {...params} label="Médico Responsável (Opcional)" size="small" />} />
                                        )}

                                        <FormControl fullWidth>
                                            <Autocomplete options={salasFiltradas} getOptionLabel={(s) => s.nome || ''} value={formData.sala} isOptionEqualToValue={(o, v) => o.id === v.id} onChange={(e, value) => setFormData(prev => ({...prev, sala: value}))} renderInput={(params) => (<TextField {...params} label="Sala *" size="small" error={!formData.sala} />)} noOptionsText="Nenhuma sala" />
                                        </FormControl>
                                    </Box>

                                    {tipoAgendamento === 'Procedimento' && (
                                         <Autocomplete multiple options={procedimentos} getOptionLabel={(p) => p.descricao || ''} value={formData.procedimentos} isOptionEqualToValue={(o, v) => o.id === v.id} onChange={handleProcedimentosChange} disableCloseOnSelect renderInput={(params) => (<TextField {...params} label={editingEvent ? "Procedimento *" : "Procedimentos *"} size="small" placeholder={formData.procedimentos.length > 0 ? "" : "Selecione..."} /> )} renderTags={(value, getTagProps) => value.map((option, index) => ( <Chip variant="filled" color="primary" label={option.descricao} size="small" sx={{ color: '#fff', height: 20 }} {...getTagProps({ index })} /> ))} />
                                    )}

                                    {bloqueioCapacidade && (
                                        <Alert 
                                            severity={bloqueioCapacidade ? "warning" : "info"} 
                                            sx={{ alignItems: 'center', py: 0, '& .MuiAlert-message': { py: 0 } }}
                                        >
                                            <FormControlLabel 
                                                control={
                                                    <Switch 
                                                        checked={isEncaixe} 
                                                        onChange={(e) => setIsEncaixe(e.target.checked)} 
                                                        color={bloqueioCapacidade ? "warning" : "info"} 
                                                        size="small" 
                                                    />
                                                } 
                                                label={
                                                    <Typography variant="caption" fontWeight="bold">
                                                        {bloqueioCapacidade ? "Forçar Encaixe (Lotado)" : "Marcar como Encaixe ⚡"}
                                                    </Typography>
                                                } 
                                                sx={{ m: 0 }} 
                                            />
                                        </Alert>
                                    )}
                                </Box>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderColor: '#e0e0e0', bgcolor: '#fff' }}>
                                <TextField
                                    label="Observações Gerais (Opcional)"
                                    fullWidth
                                    size="small"
                                    value={formData.observacoes || ''}
                                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                                    placeholder="Ex: Paciente cadeirante..."
                                />
                            </Paper>
                        </Grid>

                        <Grid item xs={12} md={5}>
                            <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, borderRadius: 2, borderColor: '#e0e0e0', bgcolor: '#fff' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: 'primary.main' }}>
                                    <EventAvailableOutlinedIcon sx={{ mr: 1, fontSize: 20 }} />
                                    <Typography variant="subtitle2" fontWeight="bold">Organização</Typography>
                                </Box>
                                <Grid container spacing={1}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField label="Início *" value={dataInicioVisual} onChange={handleDataInicioChange} fullWidth size="small" placeholder="DD/MM/AAAA HH:MM" InputProps={{ inputComponent: TextMaskDateTime }} />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField label="Fim *" value={dataFimVisual} onChange={handleDataFimChange} fullWidth size="small" placeholder="DD/MM/AAAA HH:MM" InputProps={{ inputComponent: TextMaskDateTime }} />
                                    </Grid>
                                </Grid>
                                
                                <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' }, mt: 1 }}>
                                    <FormControl fullWidth size="small"><InputLabel>Modalidade</InputLabel><Select name="modalidade" value={formData.modalidade} label="Modalidade" onChange={(e) => setFormData({...formData, modalidade: e.target.value})} ><MenuItem value="Presencial">Presencial</MenuItem><MenuItem value="Telemedicina">Telemedicina</MenuItem></Select></FormControl>
                                    <FormControl fullWidth size="small"><InputLabel>Status</InputLabel><Select name="status" value={formData.status} label="Status" onChange={(e) => setFormData({...formData, status: e.target.value})}>
                                        <MenuItem value="Agendado">Agendado</MenuItem>
                                        <MenuItem value="Confirmado">Confirmado</MenuItem>
                                        <MenuItem value="Realizado">Realizado</MenuItem>
                                        <MenuItem value="Não Compareceu">Faltou / Não Compareceu</MenuItem>
                                        {/* 👇 Adicione as novas opções abaixo 👇 */}
                                        <MenuItem value="Cancelado">Cancelado</MenuItem>
                                        <MenuItem value="Desistência">Desistência</MenuItem>
                                    </Select></FormControl>
                                </Box>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderColor: '#e0e0e0', bgcolor: '#fff' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: 'primary.main' }}>
                                    <AttachMoneyOutlinedIcon sx={{ mr: 1, fontSize: 20 }} />
                                    <Typography variant="subtitle2" fontWeight="bold">Faturamento</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    
                                    <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center' }}>
                                        <FormControl fullWidth size="small"><InputLabel>Tipo</InputLabel><Select name="tipo_atendimento" value={formData.tipo_atendimento} label="Tipo" onChange={(e) => setFormData({...formData, tipo_atendimento: e.target.value})}><MenuItem value="Particular">Particular</MenuItem><MenuItem value="Convenio">Convênio</MenuItem></Select></FormControl>
                                        
                                        <Box sx={{ p: 0.5, bgcolor: formData.isento_cobranca ? '#e8f5e9' : 'transparent', borderRadius: 1, whiteSpace: 'nowrap' }}>
                                            <FormControlLabel control={<Switch checked={formData.isento_cobranca || false} onChange={(e) => setFormData({...formData, isento_cobranca: e.target.checked})} color="success" size="small" />} label={<Typography variant="body2" fontWeight="bold" color={formData.isento_cobranca ? 'success.dark' : 'text.primary'}>Isentar</Typography>} sx={{ m: 0 }} />
                                        </Box>
                                    </Box>

                                    {formData.isento_cobranca && (<TextField label="Motivo da Isenção *" size="small" fullWidth value={formData.motivo_isencao || ''} onChange={(e) => setFormData({...formData, motivo_isencao: e.target.value})} required={formData.isento_cobranca} placeholder="Ex: Retorno..." sx={{ bgcolor: '#fff' }} />)}

                                    {formData.tipo_atendimento === 'Convenio' && (
                                        <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                                            <FormControl fullWidth size="small">
                                                <Autocomplete options={convenios} getOptionLabel={(option) => option.nome || ''} value={convenioSelecionado} isOptionEqualToValue={(option, value) => option.id === value.id} onChange={(event, newValue) => { setConvenioSelecionado(newValue); setFormData({ ...formData, plano_utilizado: null }); }} renderInput={(params) => <TextField {...params} label="Empresa *" size="small" />} />
                                            </FormControl>
                                            <FormControl fullWidth size="small">
                                                <Autocomplete options={convenioSelecionado ? planos.filter(p => p.convenio_nome === convenioSelecionado.nome) : []} getOptionLabel={(option) => option.nome || ''} value={formData.plano_utilizado} disabled={!convenioSelecionado} isOptionEqualToValue={(option, value) => option.id === value.id} onChange={(event, newValue) => setFormData({ ...formData, plano_utilizado: newValue })} renderInput={(params) => <TextField {...params} label="Plano *" error={!formData.plano_utilizado} size="small" />} noOptionsText={convenioSelecionado ? "Nenhum plano" : "Empresa..."} />
                                            </FormControl>
                                        </Box>
                                    )}
                                    
                                    {infoFinanceira && infoFinanceira.status === 'ok' && (
                                        <Box sx={{ p: 1, backgroundColor: '#e3f2fd', borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="caption" color="text.secondary">Total Previsto:</Typography><Typography variant="body2" color="primary.main" fontWeight="bold">{infoFinanceira.texto}</Typography>
                                        </Box>
                                    )}
                                    
                                    {infoFinanceira && infoFinanceira.status === 'erro' && (<Alert severity="error" sx={{ py: 0, '& .MuiAlert-message': { py: 0 } }}>{infoFinanceira.texto}</Alert>)}
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </DialogContent>
                
                <DialogActions sx={{ p: 1.5, borderTop: '1px solid #e0e0e0', bgcolor: '#fff' }}>
                    <Box>{editingEvent && (<Button onClick={handleDelete} color="error" startIcon={<DeleteIcon />} disabled={isSubmitting} size="small">Excluir</Button>)}</Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button onClick={onClose} disabled={isSubmitting} color="inherit" size="small">Cancelar</Button>
                        <Button type="submit" variant="contained" disabled={isSubmitting} size="small" sx={{ px: 3, borderRadius: 2 }}>{isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Salvar'}</Button>
                    </Box>
                </DialogActions>
            </form>

            <Dialog open={confirmarJornadaOpen} onClose={() => setConfirmarJornadaOpen(false)} PaperProps={{ sx: { borderRadius: 2, minWidth: 400 } }}>
                <DialogTitle sx={{ color: 'warning.main', fontWeight: 'bold' }}>Aviso de Fora de Jornada</DialogTitle>
                <DialogContent dividers>
                    <Typography>O horário selecionado (<strong>{dataInicioVisual} às {dataFimVisual.substring(11, 16)}</strong>) está <strong>fora da jornada de trabalho</strong> cadastrada para o(a) Dr(a). {formData.medico?.first_name}.</Typography>
                    <Typography sx={{ mt: 2 }}>Deseja forçar este agendamento como uma exceção?</Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setConfirmarJornadaOpen(false)} color="inherit">Cancelar</Button>
                    <Button onClick={() => { setConfirmarJornadaOpen(false); executarSubmitReal(); }} variant="contained" color="warning">Sim, Forçar</Button>
                </DialogActions>
            </Dialog>
        </Dialog>
    );
}