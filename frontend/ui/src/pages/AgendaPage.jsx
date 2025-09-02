// src/pages/AgendaPage.jsx - VERSÃO COM CLIQUE DIRECIONADO E MENU DE AÇÃO RÁPIDA

import React, { useState, useRef, useCallback } from 'react';
import { Box, Tooltip, Typography, Paper } from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import apiClient from '../api/axiosConfig';
import AgendamentoModal from '../components/AgendamentoModal';
import PacientesDoDiaSidebar from '../components/agenda/PacientesDoDiaSidebar';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import StarIcon from '@mui/icons-material/Star';

// NOVO: Importações para a nova funcionalidade
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Menu, Item, useContextMenu } from 'react-contexify';
import 'react-contexify/dist/ReactContexify.css'; // Estilo do menu

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
    'Aguardando Pagamento': '#FFD700' // <-- ADICIONE ESTA LINHA (cor dourada/amarela)
};

// NOVO: IDs para os menus de contexto
const MENU_ID_MEDICO = "menu-medico";
const MENU_ID_GESTAO = "menu-gestao";

export default function AgendaPage() {
  const calendarRef = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDateInfo, setSelectedDateInfo] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // NOVO: Hooks para a nova lógica
  const { user } = useAuth();
  const navigate = useNavigate();
  const { show } = useContextMenu();

  const fetchEvents = useCallback((fetchInfo, successCallback, failureCallback) => {
    apiClient.get('/agendamentos/')
      .then(response => {
        const eventosFormatados = response.data.filter(ag => ag.status !== 'Cancelado').map(ag => {
            const eventColor = statusColors[ag.status] || '#808080';
            return { id: ag.id, title: ag.paciente_nome, start: ag.data_hora_inicio, end: ag.data_hora_fim, backgroundColor: eventColor, borderColor: eventColor, extendedProps: { ...ag } };
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
  
  // ALTERADO: Esta função agora tem a lógica de decisão
  const handleEventClick = (clickInfo) => {
    const agendamento = clickInfo.event.extendedProps;
    if (user?.isMedico) {
      // CORREÇÃO: Usamos agendamento.paciente, que deve conter o ID do paciente.
      navigate(`/pacientes/${agendamento.paciente}/prontuario`);
    } else if (user?.isAdmin || user?.isRecepcao) {
      setSelectedDateInfo(null);
      setEditingEvent(clickInfo.event);
      setIsModalOpen(true);
    }
};


  // NOVO: Função para o menu de clique direito
  const handleContextMenu = (event, agendamento) => {
    event.preventDefault();
    const menuId = user.isMedico ? MENU_ID_MEDICO : MENU_ID_GESTAO;
    show({ event, id: menuId, props: { agendamento } });
  }

// ALTERADO: Esta função agora vai REUTILIZAR a lógica do clique esquerdo
const handleMenuAction = (action, agendamento) => {
  if (action === 'abrirProntuario') {
    navigate(`/pacientes/${agendamento.paciente}/prontuario`);
  } else if (action === 'editarAgendamento') {
    // A MÁGICA ACONTECE AQUI:
    // Em vez de duplicar a lógica, nós montamos um objeto simples
    // e chamamos a função handleEventClick que já funciona perfeitamente.
    const mockClickInfo = {
      event: {
        id: agendamento.id,
        extendedProps: agendamento,
        start: new Date(agendamento.data_hora_inicio),
        end: new Date(agendamento.data_hora_fim),
        title: agendamento.paciente_nome
      }
    };
    handleEventClick(mockClickInfo); // <<-- REUTILIZANDO A FUNÇÃO EXISTENTE
  }
  // Adicione outras ações futuras aqui...
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
    <Box sx={{ height: '100%', p: 2, boxSizing: 'border-box', overflowY: 'auto' }}>
      <Box sx={{ display: 'flex', height: '100%', gap: 2 }}>
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
              slotMinTime="08:00:00"
              slotMaxTime="20:00:00"
              allDaySlot={false}
              dateClick={handleDateClick}
              eventClick={handleEventClick} // ALTERADO: Esta função agora tem a lógica
              // NOVO: Adicionamos um listener para quando o evento é montado no DOM
              eventDidMount={(info) => {
                info.el.addEventListener('contextmenu', (e) => {
                  handleContextMenu(e, info.event.extendedProps);
                });
              }}
            />
          </Paper>
        </Box>
      </Box>
      <AgendamentoModal open={isModalOpen} onClose={handleCloseModal} onSave={handleSave} initialData={selectedDateInfo} editingEvent={editingEvent} />

      {/* NOVO: Definição dos Menus de Contexto */}
      <Menu id={MENU_ID_MEDICO}>
        <Item onClick={({ props }) => handleMenuAction('abrirProntuario', props.agendamento)}>
          Abrir Prontuário
        </Item>
      </Menu>

      <Menu id={MENU_ID_GESTAO}>
        <Item onClick={({ props }) => handleMenuAction('editarAgendamento', props.agendamento)}>
          Editar Agendamento
        </Item>
        <Item>Confirmar Chegada</Item>
        <Item>Cancelar Agendamento</Item>
      </Menu>
    </Box>
  );
}