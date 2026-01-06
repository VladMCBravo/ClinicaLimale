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
        <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', p: 1, gap: 1, backgroundColor: '#f4f6f8' }}>
            
            {/* COLUNA LATERAL ESQUERDA */}
            <Box sx={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <ControlesAgenda 
                    onNovoPacienteClick={() => setIsPacienteModalOpen(true)}
                    onCaixaClick={() => setIsCaixaModalOpen(true)}
                    onFiltroChange={handleFiltroChange}
                    onVerificarDispoClick={() => setIsDispoOpen(true)}
                />
                <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
                
                {/* BARRA DE STATUS RÁPIDA (Com dados reais) */}
                <Paper variant="outlined" sx={{ p: 1, display: 'flex', gap: 3, alignItems: 'center', bgcolor: '#fff', height: 50 }}>
                     <Box>
                        <Typography variant="caption" color="text.secondary" sx={{display: 'block', lineHeight: 1}}>HOJE</Typography>
                        {loadingKpis ? <CircularProgress size={14} /> : 
                            <Typography variant="h6" sx={{ lineHeight: 1, fontSize: '1.1rem' }}>{kpis.hoje}</Typography>
                        }
                     </Box>
                     <Box>
                        <Typography variant="caption" color="text.secondary" sx={{display: 'block', lineHeight: 1}}>NOVOS (MÊS)</Typography>
                         {loadingKpis ? <CircularProgress size={14} /> : 
                            <Typography variant="h6" sx={{ lineHeight: 1, color: 'secondary.main', fontSize: '1.1rem' }}>{kpis.novos}</Typography>
                         }
                     </Box>
                     <Box>
                        <Typography variant="caption" color="text.secondary" sx={{display: 'block', lineHeight: 1}}>A CONFIRM.</Typography>
                         {loadingKpis ? <CircularProgress size={14} /> : 
                            <Typography variant="h6" sx={{ lineHeight: 1, color: 'warning.main', fontSize: '1.1rem' }}>{kpis.confirmar}</Typography>
                         }
                     </Box>
                </Paper>

                {/* AGENDA */}
                <Box sx={{ flexGrow: 1 }}>
                    <AgendaPrincipal 
                        medicoFiltro={medicoFiltro} 
                        especialidadeFiltro={especialidadeFiltro} 
                        onDateClick={handleDateClick} 
                        onEventClick={handleEventClick} 
                        salas={salas}
                        refreshTrigger={refreshTrigger} // <--- ADICIONE ESTA LINHA AQUI
                    />
                </Box>
            </Box>
            
            <BarraIconesLateral />
            
            <Drawer
                anchor="left"
                open={isDispoOpen}
                onClose={() => setIsDispoOpen(false)}
            >
                <Box sx={{ width: 350, p: 2, height: '100%', bgcolor: '#f5f5f5' }}>
                    <VerificadorDisponibilidade onSlotSelect={handleSlotSelect} />
                </Box>
            </Drawer>
            
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