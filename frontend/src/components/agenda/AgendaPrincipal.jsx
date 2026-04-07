// src/components/agenda/AgendaPrincipal.jsx
import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Box, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { styled } from '@mui/material/styles'; 
import FullCalendar from '@fullcalendar/react';
import { useNavigate } from 'react-router-dom';
import { FaEdit, FaFileMedical, FaStethoscope, FaExclamationTriangle } from 'react-icons/fa';
// Plugins
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';

import { agendamentoService } from '../../services/agendamentoService';

// CSS CUSTOMIZADO
const StyledCalendarWrapper = styled('div')({
    flexGrow: 1,
    height: '100%', 
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#fff',

    // --- FONTES DOS HORÁRIOS MENORES ---
    '.fc-timegrid-slot-label-cushion': { 
        fontSize: '0.7rem !important', // Fonte menor
        fontWeight: 500,
        color: '#90a4ae'
    },
    
    // Ajuste fino das células e slots
    '.fc-timegrid-slot': { height: '32px !important' }, 
    '.fc-theme-standard td, .fc-theme-standard th': { borderColor: '#f1f3f5' },
    '.fc-col-header-cell-cushion': { padding: '8px 0', fontSize: '0.85rem', color: '#1C2E4A' },
    
    // Eventos
    '.fc-event': {
        boxShadow: 'none', 
        border: 'none',
        borderRadius: '3px',
        margin: '0 1px',
        fontSize: '0.75rem'
    },
    
    // Header do FullCalendar (Navegação)
    '.fc-header-toolbar': {
        marginBottom: '0 !important',
        padding: '6px 12px',
        backgroundColor: '#fff',
        borderBottom: '1px solid #eee'
    },
    '.fc-toolbar-title': { fontSize: '1.1rem !important', fontWeight: 700, color: '#37474f' },
    '.fc-button': { 
        padding: '2px 10px !important', 
        height: '28px !important', 
        fontSize: '0.8rem !important', 
        fontWeight: 600,
        textTransform: 'capitalize' 
    },
    '.fc-button-primary': { backgroundColor: '#1C2E4A', borderColor: '#1C2E4A' },
    '.fc-button-active': { backgroundColor: '#000 !important' }
});

const SALA_COLORS = ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#0288d1'];
const getColorForSala = (id) => SALA_COLORS[parseInt(String(id).replace(/\D/g, ''), 10) % SALA_COLORS.length] || '#1976d2';

