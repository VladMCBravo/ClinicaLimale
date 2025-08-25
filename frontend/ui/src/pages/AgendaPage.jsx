import React, { useState, useRef, useCallback } from 'react';
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

  const handleEventClick = (clickInfo) => {
  // --- ADICIONE ESTAS LINHAS DE DEPURAÇÃO ---
  console.log("--- DEBUG: Evento Clicado ---");
  console.log("Objeto do Evento:", clickInfo.event);
  console.log("Hora de Início (start object):", clickInfo.event.start);
  console.log("Hora de Fim (end object):", clickInfo.event.end);
  console.log("---------------------------------");
  // ---------------------------------------------

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
    <>
      {/* --- 1. O GRID PRINCIPAL OCUPA 100% DA ALTURA DO SEU PAI (O <Box> DO MAINLAYOUT) --- */}
      <Grid container spacing={2} sx={{ height: '100%', flexWrap: 'nowrap' }}>
        
        {/* A coluna da sidebar */}
        <Grid item sx={{ width: '300px', flexShrink: 0 }}>
          <PacientesDoDiaSidebar refreshTrigger={refreshTrigger} />
        </Grid>

        {/* --- 2. A COLUNA DO CALENDÁRIO TAMBÉM OCUPA 100% DA ALTURA --- */}
        <Grid item sx={{ flexGrow: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* O Paper agora tem padding e expande para preencher o espaço */}
          <Paper sx={{ width: '100%', flexGrow: 1, p: 2, display: 'flex', flexDirection: 'column' }}>
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
              locale="pt-br"
              buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia' }}
              height="100%" // Ocupa 100% da altura do Paper
              events={fetchEvents}
              eventContent={renderEventContent}
              slotMinTime="08:00:00"
              slotMaxTime="23:00:00"
              dateClick={handleDateClick}
              eventClick={handleEventClick}
            />
          </Paper>
        </Grid>
      </Grid>

      {/* O seu AgendamentoModal continua aqui */}
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