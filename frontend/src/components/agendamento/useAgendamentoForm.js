// src/components/agendamento/useAgendamentoForm.js
// Todo o estado, carregamento de dados, validação, checagem de capacidade/jornada e
// submissão do AgendamentoModal, extraído SEM MUDAR NENHUM COMPORTAMENTO — só pra tirar
// essa lógica do meio do JSX. Qualquer regra de negócio (obrigatoriedade de campo,
// limite de consultas/procedimentos, checagem de jornada, cálculo de valor) que existia
// antes continua exatamente igual aqui.
import { useState, useEffect, useMemo, useCallback } from 'react';
import { agendamentoService } from '../../services/agendamentoService';
import { faturamentoService } from '../../services/faturamentoService';
import { pacienteService } from '../../services/pacienteService';
import { configuracoesService } from '../../services/configuracoesService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/pt-br';
import { getInitialFormData, removerAcentos, traduzirErroBackend } from './agendamentoHelpers';

dayjs.extend(customParseFormat);
dayjs.locale('pt-br');

const MAX_CONS = 3;
const MAX_PROC = 1;

export function useAgendamentoForm({ open, editingEvent, initialData, refreshTrigger, onSave, onClose }) {
    const { showSnackbar } = useSnackbar();

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
    const [isSlotAvailable] = useState(true);
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

            faturamentoService.getPlanosConvenio().then(response => { if (isMounted) setPlanos(response.data) }).catch(err => console.error(err));
            faturamentoService.getConvenios().then(response => { if (isMounted) setConvenios(response.data) }).catch(err => console.error(err));
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            if (!formData.medico) return "Selecione o médico responsável.";

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
        // Médico sem jornada cadastrada: não temos como saber o horário dele, então tratamos
        // como "dentro" (não avisa nem marca encaixe). Mesma regra do backend (_esta_fora_da_jornada).
        if (jornadasMedico.length === 0) return true;
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

        // Vale para Consulta E Procedimento: se o horário cai fora da jornada do médico,
        // avisa antes (e o backend marca como encaixe ao salvar).
        if (formData.medico && formData.data_hora_inicio && formData.data_hora_fim) {
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

    return {
        MAX_CONS, MAX_PROC,
        formData, setFormData,
        isSubmitting,
        dataInicioVisual, dataFimVisual, handleDataInicioChange, handleDataFimChange,
        pacientes, procedimentos, planos, convenios, convenioSelecionado, setConvenioSelecionado,
        medicos, especialidades, salas, salasFiltradas,
        isEncaixe, setIsEncaixe,
        inputValuePaciente, setInputValuePaciente,
        isAdmin,
        pacienteDetalhes,
        tipoAgendamento, setTipoAgendamento,
        capacidade, bloqueioCapacidade,
        jornadasMedico,
        confirmarJornadaOpen, setConfirmarJornadaOpen,
        setEsperandoNovoPaciente,
        handlePacienteChange,
        handleProcedimentosChange,
        handleSubmit,
        handleDelete,
        executarSubmitReal,
        infoFinanceira,
        removerAcentos
    };
}
