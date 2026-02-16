// src/components/agenda/AgendaPrincipal.jsx
import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Paper, Box, Menu, MenuItem, ListItemIcon, ListItemText, Divider, FormControl, InputLabel, Select, Typography, Stack } from '@mui/material';
import { styled } from '@mui/material/styles'; 
import FullCalendar from '@fullcalendar/react';
import { useNavigate } from 'react-router-dom';
import { FaEdit, FaFileMedical, FaStethoscope, FaFilter, FaCalendarAlt } from 'react-icons/fa';
// Plugins
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';

import { agendamentoService } from '../../services/agendamentoService';
import apiClient from '../../api/axiosConfig';

// --- CSS CUSTOMIZADO DA AGENDA ---
const StyledCalendarWrapper = styled('div')(({ theme }) => ({
    flexGrow: 1,
    height: '100%', // Ocupa o resto do espaço
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#fff',

    // Grid e Slots
    '.fc-timegrid-slot': { height: '35px !important' }, // Altura confortável
    '.fc-timegrid-slot-label-cushion': { fontSize: '0.75rem', color: '#666', fontWeight: 500 },
    '.fc-col-header-cell-cushion': { padding: '10px 0', fontSize: '0.85rem', fontWeight: 'bold', color: '#1C2E4A' },
    '.fc-theme-standard td, .fc-theme-standard th': { borderColor: '#f1f3f5' },
    
    // Eventos
    '.fc-event': {
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)', 
        border: 'none',
        borderRadius: '4px',
        padding: '0 2px',
        fontSize: '0.8rem',
        margin: '1px'
    },

    // Toolbar do FullCalendar (Navegação de datas)
    '.fc-header-toolbar': {
        margin: 0,
        padding: '8px 16px',
        backgroundColor: '#fff',
        borderBottom: '1px solid #f0f0f0'
    },
    '.fc-toolbar-title': { fontSize: '1.2rem !important', fontWeight: 800, color: '#1C2E4A' },
    '.fc-button': { 
        borderRadius: '6px !important', 
        fontWeight: 600, 
        textTransform: 'capitalize',
        padding: '4px 12px !important',
        height: '32px !important'
    },
    '.fc-button-primary': { backgroundColor: '#1C2E4A', borderColor: '#1C2E4A' },
    '.fc-button-active': { backgroundColor: '#0f1b2d !important' }
}));

const SALA_COLORS = ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#0288d1'];
const getColorForSala = (salaId) => {
    const numericId = parseInt(String(salaId).replace(/\D/g, ''), 10) || 0;
    return SALA_COLORS[numericId % SALA_COLORS.length];
};

