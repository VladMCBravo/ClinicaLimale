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
import LancamentoCaixaModal from '../components/financeiro/LancamentoCaixaModal'; // <-- IMPORTE O NOVO MODAL


export default function PainelRecepcaoPage() {
    // --- ESTADOS GERAIS ---
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshSidebar, setRefreshSidebar] = useState(0);

    // --- ESTADOS DOS FILTROS ---
    const [medicoFiltro, setMedicoFiltro] = useState('');
    const [especialidadeFiltro, setEspecialidadeFiltro] = useState('');

    // --- ESTADOS DOS MODAIS E DRAWERS ---
    const [isListaEsperaOpen, setIsListaEsperaOpen] = useState(false);
    const [isPacienteModalOpen, setIsPacienteModalOpen] = useState(false);
    const [isAgendamentoModalOpen, setIsAgendamentoModalOpen] = useState(false);
    const [isCaixaModalOpen, setIsCaixaModalOpen] = useState(false);
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

    const handleModalSave = () => {
        setIsPacienteModalOpen(false);
        setIsAgendamentoModalOpen(false);
        fetchData(); 
        setRefreshSidebar(prev => prev + 1);
    };
    
    const handleSlotSelect = (data) => {
        setAgendamentoInitialData({
            start: data.data_hora_inicio.toDate(),
            medico: data.medico,
            especialidade: data.especialidade,
        });
        setIsAgendamentoModalOpen(true);
    };

    if (isLoading || !data) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ p: 3, backgroundColor: '#f4f6f8', height: 'calc(100vh - 64px)', display: 'flex', gap: 3, overflow: 'hidden' }}>
            
            {/* Coluna da Esquerda */}
            <Box sx={{ width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <AcoesRapidas 
                    onNovoPacienteClick={() => setIsPacienteModalOpen(true)}
                    onVerificarClick={() => setActiveView('verificarDisponibilidade')}
                    // Conecte o novo handler aqui
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

            {/* Coluna Central com Verificador e Agenda empilhados */}
            <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <VerificadorDisponibilidade onSlotSelect={handleSlotSelect} />
                <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                    <AgendaPrincipal medicoFiltro={medicoFiltro} especialidadeFiltro={especialidadeFiltro} onSave={handleModalSave} />
                </Box>
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
            <LancamentoCaixaModal 
                open={isCaixaModalOpen}
                onClose={() => setIsCaixaModalOpen(false)}
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