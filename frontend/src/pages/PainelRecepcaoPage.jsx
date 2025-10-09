// src/pages/PainelRecepcaoPage.jsx - VERSÃO FINAL COM TUDO INTEGRADO
import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { agendamentoService } from '../services/agendamentoService';

// Componentes do Painel
import AgendaPrincipal from '../components/agenda/AgendaPrincipal';
import PacientesDoDiaSidebar from '../components/agenda/PacientesDoDiaSidebar';
import ListaEspera from '../components/painel/ListaEspera';
import ControlesAgenda from '../components/painel/ControlesAgenda';
import BarraIconesLateral from '../components/painel/BarraIconesLateral';

// Modais
import PacienteModal from '../components/PacienteModal';
import AgendamentoModal from '../components/AgendamentoModal';
import LancamentoCaixaModal from '../components/financeiro/LancamentoCaixaModal'; // <-- IMPORTE O MODAL DE CAIXA

export default function PainelRecepcaoPage() {
    // ESTADOS GERAIS
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [salas, setSalas] = useState([]);
    const [medicoFiltro, setMedicoFiltro] = useState('');
    const [especialidadeFiltro, setEspecialidadeFiltro] = useState('');

    // ESTADOS DOS MODAIS
    const [isPacienteModalOpen, setIsPacienteModalOpen] = useState(false);
    const [isAgendamentoModalOpen, setIsAgendamentoModalOpen] = useState(false);
    const [isCaixaModalOpen, setIsCaixaModalOpen] = useState(false); // <-- NOVO STATE
    const [editingEvent, setEditingEvent] = useState(null);
    const [initialData, setInitialData] = useState(null);

    useEffect(() => {
        agendamentoService.getSalas().then(res => setSalas(res.data)).catch(err => console.error("Falha ao buscar salas", err));
    }, []);

    const forceRefresh = () => setRefreshTrigger(prev => prev + 1);

    // Handlers para abrir/fechar modais
    const handleCloseAgendamentoModal = () => { setIsAgendamentoModalOpen(false); setEditingEvent(null); setInitialData(null); };
    const handleAgendamentoSave = () => { handleCloseAgendamentoModal(); forceRefresh(); };
    const handleDateClick = (arg) => { setEditingEvent(null); setInitialData({ start: arg.date, resource: arg.resource }); setIsAgendamentoModalOpen(true); };
    const handleEventClick = (clickInfo) => { setInitialData(null); setEditingEvent(clickInfo.event || clickInfo); setIsAgendamentoModalOpen(true); };
    const handleFiltroChange = (filtros) => { setMedicoFiltro(filtros.medicoId); setEspecialidadeFiltro(filtros.especialidadeId); };

    return (
        <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', p: 2, gap: 2, backgroundColor: '#f4f6f8' }}>
            
            <Box sx={{ width: 350, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Passa as funções para abrir os modais corretos */}
                <ControlesAgenda 
                    onNovoPacienteClick={() => setIsPacienteModalOpen(true)}
                    onCaixaClick={() => setIsCaixaModalOpen(true)}
                    onFiltroChange={handleFiltroChange}
                />
                <Box sx={{ flex: 1, minHeight: '300px' }}><PacientesDoDiaSidebar refreshTrigger={refreshTrigger} medicoFiltro={medicoFiltro} /></Box>
                <Box sx={{ flex: 1, minHeight: '200px' }}><ListaEspera refreshTrigger={refreshTrigger} onAgendamentoSelect={handleEventClick} /></Box>
            </Box>

            <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex' }}>
                <AgendaPrincipal medicoFiltro={medicoFiltro} especialidadeFiltro={especialidadeFiltro} onDateClick={handleDateClick} onEventClick={handleEventClick} salas={salas} />
            </Box>
            
            <BarraIconesLateral />
            
            {/* RENDERIZAÇÃO DE TODOS OS MODAIS CONTROLADOS PELA PÁGINA */}
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
            <LancamentoCaixaModal
                open={isCaixaModalOpen}
                onClose={() => setIsCaixaModalOpen(false)}
            />
        </Box>
    );
}