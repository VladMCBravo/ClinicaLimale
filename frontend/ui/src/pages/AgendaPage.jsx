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
const statusColors = {
    'Agendado': '#6495ED', // CornflowerBlue
    'Confirmado': '#32CD32', // LimeGreen
    'Realizado': '#228B22', // ForestGreen
    'Não Compareceu': '#A9A9A9', // DarkGray
    // 'Cancelado' não precisa de cor, pois será removido
};

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
        const eventosFormatados = response.data
            // 1. AÇÃO: Filtra os agendamentos cancelados para que não apareçam
            .filter(ag => ag.status !== 'Cancelado') 
            .map(ag => {
                // 2. VISUAL: Define a cor do evento com base no status
                const eventColor = statusColors[ag.status] || '#808080'; // Cor padrão cinza
                
                return {
                    id: ag.id,
                    title: ag.paciente_nome,
                    start: ag.data_hora_inicio,
                    end: ag.data_hora_fim,
                    backgroundColor: eventColor,
                    borderColor: eventColor,
                    extendedProps: {
                      ...ag
                    }
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
         <Grid container spacing={2} sx={{ height: '100%', flexWrap: 'nowrap', p: 2 }}>
        {/* Usamos height: '100%' para que as colunas ocupem a altura toda */}
        <Grid item sx={{ width: '300px', flexShrink: 0, height: '100%' }}>
          <PacientesDoDiaSidebar refreshTrigger={0} />
        </Grid>
        <Grid item sx={{ flexGrow: 1, height: '100%', display: 'flex' }}>
          <Paper sx={{ width: '100%', height: '100%', p: 1, display: 'flex', flexDirection: 'column' }}>
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