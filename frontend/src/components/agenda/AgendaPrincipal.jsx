// src/components/agenda/AgendaPrincipal.jsx
import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Box, Menu, MenuItem, ListItemIcon, ListItemText, FormControl, InputLabel, Select, Typography, Stack } from '@mui/material';
import { styled } from '@mui/material/styles'; 
import FullCalendar from '@fullcalendar/react';
import { useNavigate } from 'react-router-dom';
import { FaEdit, FaFileMedical, FaStethoscope, FaFilter } from 'react-icons/fa';
// Plugins
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';

import { agendamentoService } from '../../services/agendamentoService';
import apiClient from '../../api/axiosConfig';

// CSS CUSTOMIZADO
const StyledCalendarWrapper = styled('div')({
    flexGrow: 1,
    height: '100%', 
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#fff',

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
    
    // Header do FullCalendar (Navegação)
    '.fc-header-toolbar': {
        marginBottom: '0 !important',
        padding: '6px 12px',
        backgroundColor: '#fff',
        borderBottom: '1px solid #eee'
    },
    '.fc-toolbar-title': { fontSize: '1.1rem !important', fontWeight: 700, color: '#37474f' },
    '.fc-button': { 
        padding: '2px 10px !important', 
        height: '28px !important', 
        fontSize: '0.8rem !important', 
        fontWeight: 600,
        textTransform: 'capitalize' 
    },
    '.fc-button-primary': { backgroundColor: '#1C2E4A', borderColor: '#1C2E4A' },
    '.fc-button-active': { backgroundColor: '#000 !important' }
});

