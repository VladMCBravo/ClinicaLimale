// src/pages/AgendaPage.jsx

import React, { useState, useRef } from 'react';
import { useDailyAppointments } from '../contexts/DailyAppointmentsContext';
import { Box, Typography, Tooltip } from '@mui/material';
import PageLayout from '../components/PageLayout';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import AgendamentoModal from '../components/AgendamentoModal';

// Ícones para os indicadores
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import StarIcon from '@mui/icons-material/Star';

// Função para renderizar o conteúdo customizado do evento
function renderEventContent(eventInfo) {
  const { pago, primeira_consulta } = eventInfo.event.extendedProps;
  return (
    <Box sx={{ p: '2px 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      <b>{eventInfo.timeText}</b>
      <Typography variant="body2" component="span" sx={{ ml: 1 }}>{eventInfo.event.title}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: '2px' }}>
        {pago && <Tooltip title="Consulta Paga"><MonetizationOnIcon sx={{ fontSize: 14, color: 'gold' }} /></Tooltip>}
        {primeira_consulta && <Tooltip title="Primeira Consulta"><StarIcon sx={{ fontSize: 14, color: 'orange' }} /></Tooltip>}
      </Box>
    </Box>
  );
}

export default function AgendaPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDateInfo, setSelectedDateInfo] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const calendarRef = useRef(null);
  const { fetchDayPatients } = useDailyAppointments();

  const fetchEvents = (fetchInfo, successCallback, failureCallback) => {
    const token = sessionStorage.getItem('authToken');
    fetch('http://127.0.0.1:8000/api/agendamentos/', {
        method: 'GET', headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` }
    })
    .then(response => response.json())
    .then(data => {
        const eventosFormatados = data.map(agendamento => ({
            id: agendamento.id,
            title: agendamento.paciente,
            start: agendamento.data_hora_inicio,
            end: agendamento.data_hora_fim,
            className: `status-${agendamento.status?.toLowerCase()}`,
            extendedProps: {
              pacienteId: agendamento.paciente_id,
              pago: agendamento.pago,
              primeira_consulta: agendamento.primeira_consulta,
            }
        }));
        successCallback(eventosFormatados);
    })
    .catch(error => failureCallback(error));
  };

  const handleDateClick = (arg) => {
    setEditingEvent(null);
    setSelectedDateInfo({ startStr: `${arg.dateStr}T09:00`, endStr: `${arg.dateStr}T10:00` });
    setIsModalOpen(true);
  };

  const handleEventClick = (clickInfo) => {
    setSelectedDateInfo(null);
    setEditingEvent(clickInfo.event);
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
    setSelectedDateInfo(null);
  };

  const handleSave = () => {
    handleCloseModal();
    if (calendarRef.current) {
      calendarRef.current.getApi().refetchEvents();
    }
    fetchDayPatients(); 
  };

  return (
    // A página da agenda continua a usar o PageLayout
    <PageLayout title="Agenda de Consultas">
      {/* A MÁGICA ESTÁ AQUI:
        Este Box vai crescer para preencher todo o espaço vertical e horizontal
        disponível dentro do Paper do PageLayout.
      */}
      <Box sx={{ flexGrow: 1, height: '100%', width: '100%' }}>
        <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            locale="pt-br"
            buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia' }}
            height="100%" // O calendário agora ocupa 100% da altura deste Box
            events={fetchEvents}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            slotMinTime="08:00:00"
            slotMaxTime="20:00:00"
            eventContent={renderEventContent}
        />
      </Box>
      <AgendamentoModal
          open={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSave}
          initialData={selectedDateInfo}
          editingEvent={editingEvent}
      />
    </PageLayout>
  );
}

