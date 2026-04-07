import React, { useState, useEffect, useCallback } from 'react';
import { Box, Drawer, Typography, Paper, CircularProgress, Stack, Divider, Button, IconButton, Tooltip } from '@mui/material';
import { agendamentoService } from '../services/agendamentoService';

// --- ÍCONES (Trazidos dos seus arquivos originais) ---
import PersonAddIcon from '@mui/icons-material/PersonAdd';       // Novo Paciente
import AddCardIcon from '@mui/icons-material/AddCard';           // Caixa
import EventAvailableIcon from '@mui/icons-material/EventAvailable'; // Buscar Horário
import CakeIcon from '@mui/icons-material/Cake';                 // Aniversariantes
import TodayIcon from '@mui/icons-material/Today';               // Agendas do dia
import SmartToyIcon from '@mui/icons-material/SmartToy';         // Chatbot

// --- COMPONENTES ---
import AgendaPrincipal from '../components/agenda/AgendaPrincipal';
import PacientesDoDiaSidebar from '../components/agenda/PacientesDoDiaSidebar';
import ListaEspera from '../components/painel/ListaEspera';
import VerificadorDisponibilidade from '../components/painel/VerificadorDisponibilidade';

// --- MODAIS ---
import PacienteModal from '../components/PacienteModal';
import AgendamentoModal from '../components/AgendamentoModal';

