// src/components/agenda/AgendaPrincipal.jsx
import React, { useRef, useCallback, useEffect } from 'react';
import { Paper, Box } from '@mui/material';
import { styled } from '@mui/material/styles'; 
import FullCalendar from '@fullcalendar/react';

import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';

import { agendamentoService } from '../../services/agendamentoService';

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
    }
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
    refreshTrigger 
}) {
    const calendarRef = useRef(null);

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
                        extendedProps: { ...ag },
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

    return (
        <Paper variant="outlined" sx={{ p: 0, height: '100%', overflow: 'hidden', border: '1px solid #ddd' }}>
            <StyledCalendarWrapper>
                <FullCalendar
                    ref={calendarRef}
                    plugins={[resourceTimeGridPlugin, dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"
                    initialView="resourceTimeGridDay"
                    
                    headerToolbar={{
                        left: 'prev,next today', 
                        center: 'title', 
                        right: 'resourceTimeGridDay,dayGridMonth'
                    }}
                    buttonText={{ 
                        resourceTimeGridDay: 'Salas', 
                        month: 'Mês', 
                        today: 'Hoje' 
                    }}

                    // --- AJUSTES DE TAMANHO ---
                    slotLabelFormat={{
                        hour: '2-digit',
                        minute: '2-digit',
                        omitZeroMinute: false,
                        meridiem: false,
                        hour12: false
                    }}
                    slotDuration="00:15:00" 
                    slotLabelInterval="01:00" 
                    
                    // Altura do evento igual a altura do slot (30px)
                    // Isso garante que ele ocupe 100% da célula sem vazar nem encavalar
                    eventMinHeight={28} 
                    
                    // --- RENDERIZAÇÃO DO CONTEÚDO (Compacto) ---
                    eventContent={(arg) => (
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '5px', 
                            overflow: 'hidden', 
                            whiteSpace: 'nowrap',
                            width: '100%' 
                        }}>
                            {/* Hora pequena e bold */}
                            <span style={{ fontWeight: 'bold', fontSize: '0.9em', opacity: 0.9 }}>
                                {arg.timeText}
                            </span>
                            {/* Nome do paciente */}
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                {arg.event.title}
                            </span>
                        </Box>
                    )}

                    locale="pt-br"
                    height="100%"
                    contentHeight="auto" // Ajusta ao conteúdo disponível
                    events={fetchEvents}
                    resources={salas.map(s => ({ id: String(s.id), title: s.nome }))}
                    
                    dateClick={onDateClick}
                    eventClick={onEventClick}
                    
                    slotMinTime="07:00:00" 
                    slotMaxTime="20:00:00"
                    allDaySlot={false}
                    nowIndicator={true}
                    stickyHeaderDates={true}
                />
            </StyledCalendarWrapper>
        </Paper>
    );
}