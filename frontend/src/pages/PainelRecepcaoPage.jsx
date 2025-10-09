// src/pages/PainelRecepcaoPage.jsx - VERSÃO ATUALIZADA
import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { agendamentoService } from '../services/agendamentoService';

// Componentes
import AgendaPrincipal from '../components/agenda/AgendaPrincipal';
import PacientesDoDiaSidebar from '../components/agenda/PacientesDoDiaSidebar';
import ListaEspera from '../components/painel/ListaEspera';
import ControlesAgenda from '../components/painel/ControlesAgenda';
import PacienteModal from '../components/PacienteModal';
import AgendamentoModal from '../components/AgendamentoModal';
import BarraIconesLateral from '../components/painel/BarraIconesLateral'; // <-- IMPORTE O NOVO COMPONENTE

export default function PainelRecepcaoPage() {
    // ESTADOS GERAIS
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [salas, setSalas] = useState([]);

    // ESTADOS DOS FILTROS
    const [medicoFiltro, setMedicoFiltro] = useState('');
    const [especialidadeFiltro, setEspecialidadeFiltro] = useState('');

    // ESTADOS DOS MODAIS
    const [isPacienteModalOpen, setIsPacienteModalOpen] = useState(false);
    const [isAgendamentoModalOpen, setIsAgendamentoModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [initialData, setInitialData] = useState(null);

    // Efeito para buscar dados essenciais da página, como as salas
    useEffect(() => {
        agendamentoService.getSalas()
            .then(res => setSalas(res.data))
            .catch(err => console.error("Falha ao buscar salas", err));
    }, []);

    // Função para forçar a atualização dos componentes filhos
    const forceRefresh = () => setRefreshTrigger(prev => prev + 1);

    // HANDLERS DOS MODAIS
    const handleCloseAgendamentoModal = () => {
        setIsAgendamentoModalOpen(false);
        setEditingEvent(null);
        setInitialData(null);
    };

    const handleAgendamentoSave = () => {
        handleCloseAgendamentoModal();
        forceRefresh(); // Atualiza a agenda e a lista de espera
    };

    // HANDLERS DE INTERAÇÃO (recebidos dos componentes filhos)
    const handleDateClick = (arg) => {
        setEditingEvent(null);
        setInitialData({ start: arg.date, resource: arg.resource });
        setIsAgendamentoModalOpen(true);
    };

    const handleEventClick = (clickInfo) => {
        // O FullCalendar passa o objeto do evento completo
        setInitialData(null);
        setEditingEvent(clickInfo.event || clickInfo); // Aceita evento do FullCalendar ou objeto direto
        setIsAgendamentoModalOpen(true);
    };

    const handleFiltroChange = (filtros) => {
        setMedicoFiltro(filtros.medicoId);
        setEspecialidadeFiltro(filtros.especialidadeId);
    };

    return (
    // <<-- MUDANÇA: Adicionamos padding (p: 2) e um espaçamento (gap: 2) aqui -->>
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', p: 2, gap: 2, backgroundColor: '#f4f6f8' }}>
        
        {/* COLUNA DA ESQUERDA (SIDEBAR) */}
        <Box sx={{ width: 350, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <ControlesAgenda onNovoPacienteClick={() => setIsPacienteModalOpen(true)} onFiltroChange={handleFiltroChange} />
            <Box sx={{ flex: 1, minHeight: '300px' }}>
                <PacientesDoDiaSidebar refreshTrigger={refreshTrigger} medicoFiltro={medicoFiltro} />
            </Box>
            <Box sx={{ flex: 1, minHeight: '200px' }}>
                <ListaEspera refreshTrigger={refreshTrigger} onAgendamentoSelect={handleEventClick} />
            </Box>
        </Box>

        {/* ÁREA CENTRAL (AGENDA) - Não precisa mais de padding próprio */}
        <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex' }}>
            <AgendaPrincipal
                medicoFiltro={medicoFiltro}
                especialidadeFiltro={especialidadeFiltro}
                onDateClick={handleDateClick}
                onEventClick={handleEventClick}
                salas={salas}
            />
        </Box>
        
        {/* NOVA COLUNA DIREITA (BARRA DE ÍCONES) */}
        <BarraIconesLateral />
        
        {/* MODAIS (controlados por esta página) */}
        <PacienteModal
            open={isPacienteModalOpen}
            onClose={() => setIsPacienteModalOpen(false)}
            onSave={() => { setIsPacienteModalOpen(false); forceRefresh(); }}
            pacienteParaEditar={null}
        />
        <AgendamentoModal
            open={isAgendamentoModalOpen}
            onClose={handleCloseAgendamentoModal}
            onSave={handleAgendamentoSave}
            initialData={initialData}
            editingEvent={editingEvent}
        />
    </Box>
);  
}