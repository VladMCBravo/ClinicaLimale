// src/pages/PainelRecepcaoPage.jsx
import React, { useState, useEffect } from 'react';
import { Box, Drawer, Typography, Paper, CircularProgress } from '@mui/material';
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

    const handleFiltroChange = (filtros) => { setMedicoFiltro(filtros.medicoId); setEspecialidadeFiltro(filtros.especialidadeId); };

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
            
            {/* =======================================================
                COLUNA ESQUERDA (Lista de Espera e Hoje - Contínua)
            ======================================================= */}
            <Box sx={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1, height: '100%' }}>
                <Box sx={{ flex: 1.5, minHeight: 0, overflow: 'hidden' }}>
                    <PacientesDoDiaSidebar refreshTrigger={refreshTrigger} medicoFiltro={medicoFiltro} />
                </Box>
                <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    <ListaEspera refreshTrigger={refreshTrigger} onAgendamentoSelect={handleEventClick} />
                </Box>
            </Box>


            {/* =======================================================
                ÁREA DIREITA (Topo Fino + Agenda Gigante)
            ======================================================= */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1, minHeight: 0, overflow: 'hidden' }}>
                
                {/* --- SUPER BARRA (Fina, Delicada e Homogênea) --- */}
                <Paper variant="outlined" sx={{ 
                    px: 2, 
                    display: 'flex', 
                    alignItems: 'center', 
                    bgcolor: '#fff', 
                    flexShrink: 0,
                    height: '48px', // Altura travada bem fininha
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}>
                    
                    {/* 1. KPIs (Menores e mais delicados) */}
                    <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'center' }}>
                         <Box>
                            <Typography variant="caption" color="text.secondary" sx={{display: 'block', lineHeight: 1, fontSize: '0.6rem', fontWeight: 600}}>HOJE</Typography>
                            {loadingKpis ? <CircularProgress size={12} /> : 
                                <Typography variant="h6" sx={{ lineHeight: 1, fontSize: '1rem', fontWeight: 800, color: '#1C2E4A' }}>{kpis.hoje}</Typography>
                            }
                         </Box>
                         <Box>
                            <Typography variant="caption" color="text.secondary" sx={{display: 'block', lineHeight: 1, fontSize: '0.6rem', fontWeight: 600}}>NOVOS (MÊS)</Typography>
                             {loadingKpis ? <CircularProgress size={12} /> : 
                                <Typography variant="h6" sx={{ lineHeight: 1, color: 'secondary.main', fontSize: '1rem', fontWeight: 800 }}>{kpis.novos}</Typography>
                             }
                         </Box>
                         <Box>
                            <Typography variant="caption" color="text.secondary" sx={{display: 'block', lineHeight: 1, fontSize: '0.6rem', fontWeight: 600}}>A CONFIRM.</Typography>
                             {loadingKpis ? <CircularProgress size={12} /> : 
                                <Typography variant="h6" sx={{ lineHeight: 1, color: 'warning.main', fontSize: '1rem', fontWeight: 800 }}>{kpis.confirmar}</Typography>
                             }
                         </Box>
                    </Box>

                    {/* Divisória elegante */}
                    <Box sx={{ width: '1px', height: '24px', bgcolor: '#e0e0e0', mx: 2 }} />

                    {/* 2. CONTROLES (Camisa de força CSS para deixar tudo fino e alinhado) */}
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        flexGrow: 1,
                        // --- REMOVE AS BORDAS E CAIXAS ORIGINAIS ---
                        '& > div': {
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: '8px',
                            border: 'none !important',      
                            boxShadow: 'none !important',
                            padding: '0 !important',
                            background: 'transparent !important',
                            width: 'auto !important'
                        },
                        // --- PADRONIZA OS BOTÕES (FINOS E LADO A LADO) ---
                        '& .MuiButton-root': {
                            height: '32px',                 
                            minHeight: '32px',
                            whiteSpace: 'nowrap',           // Trava o "Novo Paciente" em 1 linha
                            minWidth: 'fit-content',        
                            padding: '0 12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'none',
                            borderRadius: '6px'
                        },
                        // --- REDUZ O DROPDOWN DE FILTRO ---
                        '& .MuiFormControl-root, & .MuiTextField-root': {
                            width: '140px !important',
                            margin: '0 !important',
                            '& .MuiInputBase-root': {
                                height: '32px',             // Mesma altura dos botões
                                fontSize: '0.75rem',
                                bgcolor: '#f8f9fa'
                            }
                        }
                    }}>
                        <ControlesAgenda 
                            onNovoPacienteClick={() => setIsPacienteModalOpen(true)}
                            onCaixaClick={() => setIsCaixaModalOpen(true)}
                            onFiltroChange={handleFiltroChange}
                            onVerificarDispoClick={() => setIsDispoOpen(true)}
                        />
                    </Box>

                    {/* Divisória elegante */}
                    <Box sx={{ width: '1px', height: '24px', bgcolor: '#e0e0e0', mx: 2 }} />

                    {/* 3. ÍCONES (Alinhados na direita) */}
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        // --- GARANTE QUE OS ÍCONES FIQUEM EM LINHA ---
                        '& > div': { 
                            display: 'flex', 
                            flexDirection: 'row', 
                            gap: '4px',
                            border: 'none !important',
                            boxShadow: 'none !important',
                            background: 'transparent !important',
                            padding: '0 !important'
                        },
                        // Deixa os botões de ícone menores
                        '& .MuiIconButton-root': {
                            padding: '6px',
                            '& svg': { fontSize: '18px', color: '#546E7A' }
                        }
                    }}>
                         <BarraIconesLateral />
                    </Box>

                </Paper>

                {/* --- AGENDA --- */}
                <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'hidden' }}>
                    <AgendaPrincipal 
                        medicoFiltro={medicoFiltro} 
                        especialidadeFiltro={especialidadeFiltro} 
                        onDateClick={handleDateClick} 
                        onEventClick={handleEventClick} 
                        salas={salas}
                        refreshTrigger={refreshTrigger} 
                    />
                </Box>
            </Box>
            
            {/* --- MODAIS INVISÍVEIS --- */}
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