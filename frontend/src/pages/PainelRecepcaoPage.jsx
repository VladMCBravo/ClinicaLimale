// src/pages/PainelRecepcaoPage.jsx - VERSÃO COM LAYOUT CORRIGIDO

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, CircularProgress, Paper } from '@mui/material';
import apiClient from '../api/axiosConfig';

import AcoesRapidas from '../components/painel/AcoesRapidas';
import BarraStatus from '../components/painel/BarraStatus';

// (Componentes de "visão" a serem desenvolvidos)

export default function PainelRecepcaoPage() {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    // MUDANÇA: A visão padrão agora será a 'listaEspera'
    const [activeView, setActiveView] = useState('listaEspera'); 

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get('/dashboard/');
            setData(response.data);
        } catch (error) { console.error("Erro ao carregar dados do painel:", error); } 
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (isLoading || !data) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    const renderActiveView = () => {
        switch (activeView) {
            // ADICIONADO: A Lista de Espera como uma visão principal
            case 'listaEspera':
                return (
                    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                         <Typography variant="h6">Lista de Espera</Typography>
                         <Typography sx={{ mt: 1 }} color="text.secondary">(Componente a ser desenvolvido)</Typography>
                    </Paper>
                );
            case 'novoPaciente':
                 return (
                    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                         <Typography variant="h6">Formulário de Novo Paciente</Typography>
                         <Typography sx={{ mt: 1 }} color="text.secondary">(Componente a ser desenvolvido)</Typography>
                    </Paper>
                );
            case 'verificarDisponibilidade':
                 return (
                    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                         <Typography variant="h6">Verificador de Disponibilidade</Typography>
                         <Typography sx={{ mt: 1 }} color="text.secondary">(Componente a ser desenvolvido)</Typography>
                    </Paper>
                );
            default:
                // Por padrão, mostramos a lista de espera
                return (
                    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                         <Typography variant="h6">Lista de Espera</Typography>
                         <Typography sx={{ mt: 1 }} color="text.secondary">(Componente a ser desenvolvido)</Typography>
                    </Paper>
                );
        }
    };

    return (
        <Box sx={{ p: 3, backgroundColor: '#f4f6f8', height: 'calc(100vh - 64px)', display: 'flex', gap: 3 }}>
            
            {/* Coluna 1: Ações e Pacientes do Dia (Esquerda) */}
            <Box sx={{ width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <AcoesRapidas onViewChange={setActiveView} />
                
                {/* MUDANÇA: Pacientes do Dia agora está na coluna da esquerda, abaixo das ações */}
                <Paper variant="outlined" sx={{ p: 2, flexGrow: 1 }}>
                    <Typography variant="h6">Pacientes do Dia</Typography>
                    <Typography sx={{ mt: 1 }} color="text.secondary">(Componente a ser desenvolvido)</Typography>
                </Paper>
            </Box>

            {/* Coluna 2: Área de Trabalho Dinâmica (Centro) */}
            <Box sx={{ flexGrow: 1 }}>
                {renderActiveView()}
            </Box>

            {/* Coluna 3: Barra de Status (Direita) */}
            <Box sx={{ flexShrink: 0 }}>
                <BarraStatus data={data} />
            </Box>
        </Box>
    );
}