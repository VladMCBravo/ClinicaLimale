// src/pages/AgendaPage.jsx - VERSÃO FINAL E CORRIGIDA

import React, { useState, useRef, useCallback } from 'react';
import { Box, Tooltip, Typography, Paper } from '@mui/material'; // Usaremos Box para o layout
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import apiClient from '../api/axiosConfig';
import AgendamentoModal from '../components/AgendamentoModal';
import PacientesDoDiaSidebar from '../components/agenda/PacientesDoDiaSidebar';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import StarIcon from '@mui/icons-material/Star';

// Função para renderizar o conteúdo do evento (sem alterações)
function renderEventContent(eventInfo) {
  const { status_pagamento, primeira_consulta } = eventInfo.event.extendedProps;
  return (
    <Box sx={{ p: '2px 4px', overflow: 'hidden', fontSize: '0.8em' }}>
      <b>{eventInfo.timeText}</b>
      <Typography variant="body2" component="span" sx={{ ml: 1 }}>{eventInfo.event.title}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: '2px' }}>
        {status_pagamento === 'Pago' && <Tooltip title="Consulta Paga"><MonetizationOnIcon sx={{ fontSize: 14, color: 'gold' }} /></Tooltip>}
        {primeira_consulta && <Tooltip title="Primeira Consulta"><StarIcon sx={{ fontSize: 14, color: 'orange' }} /></Tooltip>}
      </Box>
    </Box>
  );
}

// Mapeamento de status para cores (sem alterações)
const statusColors = {
    'Agendado': '#6495ED',
    'Confirmado': '#32CD32',
    'Realizado': '#228B22',
    'Não Compareceu': '#A9A9A9',
};

export default function AgendaPage() {
  const calendarRef = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDateInfo, setSelectedDateInfo] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
    
  // Lógica para buscar os eventos (sem alterações)
  const fetchEvents = useCallback((fetchInfo, successCallback, failureCallback) => {
    apiClient.get('/agendamentos/')
      .then(response => {
        const eventosFormatados = response.data
            .filter(ag => ag.status !== 'Cancelado') 
            .map(ag => {
                const eventColor = statusColors[ag.status] || '#808080';
                return {
                    id: ag.id,
                    title: ag.paciente_nome,
                    start: ag.data_hora_inicio,
                    end: ag.data_hora_fim,
                    backgroundColor: eventColor,
                    borderColor: eventColor,
                    extendedProps: { ...ag }
                };
            });
        successCallback(eventosFormatados);
      })
      .catch(error => failureCallback(error));
  }, []);

  const handleDateClick = (arg) => {
    setEditingEvent(null);
    setSelectedDateInfo({ start: arg.date, end: arg.date });
    setIsModalOpen(true);
  };

  // handleEventClick limpo, sem o código de depuração
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
    setRefreshTrigger(prev => prev + 1); 
  };

  return (
    // Adicionamos o padding aqui e garantimos a altura
    <Box sx={{ display: 'flex', height: '100%', gap: 2, p: 2, boxSizing: 'border-box' }}>
      <Box sx={{ width: '300px', flexShrink: 0 }}>
        <PacientesDoDiaSidebar refreshTrigger={refreshTrigger} />
      </Box>

      <Box sx={{ flexGrow: 1, display: 'flex', minHeight: 0 }}>
        <Paper sx={{ width: '100%', height: '100%', p: 2, display: 'flex', flexDirection: 'column' }}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
            locale="pt-br"
            buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia' }}
            height="100%"
            events={fetchEvents}
            eventContent={renderEventContent}
            // --- AJUSTES FINAIS DO CALENDÁRIO ---
            slotMinTime="08:00:00"
            slotMaxTime="20:00:00"   // <-- Horário corrigido para terminar às 20h
            allDaySlot={false}      // <-- Remove a secção "all-day"
            // ------------------------------------
            dateClick={handleDateClick}
            eventClick={handleEventClick}
          />
        </Paper>
      </Box>
      <AgendamentoModal
        open={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        initialData={selectedDateInfo}
        editingEvent={editingEvent}
      />
    </Box>
  );
}