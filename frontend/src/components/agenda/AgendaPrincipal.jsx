// src/components/agenda/AgendaPrincipal.jsx - VERSÃO FINAL CORRIGIDA
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Box, Paper, Tooltip, Typography } from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import { useNavigate } from 'react-router-dom'; // <-- Import necessário
import { Menu, Item, useContextMenu } from 'react-contexify'; // <-- Imports necessários
import 'react-contexify/dist/ReactContexify.css'; // <-- Import do CSS

import AgendamentoModal from '../AgendamentoModal';
import { agendamentoService } from '../../services/agendamentoService';
import { useAuth } from '../../hooks/useAuth'; // <-- Import necessário

// ... (Função renderEventContent e outras constantes se você as tiver)
const MENU_ID_MEDICO = "menu-medico-painel";
const MENU_ID_GESTAO = "menu-gestao-painel";


export default function AgendaPrincipal({ medicoFiltro, especialidadeFiltro, onSave }) {
    const calendarRef = useRef(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDateInfo, setSelectedDateInfo] = useState(null);
    const [editingEvent, setEditingEvent] = useState(null);
    const [salas, setSalas] = useState([]);
    const { user } = useAuth(); // <-- Hook necessário
    const navigate = useNavigate(); // <-- Hook necessário
    const { show } = useContextMenu(); // <-- Hook necessário

    // Busca as salas da API
    useEffect(() => {
        agendamentoService.getSalas()
            .then(response => {
                const salasFormatadas = response.data.map(sala => ({
                    id: String(sala.id),
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
                    .filter(ag => ag.status !== 'Cancelado' && ag.sala)
                    .map(ag => ({
                        id: ag.id,
                        title: ag.paciente_nome,
                        start: ag.data_hora_inicio,
                        end: ag.data_hora_fim,
                        extendedProps: { ...ag },
                        resourceId: String(ag.sala)
                    }));
                successCallback(eventosFormatados);
            })
            .catch(error => failureCallback(error));
    }, [medicoFiltro, especialidadeFiltro]);
    
    useEffect(() => {
        if (calendarRef.current) {
            calendarRef.current.getApi().refetchEvents();
        }
    }, [medicoFiltro, especialidadeFiltro, onSave]);

    // Ao clicar em um espaço vazio na agenda
    const handleDateClick = (arg) => {
        setEditingEvent(null);
        setSelectedDateInfo({ start: arg.date, resource: arg.resource });
        setIsModalOpen(true);
    };

    // Ao clicar em um evento existente
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

    // <<-- FUNÇÕES DO MENU DE CONTEXTO (CORRIGIDO) -->>
    const handleContextMenu = (event, agendamento) => {
        event.preventDefault();
        const menuId = user.isMedico ? MENU_ID_MEDICO : MENU_ID_GESTAO;
        show({ event, id: menuId, props: { agendamento } });
    };

    const handleMenuAction = (action, agendamento) => {
        if (action === 'editarAgendamento') {
            const mockClickInfo = { event: { extendedProps: agendamento, id: agendamento.id } };
            handleEventClick(mockClickInfo);
        } else if (action === 'abrirProntuario') {
            navigate(`/pacientes/${agendamento.paciente}/prontuario`);
        }
    };
    // <<-- FIM DA CORREÇÃO -->>

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
                    plugins={[resourceTimelinePlugin, dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                    schedulerLicenseKey="GPL-TO-REMOVE-THE-WARNING"
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
                    resources={salas}
                    resourceAreaHeaderContent="Salas"
                    
                    // <<-- LIGAÇÃO DO MENU DE CONTEXTO (CORRIGIDO) -->>
                    eventDidMount={(info) => {
                        info.el.addEventListener('contextmenu', (e) => handleContextMenu(e, info.event.extendedProps));
                    }}
                />
            </Paper>

            <AgendamentoModal
                open={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSave}
                initialData={selectedDateInfo}
                editingEvent={editingEvent}
            />

            {/* <<-- JSX DOS MENUS (CORRIGIDO) -->> */}
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