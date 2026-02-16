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
                ÁREA DIREITA (Topo Fino + Filtros + Agenda Gigante)
            ======================================================= */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1, minHeight: 0, overflow: 'hidden' }}>
                
                {/* --- SUPER BARRA (Fina, Delicada e Centralizada) --- */}
                <Paper variant="outlined" sx={{ 
                    px: 2, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', /* Distribui as 3 caixas principais */
                    bgcolor: '#fff', 
                    flexShrink: 0,
                    height: '45px', // Ainda mais fina!
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}>
                    
                    {/* CAIXA 1: KPIs (Largura travada para garantir a centralização) */}
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', width: '220px' }}>
                         <Box>
                            <Typography variant="caption" color="text.secondary" sx={{display: 'block', lineHeight: 1, fontSize: '0.55rem', fontWeight: 600}}>HOJE</Typography>
                            {loadingKpis ? <CircularProgress size={12} /> : <Typography variant="h6" sx={{ lineHeight: 1, fontSize: '0.9rem', fontWeight: 800, color: '#1C2E4A' }}>{kpis.hoje}</Typography>}
                         </Box>
                         <Box>
                            <Typography variant="caption" color="text.secondary" sx={{display: 'block', lineHeight: 1, fontSize: '0.55rem', fontWeight: 600}}>NOVOS</Typography>
                             {loadingKpis ? <CircularProgress size={12} /> : <Typography variant="h6" sx={{ lineHeight: 1, color: 'secondary.main', fontSize: '0.9rem', fontWeight: 800 }}>{kpis.novos}</Typography>}
                         </Box>
                         <Box>
                            <Typography variant="caption" color="text.secondary" sx={{display: 'block', lineHeight: 1, fontSize: '0.55rem', fontWeight: 600}}>A CONFIRM.</Typography>
                             {loadingKpis ? <CircularProgress size={12} /> : <Typography variant="h6" sx={{ lineHeight: 1, color: 'warning.main', fontSize: '0.9rem', fontWeight: 800 }}>{kpis.confirmar}</Typography>}
                         </Box>
                    </Box>

                    {/* CAIXA 2: CONTROLES (Exatamente no meio da tela) */}
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        flexGrow: 1,
                        // Camisa de força CSS para os botões do componente
                        '& > div': { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', border: 'none !important', boxShadow: 'none !important', background: 'transparent !important' },
                        '& .MuiButton-root': { height: '30px', minHeight: '30px', whiteSpace: 'nowrap', padding: '0 16px', fontSize: '0.75rem', fontWeight: 600, borderRadius: '6px' },
                        // HACK: Esconde o dropdown de Filtro antigo que estava aqui
                        '& .MuiFormControl-root, & .MuiTextField-root': { display: 'none !important' } 
                    }}>
                        <ControlesAgenda 
                            onNovoPacienteClick={() => setIsPacienteModalOpen(true)}
                            onCaixaClick={() => setIsCaixaModalOpen(true)}
                            onVerificarDispoClick={() => setIsDispoOpen(true)}
                            onFiltroChange={() => {}} // Desativado aqui, pois vamos para a barra de baixo
                        />
                    </Box>

                    {/* CAIXA 3: ÍCONES (Alinhados na direita, mesma largura da Caixa 1) */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '220px', '& > div': { display: 'flex', gap: '4px', border: 'none !important', boxShadow: 'none !important', background: 'transparent !important' }, '& .MuiIconButton-root': { padding: '4px', '& svg': { fontSize: '16px', color: '#546E7A' } } }}>
                         <BarraIconesLateral />
                    </Box>

                </Paper>

                {/* --- NOVA BARRA DE FILTROS (Horizontal, embaixo do topo e acima da agenda) --- */}
                <Paper variant="outlined" sx={{ 
                    p: '6px 16px', display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#fff', borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)', flexShrink: 0
                }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1C2E4A', fontSize: '0.75rem' }}>
                        Filtrar Agenda:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexGrow: 1 }}>
                        {/* ⚠️ AVISO PARA VOCÊ: Substitua este texto abaixo pelos seus Selects de Médico/Especialidade que você tirou do ControlesAgenda */}
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', alignSelf: 'center' }}>
                            [ Cole aqui os campos de Médico e Especialidade. Eles vão ficar perfeitamente alinhados na horizontal! ]
                        </Typography>
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
                        onFiltroChange={handleFiltroChange}  // <---- É só adicionar esta linha!
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