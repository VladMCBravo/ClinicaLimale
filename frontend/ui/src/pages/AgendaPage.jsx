// src/pages/AgendaPage.jsx - VERSÃO FINAL E CORRIGIDA

import React, { useState, useRef, useCallback } from 'react';
// ... (mantenha todas as suas importações)
import { Box, Tooltip, Typography, Grid, Paper } from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import apiClient from '../api/axiosConfig';
import AgendamentoModal from '../components/AgendamentoModal';
import PacientesDoDiaSidebar from '../components/agenda/PacientesDoDiaSidebar';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import StarIcon from '@mui/icons-material/Star';

// --- Lógica de renderização FINAL ---
function renderEventContent(eventInfo) {
  // Agora lemos as propriedades corretas do extendedProps
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

export default function AgendaPage() {
  const calendarRef = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDateInfo, setSelectedDateInfo] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
    
  // --- Lógica de busca de eventos FINAL ---
  const fetchEvents = useCallback((fetchInfo, successCallback, failureCallback) => {
    apiClient.get('/agendamentos/')
      .then(response => {
        const eventosFormatados = response.data.map(ag => ({
            id: ag.id,
            title: ag.paciente_nome, // <-- Usa o nome do paciente
            start: ag.data_hora_inicio,
            end: ag.data_hora_fim,
            className: `status-${ag.status?.toLowerCase()}`,
            extendedProps: {
              status_pagamento: ag.pagamento ? ag.pagamento.status : null,
              primeira_consulta: ag.primeira_consulta, // <-- Agora vem direto da API
              pacienteId: ag.paciente,
              // Adicionamos todos os dados para o modo de edição
              ...ag
            }
        }));
        successCallback(eventosFormatados);
      })
      .catch(error => failureCallback(error));
  }, []);

  const handleDateClick = (arg) => {
    setEditingEvent(null);
    setSelectedDateInfo({ start: arg.date, end: arg.date });
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
    setRefreshTrigger(prev => prev + 1); 
  };

  return (
    // O seu JSX aqui permanece o mesmo
    <>
      <Grid container spacing={2} sx={{ height: 'calc(100vh - 100px)', flexWrap: 'nowrap' }}>
        <Grid item sx={{ width: '300px', flexShrink: 0 }}>
          <PacientesDoDiaSidebar refreshTrigger={refreshTrigger} />
        </Grid>
        <Grid item sx={{ flexGrow: 1, minWidth: 0 }}>
          <Paper sx={{ height: '100%', p: 1 }}>
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
              slotMinTime="08:00:00"
              slotMaxTime="20:00:00"
              dateClick={handleDateClick}
              eventClick={handleEventClick}
            />
          </Paper>
        </Grid>
      </Grid>
      <AgendamentoModal
        open={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        initialData={selectedDateInfo}
        editingEvent={editingEvent}
      />
    </>
  );
}