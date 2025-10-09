// src/components/agenda/AgendaPrincipal.jsx - VERSÃO SIMPLIFICADA
import React, { useRef, useCallback, useEffect } from 'react';
import { Box, Paper } from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import { agendamentoService } from '../../services/agendamentoService';

// Este componente agora é mais "burro", apenas exibe a agenda e emite eventos.
export default function AgendaPrincipal({
    medicoFiltro,
    especialidadeFiltro,
    onDateClick,
    onEventClick,
    salas = []
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
                        resourceId: String(ag.sala)
                    }));
                successCallback(eventosFormatados);
            })
            .catch(error => failureCallback(error));
    }, [medicoFiltro, especialidadeFiltro]);

    useEffect(() => {
        if (calendarRef.current) {
            calendarRef.current.getApi().refetchEvents();
        }
    }, [medicoFiltro, especialidadeFiltro]); // Removido onSave, pois não controla mais o modal

    return (
        <Paper variant="outlined" sx={{ p: 2, height: '100%', display: 'flex' }}>
            <FullCalendar
                ref={calendarRef}
                plugins={[resourceTimeGridPlugin, dayGridPlugin, timeGridPlugin, interactionPlugin]}
                schedulerLicenseKey="GPL-TO-REMOVE-THE-WARNING"
                initialView="resourceTimeGridDay"
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'resourceTimeGridDay,timeGridWeek,dayGridMonth'
                }}
                buttonText={{ resourceTimeGridDay: 'Salas', week: 'Semana', month: 'Mês', today: 'Hoje' }}
                locale="pt-br"
                height="100%"
                events={fetchEvents}
                resources={salas.map(s => ({ id: String(s.id), title: s.nome }))}
                dateClick={onDateClick} // Usa a prop recebida
                eventClick={onEventClick} // Usa a prop recebida
                slotMinTime="08:00:00"
                slotMaxTime="20:00:00"
                allDaySlot={false}
                nowIndicator={true}
            />
        </Paper>
    );
}