// src/pages/PainelRecepcaoPage.jsx
import React, { useState, useEffect } from 'react';
import { Box, Drawer, Typography, Paper, CircularProgress, Stack, Divider } from '@mui/material';
import { agendamentoService } from '../services/agendamentoService';

// Componentes
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
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [salas, setSalas] = useState([]);
    
    // Estados de Filtro (Passados para a Agenda)
    const [medicoFiltro, setMedicoFiltro] = useState('');
    const [especialidadeFiltro, setEspecialidadeFiltro] = useState('');

    const [kpis, setKpis] = useState({ hoje: 0, novos: 0, confirmar: 0 });
    const [loadingKpis, setLoadingKpis] = useState(true);

    const [isPacienteModalOpen, setIsPacienteModalOpen] = useState(false);
    const [isAgendamentoModalOpen, setIsAgendamentoModalOpen] = useState(false);
    const [isCaixaModalOpen, setIsCaixaModalOpen] = useState(false);
    const [isDispoOpen, setIsDispoOpen] = useState(false);

    const [editingEvent, setEditingEvent] = useState(null);
    const [initialData, setInitialData] = useState(null);

    useEffect(() => {
        agendamentoService.getSalas().then(res => setSalas(res.data));
    }, []);

    useEffect(() => {
        setLoadingKpis(true);
        agendamentoService.getDashboardKPIs()
            .then(res => setKpis(res.data))
            .finally(() => setLoadingKpis(false));
    }, [refreshTrigger]);

    const forceRefresh = () => setRefreshTrigger(prev => prev + 1);

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
            
            {/* ESQUERDA */}
            <Box sx={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1, height: '100%' }}>
                <Box sx={{ flex: 1.5, minHeight: 0, overflow: 'hidden' }}>
                    <PacientesDoDiaSidebar refreshTrigger={refreshTrigger} medicoFiltro={medicoFiltro} />
                </Box>
                <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    <ListaEspera refreshTrigger={refreshTrigger} onAgendamentoSelect={handleEventClick} />
                </Box>
            </Box>

            {/* DIREITA (PRINCIPAL) */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1, minHeight: 0, overflow: 'hidden' }}>
                
                {/* === BARRA SUPERIOR (Horizontal, Fina e Unificada) === */}
                <Paper variant="outlined" sx={{ 
                    px: 2, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    bgcolor: '#fff', 
                    flexShrink: 0,
                    height: '48px', // Altura fixa fina
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                    
                    {/* 1. KPIs */}
                    <Stack direction="row" spacing={3} alignItems="center" sx={{ minWidth: 'fit-content' }}>
                         <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" sx={{fontWeight: 700, color: '#999', fontSize: '0.6rem', display:'block'}}>HOJE</Typography>
                            {loadingKpis ? <CircularProgress size={12} /> : <Typography sx={{fontWeight: 800, color: '#1C2E4A', fontSize: '0.9rem', lineHeight: 1}}>{kpis.hoje}</Typography>}
                         </Box>
                         <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" sx={{fontWeight: 700, color: '#999', fontSize: '0.6rem', display:'block'}}>NOVOS</Typography>
                             {loadingKpis ? <CircularProgress size={12} /> : <Typography sx={{fontWeight: 800, color: 'secondary.main', fontSize: '0.9rem', lineHeight: 1}}>{kpis.novos}</Typography>}
                         </Box>
                         <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" sx={{fontWeight: 700, color: '#999', fontSize: '0.6rem', display:'block'}}>CONFIRM.</Typography>
                             {loadingKpis ? <CircularProgress size={12} /> : <Typography sx={{fontWeight: 800, color: 'warning.main', fontSize: '0.9rem', lineHeight: 1}}>{kpis.confirmar}</Typography>}
                         </Box>
                    </Stack>

                    <Divider orientation="vertical" flexItem sx={{ mx: 2, height: '60%', alignSelf:'center' }} />

                    {/* 2. BOTÕES (Forçando Horizontalidade e Tamanho) */}
                    <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'row', // GARANTE HORIZONTAL
                        alignItems: 'center', 
                        gap: 1,
                        flexGrow: 1,
                        justifyContent: 'center',
                        
                        // ESTILO FORÇADO PARA OS BOTÕES DO CONTROLES AGENDA
                        '& button': { 
                            height: '32px !important', // Altura fina fixa
                            minHeight: '32px !important',
                            fontSize: '0.8rem !important',
                            padding: '0 16px !important',
                            whiteSpace: 'nowrap'
                        },
                        // Oculta qualquer input de filtro que exista dentro do componente antigo
                        '& .MuiTextField-root, & .MuiFormControl-root': {
                            display: 'none !important'
                        }
                    }}>
                        <ControlesAgenda 
                            onNovoPacienteClick={() => setIsPacienteModalOpen(true)}
                            onCaixaClick={() => setIsCaixaModalOpen(true)}
                            onVerificarDispoClick={() => setIsDispoOpen(true)}
                            // Não passamos onFiltroChange aqui para evitar renderizar filtros duplicados se o componente tiver lógica interna
                        />
                    </Box>

                    <Divider orientation="vertical" flexItem sx={{ mx: 2, height: '60%', alignSelf:'center' }} />

                    {/* 3. ÍCONES */}
                    <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 'fit-content' }}>
                         <BarraIconesLateral />
                    </Box>

                </Paper>

                {/* === AGENDA COM FILTRO INTEGRADO === */}
                <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'hidden', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', bgcolor: '#fff' }}>
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
            
            {/* Modais */}
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