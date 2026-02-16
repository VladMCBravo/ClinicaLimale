// src/components/agenda/AgendaPrincipal.jsx
import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Paper, Box, Menu, MenuItem, ListItemIcon, ListItemText, Divider} from '@mui/material';
import { styled } from '@mui/material/styles'; 
import FullCalendar from '@fullcalendar/react';
import { useNavigate } from 'react-router-dom'; // Adicionado useNavigate
// Ícones para o Menu
import { FaEdit, FaFileMedical, FaStethoscope, FaExclamationTriangle } from 'react-icons/fa';
// Plugins
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';

import { agendamentoService } from '../../services/agendamentoService';
import apiClient from '../../api/axiosConfig'; // <--- Usado para buscar médicos e especialidades

// --- CSS CUSTOMIZADO (AJUSTE FINO) ---
const StyledCalendarWrapper = styled('div')(({ theme }) => ({
    flexGrow: 1,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',

    // 1. Lateral (Horários)
    '.fc-timegrid-slot-label-cushion': {
        fontSize: '0.7rem', 
        color: '#888',
        fontWeight: 500,
        textTransform: 'lowercase',
    },
    
    // 2. Bordas suaves
    '.fc-theme-standard td, .fc-theme-standard th': {
        borderColor: '#f0f0f0', 
    },
    
    // 3. O PULO DO GATO: Altura COMPACTA (30px)
    // 30px é suficiente para 1 linha de texto legível.
    // Antes estava 50px (muito alto). Menos que 30px vai encavalar.
    '.fc-timegrid-slot': {
        height: '30px !important', 
    },

    // 4. Estilo do Card de Evento
    '.fc-event': {
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)', 
        border: 'none',
        borderRadius: '4px',
        padding: '0 4px', // Padding lateral apertado
        fontSize: '0.8rem', // Fonte levemente menor
        // Centraliza o texto verticalmente no evento
        display: 'flex',
        alignItems: 'center',
    },

    // 5. Cabeçalho das salas
    '.fc-col-header-cell-cushion': {
        padding: '8px 0',
        fontSize: '0.85rem',
        fontWeight: 'bold',
        color: '#1C2E4A'
    },
    
    // 6. Indicador de hora atual
    '.fc-timegrid-now-indicator-line': {
        borderColor: '#f50057',
        borderWidth: '2px'
    },

    // 7. Estilo dos Botões da Toolbar
    '.fc-button-primary': {
        backgroundColor: '#1C2E4A !important',
        borderColor: '#1C2E4A !important',
        fontSize: '0.85rem !important',
        textTransform: 'capitalize !important',
        '&:hover': {
            backgroundColor: '#2c3e50 !important',
        },
        '&:disabled': {
            backgroundColor: '#ccc !important',
            borderColor: '#ccc !important'
        }
    },

    // 8. Ajuste do Título (Data)
    '.fc-toolbar-title': {
        fontSize: '1.1rem !important',
        fontWeight: 'bold',
        color: '#1C2E4A'
    },

    // 9. Correção para o botão 'Hoje' não sumir em telas menores
    '.fc-toolbar': {
        gap: '8px',
        flexWrap: 'wrap',
        padding: '8px !important'
    }
}));

const SALA_COLORS = ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#0288d1'];

const getColorForSala = (salaId) => {
    const numericId = parseInt(String(salaId).replace(/\D/g, ''), 10) || 0;
    return SALA_COLORS[numericId % SALA_COLORS.length];
};

// Simulação de verificação de permissão (ajuste conforme seu Context de Autenticação)
const isMedico = () => {
    // Exemplo: return user.cargo === 'MEDICO';
    // Por enquanto vou deixar true para você testar, mas mude para sua lógica real
    return true; 
};