export default function PainelRecepcaoPage() {
    // --- ESTADOS ---
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [salas, setSalas] = useState([]);

    // <--- ADICIONADO AQUI: Estado para guardar o dia clicado
    const [dataSidebar, setDataSidebar] = useState(new Date());

    // Filtros que a página segura para passar para a Agenda
    const [medicoFiltro, setMedicoFiltro] = useState('');
    const [especialidadeFiltro, setEspecialidadeFiltro] = useState('');

    const [kpis, setKpis] = useState({ hoje: 0, novos: 0, confirmar: 0 });
    const [loadingKpis, setLoadingKpis] = useState(true);

    // Modais
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

    // Carrega KPIs (Números do Topo) - CORREÇÃO AQUI
    useEffect(() => {
        setLoadingKpis(true);
        agendamentoService.getDashboardKPIs()
            .then(res => {
                // Mapeia os nomes que vêm do backend para os nomes usados no layout
                setKpis({
                    hoje: res.data.agendamentos_hoje_count || res.data.hoje || 0,
                    novos: res.data.pacientes_novos_mes_count || res.data.novos || 0,
                    confirmar: res.data.consultas_a_confirmar_count || res.data.confirmar || 0
                });
            })
            .catch(err => console.error("Erro ao carregar KPIs:", err))
            .finally(() => setLoadingKpis(false));
    }, [refreshTrigger]);

    const forceRefresh = () => setRefreshTrigger(prev => prev + 1);

    // Handlers
    const handleCloseAgendamentoModal = () => { setIsAgendamentoModalOpen(false); setEditingEvent(null); setInitialData(null); };
    const handleAgendamentoSave = () => { handleCloseAgendamentoModal(); forceRefresh(); };
    
    const handleDateClick = (arg) => { 
        setDataSidebar(arg.date); // <--- ADICIONADO AQUI
        setEditingEvent(null); 
        setInitialData({ start: arg.date, resource: arg.resource }); 
        setIsAgendamentoModalOpen(true); 
    };
    
    // Este handler é chamado quando clicamos em "Editar" no menu do card
    const handleEventClick = (clickInfo) => { 
    // Trocamos o nome da variável de "event" para "eventoSelecionado"
    const eventoSelecionado = clickInfo.event || clickInfo;
    
    // Fallback: Se não achar o start, tenta usar a string que vem da API, ou a data atual
    const dataParaSidebar = eventoSelecionado.start || new Date(eventoSelecionado.data_hora_inicio || Date.now());
    
    setDataSidebar(dataParaSidebar);
    setInitialData(null); 
    setEditingEvent(eventoSelecionado); 
    setIsAgendamentoModalOpen(true); 
};

// NOVO HANDLER BLINDADO CONTRA LOOP INFINITO
    const handleDatesSet = useCallback((dateInfo) => {
        const novaData = dateInfo.view.currentStart;
        
        setDataSidebar((dataAntiga) => {
        // --- NOVA BLINDAGEM: Se dataAntiga for null/undefined, apenas assume a nova data ---
        if (!dataAntiga) return novaData;

        // O Freio: Se o dia for exatamente o mesmo, aborta a atualização!
        if (dataAntiga.toDateString() === novaData.toDateString()) {
            return dataAntiga; // Mantém o estado intacto, evitando re-render
        }
        return novaData; // Se mudou o dia, aí sim ele atualiza
    });
}, []);

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
            
            {/* --- LATERAL ESQUERDA (Listas) --- */}
            <Box sx={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1, height: '100%' }}>
                <Box sx={{ flex: 1.5, minHeight: 0, overflow: 'hidden' }}>
                    {/* <--- ADICIONADO AQUI: Passando a dataSidebar como prop */}
                    <PacientesDoDiaSidebar refreshTrigger={refreshTrigger} medicoFiltro={medicoFiltro} dataSelecionada={dataSidebar} />
                </Box>
                <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    <ListaEspera refreshTrigger={refreshTrigger} onAgendamentoSelect={handleEventClick} />
                </Box>
            </Box>

            {/* --- ÁREA PRINCIPAL --- */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1, minHeight: 0, overflow: 'hidden' }}>
                
                {/* ================================================================================
                    BARRA SUPERIOR UNIFICADA (KPIs + BOTÕES + ÍCONES)
                    ================================================================================
                */}
                <Paper variant="outlined" sx={{ 
                    px: 2, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    bgcolor: '#fff', 
                    flexShrink: 0,
                    height: '50px', // Altura fina fixa
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                    
                    {/* KPIs */}
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

                    <Divider orientation="vertical" flexItem sx={{ mx: 2, height: '60%', alignSelf:'center' }} />

                    {/* 2. BOTÕES DE AÇÃO (Extraídos do seu ControlesAgenda.jsx mas em linha) */}
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexGrow: 1, justifyContent: 'center' }}>
                        
                        <Button 
                            variant="contained" 
                            startIcon={<PersonAddIcon fontSize="small" />}
                            onClick={() => setIsPacienteModalOpen(true)}
                            sx={{ bgcolor: '#1C2E4A', height: '32px', fontSize: '0.75rem', textTransform: 'none', fontWeight: 600 }}
                        >
                            Novo Paciente
                        </Button>

                        <Button 
                            variant="outlined" color="info"
                            startIcon={<EventAvailableIcon fontSize="small" />}
                            onClick={() => setIsDispoOpen(true)}
                            sx={{ height: '32px', fontSize: '0.75rem', textTransform: 'none', fontWeight: 600 }}
                        >
                            Buscar Horário
                        </Button>

                    </Stack>

                    <Divider orientation="vertical" flexItem sx={{ mx: 2, height: '60%', alignSelf:'center' }} />

                    {/* 3. ÍCONES (Extraídos do seu BarraIconesLateral.jsx mas em linha) */}
                    <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Aniversariantes do Mês">
                            <IconButton size="small" sx={{color: '#546E7A'}}> <CakeIcon fontSize="small"/> </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Agendas do Dia">
                            <IconButton size="small" sx={{color: '#546E7A'}}> <TodayIcon fontSize="small"/> </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Chatbot">
                            <IconButton size="small" sx={{color: '#546E7A'}}> <SmartToyIcon fontSize="small"/> </IconButton>
                        </Tooltip>
                    </Stack>

                </Paper>

                {/* ================================================================================
                    AGENDA (Com filtro interno)
                    ================================================================================
                */}
                <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'hidden', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', bgcolor: '#fff' }}>
                    <AgendaPrincipal 
                        medicoFiltro={medicoFiltro} 
                        especialidadeFiltro={especialidadeFiltro} 
                        onDateClick={handleDateClick} 
                        onEventClick={handleEventClick}
                        onDatesSet={handleDatesSet}  // <--- ADICIONE ESTA LINHA AQUI 
                        salas={salas}
                        refreshTrigger={refreshTrigger}
                        onFiltroChange={handleFiltroChange} 
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
        </Box>
    );
}