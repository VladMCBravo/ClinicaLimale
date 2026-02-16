// src/pages/PainelRecepcaoPage.jsx
import React, { useState, useEffect } from 'react';
import { Box, Drawer, Typography, Paper, CircularProgress, Stack, Divider, Button } from '@mui/material';
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
import LancamentoCaixaModal from '../components/financeiro/LancamentoCaixaModal';

export default function PainelRecepcaoPage() {
    // ESTADOS GERAIS
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [salas, setSalas] = useState([]);
    const [medicoFiltro, setMedicoFiltro] = useState('');
    const [especialidadeFiltro, setEspecialidadeFiltro] = useState('');

    // ESTADO DOS KPIS (ESTATÍSTICAS)
    const [kpis, setKpis] = useState({ hoje: 0, novos: 0, confirmar: 0 });
    const [loadingKpis, setLoadingKpis] = useState(true);

    // ESTADOS DOS MODAIS E DRAWER
    const [isPacienteModalOpen, setIsPacienteModalOpen] = useState(false);
    const [isAgendamentoModalOpen, setIsAgendamentoModalOpen] = useState(false);
    const [isCaixaModalOpen, setIsCaixaModalOpen] = useState(false);
    const [isDispoOpen, setIsDispoOpen] = useState(false);

    const [editingEvent, setEditingEvent] = useState(null);
    const [initialData, setInitialData] = useState(null);

    // Carrega SALAS
    useEffect(() => {
        agendamentoService.getSalas()
            .then(res => setSalas(res.data))
            .catch(err => console.error("Falha ao buscar salas", err));
    }, []);

    // Carrega KPIs (Números do Topo)
    useEffect(() => {
        setLoadingKpis(true);
        agendamentoService.getDashboardKPIs()
            .then(res => {
                setKpis(res.data);
            })
            .catch(err => console.error("Erro ao carregar KPIs:", err))
            .finally(() => setLoadingKpis(false));
    }, [refreshTrigger]); // Recarrega quando algo muda na agenda

    const forceRefresh = () => setRefreshTrigger(prev => prev + 1);

    // Handlers
    const handleCloseAgendamentoModal = () => { setIsAgendamentoModalOpen(false); setEditingEvent(null); setInitialData(null); };
    const handleAgendamentoSave = () => { handleCloseAgendamentoModal(); forceRefresh(); };
    
    const handleDateClick = (arg) => { 
        setEditingEvent(null); 
        setInitialData({ start: arg.date, resource: arg.resource }); 
        setIsAgendamentoModalOpen(true); 
    };
    
    const handleEventClick = (clickInfo) => { 
        setInitialData(null); 
        setEditingEvent(clickInfo.event || clickInfo); 
        setIsAgendamentoModalOpen(true); 
    };

    // A AgendaPrincipal vai chamar isso quando mudar o filtro interno dela,
    // ou se você quiser controlar tudo por aqui.
    const handleFiltroChange = (filtros) => { 
        setMedicoFiltro(filtros.medicoId); 
        setEspecialidadeFiltro(filtros.especialidadeId); 
    };

    const handleSlotSelect = (slotInfo) => {
        setIsDispoOpen(false);
        setInitialData({
             start: slotInfo.data_hora_inicio.toDate(),
             medicoId: slotInfo.medico?.id,
             especialidadeId: slotInfo.especialidade?.id
        });
        setIsAgendamentoModalOpen(true);
    };

    return (
        <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', p: 1, gap: 1, backgroundColor: '#f4f6f8', overflow: 'hidden' }}>
            
            {/* --- COLUNA ESQUERDA --- */}
            <Box sx={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1, height: '100%' }}>
                <Box sx={{ flex: 1.5, minHeight: 0, overflow: 'hidden' }}>
                    <PacientesDoDiaSidebar refreshTrigger={refreshTrigger} medicoFiltro={medicoFiltro} />
                </Box>
                <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    <ListaEspera refreshTrigger={refreshTrigger} onAgendamentoSelect={handleEventClick} />
                </Box>
            </Box>


            {/* --- ÁREA DIREITA (PRINCIPAL) --- */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1, minHeight: 0, overflow: 'hidden' }}>
                
                {/* === BARRA SUPERIOR UNIFICADA === 
                    Altura fixa, flexbox limpo, botões alinhados.
                */}
                <Paper variant="outlined" sx={{ 
                    px: 2, py: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                    bgcolor: '#fff', flexShrink: 0, height: '54px', borderRadius: '8px', border: 'none',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                }}>
                    
                    {/* 1. KPIs */}
                    <Stack direction="row" spacing={3} alignItems="center">
                        <Box>
                            <Typography variant="caption" sx={{fontWeight: 700, color: '#999', fontSize: '0.65rem'}}>HOJE</Typography>
                            {loadingKpis ? <CircularProgress size={14} /> : <Typography sx={{fontWeight: 800, color: '#1C2E4A', lineHeight: 1}}>{kpis.hoje}</Typography>}
                        </Box>
                        <Box>
                            <Typography variant="caption" sx={{fontWeight: 700, color: '#999', fontSize: '0.65rem'}}>NOVOS</Typography>
                            {loadingKpis ? <CircularProgress size={14} /> : <Typography sx={{fontWeight: 800, color: 'secondary.main', lineHeight: 1}}>{kpis.novos}</Typography>}
                        </Box>
                        <Box>
                            <Typography variant="caption" sx={{fontWeight: 700, color: '#999', fontSize: '0.65rem'}}>A CONFIRM.</Typography>
                            {loadingKpis ? <CircularProgress size={14} /> : <Typography sx={{fontWeight: 800, color: 'warning.main', lineHeight: 1}}>{kpis.confirmar}</Typography>}
                        </Box>
                    </Stack>

                    <Divider orientation="vertical" flexItem sx={{ mx: 2, height: '60%' }} />

                    {/* 2. BOTÕES DE AÇÃO (Usando Stack para alinhar perfeitamente) */}
                    <Stack direction="row" spacing={1} sx={{ flexGrow: 1, justifyContent: 'center' }}>
                         {/* Passando as funções para o componente filho ou renderizando botões diretos se preferir */}
                         <ControlesAgenda 
                            onNovoPacienteClick={() => setIsPacienteModalOpen(true)}
                            onCaixaClick={() => setIsCaixaModalOpen(true)}
                            onVerificarDispoClick={() => setIsDispoOpen(true)}
                            onFiltroChange={() => {}} // Filtros foram movidos para baixo
                        />
                    </Stack>

                    <Divider orientation="vertical" flexItem sx={{ mx: 2, height: '60%' }} />

                    {/* 3. ÍCONES LATERAIS */}
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                         <BarraIconesLateral />
                    </Box>

                </Paper>

                {/* --- AGENDA (Ocupa todo o resto) --- */}
                <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'hidden', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                    <AgendaPrincipal 
                        medicoFiltro={medicoFiltro} 
                        especialidadeFiltro={especialidadeFiltro} 
                        onDateClick={handleDateClick} 
                        onEventClick={handleEventClick} 
                        salas={salas}
                        refreshTrigger={refreshTrigger}
                        onFiltroChange={handleFiltroChange} 
                    />
                </Box>
            </Box>
            
            {/* --- MODAIS --- */}
            <Drawer anchor="left" open={isDispoOpen} onClose={() => setIsDispoOpen(false)}>
                <Box sx={{ width: 350, p: 2, height: '100%', bgcolor: '#f5f5f5' }}>
                    <VerificadorDisponibilidade onSlotSelect={handleSlotSelect} />
                </Box>
            </Drawer>
            <PacienteModal open={isPacienteModalOpen} onClose={() => setIsPacienteModalOpen(false)} onSave={() => { setIsPacienteModalOpen(false); forceRefresh(); }} pacienteParaEditar={null} />
            <AgendamentoModal open={isAgendamentoModalOpen} onClose={handleCloseAgendamentoModal} onSave={handleAgendamentoSave} initialData={initialData} editingEvent={editingEvent} />
            <LancamentoCaixaModal open={isCaixaModalOpen} onClose={() => setIsCaixaModalOpen(false)} />
        </Box>
    );
}