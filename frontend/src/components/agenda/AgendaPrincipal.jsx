// src/components/agenda/AgendaPrincipal.jsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Box, Tooltip, Typography, Paper } from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useNavigate } from 'react-router-dom';
import { Menu, Item, useContextMenu } from 'react-contexify';
import 'react-contexify/dist/ReactContexify.css';

import AgendamentoModal from '../AgendamentoModal';
import { agendamentoService } from '../../services/agendamentoService';
import { useAuth } from '../../hooks/useAuth';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import StarIcon from '@mui/icons-material/Star';

// Constantes e Funções de Renderização
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

// O componente agora recebe os filtros como PROPS
export default function AgendaPrincipal({ medicoFiltro, especialidadeFiltro, onSave }) {
    const calendarRef = useRef(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDateInfo, setSelectedDateInfo] = useState(null);
    const [editingEvent, setEditingEvent] = useState(null);
    const { user } = useAuth();
    const navigate = useNavigate();
    const { show } = useContextMenu();

    const fetchEvents = useCallback((fetchInfo, successCallback, failureCallback) => {
        // Usa os filtros recebidos para chamar o service
        agendamentoService.getAgendamentos(medicoFiltro, especialidadeFiltro)
            .then(response => {
                const eventosFormatados = response.data
                    .filter(ag => ag.status !== 'Cancelado')
                    .map(ag => {
                        const eventColor = statusColors[ag.status] || '#808080';
                        let borderColor = ag.tipo_agendamento === 'Consulta' ? '#1976d2' : '#9c27b0';
                        return {
                            id: ag.id,
                            title: ag.paciente_nome,
                            start: ag.data_hora_inicio,
                            end: ag.data_hora_fim,
                            backgroundColor: eventColor,
                            borderColor: borderColor,
                            extendedProps: { ...ag }
                        };
                    });
                successCallback(eventosFormatados);
            })
            .catch(error => failureCallback(error));
    }, [medicoFiltro, especialidadeFiltro]); // A dependência garante que a busca é refeita quando o filtro muda

    useEffect(() => {
        if (calendarRef.current) {
            calendarRef.current.getApi().refetchEvents();
        }
    }, [medicoFiltro, especialidadeFiltro]);

    const handleDateClick = (arg) => {
        setEditingEvent(null);
        setSelectedDateInfo({ start: arg.date, end: arg.date });
        setIsModalOpen(true);
    };

    const handleEventClick = (clickInfo) => {
        const agendamento = clickInfo.event.extendedProps;
        if (user?.isMedico) {
            navigate(`/pacientes/${agendamento.paciente}/prontuario`);
        } else if (user?.isAdmin || user?.isRecepcao) {
            setSelectedDateInfo(null);
            setEditingEvent(clickInfo.event);
            setIsModalOpen(true);
        }
    };

    const handleContextMenu = (event, agendamento) => {
        event.preventDefault();
        const menuId = user.isMedico ? MENU_ID_MEDICO : MENU_ID_GESTAO;
        show({ event, id: menuId, props: { agendamento } });
    };

    const handleMenuAction = (action, agendamento) => {
        if (action === 'editarAgendamento') {
            const mockClickInfo = { event: { extendedProps: agendamento } };
            handleEventClick(mockClickInfo);
        } else if (action === 'abrirProntuario') {
            navigate(`/pacientes/${agendamento.paciente}/prontuario`);
        }
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
        // Se a função onSave foi passada (pelo Painel), chame-a
        if (onSave) {
            onSave();
        }
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Paper sx={{ flexGrow: 1, p: 2, display: 'flex', flexDirection: 'column' }} variant="outlined">
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
                    eventClick={handleEventClick}
                    eventDidMount={(info) => {
                        info.el.addEventListener('contextmenu', (e) => handleContextMenu(e, info.event.extendedProps));
                    }}
                    eventDisplay='block'
                    eventOverlap={false}
                    nowIndicator={true}
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