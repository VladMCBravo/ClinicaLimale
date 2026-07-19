// src/components/agenda/AgendaPrincipal.jsx
import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Box, Menu, MenuItem, ListItemIcon, ListItemText, Divider, Tooltip, Checkbox, IconButton, Typography, Badge, Button, CircularProgress } from '@mui/material';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import PersonIcon from '@mui/icons-material/Person';
import FilterListIcon from '@mui/icons-material/FilterList';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import apiClient from '../../api/axiosConfig'; // Para buscar os médicos com jornada
import { styled } from '@mui/material/styles'; 
import FullCalendar from '@fullcalendar/react';
import { useNavigate } from 'react-router-dom';
import { FaEdit, FaFileMedical, FaStethoscope, FaExclamationTriangle, FaWhatsapp } from 'react-icons/fa';
// Plugins
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';

import { agendamentoService } from '../../services/agendamentoService';

// CSS CUSTOMIZADO
const StyledCalendarWrapper = styled('div')({
    flexGrow: 1,
    height: '100%',
    minHeight: 0, // Impede que o wrapper cresça para caber todos os slots de horário (o mesmo padrão usado em MainLayout.jsx)
    overflow: 'hidden', // O FullCalendar cuida do scroll interno da grade; sem isso o rodapé nunca termina
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#fff',
    position: 'relative', // <--- 1. ADICIONE APENAS ESTA LINHA AQUI

    // --- FONTES DOS HORÁRIOS MENORES ---
    '.fc-timegrid-slot-label-cushion': { 
        fontSize: '0.7rem !important', // Fonte menor
        fontWeight: 500,
        color: '#90a4ae'
    },
    
    // Ajuste fino das células e slots
    '.fc-timegrid-slot': { height: '32px !important' }, 
    '.fc-theme-standard td, .fc-theme-standard th': { borderColor: '#f1f3f5' },
    '.fc-col-header-cell-cushion': { padding: '8px 0', fontSize: '0.85rem', color: '#1C2E4A' },
    
    // Eventos
    '.fc-event': {
        boxShadow: 'none',
        border: 'none',
        borderRadius: '3px',
        margin: '0 1px',
        fontSize: '0.75rem'
    },

    // Encaixe: contorno tracejado âmbar, visível independente da cor da sala
    '.fc-event.evento-encaixe': {
        boxShadow: 'inset 0 0 0 2px #ffab00',
        outline: '1px dashed #ffab00',
        outlineOffset: '1px'
    },

    // Fora do expediente do médico (modo "Médicos"): cinza neutro em vez do
    // vermelho padrão do FullCalendar para "background events"
    '.fc-bg-event': {
        backgroundColor: 'rgba(120, 130, 140, 0.12)',
        opacity: 1
    },
    
});

// Toolbar 100% customizada (substitui o headerToolbar nativo do FullCalendar) —
// permite colocar navegação, título e os toggles de Salas/Médicos/Dia-Semana-Mês
// todos numa linha só, sem sobreposição, independente da largura da data exibida.
const CustomToolbar = styled(Box)({
    display: 'flex',
    alignItems: 'center',
    minHeight: 44,
    padding: '6px 10px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #eee',
    gap: 8
});

const toggleButtonSx = {
    px: 1.5, fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize',
    color: '#fff', bgcolor: '#1C2E4A', borderColor: '#1C2E4A',
    '&:hover': { bgcolor: '#16233a' },
    '&.Mui-selected': { bgcolor: '#000', color: '#fff' },
    '&.Mui-selected:hover': { bgcolor: '#000' }
};

const SALA_COLORS = ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#0288d1'];
const getColorForSala = (id) => SALA_COLORS[parseInt(String(id).replace(/\D/g, ''), 10) % SALA_COLORS.length] || '#1976d2';

// Mesmo endereço usado nas mensagens automáticas do chatbot (backend/chatbot/agente_*.py)
const CLINICA_ENDERECO = 'Rua Orense, 41 - Sala 512, Centro - Diadema/SP';
const CLINICA_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Rua Orense, 41 - Centro, Diadema - SP')}`;
const capitalizar = (texto) => texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;

// Espelha CustomUser.nome_com_prefixo (backend/usuarios/models.py): usa o campo
// 'genero' quando preenchido, senão cai no fallback de checar a última letra do
// primeiro nome. Usado onde só temos o nome curto do médico (cabeçalho da coluna,
// aviso de fora de expediente) — quando o back já manda o nome completo pronto
// (medico_nome_com_prefixo), preferimos usar aquele em vez desta função.
const prefixoTratamento = (medico) => {
    if (medico?.genero === 'F') return 'Dra.';
    if (medico?.genero === 'M') return 'Dr.';
    const primeiroNome = (medico?.first_name || '').trim().split(' ')[0].toLowerCase();
    return primeiroNome.endsWith('a') ? 'Dra.' : 'Dr.';
};

