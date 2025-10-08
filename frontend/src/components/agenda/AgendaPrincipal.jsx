// src/components/agenda/AgendaPrincipal.jsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Box, Tooltip, Typography, Paper } from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list'; // <-- PASSO 1: IMPORTAR O PLUGIN DE LISTA
import resourceTimelinePlugin from '@fullcalendar/resource-timeline'; // <-- PLUGIN DE RECURSOS
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
    const [salas, setSalas] = useState([]);

    // Busca as salas da API
    useEffect(() => {
        agendamentoService.getSalas()
            .then(response => {
                const salasFormatadas = response.data.map(sala => ({
                    id: String(sala.id), // Garante que o ID seja uma string
                    title: sala.nome
                }));
                setSalas(salasFormatadas);
            })
            .catch(error => console.error("Erro ao buscar salas:", error));
    }, []);

    // Busca os eventos (agendamentos)
    const fetchEvents = useCallback((fetchInfo, successCallback, failureCallback) => {
        agendamentoService.getAgendamentos(medicoFiltro, especialidadeFiltro)
            .then(response => {
                const eventosFormatados = response.data
                    .filter(ag => ag.status !== 'Cancelado' && ag.sala) // <-- Garante que apenas agendamentos com sala apareçam na visão de recursos
                    .map(ag => ({
                        id: ag.id,
                        title: ag.paciente_nome,
                        start: ag.data_hora_inicio,
                        end: ag.data_hora_fim,
                        extendedProps: { ...ag },
                        resourceId: String(ag.sala) // <-- MUDANÇA: Associa o evento a uma sala (recurso)
                    }));
                successCallback(eventosFormatados);
            })
            .catch(error => failureCallback(error));
    }, [medicoFiltro, especialidadeFiltro]);
    
    // Atualiza a agenda quando filtros ou eventos são salvos
    useEffect(() => {
        if (calendarRef.current) {
            calendarRef.current.getApi().refetchEvents();
        }
    }, [medicoFiltro, especialidadeFiltro, onSave]);

    // Ao clicar em um espaço vazio na agenda
    const handleDateClick = (arg) => {
        setEditingEvent(null);
        // <<-- MUDANÇA: Captura a sala (resource) que foi clicada -->>
        setSelectedDateInfo({ start: arg.date, resource: arg.resource });
        setIsModalOpen(true);
    };

    // Ao clicar em um evento existente
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
        if (onSave) onSave();
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Paper sx={{ flexGrow: 1, p: 2, display: 'flex', flexDirection: 'column' }} variant="outlined">
                <FullCalendar
                    ref={calendarRef}
                    // <<-- MUDANÇA: Adiciona o plugin de recursos -->>
                    plugins={[resourceTimelinePlugin, dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                    schedulerLicenseKey="GPL-TO-REMOVE-THE-WARNING"
                    
                    // <<-- MUDANÇA: Define a visão por salas como inicial -->>
                    initialView="resourceTimelineDay"
                    
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'resourceTimelineDay,timeGridWeek,dayGridMonth'
                    }}
                    buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia', resourceTimelineDay: 'Salas' }}
                    
                    locale="pt-br"
                    height="100%"
                    events={fetchEvents}
                    slotMinTime="08:00:00"
                    slotMaxTime="20:00:00"
                    allDaySlot={false}
                    dateClick={handleDateClick}
                    eventClick={handleEventClick}
                    nowIndicator={true}
                    
                    // <<-- MUDANÇA: Fornece as salas para a agenda -->>
                    resources={salas}
                    resourceAreaHeaderContent="Salas"
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