const SALA_COLORS = ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#0288d1'];
const getColorForSala = (id) => SALA_COLORS[parseInt(String(id).replace(/\D/g, ''), 10) % SALA_COLORS.length] || '#1976d2';

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
    const [medicos, setMedicos] = useState([]);
    const [especialidades, setEspecialidades] = useState([]);
    
    // Menu Contexto
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const openMenu = Boolean(anchorEl);

    useEffect(() => {
        apiClient.get('/usuarios/usuarios/?cargo=medico').then(res => setMedicos(res.data.results || []));
        apiClient.get('/usuarios/especialidades/').then(res => setEspecialidades(res.data.results || []));
    }, []);

    const fetchEvents = useCallback((fetchInfo, successCallback, failureCallback) => {
        agendamentoService.getAgendamentos(medicoFiltro, especialidadeFiltro)
            .then(res => {
                const evts = res.data
                    .filter(a => a.status !== 'Cancelado' && a.sala)
                    .map(a => ({
                        id: a.id,
                        title: a.paciente_nome, 
                        start: a.data_hora_inicio,
                        end: a.data_hora_fim,
                        resourceId: String(a.sala),
                        backgroundColor: getColorForSala(a.sala),
                        extendedProps: { ...a, paciente_id: a.paciente }
                    }));
                successCallback(evts);
            })
            .catch(failureCallback);
    }, [medicoFiltro, especialidadeFiltro]);

    useEffect(() => { if (calendarRef.current) calendarRef.current.getApi().refetchEvents(); }, [medicoFiltro, especialidadeFiltro, refreshTrigger]);

    const handleAction = (action) => {
        const dados = selectedEvent?.extendedProps;
        if (!dados) return;
        setAnchorEl(null);

        if (action === 'edit') onEventClick({ event: { id: selectedEvent.id, ...dados } });
        else if (action === 'laudo') {
            if (!dados.paciente_id) return alert('Sem paciente');
            localStorage.setItem('laudos_rascunho_auto_save', JSON.stringify({
                paciente: { id: dados.paciente_id, nome_completo: selectedEvent.title },
                medicoNome: dados.medico_nome, tipoExame: dados.tipo_exame || 'OBSTETRICO', textoFinal: ''
            }));
            navigate('/laudos');
        } else if (action === 'consulta') {
            if (!dados.paciente_id) return alert('Sem paciente');
            navigate('/painel-medico', { state: { agendamentoId: selectedEvent.id, pacienteId: dados.paciente_id } });
        }
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fff' }}>
            
            {/* === BARRA DE FILTROS DA AGENDA (Aqui embaixo, bonita e organizada) === */}
            <Box sx={{ 
                p: '8px 16px', 
                bgcolor: '#f9fafb', 
                borderBottom: '1px solid #e0e0e0',
                display: 'flex', 
                alignItems: 'center', 
                gap: 2 
            }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ color: '#546E7A', opacity: 0.8 }}>
                    <FaFilter size={12} />
                    <Typography variant="overline" sx={{ fontWeight: 'bold', lineHeight: 1 }}>Filtros</Typography>
                </Stack>

                <FormControl size="small" sx={{ minWidth: 180, bgcolor: '#fff' }}>
                    <InputLabel sx={{ fontSize: '0.8rem' }}>Médico</InputLabel>
                    <Select 
                        value={medicoFiltro || ''} 
                        label="Médico" 
                        onChange={e => onFiltroChange({ medicoId: e.target.value, especialidadeId: especialidadeFiltro })}
                        sx={{ height: '32px', fontSize: '0.8rem' }}
                    >
                        <MenuItem value="">Todos</MenuItem>
                        {medicos.map(m => <MenuItem key={m.id} value={m.id}>{m.first_name || m.username}</MenuItem>)}
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 180, bgcolor: '#fff' }}>
                    <InputLabel sx={{ fontSize: '0.8rem' }}>Especialidade</InputLabel>
                    <Select 
                        value={especialidadeFiltro || ''} 
                        label="Especialidade" 
                        onChange={e => onFiltroChange({ medicoId: medicoFiltro, especialidadeId: e.target.value })}
                        sx={{ height: '32px', fontSize: '0.8rem' }}
                    >
                        <MenuItem value="">Todas</MenuItem>
                        {especialidades.map(e => <MenuItem key={e.id} value={e.id}>{e.nome}</MenuItem>)}
                    </Select>
                </FormControl>
            </Box>

            {/* === CALENDÁRIO === */}
            <StyledCalendarWrapper>
                <FullCalendar
                    ref={calendarRef}
                    plugins={[resourceTimeGridPlugin, dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="resourceTimeGridDay"
                    locale="pt-br"
                    headerToolbar={{ left: 'prev,next today', center: 'title', right: 'resourceTimeGridDay,timeGridWeek,dayGridMonth' }}
                    height="100%"
                    events={fetchEvents}
                    resources={salas.map(s => ({ id: String(s.id), title: s.nome }))}
                    dateClick={onDateClick}
                    eventClick={(info) => { info.jsEvent.preventDefault(); setAnchorEl(info.el); setSelectedEvent(info.event); }}
                    slotMinTime="07:00:00" 
                    slotMaxTime="20:00:00"
                    allDaySlot={false}
                    nowIndicator={true}
                    slotDuration="00:15:00"
                    eventContent={(arg) => (
                        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', pl: 0.5, overflow: 'hidden', borderLeft: '3px solid rgba(0,0,0,0.2)' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.75em', whiteSpace: 'nowrap' }}>
                                {arg.timeText.replace(/:\d{2}$/, '')} {arg.event.title}
                            </div>
                        </Box>
                    )}
                />
            </StyledCalendarWrapper>

            <Menu anchorEl={anchorEl} open={openMenu} onClose={() => setAnchorEl(null)}>
                <MenuItem onClick={() => handleAction('edit')}><ListItemIcon><FaEdit size={14}/></ListItemIcon><ListItemText primaryTypographyProps={{fontSize:'0.85rem'}}>Editar</ListItemText></MenuItem>
                <MenuItem onClick={() => handleAction('laudo')}><ListItemIcon><FaFileMedical size={14}/></ListItemIcon><ListItemText primaryTypographyProps={{fontSize:'0.85rem'}}>Laudo</ListItemText></MenuItem>
                <MenuItem onClick={() => handleAction('consulta')}><ListItemIcon><FaStethoscope size={14}/></ListItemIcon><ListItemText primaryTypographyProps={{fontSize:'0.85rem'}}>Atender</ListItemText></MenuItem>
            </Menu>
        </Box>
    );
}