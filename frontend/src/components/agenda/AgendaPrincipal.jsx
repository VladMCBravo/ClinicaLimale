// src/components/agenda/AgendaPrincipal.jsx - VERSÃO COM IMPORTS CORRIGIDOS
import React, { useRef, useCallback, useEffect } from 'react';
import { Box, Paper } from '@mui/material';
import FullCalendar from '@fullcalendar/react';

// <<-- AS IMPORTAÇÕES QUE FALTAVAM ESTÃO AQUI -->>
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
// <<-- FIM DA CORREÇÃO -->>

import { agendamentoService } from '../../services/agendamentoService';

// Função para gerar cores por sala
const SALA_COLORS = ['#3788d8', '#33a088', '#b54c38', '#8f4dae', '#e59400'];
const getColorForSala = (salaId) => {
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
                        backgroundColor: getColorForSala(ag.sala),
                        borderColor: getColorForSala(ag.sala)
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