export default function AgendaPrincipal({
    medicoFiltro, 
    especialidadeFiltro, 
    onDateClick, 
    onEventClick, 
    salas = [],
    refreshTrigger,
    onFiltroChange
}) {
    const calendarRef = useRef(null);
    const navigate = useNavigate();

    // Filtros internos
    const [medicos, setMedicos] = useState([]);
    const [especialidades, setEspecialidades] = useState([]);

    // Menu Contexto
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const openMenu = Boolean(anchorEl);

    // Carregar dados de filtros
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
                        title: ag.paciente_nome, 
                        start: ag.data_hora_inicio,
                        end: ag.data_hora_fim,
                        extendedProps: { 
                            ...ag,
                            tipo_procedimento: ag.tipo_exame || 'CONSULTA',
                            paciente_id: ag.paciente,
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
        if (calendarRef.current) calendarRef.current.getApi().refetchEvents();
    }, [medicoFiltro, especialidadeFiltro, refreshTrigger]);

    // Handlers de Filtro
    const handleMedicoChange = (e) => {
        if (onFiltroChange) onFiltroChange({ medicoId: e.target.value, especialidadeId: especialidadeFiltro });
    };

    const handleEspecialidadeChange = (e) => {
        if (onFiltroChange) onFiltroChange({ medicoId: medicoFiltro, especialidadeId: e.target.value });
    };

    // Menu Handlers
    const handleCalendarEventClick = (clickInfo) => {
        clickInfo.jsEvent.preventDefault(); 
        setAnchorEl(clickInfo.el);
        setSelectedEvent(clickInfo.event);
    };
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedEvent(null); };

    const handleActionEditar = () => {
        if (selectedEvent) onEventClick({ event: { id: selectedEvent.id, ...selectedEvent.extendedProps } }); 
        handleCloseMenu();
    };

    const handleActionLaudo = () => {
        const dados = selectedEvent?.extendedProps;
        if (!dados || !dados.paciente_id) return alert("Erro: Paciente não identificado.");
        const draftLaudo = {
            paciente: { id: dados.paciente_id, nome_completo: selectedEvent.title },
            medicoNome: dados.medico_nome,
            medicoCrm: dados.medico_crm,
            tipoExame: dados.tipo_procedimento || 'OBSTETRICO',
            textoFinal: '', dadosEstruturados: {}
        };
        localStorage.setItem('laudos_rascunho_auto_save', JSON.stringify(draftLaudo));
        handleCloseMenu();
        navigate('/laudos');
    };

    const handleActionConsulta = () => {
        const dados = selectedEvent?.extendedProps;
        if (!dados?.paciente_id) return alert("Erro: Paciente não identificado.");
        navigate('/painel-medico', { state: { agendamentoId: selectedEvent.id, pacienteId: dados.paciente_id } });
        handleCloseMenu();
    };

    return (
        <Paper elevation={0} sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fff', overflow: 'hidden' }}>
            
            {/* --- BARRA DE FILTROS BONITA (Integrada) --- */}
            <Box sx={{ 
                p: '10px 16px', 
                bgcolor: '#f8f9fa', 
                borderBottom: '1px solid #e0e0e0',
                display: 'flex', 
                alignItems: 'center', 
                gap: 3
            }}>
                <Stack direction="row" alignItems="center" gap={1} sx={{color: '#546E7A'}}>
                    <FaFilter />
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Filtrar:</Typography>
                </Stack>

                {/* Filtro Médico */}
                <FormControl size="small" variant="outlined" sx={{ minWidth: 200, bgcolor: '#fff' }}>
                    <InputLabel>Médico</InputLabel>
                    <Select value={medicoFiltro || ''} label="Médico" onChange={handleMedicoChange}>
                        <MenuItem value=""><em>Todos os Médicos</em></MenuItem>
                        {medicos.map(m => (
                            <MenuItem key={m.id} value={m.id}>{m.first_name ? `${m.first_name} ${m.last_name}` : m.username}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Filtro Especialidade */}
                <FormControl size="small" variant="outlined" sx={{ minWidth: 200, bgcolor: '#fff' }}>
                    <InputLabel>Especialidade</InputLabel>
                    <Select value={especialidadeFiltro || ''} label="Especialidade" onChange={handleEspecialidadeChange}>
                        <MenuItem value=""><em>Todas as Especialidades</em></MenuItem>
                        {especialidades.map(e => (
                            <MenuItem key={e.id} value={e.id}>{e.nome}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Box sx={{ flexGrow: 1 }} />
                
                {/* Legenda rápida opcional */}
                <Stack direction="row" spacing={2} sx={{ display: { xs: 'none', md: 'flex' } }}>
                   <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.75rem', color: '#666' }}>
                       <Box sx={{ w: 10, h: 10, bgcolor: '#e91e63', borderRadius: '50%', width: 8, height: 8 }} /> Obstétrico
                   </Box>
                   <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.75rem', color: '#666' }}>
                       <Box sx={{ w: 10, h: 10, bgcolor: '#2196f3', borderRadius: '50%', width: 8, height: 8 }} /> Consulta
                   </Box>
                </Stack>
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
                    eventContent={(arg) => {
                        const dados = arg.event.extendedProps;
                        
                        // Icones de status
                        let emojis = "";
                        if (dados.pagamento_status === 'Pendente') emojis += " 🔴";
                        if (dados.status === 'Confirmado') emojis += " ✅";
                        if (dados.status === 'Realizado') emojis += " 🏁";

                        // Cor lateral baseada no tipo
                        const tipo = (dados.tipo_procedimento || '').toLowerCase();
                        let borderLeftColor = '#2196f3'; // Consulta padrão
                        if (tipo.includes('obstétrico') || tipo.includes('fetal')) borderLeftColor = '#e91e63';
                        else if (tipo.includes('cardio')) borderLeftColor = '#ff9800';

                        return (
                            <Box sx={{ 
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                                width: '100%', height: '100%', borderLeft: `4px solid ${borderLeftColor}`, pl: 0.5, overflow: 'hidden'
                            }}>
                                <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontWeight: 600 }}>
                                    {arg.timeText.replace(/:\d{2}$/, '')} {arg.event.title}
                                </div>
                                <div style={{ fontSize: '0.7rem', flexShrink: 0 }}>{emojis}</div>
                            </Box>
                        );
                    }}
                />
            </StyledCalendarWrapper>

            {/* --- MENU CONTEXTO --- */}
            <Menu anchorEl={anchorEl} open={openMenu} onClose={handleCloseMenu}>
                <MenuItem onClick={handleActionEditar}><ListItemIcon><FaEdit/></ListItemIcon><ListItemText>Editar</ListItemText></MenuItem>
                <MenuItem onClick={handleActionLaudo}><ListItemIcon><FaFileMedical color="green"/></ListItemIcon><ListItemText>Laudo</ListItemText></MenuItem>
                <MenuItem onClick={handleActionConsulta}><ListItemIcon><FaStethoscope color="blue"/></ListItemIcon><ListItemText>Atender</ListItemText></MenuItem>
            </Menu>
        </Paper>
    );
}