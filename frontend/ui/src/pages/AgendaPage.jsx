// src/pages/AgendaPage.jsx
import React, { useState, useRef } from 'react';
import { Box, Tooltip, Typography, Grid, Paper } from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import apiClient from '../api/axiosConfig';
import AgendamentoModal from '../components/AgendamentoModal';
import PacientesDoDiaSidebar from '../components/agenda/PacientesDoDiaSidebar';

// Ícones
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import StarIcon from '@mui/icons-material/Star';

// --- ALTERAÇÃO 1: A lógica de renderização agora verifica o status ---
function renderEventContent(eventInfo) {
  // A propriedade agora é 'status_pagamento'
  const { status_pagamento, primeira_consulta } = eventInfo.event.extendedProps;
  return (
    <Box sx={{ p: '2px 4px', overflow: 'hidden', fontSize: '0.8em' }}>
      <b>{eventInfo.timeText}</b>
      <Typography variant="body2" component="span" sx={{ ml: 1 }}>{eventInfo.event.title}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: '2px' }}>
        {/* O ícone só aparece se o status for 'Pago' */}
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
    
  const fetchEvents = (fetchInfo, successCallback, failureCallback) => {
    // A API de agendamentos agora nos dá o objeto de pagamento
    apiClient.get('/agendamentos/')
      .then(response => {
        const eventosFormatados = response.data.map(ag => ({
            id: ag.id,
            title: ag.paciente_nome, // Usando o paciente_nome do serializer
            start: ag.data_hora_inicio,
            end: ag.data_hora_fim,
            className: `status-${ag.status?.toLowerCase()}`,
            extendedProps: {
              // --- ALTERAÇÃO 2: Extraímos o status do pagamento ---
              // Se ag.pagamento existir, pegamos o status. Senão, é nulo.
              status_pagamento: ag.pagamento ? ag.pagamento.status : null,
              primeira_consulta: ag.primeira_consulta, // Mantenha esta lógica se ainda a usa
              pacienteId: ag.paciente
            }
        }));
        successCallback(eventosFormatados);
      })
      .catch(error => failureCallback(error));
  };

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
    // Atualiza o calendário
    if (calendarRef.current) {
      calendarRef.current.getApi().refetchEvents();
        }
        // ATUALIZA A BARRA LATERAL incrementando o gatilho
        setRefreshTrigger(prev => prev + 1); 
    };

  // 2. A ESTRUTURA DO RETURN FOI UNIFICADA E CORRIGIDA
  return (
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
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
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