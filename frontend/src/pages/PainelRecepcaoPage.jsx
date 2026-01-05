// src/pages/PainelRecepcaoPage.jsx - VERSÃO FINAL COM TUDO INTEGRADO
import React, { useState, useEffect } from 'react';
import { Box, Drawer, Typography, Paper } from '@mui/material';
import { agendamentoService } from '../services/agendamentoService';

// Componentes do Painel
import AgendaPrincipal from '../components/agenda/AgendaPrincipal';
import PacientesDoDiaSidebar from '../components/agenda/PacientesDoDiaSidebar';
import ListaEspera from '../components/painel/ListaEspera';
import ControlesAgenda from '../components/painel/ControlesAgenda';
import BarraIconesLateral from '../components/painel/BarraIconesLateral';
import VerificadorDisponibilidade from '../components/painel/VerificadorDisponibilidade';

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
    const [isDispoOpen, setIsDispoOpen] = useState(false);
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
    // FUNÇÃO: Quando clicar num horário vago no verificador, abre o modal de agendamento já preenchido
    const handleSlotSelect = (slotInfo) => {
        setIsDispoOpen(false); // Fecha o verificador
        setInitialData({
             start: slotInfo.data_hora_inicio.toDate(), // Converter dayjs para JS Date
             medicoId: slotInfo.medico?.id,
             // ... outros dados
        });
        setIsAgendamentoModalOpen(true);
    };

    return (
        <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', p: 1, gap: 1, backgroundColor: '#f4f6f8' }}> {/* Padding e Gap reduzidos para 1 */}
            
            {/* COLUNA LATERAL ESQUERDA (Mais estreita se possível, ex: 300px) */}
            <Box sx={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                
                <ControlesAgenda 
                    onNovoPacienteClick={() => setIsPacienteModalOpen(true)}
                    onCaixaClick={() => setIsCaixaModalOpen(true)}
                    onFiltroChange={handleFiltroChange}
                    onVerificarDispoClick={() => setIsDispoOpen(true)} // <-- NOVO
                />
                
                {/* Pacientes do dia e Lista de Espera compartilham o espaço restante */}
                <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                     {/* Dica: Você pode colocar Abas aqui se ficar muito cheio: [Chegando] | [Espera] */}
                    <Box sx={{ flex: 1, minHeight: 0, mb: 1 }}>
                        <PacientesDoDiaSidebar refreshTrigger={refreshTrigger} medicoFiltro={medicoFiltro} />
                    </Box>
                    <Box sx={{ height: '35%', minHeight: 150 }}>
                        <ListaEspera refreshTrigger={refreshTrigger} onAgendamentoSelect={handleEventClick} />
                    </Box>
                </Box>
            </Box>

            {/* ÁREA PRINCIPAL */}
            <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                
                {/* 1. BARRA DE STATUS RÁPIDA (Substituindo os KPI Cards grandes) */}
                <Paper variant="outlined" sx={{ p: 1, display: 'flex', gap: 3, alignItems: 'center', bgcolor: '#fff' }}>
                     <Box>
                        <Typography variant="caption" color="text.secondary">HOJE</Typography>
                        <Typography variant="h6" sx={{ lineHeight: 1 }}>14</Typography>
                     </Box>
                     <Box>
                        <Typography variant="caption" color="text.secondary">NOVOS</Typography>
                        <Typography variant="h6" sx={{ lineHeight: 1, color: 'secondary.main' }}>3</Typography>
                     </Box>
                     <Box>
                        <Typography variant="caption" color="text.secondary">A CONFIRMAR</Typography>
                        <Typography variant="h6" sx={{ lineHeight: 1, color: 'warning.main' }}>5</Typography>
                     </Box>
                     {/* Espaço para avisos financeiros futuros */}
                </Paper>

                {/* 2. AGENDA */}
                <Box sx={{ flexGrow: 1 }}>
                    <AgendaPrincipal 
                        medicoFiltro={medicoFiltro} 
                        especialidadeFiltro={especialidadeFiltro} 
                        onDateClick={handleDateClick} 
                        onEventClick={handleEventClick} 
                        salas={salas} 
                    />
                </Box>
            </Box>
            
            <BarraIconesLateral />
            
            {/* DRAWER PARA BUSCA DE HORÁRIOS (Melhor que modal pois não bloqueia toda a visão) */}
            <Drawer
                anchor="left"
                open={isDispoOpen}
                onClose={() => setIsDispoOpen(false)}
            >
                <Box sx={{ width: 350, p: 2, height: '100%', bgcolor: '#f5f5f5' }}>
                    <VerificadorDisponibilidade onSlotSelect={handleSlotSelect} />
                </Box>
            </Drawer>
            
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