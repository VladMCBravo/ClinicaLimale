// src/pages/PainelRecepcaoPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, CircularProgress, Paper, Drawer } from '@mui/material';
import apiClient from '../api/axiosConfig';

// Nossos componentes modulares
import AcoesRapidas from '../components/painel/AcoesRapidas';
import BarraStatus from '../components/painel/BarraStatus';
import FiltrosAgenda from '../components/painel/FiltrosAgenda';
import AgendaPrincipal from '../components/agenda/AgendaPrincipal'; // A agenda unificada!
import PacientesDoDiaSidebar from '../components/agenda/PacientesDoDiaSidebar';
import ListaEspera from '../components/painel/ListaEspera'; // <-- ADICIONE ESTA LINHA

export default function PainelRecepcaoPage() {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeView, setActiveView] = useState('listaEspera');
    const [refreshSidebar, setRefreshSidebar] = useState(0);

    // Estados para os filtros
    const [medicoFiltro, setMedicoFiltro] = useState('');
    const [especialidadeFiltro, setEspecialidadeFiltro] = useState('');
    // MUDANÇA 1: Novo estado para controlar o painel da lista de espera
    const [isListaEsperaOpen, setIsListaEsperaOpen] = useState(false);
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

    const handleFiltroChange = (filtros) => {
        setMedicoFiltro(filtros.medicoId);
        setEspecialidadeFiltro(filtros.especialidadeId);
    };

    const handleAgendaSave = () => {
        // Força a atualização da sidebar e dos dados do painel
        fetchData(); 
        setRefreshSidebar(prev => prev + 1);
    }

    if (isLoading || !data) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    const renderActiveView = () => {
        switch (activeView) {
            case 'listaEspera':
                return <ListaEspera />;
            case 'agenda':
                return <AgendaPrincipal medicoFiltro={medicoFiltro} especialidadeFiltro={especialidadeFiltro} onSave={handleAgendaSave} />;
            // Adicione outros casos aqui se precisar (ex: 'novoPaciente', 'verificarDisponibilidade')
            default:
                return <ListaEspera />;
        }
    };

    return (
        <Box sx={{ p: 3, backgroundColor: '#f4f6f8', height: 'calc(100vh - 64px)', display: 'flex', gap: 3, overflow: 'hidden' }}>
            {/* Coluna da Esquerda (sem alterações) */}
            <Box sx={{ width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <AcoesRapidas onViewChange={() => {}} /> {/* Por enquanto, Ações Rápidas não muda a visão principal */}
                <FiltrosAgenda onFiltroChange={handleFiltroChange} />
                <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                    <PacientesDoDiaSidebar refreshTrigger={refreshSidebar} medicoFiltro={medicoFiltro} />
                </Box>
            </Box>

            {/* Área Central: A Agenda é a visão principal e permanente */}
            <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                <AgendaPrincipal medicoFiltro={medicoFiltro} especialidadeFiltro={especialidadeFiltro} onSave={handleAgendaSave} />
            </Box>

            {/* Barra de Status da Direita */}
            <Box sx={{ flexShrink: 0 }}>
                <BarraStatus data={data} onListaEsperaClick={() => setIsListaEsperaOpen(true)} />
            </Box>

            {/* MUDANÇA 2: O Painel Deslizante (Drawer) para a Lista de Espera */}
            <Drawer
                anchor="right"
                open={isListaEsperaOpen}
                onClose={() => setIsListaEsperaOpen(false)}
            >
                <Box sx={{ width: 400, p: 2 }}>
                    <ListaEspera />
                </Box>
            </Drawer>
        </Box>
    );
}