// --- SOMBREAMENTO DE JORNADA (modo "Médicos") ---
const SLOT_MIN_TIME = '06:30:00';
const SLOT_MAX_TIME = '22:00:00';

const timeStrParaMinutos = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
};
const minutosParaTimeStr = (mins) => {
    const h = String(Math.floor(mins / 60)).padStart(2, '0');
    const m = String(mins % 60).padStart(2, '0');
    return `${h}:${m}:00`;
};

// Converte Date.getDay() (0=Domingo) para o índice usado pelo Django (0=Segunda...6=Domingo)
const diaSemanaParaDjango = (data) => (data.getDay() + 6) % 7;

// Para cada médico, gera "background events" cobrindo os horários em que ele NÃO
// atende no dia exibido, com base nas jornadas cadastradas em Configurações.
// Médicos sem nenhuma jornada cadastrada não são sombreados (não sabemos a agenda
// deles) — em vez disso ganham um aviso no cabeçalho da coluna (ver resourceLabelContent).
const construirEventosForaExpediente = (listaMedicos, dataExibida) => {
    const diaSemanaDjango = diaSemanaParaDjango(dataExibida);
    const anoMesDia = `${dataExibida.getFullYear()}-${String(dataExibida.getMonth() + 1).padStart(2, '0')}-${String(dataExibida.getDate()).padStart(2, '0')}`;
    const slotMinMin = timeStrParaMinutos(SLOT_MIN_TIME);
    const slotMaxMin = timeStrParaMinutos(SLOT_MAX_TIME);
    const eventos = [];

    listaMedicos.forEach(medico => {
        const jornadas = medico.jornadas || [];
        if (jornadas.length === 0) return; // sem jornada cadastrada: não sombreia

        const resourceId = `medico_${medico.id}`;
        const nomeMedico = `${prefixoTratamento(medico)} ${medico.first_name} ${medico.last_name || ''}`.trim();

        const janelasHoje = jornadas
            .filter(j => j.dia_da_semana === diaSemanaDjango)
            .map(j => [timeStrParaMinutos(j.hora_inicio), timeStrParaMinutos(j.hora_fim)])
            .sort((a, b) => a[0] - b[0]);

        if (janelasHoje.length === 0) {
            eventos.push({
                display: 'background',
                resourceId,
                start: `${anoMesDia}T${SLOT_MIN_TIME}`,
                end: `${anoMesDia}T${SLOT_MAX_TIME}`,
                extendedProps: { isForaExpediente: true, medicoNome: nomeMedico }
            });
            return;
        }

        let cursor = slotMinMin;
        janelasHoje.forEach(([inicio, fim]) => {
            const inicioClamp = Math.max(inicio, slotMinMin);
            if (inicioClamp > cursor) {
                eventos.push({
                    display: 'background',
                    resourceId,
                    start: `${anoMesDia}T${minutosParaTimeStr(cursor)}`,
                    end: `${anoMesDia}T${minutosParaTimeStr(inicioClamp)}`,
                    extendedProps: { isForaExpediente: true, medicoNome: nomeMedico }
                });
            }
            cursor = Math.max(cursor, Math.min(fim, slotMaxMin));
        });
        if (cursor < slotMaxMin) {
            eventos.push({
                display: 'background',
                resourceId,
                start: `${anoMesDia}T${minutosParaTimeStr(cursor)}`,
                end: `${anoMesDia}T${SLOT_MAX_TIME}`,
                extendedProps: { isForaExpediente: true, medicoNome: nomeMedico }
            });
        }
    });

    return eventos;
};

