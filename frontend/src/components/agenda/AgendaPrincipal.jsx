// src/components/agenda/AgendaPrincipal.jsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Box, Tooltip, Typography, Paper } from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list'; // <-- PASSO 1: IMPORTAR O PLUGIN DE LISTA
import { useNavigate } from 'react-router-dom';
import { Menu, Item, useContextMenu } from 'react-contexify';
import 'react-contexify/dist/ReactContexify.css';

import AgendamentoModal from '../AgendamentoModal';
import { agendamentoService } from '../../services/agendamentoService';
import { useAuth } from '../../hooks/useAuth';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import StarIcon from '@mui/icons-material/Star';

// Constantes e Funções de Renderização (sem alterações)
const statusColors = {
    'Agendado': '#6495ED',
    'Confirmado': '#32CD32',
    'Realizado': '#228B22',
    'Não Compareceu': '#A9A9A9',
    'Aguardando Pagamento': '#FFD700'
};
const MENU_ID_MEDICO = "menu-medico-painel";
const MENU_ID_GESTAO = "menu-gestao-painel";
function renderEventContent(eventInfo) {
    const { status_pagamento, primeira_consulta } = eventInfo.event.extendedProps;
    return (
        <Box sx={{ p: '2px 4px', overflow: 'hidden', fontSize: '0.85em' }}>
            <div>
                <b>{eventInfo.timeText}</b>
                <Typography variant="body2" component="span" sx={{ ml: 1 }}>
                    {eventInfo.event.title}
                </Typography>
            </div>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: '4px' }}>
                {status_pagamento === 'Pago' && (
                    <Tooltip title="Consulta Paga">
                        <MonetizationOnIcon sx={{ fontSize: 16, color: 'gold' }} />
                    </Tooltip>
                )}
                {primeira_consulta && (
                    <Tooltip title="Primeira Consulta">
                        <StarIcon sx={{ fontSize: 16, color: 'orange' }} />
                    </Tooltip>
                )}
            </Box>
        </Box>
    );
}

export default function AgendaPrincipal({ medicoFiltro, especialidadeFiltro, onSave }) {
    const calendarRef = useRef(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDateInfo, setSelectedDateInfo] = useState(null);
    const [editingEvent, setEditingEvent] = useState(null);
    const { user } = useAuth();
    const navigate = useNavigate();
    const { show } = useContextMenu();
    
    // ... Toda a lógica de handlers e hooks permanece a mesma ...
    const fetchEvents = useCallback((fetchInfo, successCallback, failureCallback) => { agendamentoService.getAgendamentos(medicoFiltro, especialidadeFiltro).then(response => { const eventosFormatados = response.data.filter(ag => ag.status !== 'Cancelado').map(ag => ({ id: ag.id, title: ag.paciente_nome, start: ag.data_hora_inicio, end: ag.data_hora_fim, backgroundColor: statusColors[ag.status] || '#808080', borderColor: ag.tipo_agendamento === 'Consulta' ? '#1976d2' : '#9c27b0', extendedProps: { ...ag } })); successCallback(eventosFormatados); }).catch(error => failureCallback(error)); }, [medicoFiltro, especialidadeFiltro]);
    useEffect(() => { if (calendarRef.current) { calendarRef.current.getApi().refetchEvents(); } }, [medicoFiltro, especialidadeFiltro]);
    const handleDateClick = (arg) => { setEditingEvent(null); setSelectedDateInfo({ start: arg.date, end: arg.date }); setIsModalOpen(true); };
    const handleEventClick = (clickInfo) => { const agendamento = clickInfo.event.extendedProps; if (user?.isMedico) { navigate(`/pacientes/${agendamento.paciente}/prontuario`); } else if (user?.isAdmin || user?.isRecepcao) { setSelectedDateInfo(null); setEditingEvent(clickInfo.event); setIsModalOpen(true); } };
    const handleContextMenu = (event, agendamento) => { event.preventDefault(); const menuId = user.isMedico ? MENU_ID_MEDICO : MENU_ID_GESTAO; show({ event, id: menuId, props: { agendamento } }); };
    const handleMenuAction = (action, agendamento) => { if (action === 'editarAgendamento') { const mockClickInfo = { event: { extendedProps: agendamento } }; handleEventClick(mockClickInfo); } else if (action === 'abrirProntuario') { navigate(`/pacientes/${agendamento.paciente}/prontuario`); } };
    const handleCloseModal = () => { setIsModalOpen(false); setEditingEvent(null); setSelectedDateInfo(null); };
    const handleSave = () => { handleCloseModal(); if (calendarRef.current) { calendarRef.current.getApi().refetchEvents(); } if (onSave) { onSave(); } };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Paper sx={{ flexGrow: 1, p: 2, display: 'flex', flexDirection: 'column' }} variant="outlined">
                <FullCalendar
                    ref={calendarRef}
                    // PASSO 2: ADICIONAR O PLUGIN À LISTA
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                    
                    // PASSO 3: MUDAR A VISÃO INICIAL E OS BOTÕES
                    initialView="timeGridWeek" // Mantemos a de semana como padrão geral
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        // MANTEMOS 'listDay' aqui, pois é o nome da *visão*
                        right: 'dayGridMonth,timeGridWeek,listDay' 
                    }}
                    
                    // A MUDANÇA É AQUI:
                    // Nós dizemos ao FullCalendar para usar o texto "Dia" para a visão 'list'.
                    buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana', list: 'Dia' }}

                    locale="pt-br"
                    height="100%"
                    events={fetchEvents}
                    // O eventContent não é usado na visão de lista, mas mantemos para as outras visões
                    eventContent={renderEventContent}
                    slotMinTime="08:00:00"
                    slotMaxTime="20:00:00"
                    slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                    allDaySlot={false}
                    dateClick={handleDateClick}
                    eventClick={handleEventClick}
                    eventDidMount={(info) => {
                        info.el.addEventListener('contextmenu', (e) => handleContextMenu(e, info.event.extendedProps));
                    }}
                    nowIndicator={true}

                    // REMOVEMOS AS PROPS DE EMPILHAMENTO, POIS NÃO SÃO NECESSÁRIAS AQUI
                />
            </Paper>
            <AgendamentoModal open={isModalOpen} onClose={handleCloseModal} onSave={handleSave} initialData={selectedDateInfo} editingEvent={editingEvent} />
            <Menu id={MENU_ID_MEDICO}>
                <Item onClick={({ props }) => handleMenuAction('abrirProntuario', props.agendamento)}>Abrir Prontuário</Item>
            </Menu>
            <Menu id={MENU_ID_GESTAO}>
                <Item onClick={({ props }) => handleMenuAction('editarAgendamento', props.agendamento)}>Editar Agendamento</Item>
                <Item>Confirmar Chegada</Item>
                <Item>Cancelar Agendamento</Item>
            </Menu>
        </Box>
    );
}