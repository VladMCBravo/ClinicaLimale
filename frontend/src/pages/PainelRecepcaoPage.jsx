// src/pages/PainelRecepcaoPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, CircularProgress, Paper } from '@mui/material';
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
        <Box sx={{ p: 3, backgroundColor: '#f4f6f8', height: 'calc(100vh - 64px)', display: 'flex', gap: 3 }}>
            <Box sx={{ width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <AcoesRapidas onViewChange={setActiveView} />
                <FiltrosAgenda onFiltroChange={handleFiltroChange} />
                <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                    <PacientesDoDiaSidebar 
                        refreshTrigger={refreshSidebar} 
                        medicoFiltro={medicoFiltro} // Passamos o filtro de médico como prop
                    />
                </Box>
            </Box>
            <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                {renderActiveView()}
            </Box>
            <Box sx={{ flexShrink: 0 }}>
                <BarraStatus data={data} />
            </Box>
        </Box>
    );
}