export default function AgendaPrincipal({
    medicoFiltro,
    especialidadeFiltro,
    onDateClick,
    onEventClick,
    onDatesSet, // <--- ADICIONE AQUI
    salas = [],
    refreshTrigger,
    kpis = {},
    loadingKpis = false,
    onNovoPaciente,
    onBuscarHorario,
    onTabelaPrecos,
    onStatusWhatsapp
}) {
    const calendarRef = useRef(null);
    const navigate = useNavigate();

    // ESTADOS DO MENU
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const openMenu = Boolean(anchorEl);

    // Badge de KPIs e menu de ações secundárias, ambos recolhidos por padrão para
    // caber a barra da agenda inteira numa linha só
    const [kpiAnchorEl, setKpiAnchorEl] = useState(null);
    const [moreAnchorEl, setMoreAnchorEl] = useState(null);
    const handleCloseMore = (action) => {
        setMoreAnchorEl(null);
        if (action) action();
    };

    // --- NOVOS ESTADOS PARA O MODO DE VISÃO ---
    const [viewMode, setViewMode] = useState('salas'); // 'salas' ou 'medicos'
    // Todos os médicos (não só quem já tem jornada cadastrada), cada um já vem com
    // '.jornadas' aninhado (UserSerializer.get_jornadas) — usado tanto para montar as
    // colunas do modo "Médicos" quanto para sombrear os horários fora de expediente.
    const [medicos, setMedicos] = useState([]);

    // Filtro de quais colunas aparecem: null = mostrar todas (sentinela, evita ter
    // que sincronizar com o carregamento assíncrono de salas/médicos); um array
    // explícito é a seleção manual feita pelo usuário no menu de filtro.
    const [salasVisiveisIds, setSalasVisiveisIds] = useState(null);
    const [medicosVisiveisIds, setMedicosVisiveisIds] = useState(null);
    const [filtroAnchorEl, setFiltroAnchorEl] = useState(null);
    const filtroMenuAberto = Boolean(filtroAnchorEl);

    // --- ESTADO DA TOOLBAR CUSTOMIZADA (título e view atual, refletindo o FullCalendar) ---
    const [tituloAtual, setTituloAtual] = useState('');
    const [viewAtual, setViewAtual] = useState('resourceTimeGridDay');

    const handlePrev = () => calendarRef.current?.getApi().prev();
    const handleNext = () => calendarRef.current?.getApi().next();
    const handleHoje = () => calendarRef.current?.getApi().today();
    const handleChangeView = (viewName) => calendarRef.current?.getApi().changeView(viewName);
    const handleDatesSet = (arg) => {
        setTituloAtual(arg.view.title);
        setViewAtual(arg.view.type);
        if (onDatesSet) onDatesSet(arg);
    };

    useEffect(() => {
        apiClient.get('/usuarios/usuarios/?cargo=medico&apenas_ativos=true')
            .then(res => setMedicos(res.data.results || res.data || []))
            .catch(err => console.error("Erro ao buscar médicos", err));
    }, []);

    // 1. Apague o [eventos, setEventos] e a função carregarEventos.
    // 2. Crie esta nova função que o FullCalendar vai usar para buscar os dados sob demanda:
    const fetchEventos = useCallback((fetchInfo, successCallback, failureCallback) => {
        const { startStr, endStr } = fetchInfo;

        agendamentoService.getAgendamentos(medicoFiltro, especialidadeFiltro, startStr, endStr)
            .then(response => {
                const agrupadosMap = new Map();
                
                response.data.forEach(ag => {
                    if (!ag.sala) return;

                    const chave = `${ag.paciente}_${ag.data_hora_inicio}`;
                    // Consultas normais não têm procedimento_descricao/tipo_exame — cai pra especialidade
                    // (ex: "Cardiologia") em vez do texto genérico "Procedimento" que não dizia nada.
                    const procAtual = ag.procedimento_descricao || ag.tipo_exame || ag.especialidade_nome || 'Consulta';

                    if (agrupadosMap.has(chave)) {
                        const existente = agrupadosMap.get(chave);
                        existente.tipo_procedimento += ` + ${procAtual}`;
                        existente.quantidade_exames = (existente.quantidade_exames || 1) + 1;
                        // --- NOVO: GUARDA OS IDs DOS OUTROS EXAMES DO GRUPO ---
                        if (ag.procedimento) existente.lista_procedimentos_ids.push(ag.procedimento);
                        // Se qualquer exame do grupo for encaixe, o grupo inteiro é exibido como encaixe
                        existente.is_encaixe = existente.is_encaixe || ag.is_encaixe;
                    } else {
                        agrupadosMap.set(chave, {
                            ...ag,
                            tipo_procedimento: procAtual,
                            quantidade_exames: 1,
                            // --- NOVO: INICIA A LISTA COM O PRIMEIRO EXAME ---
                            lista_procedimentos_ids: ag.procedimento ? [ag.procedimento] : []
                        });
                    }
                });

                const eventosFormatados = Array.from(agrupadosMap.values()).map(ag => {
                    const isInativo = ag.status === 'Cancelado' || ag.status === 'Não Compareceu';
                    const colunaId = viewMode === 'salas' ? `sala_${ag.sala}` : `medico_${ag.medico}`;

                    return {
                        id: ag.id,
                        title: ag.paciente_nome, 
                        start: ag.data_hora_inicio,
                        end: ag.data_hora_fim,
                        extendedProps: { 
                            ...ag,
                            tipo_procedimento: ag.tipo_procedimento, 
                            quantidade_exames: ag.quantidade_exames,
                            // --- NOVO: PASSA A LISTA COMPLETA PARA O MODAL LER ---
                            lista_procedimentos_ids: ag.lista_procedimentos_ids, 
                            paciente_id: ag.paciente, 
                            medico_nome: ag.medico_nome,
                            medico_crm: ag.medico_crm
                        },
                        resourceId: colunaId,
                        backgroundColor: isInativo ? 'rgba(200, 200, 200, 0.4)' : getColorForSala(ag.sala),
                        borderColor: isInativo ? 'rgba(150, 150, 150, 0.5)' : getColorForSala(ag.sala),
                        textColor: isInativo ? '#666' : '#fff',
                        classNames: [
                            ...(isInativo ? ['evento-inativo'] : []),
                            ...(ag.is_encaixe && !isInativo ? ['evento-encaixe'] : [])
                        ]
                    };
                });
                
                const eventosForaExpediente = viewMode === 'medicos'
                    ? construirEventosForaExpediente(medicos, fetchInfo.start)
                    : [];

                successCallback([...eventosFormatados, ...eventosForaExpediente]);
            })
            .catch(error => {
                console.error("Erro ao carregar a agenda:", error);
                failureCallback(error);
            });
    }, [medicoFiltro, especialidadeFiltro, viewMode, medicos]);

    // 3. Atualize o useEffect para forçar o recarregamento quando salvar um agendamento novo
useEffect(() => {
    if (calendarRef.current) {
        calendarRef.current.getApi().refetchEvents();
    }
    }, [refreshTrigger]);

    // HANDLERS DO MENU

    // 1. Ao clicar no evento (abre o menu)
    const handleCalendarEventClick = (clickInfo) => {
        clickInfo.jsEvent.preventDefault(); 
        setAnchorEl(clickInfo.el);
        setSelectedEvent(clickInfo.event);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedEvent(null);
    };

    // 2. Ação: Editar
    const handleActionEditar = () => {
    if (selectedEvent) {
        onEventClick({ 
            event: { 
                id: selectedEvent.id, 
                start: selectedEvent.start, // <--- ADICIONE ESTA LINHA
                end: selectedEvent.end,     // <--- ADICIONE ESTA LINHA (boa prática)
                ...selectedEvent.extendedProps 
            } 
        }); 
    }
    handleCloseMenu();
};

    // 3. Ação: Laudo
    const handleActionLaudo = () => {
        const dados = selectedEvent?.extendedProps;
        if (!dados || !dados.paciente_id) {
            alert("Erro: Este agendamento não tem um paciente vinculado.");
            return;
        }
        const draftLaudo = {
            paciente: { id: dados.paciente_id, nome_completo: selectedEvent.title }, 
            medicoNome: dados.medico_nome,
            medicoCrm: dados.medico_crm,
            tipoExame: dados.tipo_procedimento !== 'CONSULTA' ? dados.tipo_procedimento : 'OBSTETRICO',
            textoFinal: '',
            dadosEstruturados: {}
        };
        sessionStorage.setItem('laudos_rascunho_auto_save', JSON.stringify(draftLaudo));
        handleCloseMenu();
        navigate('/laudos');
    };

    // 4. Ação: Painel Médico
    const handleActionConsulta = () => {
        const dados = selectedEvent?.extendedProps;
        if (!dados?.paciente_id) {
             alert("Erro: Paciente não identificado.");
             return;
        }
        navigate('/painel-medico', {
            state: {
                agendamentoId: selectedEvent.id,
                pacienteId: dados.paciente_id
            }
        });
        handleCloseMenu();
    };

    // 5. Ação: Confirmação via WhatsApp — abre o WhatsApp com uma mensagem pronta
    // pedindo a confirmação do paciente, já com data/hora e o endereço da clínica.
    // Quem efetivamente envia é a pessoa da recepção, clicando em enviar no WhatsApp.
    const handleActionConfirmarWhatsapp = () => {
        const dados = selectedEvent?.extendedProps;
        const telefoneBruto = dados?.paciente_telefone;
        if (!telefoneBruto) {
            alert('Este paciente não tem telefone/WhatsApp cadastrado.');
            handleCloseMenu();
            return;
        }

        let numero = telefoneBruto.replace(/\D/g, '');
        if (numero.length <= 11) numero = `55${numero}`; // adiciona o DDI do Brasil se faltando

        const primeiroNome = (selectedEvent.title || '').trim().split(' ')[0];
        const inicio = selectedEvent.start ? new Date(selectedEvent.start) : null;
        const dataFormatada = inicio ? capitalizar(inicio.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })) : '';
        const horaFormatada = inicio ? inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
        const procedimento = dados.tipo_procedimento || dados.procedimento_descricao || dados.especialidade_nome || 'sua consulta';
        const medico = dados.medico_nome_com_prefixo || dados.medico_nome;

        // SEM emojis de fora do plano básico do Unicode (😊 📅 📋 🩺 📍 💛 etc.): mesmo usando
        // \u{...} e com o encoding correto na URL, eles chegam corrompidos ("�") no WhatsApp em
        // todas as plataformas testadas (Mac, Windows, iPhone, Android) — parece ser uma limitação
        // do próprio link wa.me com o parâmetro de texto, não do nosso código. Mensagem só com
        // texto simples e negrito (*assim*), que o WhatsApp sempre suporta.
        const mensagem = `Olá, ${primeiroNome}!\n\n`
            + `Aqui é da *Clínica Limalé*. Passando para confirmar o seu agendamento:\n\n`
            + `Data: ${dataFormatada}, às ${horaFormatada}\n`
            + `${dados.tipo_agendamento === 'Consulta' ? 'Especialidade' : 'Procedimento'}: ${procedimento}\n`
            + (medico ? `Médico(a): ${medico}\n` : '')
            + `\n*Endereço da clínica*\n${CLINICA_ENDERECO}\n`
            + `Como chegar: ${CLINICA_MAPS_URL}\n\n`
            + `Você confirma sua presença? Basta responder *SIM* ou nos avisar se precisar remarcar.`;

        window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`, '_blank');
        handleCloseMenu();
    };

    // --- FILTRO DE SALAS/MÉDICOS EXIBIDOS ---
    const listaFiltro = viewMode === 'salas' ? salas : medicos;
    const idsVisiveis = viewMode === 'salas' ? salasVisiveisIds : medicosVisiveisIds;
    const setIdsVisiveis = viewMode === 'salas' ? setSalasVisiveisIds : setMedicosVisiveisIds;
    const qtdOcultos = idsVisiveis === null ? 0 : listaFiltro.filter(item => !idsVisiveis.includes(item.id)).length;

    const alternarVisibilidade = (id) => {
        setIdsVisiveis(prev => {
            const atual = prev === null ? listaFiltro.map(item => item.id) : prev;
            return atual.includes(id) ? atual.filter(x => x !== id) : [...atual, id];
        });
    };

    const salasParaExibir = salasVisiveisIds === null ? salas : salas.filter(s => salasVisiveisIds.includes(s.id));
    const medicosParaExibir = medicosVisiveisIds === null ? medicos : medicos.filter(m => medicosVisiveisIds.includes(m.id));

    const labelParaItem = (item) => viewMode === 'salas'
        ? item.nome
        : `${prefixoTratamento(item)} ${item.first_name} ${item.last_name || ''}`.trim();

    return (
        <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', bgcolor: '#fff' }}>
            
            {/* --- FULLCALENDAR --- */}
            <StyledCalendarWrapper>
                {/* Toolbar customizada: navegação, título e os toggles, tudo numa linha só */}
                <CustomToolbar>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexShrink: 0 }}>
                        <IconButton size="small" onClick={handlePrev} sx={{ bgcolor: '#1C2E4A', color: '#fff', borderRadius: 1, width: 26, height: 26, '&:hover': { bgcolor: '#16233a' } }}>
                            <ChevronLeftIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={handleNext} sx={{ bgcolor: '#1C2E4A', color: '#fff', borderRadius: 1, width: 26, height: 26, '&:hover': { bgcolor: '#16233a' } }}>
                            <ChevronRightIcon fontSize="small" />
                        </IconButton>
                        <Button size="small" onClick={handleHoje} sx={{ bgcolor: '#78909c', color: '#fff', textTransform: 'none', fontWeight: 700, borderRadius: 1, height: 26, px: 1.2, minWidth: 0, fontSize: '0.7rem', '&:hover': { bgcolor: '#607d8b' } }}>
                            Hoje
                        </Button>
                    </Box>

                    <Typography sx={{
                        fontSize: '0.85rem', fontWeight: 700, color: '#37474f', flexShrink: 0, maxWidth: 190,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                        {tituloAtual}
                    </Typography>

                    <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />

                    <Tooltip title="Indicadores do dia (hoje · novos no mês · a confirmar)">
                        <Box
                            component="button"
                            onClick={(e) => setKpiAnchorEl(e.currentTarget)}
                            sx={{
                                display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0,
                                bgcolor: '#fdf1e2', border: '1px solid #e8b374', color: '#a35a1d',
                                borderRadius: 5, height: 26, px: 1.2, fontSize: '0.7rem', fontWeight: 700,
                                cursor: 'pointer', fontFamily: 'inherit'
                            }}
                        >
                            {loadingKpis ? <CircularProgress size={11} sx={{ color: '#a35a1d' }} /> : (
                                <>{kpis.hoje ?? 0} · {kpis.novos ?? 0} · {kpis.confirmar ?? 0}</>
                            )}
                            <KeyboardArrowDownIcon sx={{ fontSize: 14 }} />
                        </Box>
                    </Tooltip>

                    <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                        <ToggleButtonGroup
                            value={viewMode}
                            exclusive
                            onChange={(e, newValue) => { if (newValue) setViewMode(newValue); }}
                            size="small"
                        >
                            <ToggleButton value="salas" sx={{ px: 1.2, py: 0.3, fontSize: '0.7rem', fontWeight: 700, textTransform: 'none' }}>
                                <MeetingRoomIcon sx={{ fontSize: 16, mr: 0.5 }} /> Salas
                            </ToggleButton>
                            <ToggleButton value="medicos" sx={{ px: 1.2, py: 0.3, fontSize: '0.7rem', fontWeight: 700, textTransform: 'none' }}>
                                <PersonIcon sx={{ fontSize: 16, mr: 0.5 }} /> Médicos
                            </ToggleButton>
                        </ToggleButtonGroup>
                        <Tooltip title={viewMode === 'salas' ? 'Escolher salas exibidas' : 'Escolher médicos exibidos'}>
                            <IconButton size="small" onClick={(e) => setFiltroAnchorEl(e.currentTarget)} sx={{ bgcolor: '#fff', border: '1px solid #e0e0e0' }}>
                                <Badge badgeContent={qtdOcultos} color="warning" invisible={qtdOcultos === 0}>
                                    <FilterListIcon sx={{ fontSize: 18 }} />
                                </Badge>
                            </IconButton>
                        </Tooltip>
                        <ToggleButtonGroup
                            value={viewAtual}
                            exclusive
                            onChange={(e, newValue) => { if (newValue) handleChangeView(newValue); }}
                            size="small"
                        >
                            <ToggleButton value="resourceTimeGridDay" sx={{ ...toggleButtonSx, py: 0.3 }}>Dia</ToggleButton>
                            <ToggleButton value="timeGridWeek" sx={{ ...toggleButtonSx, py: 0.3 }}>Semana</ToggleButton>
                            <ToggleButton value="dayGridMonth" sx={{ ...toggleButtonSx, py: 0.3 }}>Mês</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 8 }} />

                    <Button
                        size="small"
                        onClick={onNovoPaciente}
                        startIcon={<PersonAddIcon fontSize="small" />}
                        sx={{ bgcolor: '#1a233b', color: '#fff', textTransform: 'none', fontWeight: 700, fontSize: '0.7rem', height: 26, px: 1.2, flexShrink: 0, '&:hover': { bgcolor: '#16233a' } }}
                    >
                        Novo Paciente
                    </Button>
                    <Tooltip title="Mais ações">
                        <IconButton size="small" onClick={(e) => setMoreAnchorEl(e.currentTarget)} sx={{ border: '1px solid #e0e0e0', flexShrink: 0 }}>
                            <MoreHorizIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </CustomToolbar>

                <Menu anchorEl={kpiAnchorEl} open={Boolean(kpiAnchorEl)} onClose={() => setKpiAnchorEl(null)}>
                    <Box sx={{ px: 2, py: 1, minWidth: 160 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 3, fontSize: '0.8rem', py: 0.4 }}>
                            <span style={{ color: '#666' }}>Hoje</span><b style={{ color: '#1a233b' }}>{kpis.hoje ?? 0}</b>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 3, fontSize: '0.8rem', py: 0.4 }}>
                            <span style={{ color: '#666' }}>Novos no mês</span><b style={{ color: '#c0a46f' }}>{kpis.novos ?? 0}</b>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 3, fontSize: '0.8rem', py: 0.4 }}>
                            <span style={{ color: '#666' }}>A confirmar</span><b style={{ color: '#a35a1d' }}>{kpis.confirmar ?? 0}</b>
                        </Box>
                    </Box>
                </Menu>

                <Menu anchorEl={moreAnchorEl} open={Boolean(moreAnchorEl)} onClose={() => setMoreAnchorEl(null)}>
                    <MenuItem onClick={() => handleCloseMore(onBuscarHorario)}>
                        <ListItemIcon><EventAvailableIcon fontSize="small" color="info" /></ListItemIcon>
                        <ListItemText>Buscar Horário</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => handleCloseMore(onTabelaPrecos)}>
                        <ListItemIcon><RequestQuoteIcon fontSize="small" color="success" /></ListItemIcon>
                        <ListItemText>Tabela de Preços</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => handleCloseMore(onStatusWhatsapp)}>
                        <ListItemIcon><SmartToyIcon fontSize="small" /></ListItemIcon>
                        <ListItemText>Status do WhatsApp (IA)</ListItemText>
                    </MenuItem>
                </Menu>

                <Menu
                    anchorEl={filtroAnchorEl}
                    open={filtroMenuAberto}
                    onClose={() => setFiltroAnchorEl(null)}
                    PaperProps={{ sx: { maxHeight: 360, minWidth: 220 } }}
                >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 0.5 }}>
                        <Typography
                            variant="caption"
                            sx={{ cursor: 'pointer', fontWeight: 700, color: '#1976d2' }}
                            onClick={() => setIdsVisiveis(null)}
                        >
                            Selecionar todos
                        </Typography>
                        <Typography
                            variant="caption"
                            sx={{ cursor: 'pointer', fontWeight: 700, color: '#d32f2f' }}
                            onClick={() => setIdsVisiveis([])}
                        >
                            Limpar
                        </Typography>
                    </Box>
                    <Divider />
                    {listaFiltro.map(item => {
                        const marcado = idsVisiveis === null || idsVisiveis.includes(item.id);
                        return (
                            <MenuItem key={item.id} dense onClick={(e) => { e.stopPropagation(); alternarVisibilidade(item.id); }}>
                                <Checkbox size="small" checked={marcado} sx={{ p: 0.5, mr: 1 }} />
                                <ListItemText primary={labelParaItem(item)} primaryTypographyProps={{ fontSize: '0.8rem' }} />
                            </MenuItem>
                        );
                    })}
                </Menu>
                <FullCalendar
                    ref={calendarRef}
                    plugins={[resourceTimeGridPlugin, dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"
                    initialView="resourceTimeGridDay"
                    locale="pt-br"
                    headerToolbar={false}
                    height="100%"
                    events={fetchEventos}
                    
                    // A SEGUNDA MÁGICA: Muda as colunas dependendo do modo (e do filtro manual)
                    resources={
                        viewMode === 'salas'
                        ? salasParaExibir.map(s => ({ id: `sala_${s.id}`, title: s.nome }))
                        // Todos os médicos viram coluna, tenham ou não jornada cadastrada,
                        // senão os agendamentos deles somem (o FullCalendar descarta
                        // silenciosamente eventos cujo resourceId não bate com nenhuma coluna).
                        : medicosParaExibir.map(m => ({
                            id: `medico_${m.id}`,
                            title: `${prefixoTratamento(m)} ${m.first_name}`
                        }))
                    }
                    resourceLabelContent={(arg) => {
                        if (viewMode !== 'medicos') return arg.resource.title;
                        const medico = medicos.find(m => `medico_${m.id}` === arg.resource.id);
                        const semJornada = medico && (!medico.jornadas || medico.jornadas.length === 0);
                        const nomeCompleto = medico ? `${prefixoTratamento(medico)} ${medico.first_name} ${medico.last_name || ''}`.trim() : arg.resource.title;
                        const tooltipTexto = semJornada
                            ? `${nomeCompleto} — jornada de trabalho não configurada em Configurações`
                            : nomeCompleto;
                        return (
                            <Tooltip title={tooltipTexto}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.4, width: '100%', minWidth: 0 }}>
                                    <Box component="span" sx={{
                                        fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden',
                                        textOverflow: 'ellipsis', display: 'block', minWidth: 0
                                    }}>
                                        {arg.resource.title}
                                    </Box>
                                    {semJornada && <span style={{ fontSize: '0.8em', flexShrink: 0 }}>⚠️</span>}
                                </Box>
                            </Tooltip>
                        );
                    }}

                    dateClick={onDateClick}
                    eventClick={handleCalendarEventClick}
                    datesSet={handleDatesSet}
                    slotMinTime="06:30:00"
                    slotMaxTime="22:00:00"
                    allDaySlot={false}
                    nowIndicator={true}
                    slotDuration="00:15:00"
                    eventMinHeight={28}
                    // MUDANÇA 3: Permitir sobreposição visual
                    slotEventOverlap={true}
                    eventOverlap={true}

                    eventContent={(arg) => {
                        if (arg.event.display === 'background') {
                            const { medicoNome } = arg.event.extendedProps;
                            return (
                                <Box sx={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    width: '100%', height: '100%', overflow: 'hidden', padding: '2px'
                                }}>
                                    <span style={{
                                        fontSize: '0.65rem', color: '#78909c', fontStyle: 'italic',
                                        textAlign: 'center', lineHeight: 1.2
                                    }}>
                                        {medicoNome} — fora do expediente
                                    </span>
                                </Box>
                            );
                        }

                        const dados = arg.event.extendedProps;
                        const isInativo = dados.status === 'Cancelado' || dados.status === 'Não Compareceu';
                        
                        let emojis = "";
                        if (dados.is_encaixe && !isInativo) emojis += " ⚡";
                        if (dados.pagamento_status === 'Pendente' && !isInativo) emojis += " 🔴";
                        if (dados.primeira_consulta && !isInativo) emojis += " ⭐";
                        else if (dados.tipo_visita === 'Retorno' && !isInativo) emojis += " 🔄";
                        if (dados.status === 'Confirmado') emojis += " ✅";
                        if (dados.status === 'Cancelado') emojis += " ❌";
                        if (dados.status === 'Não Compareceu') emojis += " 👻"; // Sugestão para não compareceu
                        if (dados.status === 'Realizado') emojis += " 🏁";

                        // MUDANÇA 4: Ajuste da borda lateral e cores internas
                        const tipo = (dados.tipo_procedimento || '').toLowerCase();
                        let borderLeftColor = 'transparent';
                        
                        // Se estiver inativo, a borda lateral fica cinza claro. Senão, usa as cores normais.
                        if (isInativo) {
                             borderLeftColor = '#ccc';
                        } else if (tipo.includes('obstétrico') || tipo.includes('fetal') || tipo.includes('transvaginal')) {
                            borderLeftColor = '#e91e63';
                        } else if (tipo.includes('cardio') || tipo.includes('ecocardiograma')) {
                            borderLeftColor = '#ff9800';
                        } else if (tipo.includes('consulta')) {
                            borderLeftColor = '#2196f3';
                        }

                        const tooltipTitulo = (
                            <Box sx={{ fontSize: '0.75rem', lineHeight: 1.6 }}>
                                <div><strong>{arg.event.title}</strong></div>
                                <div>{arg.timeText}</div>
                                {dados.tipo_procedimento && <div>📋 {dados.tipo_procedimento}</div>}
                                {dados.sala_nome && <div>🚪 {dados.sala_nome}</div>}
                                {dados.medico_nome && <div>🩺 {dados.medico_nome_com_prefixo || dados.medico_nome}</div>}
                                {dados.tipo_atendimento && <div>💳 {dados.tipo_atendimento}</div>}
                                <div>📌 {dados.status}</div>
                                {dados.is_encaixe && !isInativo && <div>⚡ Agendado como Encaixe</div>}
                            </Box>
                        );

                        return (
                            <Tooltip title={tooltipTitulo} arrow placement="top" enterDelay={400}>
                                <Box sx={{
                                    display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                                    width: '100%', height: '100%', borderLeft: `3px solid ${borderLeftColor}`, padding: '0 2px 0 4px', overflow: 'hidden'
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', whiteSpace: 'nowrap', flexGrow: 1 }}>
                                        <span style={{
                                            fontWeight: 900,
                                            fontSize: '0.7em',
                                            opacity: isInativo ? 0.5 : 0.8, // Mais transparente se inativo
                                            color: arg.textColor // Usa a cor do texto definida lá em cima
                                        }}>
                                            {arg.timeText.split(' - ')[0]}
                                        </span>
                                        <span style={{
                                            fontWeight: isInativo ? 'normal' : 'bold', // Tira o negrito se inativo
                                            fontSize: '0.75em',
                                            textOverflow: 'ellipsis',
                                            overflow: 'hidden',
                                            textDecoration: isInativo ? 'line-through' : 'none',
                                            color: arg.textColor // Usa a cor do texto definida lá em cima (#666 para inativos, #fff para ativos)
                                        }}>
                                            {arg.event.title}
                                        </span>
                                        {/* --- A MÁGICA: BADGE DE QUANTIDADE DE EXAMES --- */}
                                        {dados.quantidade_exames > 1 && (
                                            <span style={{
                                                fontSize: '0.65em',
                                                backgroundColor: isInativo ? 'transparent' : 'rgba(255,255,255,0.25)',
                                                padding: '1px 5px',
                                                borderRadius: '6px',
                                                fontWeight: 'bold',
                                                border: isInativo ? 'none' : '1px solid rgba(255,255,255,0.4)',
                                                color: arg.textColor
                                            }}>
                                                ({dados.quantidade_exames} exames)
                                            </span>
                                        )}
                                        {/* --- BADGE DE ENCAIXE --- */}
                                        {dados.is_encaixe && !isInativo && (
                                            <span style={{
                                                fontSize: '0.65em',
                                                backgroundColor: '#ffab00',
                                                color: '#3e2723',
                                                padding: '1px 5px',
                                                borderRadius: '6px',
                                                fontWeight: 'bold',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                ⚡ Encaixe
                                            </span>
                                        )}
                                    </Box>
                                    <Box sx={{ fontSize: '0.8em', flexShrink: 0, paddingLeft: '2px', display: 'flex', alignItems: 'center', opacity: isInativo ? 0.6 : 1 }}>
                                        {emojis}
                                    </Box>
                                </Box>
                            </Tooltip>
                        );
                    }}
                />
            </StyledCalendarWrapper>

            <Menu
                anchorEl={anchorEl}
                open={openMenu}
                onClose={handleCloseMenu}
                PaperProps={{ elevation: 3, sx: { minWidth: 200 } }}
            >
                <Box sx={{ p: 2, pb: 1, borderBottom: '1px solid #eee' }}>
                    <div style={{fontWeight: 'bold', fontSize: '14px', color:'#1C2E4A'}}>
                        {selectedEvent?.title || 'Agendamento'}
                    </div>
                    <div style={{fontSize: '11px', color:'#666'}}>Selecione uma ação:</div>
                </Box>

                <MenuItem onClick={handleActionConfirmarWhatsapp} disabled={!selectedEvent?.extendedProps?.paciente_telefone}>
                    <ListItemIcon><FaWhatsapp fontSize="small" color="#25D366" /></ListItemIcon>
                    <ListItemText>Confirmar via WhatsApp</ListItemText>
                </MenuItem>

                <Divider />

                <MenuItem onClick={handleActionEditar}>
                    <ListItemIcon><FaEdit fontSize="small" /></ListItemIcon>
                    <ListItemText>Editar Agendamento</ListItemText>
                </MenuItem>

                <Divider />

                <MenuItem onClick={handleActionLaudo} disabled={!selectedEvent?.extendedProps?.paciente_id}>
                    <ListItemIcon><FaFileMedical fontSize="small" color="#2E7D32"/></ListItemIcon>
                    <ListItemText>Realizar Laudo</ListItemText>
                </MenuItem>

                <MenuItem onClick={handleActionConsulta} disabled={!selectedEvent?.extendedProps?.paciente_id}>
                    <ListItemIcon><FaStethoscope fontSize="small" color="#1976d2"/></ListItemIcon>
                    <ListItemText>Iniciar Atendimento</ListItemText>
                </MenuItem>
            </Menu>
        </Box>
    );
}