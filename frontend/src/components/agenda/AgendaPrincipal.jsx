// src/components/agenda/AgendaPrincipal.jsx - VERSÃO COM CORES POR SALA
import React, { useRef, useCallback, useEffect } from 'react';
import { Box, Paper } from '@mui/material';
import FullCalendar from '@fullcalendar/react';
// ... (outros imports do fullcalendar)
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import { agendamentoService } from '../../services/agendamentoService';

// <<-- NOVA FUNÇÃO PARA GERAR CORES -->>
const SALA_COLORS = ['#3788d8', '#33a088', '#b54c38', '#8f4dae', '#e59400'];
const getColorForSala = (salaId) => {
    // Garante que o ID seja um número para o cálculo
    const numericId = parseInt(String(salaId).replace(/\D/g, ''), 10) || 0;
    return SALA_COLORS[numericId % SALA_COLORS.length];
};

export default function AgendaPrincipal({
    medicoFiltro, especialidadeFiltro, onDateClick, onEventClick, salas = []
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
                        // <<-- LÓGICA DE COR ADICIONADA AQUI -->>
                        backgroundColor: getColorForSala(ag.sala),
                        borderColor: getColorForSala(ag.sala) // Borda da mesma cor
                    }));
                successCallback(eventosFormatados);
            })
            .catch(error => failureCallback(error));
    }, [medicoFiltro, especialidadeFiltro]);

    useEffect(() => {
        if (calendarRef.current) {
            calendarRef.current.getApi().refetchEvents();
        }
    }, [medicoFiltro, especialidadeFiltro]);

    return (
        <Paper variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <FullCalendar
                ref={calendarRef}
                plugins={[resourceTimeGridPlugin, dayGridPlugin, timeGridPlugin, interactionPlugin]}
                schedulerLicenseKey="GPL-TO-REMOVE-THE-WARNING"
                initialView="resourceTimeGridDay"
                headerToolbar={{
                    left: 'prev,next today', center: 'title', right: 'resourceTimeGridDay,timeGridWeek,dayGridMonth'
                }}
                buttonText={{ resourceTimeGridDay: 'Salas', week: 'Semana', month: 'Mês', today: 'Hoje' }}
                locale="pt-br"
                height="100%"
                events={fetchEvents}
                resources={salas.map(s => ({ id: String(s.id), title: s.nome }))}
                dateClick={onDateClick}
                eventClick={onEventClick}
                slotMinTime="08:00:00"
                slotMaxTime="20:00:00"
                allDaySlot={false}
                nowIndicator={true}
            />
        </Paper>
    );
}