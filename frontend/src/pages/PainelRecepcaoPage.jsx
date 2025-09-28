// src/pages/PainelRecepcaoPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Box, CircularProgress, Drawer } from '@mui/material';
import apiClient from '../api/axiosConfig';

// Importações
import AcoesRapidas from '../components/painel/AcoesRapidas';
import BarraStatus from '../components/painel/BarraStatus';
import FiltrosAgenda from '../components/painel/FiltrosAgenda';
import AgendaPrincipal from '../components/agenda/AgendaPrincipal';
import PacientesDoDiaSidebar from '../components/agenda/PacientesDoDiaSidebar';
import ListaEspera from '../components/painel/ListaEspera';
import PacienteModal from '../components/PacienteModal';
import AgendamentoModal from '../components/AgendamentoModal';
import VerificadorDisponibilidade from '../components/painel/VerificadorDisponibilidade';
import FormularioPaciente from '../components/pacientes/FormularioPaciente';

export default function PainelRecepcaoPage() {
    // ESTADO 'activeView' E FUNÇÃO 'renderActiveView' REMOVIDOS
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshSidebar, setRefreshSidebar] = useState(0);
    const [medicoFiltro, setMedicoFiltro] = useState('');
    const [especialidadeFiltro, setEspecialidadeFiltro] = useState('');
    const [isListaEsperaOpen, setIsListaEsperaOpen] = useState(false);
    const [isPacienteModalOpen, setIsPacienteModalOpen] = useState(false);
    const [isAgendamentoModalOpen, setIsAgendamentoModalOpen] = useState(false);
    const [agendamentoInitialData, setAgendamentoInitialData] = useState(null);
    const [isCaixaModalOpen, setIsCaixaModalOpen] = useState(false); // Adicionado para o modal de caixa
;

    // --- BUSCA DE DADOS ---
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get('/dashboard/');
            setData(response.data);
        } catch (error) {
            console.error("Erro ao carregar dados do painel:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);
    const handleFiltroChange = (filtros) => { setMedicoFiltro(filtros.medicoId); setEspecialidadeFiltro(filtros.especialidadeId); };
    const handleModalSave = () => { setIsPacienteModalOpen(false); setIsAgendamentoModalOpen(false); fetchData(); setRefreshSidebar(prev => prev + 1); };
    const handleSlotSelect = (data) => { setAgendamentoInitialData({ start: data.data_hora_inicio.toDate(), medico: data.medico, especialidade: data.especialidade }); setIsAgendamentoModalOpen(true); };

    if (isLoading || !data) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ p: 3, backgroundColor: '#f4f6f8', height: 'calc(100vh - 64px)', display: 'flex', gap: 3, overflow: 'hidden' }}>
            <Box sx={{ width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <AcoesRapidas 
                    onNovoPacienteClick={() => setIsPacienteModalOpen(true)}
                    // A função 'Verificar Disponibilidade' não faz mais nada, pois o componente já está na tela
                    onVerificarClick={() => {}} 
                    onCaixaClick={() => setIsCaixaModalOpen(true)}
                /> 
                <FiltrosAgenda onFiltroChange={handleFiltroChange} />
                <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                    <PacientesDoDiaSidebar 
                        refreshTrigger={refreshSidebar} 
                        medicoFiltro={medicoFiltro}
                    />
                </Box>
            </Box>

            <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <VerificadorDisponibilidade onSlotSelect={handleSlotSelect} />
                <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                    <AgendaPrincipal medicoFiltro={medicoFiltro} especialidadeFiltro={especialidadeFiltro} onSave={handleModalSave} />
                </Box>
            </Box>

            <Box sx={{ flexShrink: 0 }}>
                <BarraStatus data={data} onListaEsperaClick={() => setIsListaEsperaOpen(true)} />
            </Box>
            
            {/* Elementos Flutuantes (Modais e Drawers) */}
            <Drawer anchor="right" open={isListaEsperaOpen} onClose={() => setIsListaEsperaOpen(false)}>
                <Box sx={{ width: 400, p: 2 }}><ListaEspera /></Box>
            </Drawer>

            <PacienteModal
                open={isPacienteModalOpen}
                onClose={() => setIsPacienteModalOpen(false)}
                onSave={handleModalSave}
                pacienteParaEditar={null}
            />

            <AgendamentoModal
                open={isAgendamentoModalOpen}
                onClose={() => setIsAgendamentoModalOpen(false)}
                onSave={handleModalSave}
                initialData={agendamentoInitialData}
            />
            
            {/* MUDANÇA AQUI: A linha abaixo foi descomentada */}
            <LancamentoCaixaModal 
                open={isCaixaModalOpen} 
                onClose={() => setIsCaixaModalOpen(false)} 
            />
        </Box>
    );
}