export default function AgendaPrincipal({
    medicoFiltro, 
    especialidadeFiltro, 
    onDateClick, 
    onEventClick,
    onDatesSet, // <--- ADICIONE AQUI 
    salas = [],
    refreshTrigger
}) {
    const calendarRef = useRef(null);
    const navigate = useNavigate();
    
    // ESTADOS DO MENU
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const openMenu = Boolean(anchorEl);

    // 1. Apague o [eventos, setEventos] e a função carregarEventos.
    // 2. Crie esta nova função que o FullCalendar vai usar para buscar os dados sob demanda:
    const fetchEventos = useCallback((fetchInfo, successCallback, failureCallback) => {
    // O FullCalendar fornece automaticamente o startStr e endStr da tela atual!
    const { startStr, endStr } = fetchInfo;

    agendamentoService.getAgendamentos(medicoFiltro, especialidadeFiltro, startStr, endStr)
        .then(response => {
            // =================================================================
            // DEBUG: O DEDO-DURO DO FRONTEND
            // =================================================================
            console.log(`\n[DEBUG AGENDA] Buscando intervalo de ${startStr} a ${endStr}`);
            console.log(`[DEBUG AGENDA] O backend devolveu ${response.data.length} agendamentos brutos.`);
            
            response.data.forEach(ag => {
                console.log(`👻 -> ID: ${ag.id} | Paciente: ${ag.paciente_nome} | Sala: ${ag.sala} | Início Banco: ${ag.data_hora_inicio} | Status: ${ag.status}`);
            });
            // =================================================================

            const eventosFormatados = response.data
                // Atenção: Aqui nós estamos escondendo pacientes que não têm sala! (Isso pode ser um fantasma)
                .filter(ag => ag.sala) 
                .map(ag => {
                    const isInativo = ag.status === 'Cancelado' || ag.status === 'Não Compareceu';
                    return {
                        id: ag.id,
                        title: ag.paciente_nome, 
                        start: ag.data_hora_inicio,
                        end: ag.data_hora_fim,
                        extendedProps: { 
                            ...ag,
                            tipo_procedimento: ag.tipo_exame || 'CONSULTA', 
                            paciente_id: ag.paciente, 
                            medico_nome: ag.medico_nome,
                            medico_crm: ag.medico_crm
                        },
                        resourceId: String(ag.sala),
                        backgroundColor: isInativo ? 'rgba(200, 200, 200, 0.4)' : getColorForSala(ag.sala),
                        borderColor: isInativo ? 'rgba(150, 150, 150, 0.5)' : getColorForSala(ag.sala),
                        textColor: isInativo ? '#666' : '#fff',
                        classNames: isInativo ? ['evento-inativo'] : []
                    };
                });
            successCallback(eventosFormatados);
        })
        .catch(error => {
            console.error("Erro ao carregar a agenda:", error);
            failureCallback(error);
        });
}, [medicoFiltro, especialidadeFiltro]);

    // 3. Atualize o useEffect para forçar o recarregamento quando salvar um agendamento novo
useEffect(() => {
    if (calendarRef.current) {
        calendarRef.current.getApi().refetchEvents();
    }
    }, [refreshTrigger]);

    // HANDLERS DO MENU

    // 1. Ao clicar no evento (abre o menu)
    const handleCalendarEventClick = (clickInfo) => {
        clickInfo.jsEvent.preventDefault(); 
        setAnchorEl(clickInfo.el);
        setSelectedEvent(clickInfo.event);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedEvent(null);
    };

    // 2. Ação: Editar
    const handleActionEditar = () => {
    if (selectedEvent) {
        onEventClick({ 
            event: { 
                id: selectedEvent.id, 
                start: selectedEvent.start, // <--- ADICIONE ESTA LINHA
                end: selectedEvent.end,     // <--- ADICIONE ESTA LINHA (boa prática)
                ...selectedEvent.extendedProps 
            } 
        }); 
    }
    handleCloseMenu();
};

    // 3. Ação: Laudo
    const handleActionLaudo = () => {
        const dados = selectedEvent?.extendedProps;
        if (!dados || !dados.paciente_id) {
            alert("Erro: Este agendamento não tem um paciente vinculado.");
            return;
        }
        const draftLaudo = {
            paciente: { id: dados.paciente_id, nome_completo: selectedEvent.title }, 
            medicoNome: dados.medico_nome,
            medicoCrm: dados.medico_crm,
            tipoExame: dados.tipo_procedimento !== 'CONSULTA' ? dados.tipo_procedimento : 'OBSTETRICO',
            textoFinal: '',
            dadosEstruturados: {}
        };
        sessionStorage.setItem('laudos_rascunho_auto_save', JSON.stringify(draftLaudo));
        handleCloseMenu();
        navigate('/laudos');
    };

    // 4. Ação: Painel Médico
    const handleActionConsulta = () => {
        const dados = selectedEvent?.extendedProps;
        if (!dados?.paciente_id) {
             alert("Erro: Paciente não identificado.");
             return;
        }
        navigate('/painel-medico', { 
            state: { 
                agendamentoId: selectedEvent.id, 
                pacienteId: dados.paciente_id 
            } 
        });
        handleCloseMenu();
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fff' }}>
           
            {/* --- FULLCALENDAR --- */}
            <StyledCalendarWrapper>
                <FullCalendar
                    ref={calendarRef}
                    plugins={[resourceTimeGridPlugin, dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="resourceTimeGridDay"
                    locale="pt-br"
                    buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia' }}
                    headerToolbar={{ left: 'prev,next today', center: 'title', right: 'resourceTimeGridDay,timeGridWeek,dayGridMonth' }}
                    height="100%"
                    events={fetchEventos}
                    resources={salas.map(s => ({ id: String(s.id), title: s.nome }))}
                    dateClick={onDateClick}
                    eventClick={handleCalendarEventClick}
                    datesSet={onDatesSet}
                    slotMinTime="08:00:00" 
                    slotMaxTime="22:30:00"
                    allDaySlot={false}
                    nowIndicator={true}
                    slotDuration="00:15:00"
                    eventMinHeight={28}
                    // MUDANÇA 3: Permitir sobreposição visual
                    slotEventOverlap={true}
                    eventOverlap={true}

                    eventContent={(arg) => {
                        const dados = arg.event.extendedProps;
                        const isInativo = dados.status === 'Cancelado' || dados.status === 'Não Compareceu';
                        
                        let emojis = "";
                        if (dados.pagamento_status === 'Pendente' && !isInativo) emojis += " 🔴";
                        if (dados.primeira_consulta && !isInativo) emojis += " ⭐";
                        else if (dados.tipo_visita === 'Retorno' && !isInativo) emojis += " 🔄";
                        if (dados.status === 'Confirmado') emojis += " ✅";
                        if (dados.status === 'Cancelado') emojis += " ❌";
                        if (dados.status === 'Não Compareceu') emojis += " 👻"; // Sugestão para não compareceu
                        if (dados.status === 'Realizado') emojis += " 🏁";

                        // MUDANÇA 4: Ajuste da borda lateral e cores internas
                        const tipo = (dados.tipo_procedimento || '').toLowerCase();
                        let borderLeftColor = 'transparent';
                        
                        // Se estiver inativo, a borda lateral fica cinza claro. Senão, usa as cores normais.
                        if (isInativo) {
                             borderLeftColor = '#ccc';
                        } else if (tipo.includes('obstétrico') || tipo.includes('fetal') || tipo.includes('transvaginal')) {
                            borderLeftColor = '#e91e63';
                        } else if (tipo.includes('cardio') || tipo.includes('ecocardiograma')) {
                            borderLeftColor = '#ff9800';
                        } else if (tipo.includes('consulta')) {
                            borderLeftColor = '#2196f3';
                        }

                        return (
                            <Box sx={{ 
                                display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
                                width: '100%', height: '100%', borderLeft: `3px solid ${borderLeftColor}`, padding: '0 2px 0 4px', overflow: 'hidden'
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', whiteSpace: 'nowrap', flexGrow: 1 }}>
                                    <span style={{ 
                                        fontWeight: 900, 
                                        fontSize: '0.7em', 
                                        opacity: isInativo ? 0.5 : 0.8, // Mais transparente se inativo
                                        color: arg.textColor // Usa a cor do texto definida lá em cima
                                    }}>
                                        {arg.timeText.split(' - ')[0]}
                                    </span>
                                    <span style={{ 
                                        fontWeight: isInativo ? 'normal' : 'bold', // Tira o negrito se inativo
                                        fontSize: '0.75em', 
                                        textOverflow: 'ellipsis', 
                                        overflow: 'hidden', 
                                        textDecoration: isInativo ? 'line-through' : 'none', 
                                        color: arg.textColor // Usa a cor do texto definida lá em cima (#666 para inativos, #fff para ativos)
                                    }}>
                                        {arg.event.title}
                                    </span>
                                </Box>
                                <Box sx={{ fontSize: '0.8em', flexShrink: 0, paddingLeft: '2px', display: 'flex', alignItems: 'center', opacity: isInativo ? 0.6 : 1 }}>
                                    {emojis}
                                </Box>
                            </Box>
                        );
                    }}
                />
            </StyledCalendarWrapper>

            <Menu
                anchorEl={anchorEl}
                open={openMenu}
                onClose={handleCloseMenu}
                PaperProps={{ elevation: 3, sx: { minWidth: 200 } }}
            >
                <Box sx={{ p: 2, pb: 1, borderBottom: '1px solid #eee' }}>
                    <div style={{fontWeight: 'bold', fontSize: '14px', color:'#1C2E4A'}}>
                        {selectedEvent?.title || 'Agendamento'}
                    </div>
                    <div style={{fontSize: '11px', color:'#666'}}>Selecione uma ação:</div>
                </Box>

                <MenuItem onClick={handleActionEditar}>
                    <ListItemIcon><FaEdit fontSize="small" /></ListItemIcon>
                    <ListItemText>Editar Agendamento</ListItemText>
                </MenuItem>

                <Divider />

                <MenuItem onClick={handleActionLaudo} disabled={!selectedEvent?.extendedProps?.paciente_id}>
                    <ListItemIcon><FaFileMedical fontSize="small" color="#2E7D32"/></ListItemIcon>
                    <ListItemText>Realizar Laudo</ListItemText>
                </MenuItem>

                <MenuItem onClick={handleActionConsulta} disabled={!selectedEvent?.extendedProps?.paciente_id}>
                    <ListItemIcon><FaStethoscope fontSize="small" color="#1976d2"/></ListItemIcon>
                    <ListItemText>Iniciar Atendimento</ListItemText>
                </MenuItem>
            </Menu>
        </Box>
    );
}