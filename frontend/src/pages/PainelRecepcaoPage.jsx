// src/pages/PainelRecepcaoPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Box, CircularProgress, Drawer } from '@mui/material';
import apiClient from '../api/axiosConfig';

// --- VERIFIQUE SE TODAS ESTAS IMPORTAÇÕES ESTÃO PRESENTES ---
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
    // --- ESTADOS GERAIS ---
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeView, setActiveView] = useState('agenda');
    const [refreshSidebar, setRefreshSidebar] = useState(0);

    // --- ESTADOS DOS FILTROS ---
    const [medicoFiltro, setMedicoFiltro] = useState('');
    const [especialidadeFiltro, setEspecialidadeFiltro] = useState('');

    // --- ESTADOS DOS MODAIS E DRAWERS ---
    const [isListaEsperaOpen, setIsListaEsperaOpen] = useState(false);
    const [isPacienteModalOpen, setIsPacienteModalOpen] = useState(false);
    const [isAgendamentoModalOpen, setIsAgendamentoModalOpen] = useState(false);
    const [agendamentoInitialData, setAgendamentoInitialData] = useState(null);
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

    // --- HANDLERS (FUNÇÕES DE CONTROLE) ---
    const handleFiltroChange = (filtros) => {
        setMedicoFiltro(filtros.medicoId);
        setEspecialidadeFiltro(filtros.especialidadeId);
    };

    // FUNÇÃO QUE ESTAVA FALTANDO
    const handleModalSave = () => {
        setIsPacienteModalOpen(false);
        setIsAgendamentoModalOpen(false);
        fetchData(); 
        setRefreshSidebar(prev => prev + 1);
    };
    
    const handleSlotSelect = (data) => {
        setAgendamentoInitialData({
            start: data.data_hora_inicio.toDate(),
            extendedProps: {
                medico: data.medico?.id,
                especialidade: data.especialidade?.id,
            }
        });
        setIsAgendamentoModalOpen(true);
    };

    if (isLoading || !data) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    // --- RENDERIZAÇÃO DA VISÃO ATIVA (ÁREA CENTRAL) ---
    const renderActiveView = () => {
        switch (activeView) {
            case 'agenda':
                return <AgendaPrincipal medicoFiltro={medicoFiltro} especialidadeFiltro={especialidadeFiltro} onSave={handleModalSave} />;
            case 'novoPaciente':
                return <FormularioPaciente onClose={() => setActiveView('agenda')} />;
            case 'verificarDisponibilidade':
                return <VerificadorDisponibilidade onSlotSelect={handleSlotSelect} onClose={() => setActiveView('agenda')} />;
            default:
                return <AgendaPrincipal medicoFiltro={medicoFiltro} especialidadeFiltro={especialidadeFiltro} onSave={handleModalSave} />;
        }
    };

    return (
        <Box sx={{ p: 3, backgroundColor: '#f4f6f8', height: 'calc(100vh - 64px)', display: 'flex', gap: 3, overflow: 'hidden' }}>
            
            {/* Coluna da Esquerda */}
            <Box sx={{ width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <AcoesRapidas 
                    onNovoPacienteClick={() => setIsPacienteModalOpen(true)}
                    onVerificarClick={() => setActiveView('verificarDisponibilidade')}
                /> 
                <FiltrosAgenda onFiltroChange={handleFiltroChange} />
                <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                    <PacientesDoDiaSidebar 
                        refreshTrigger={refreshSidebar} 
                        medicoFiltro={medicoFiltro}
                    />
                </Box>
            </Box>

            {/* Coluna Central Dinâmica */}
            <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                {renderActiveView()}
            </Box>

            {/* Coluna da Direita */}
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
        </Box>
    );
}