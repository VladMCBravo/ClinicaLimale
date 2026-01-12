// src/components/agenda/AgendaPrincipal.jsx
import React, { useRef, useCallback, useEffect } from 'react';
import { Paper, Box } from '@mui/material';
import { styled } from '@mui/material/styles'; // Import para estilização
import FullCalendar from '@fullcalendar/react';

import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';

import { agendamentoService } from '../../services/agendamentoService';

// --- BANHO DE LOJA (CSS CUSTOMIZADO) ---
const StyledCalendarWrapper = styled('div')(({ theme }) => ({
    flexGrow: 1,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',

    // 1. Estilizando a lateral (Horários)
    '.fc-timegrid-slot-label-cushion': {
        fontSize: '0.75rem', // Fonte menor
        color: '#666',        // Cinza elegante
        fontWeight: 500,
        textTransform: 'lowercase',
    },
    
    // 2. Removendo linhas excessivas e suavizando
    '.fc-theme-standard td, .fc-theme-standard th': {
        borderColor: '#e0e0e0', // Bordas mais suaves
    },
    
    // 3. O SEGREDO DO "ENCAVALADO": Forçar altura da linha de 15 min
    // Se o evento tem 45px, o slot precisa ter pelo menos 50px para não encavalar
    '.fc-timegrid-slot': {
        height: '50px !important', 
    },

    // 4. Estilo dos Eventos (Cards bonitos)
    '.fc-event': {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)', // Sombra suave
        border: 'none',
        borderRadius: '6px', // Cantos arredondados
        padding: '2px',
        fontSize: '0.85rem',
        transition: 'transform 0.1s',
        '&:hover': {
            transform: 'scale(1.01)',
            zIndex: 9999,
        }
    },

    // 5. Cabeçalho das salas
    '.fc-col-header-cell-cushion': {
        padding: '10px 0',
        fontSize: '0.9rem',
        fontWeight: 'bold',
        color: '#1C2E4A'
    },
    
    // 6. Linha do tempo atual
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
                        title: ag.paciente_nome,
                        start: ag.data_hora_inicio,
                        end: ag.data_hora_fim,
                        extendedProps: { ...ag },
                        resourceId: String(ag.sala),
                        backgroundColor: getColorForSala(ag.sala),
                        borderColor: 'transparent', // Remove borda padrão feia
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
                    schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives" // Use a licença correta se tiver pago
                    initialView="resourceTimeGridDay"
                    
                    // --- CABEÇALHO ---
                    headerToolbar={{
                        left: 'prev,next today', 
                        center: 'title', 
                        right: 'resourceTimeGridDay,dayGridMonth' // Simplifiquei para focar no dia a dia
                    }}
                    buttonText={{ 
                        resourceTimeGridDay: 'Salas (Dia)', 
                        month: 'Mês', 
                        today: 'Hoje' 
                    }}

                    // --- FORMATAÇÃO DE TEMPO (AQUI RESOLVE O 08 vs 08:00) ---
                    slotLabelFormat={{
                        hour: '2-digit',
                        minute: '2-digit',
                        omitZeroMinute: false,
                        meridiem: false,
                        hour12: false
                    }}
                    slotDuration="00:15:00" // Define a grade exata de 15 min
                    slotLabelInterval="01:00" // Mostra o rótulo a cada hora (limpa a lateral)
                    
                    // --- APARÊNCIA DOS EVENTOS ---
                    eventMinHeight={40} // Um pouco menor que o slot de 50px para ter respiro
                    eventContent={(arg) => (
                        <Box sx={{ p: 0.5, lineHeight: 1.2 }}>
                            <div style={{ fontWeight: 'bold', fontSize: '0.85em' }}>
                                {arg.timeText}
                            </div>
                            <div style={{ fontSize: '0.9em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {arg.event.title}
                            </div>
                        </Box>
                    )}

                    locale="pt-br"
                    height="100%"
                    events={fetchEvents}
                    resources={salas.map(s => ({ id: String(s.id), title: s.nome }))}
                    
                    dateClick={onDateClick}
                    eventClick={onEventClick}
                    
                    slotMinTime="07:00:00" // Começa um pouco antes das 8h para dar respiro
                    slotMaxTime="20:00:00"
                    allDaySlot={false}
                    nowIndicator={true}
                    expandRows={true} // Tenta ocupar a altura
                    stickyHeaderDates={true}
                />
            </StyledCalendarWrapper>
        </Paper>
    );
}