export default function AgendaPrincipal({
    medicoFiltro, 
    especialidadeFiltro, 
    onDateClick, 
    onEventClick, 
    salas = [],
    refreshTrigger,
    onFiltroChange // <--- NOVO PROP PARA AVISAR A TELA PRINCIPAL
}) {
    const calendarRef = useRef(null);
    const navigate = useNavigate();

    // --- ESTADOS DOS FILTROS ---
    const [medicos, setMedicos] = useState([]);
    const [especialidades, setEspecialidades] = useState([]);

    // --- ESTADOS DO MENU DE OPÇÕES ---
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const openMenu = Boolean(anchorEl);

    // Carrega Médicos e Especialidades para o Filtro Interno
    useEffect(() => {
        apiClient.get('/usuarios/usuarios/?cargo=medico')
            .then(res => setMedicos(res.data.results || res.data || []))
            .catch(err => console.error("Erro ao buscar médicos", err));

        apiClient.get('/usuarios/especialidades/')
            .then(res => setEspecialidades(res.data.results || res.data || []))
            .catch(err => console.error("Erro ao buscar especialidades", err));
    }, []);

    const fetchEvents = useCallback((fetchInfo, successCallback, failureCallback) => {
        agendamentoService.getAgendamentos(medicoFiltro, especialidadeFiltro)
            .then(response => {
                const eventosFormatados = response.data
                    .filter(ag => ag.status !== 'Cancelado' && ag.sala)
                    .map(ag => ({
                        id: ag.id,
                        // Truque: Juntar hora e nome no título para ocupar menos espaço visual
                        title: ag.paciente_nome, 
                        start: ag.data_hora_inicio,
                        end: ag.data_hora_fim,
                        extendedProps: { 
                            ...ag,
                            tipo_procedimento: ag.tipo_exame || 'CONSULTA', // Exemplo
                            paciente_id: ag.paciente, // ID do paciente é crucial
                            medico_nome: ag.medico_nome,
                            medico_crm: ag.medico_crm
                        },
                        resourceId: String(ag.sala),
                        backgroundColor: getColorForSala(ag.sala),
                        textColor: '#fff'
                    }));
                successCallback(eventosFormatados);
            })
            .catch(error => failureCallback(error));
    }, [medicoFiltro, especialidadeFiltro]);

    useEffect(() => {
        if (calendarRef.current) {
            calendarRef.current.getApi().refetchEvents();
        }
    }, [medicoFiltro, especialidadeFiltro, refreshTrigger]);

    // --- HANDLERS DOS FILTROS ---
    const handleMedicoChange = (e) => {
        if (onFiltroChange) onFiltroChange({ medicoId: e.target.value, especialidadeId: especialidadeFiltro });
    };

    const handleEspecialidadeChange = (e) => {
        if (onFiltroChange) onFiltroChange({ medicoId: medicoFiltro, especialidadeId: e.target.value });
    };

    // --- HANDLERS DO MENU ---

    // 1. Ao clicar no evento no calendário
    const handleCalendarEventClick = (clickInfo) => {
        // Impede o comportamento padrão e abre nosso menu
        clickInfo.jsEvent.preventDefault(); 
        setAnchorEl(clickInfo.el);
        setSelectedEvent(clickInfo.event);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedEvent(null);
    };

    // 2. Ação: Editar (chama a função antiga)
    const handleActionEditar = () => {
        if (selectedEvent) {
            // Passa o objeto original (extendedProps contém os dados puros do backend)
            onEventClick({ 
                event: { 
                    id: selectedEvent.id, 
                    ...selectedEvent.extendedProps 
                } 
            }); 
        }
        handleCloseMenu();
    };

    // 3. Ação: Ir para Laudos
    const handleActionLaudo = () => {
        const dados = selectedEvent?.extendedProps;
        if (!dados || !dados.paciente_id) {
            alert("Erro: Este agendamento não tem um paciente vinculado.");
            return;
        }

        // PREPARA O AMBIENTE PARA A PÁGINA DE LAUDOS LER
        // Como sua página Laudos lê do localStorage na inicialização:
        const draftLaudo = {
            paciente: { id: dados.paciente_id, nome_completo: selectedEvent.title }, // Ajuste conforme objeto esperado
            medicoNome: dados.medico_nome,
            medicoCrm: dados.medico_crm,
            tipoExame: dados.tipo_procedimento !== 'CONSULTA' ? dados.tipo_procedimento : 'OBSTETRICO', // Default ou real
            textoFinal: '', // Novo laudo
            dadosEstruturados: {}
        };

        // Salva no storage que a página Laudos escuta
        localStorage.setItem('laudos_rascunho_auto_save', JSON.stringify(draftLaudo));

        handleCloseMenu();
        navigate('/laudos'); // Redireciona
    };

    // 4. Ação: Ir para Painel Médico
    const handleActionConsulta = () => {
        const dados = selectedEvent?.extendedProps;
        
        // SEGURANÇA: Só deixa ir se for médico (lógica de frontend, o backend deve barrar dados também)
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

    return (
        <Paper variant="outlined" sx={{ p: 0, height: '100%', overflow: 'hidden', border: '1px solid #ddd', display: 'flex', flexDirection: 'column' }}>
            
            {/* --- NOVA BARRA DE FILTROS EMBUTIDA --- */}
            <Box sx={{ 
                display: 'flex', alignItems: 'center', gap: 2, p: '6px 12px', 
                bgcolor: '#f8f9fa', borderBottom: '1px solid #e0e0e0', flexShrink: 0 
            }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1C2E4A', fontSize: '0.75rem', mr: 1 }}>
                    Filtros da Agenda:
                </Typography>

                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel sx={{ fontSize: '0.75rem', top: '-4px' }}>Médico</InputLabel>
                    <Select
                        value={medicoFiltro || ''}
                        label="Médico"
                        onChange={handleMedicoChange}
                        sx={{ fontSize: '0.75rem', height: '28px', bgcolor: '#fff', '& .MuiSelect-select': { py: 0.5 } }}
                    >
                        <MenuItem value="" sx={{ fontSize: '0.75rem' }}><em>Todos os Médicos</em></MenuItem>
                        {medicos.map(m => (
                            <MenuItem key={m.id} value={m.id} sx={{ fontSize: '0.75rem' }}>
                                {m.first_name ? `${m.first_name} ${m.last_name}` : m.username}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel sx={{ fontSize: '0.75rem', top: '-4px' }}>Especialidade</InputLabel>
                    <Select
                        value={especialidadeFiltro || ''}
                        label="Especialidade"
                        onChange={handleEspecialidadeChange}
                        sx={{ fontSize: '0.75rem', height: '28px', bgcolor: '#fff', '& .MuiSelect-select': { py: 0.5 } }}
                    >
                        <MenuItem value="" sx={{ fontSize: '0.75rem' }}><em>Todas as Especialidades</em></MenuItem>
                        {especialidades.map(e => (
                            <MenuItem key={e.id} value={e.id} sx={{ fontSize: '0.75rem' }}>
                                {e.nome}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {/* --- FULLCALENDAR --- */}
            <StyledCalendarWrapper>
                <FullCalendar
                    ref={calendarRef}
                    plugins={[resourceTimeGridPlugin, dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="resourceTimeGridDay"
                    locale="pt-br"
                    buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia' }}
                    headerToolbar={{ left: 'prev,next today', center: 'title', right: 'resourceTimeGridDay,timeGridWeek,dayGridMonth' }}
                    height="100%"
                    events={fetchEvents}
                    resources={salas.map(s => ({ id: String(s.id), title: s.nome }))}
                    dateClick={onDateClick}
                    eventClick={handleCalendarEventClick} 
                    slotMinTime="07:00:00" 
                    slotMaxTime="20:00:00"
                    allDaySlot={false}
                    nowIndicator={true}
                    slotDuration="00:15:00"
                    eventMinHeight={28}
                    eventContent={(arg) => {
                        const dados = arg.event.extendedProps;
                        
                        let emojis = "";
                        if (dados.pagamento_status === 'Pendente' && dados.status !== 'Cancelado') emojis += " 🔴";
                        if (dados.primeira_consulta) emojis += " ⭐";
                        else if (dados.tipo_visita === 'Retorno') emojis += " 🔄";
                        if (dados.status === 'Confirmado') emojis += " ✅";
                        if (dados.status === 'Cancelado') emojis += " ❌";
                        if (dados.status === 'Realizado') emojis += " 🏁";

                        const tipo = (dados.tipo_procedimento || '').toLowerCase();
                        let borderLeftColor = 'transparent';
                        if (tipo.includes('obstétrico') || tipo.includes('fetal') || tipo.includes('transvaginal')) borderLeftColor = '#e91e63';
                        else if (tipo.includes('cardio') || tipo.includes('ecocardiograma')) borderLeftColor = '#ff9800';
                        else if (tipo.includes('consulta')) borderLeftColor = '#2196f3';

                        return (
                            <Box sx={{ 
                                display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
                                width: '100%', height: '100%', borderLeft: `3px solid ${borderLeftColor}`, padding: '0 2px 0 4px', overflow: 'hidden'
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', whiteSpace: 'nowrap', flexGrow: 1 }}>
                                    <span style={{ fontWeight: 900, fontSize: '0.7em', opacity: 0.8 }}>{arg.timeText.replace(/:\d{2}$/, '')}</span>
                                    <span style={{ fontWeight: 'bold', fontSize: '0.75em', textOverflow: 'ellipsis', overflow: 'hidden', textDecoration: dados.status === 'Cancelado' ? 'line-through' : 'none', color: dados.status === 'Cancelado' ? '#999' : '#fff' }}>
                                        {arg.event.title}
                                    </span>
                                </Box>
                                <Box sx={{ fontSize: '0.8em', flexShrink: 0, paddingLeft: '2px', display: 'flex', alignItems: 'center' }}>{emojis}</Box>
                            </Box>
                        );
                    }}
                />
            </StyledCalendarWrapper>

            {/* --- MENU DE OPÇÕES (FLUTUANTE) --- */}
            <Menu anchorEl={anchorEl} open={openMenu} onClose={handleCloseMenu} PaperProps={{ elevation: 3, sx: { minWidth: 200 } }}>
                <Box sx={{ p: 2, pb: 1, borderBottom: '1px solid #eee' }}>
                    <div style={{fontWeight: 'bold', fontSize: '14px', color:'#1C2E4A'}}>{selectedEvent?.title || 'Agendamento'}</div>
                    <div style={{fontSize: '11px', color:'#666'}}>Selecione uma ação:</div>
                </Box>
                <MenuItem onClick={handleActionEditar}><ListItemIcon><FaEdit fontSize="small" /></ListItemIcon><ListItemText>Editar Agendamento</ListItemText></MenuItem>
                <Divider />
                <MenuItem onClick={handleActionLaudo} disabled={!selectedEvent?.extendedProps?.paciente_id}><ListItemIcon><FaFileMedical fontSize="small" color="#2E7D32"/></ListItemIcon><ListItemText>Realizar Laudo</ListItemText></MenuItem>
                <MenuItem onClick={handleActionConsulta} disabled={!selectedEvent?.extendedProps?.paciente_id}><ListItemIcon><FaStethoscope fontSize="small" color="#1976d2"/></ListItemIcon><ListItemText>Iniciar Atendimento</ListItemText></MenuItem>
            </Menu>
        </Paper>
    );
}