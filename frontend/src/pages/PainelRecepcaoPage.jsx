// src/pages/PainelRecepcaoPage.jsx - VERSÃO COM LAYOUT GOOGLE CALENDAR

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, CircularProgress, Paper } from '@mui/material';
import apiClient from '../api/axiosConfig';

// Importe os componentes da nova estrutura
import AcoesRapidas from '../components/painel/AcoesRapidas';
import BarraStatus from '../components/painel/BarraStatus';

// (Vamos precisar criar esses componentes de "visão" depois)
// import FormularioNovoPaciente from '../components/pacientes/FormularioNovoPaciente'; 
// import VerificadorDisponibilidade from '../components/agenda/VerificadorDisponibilidade';
// import PacientesDoDia from '../components/painel/PacientesDoDia';

export default function PainelRecepcaoPage() {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    // ESTADO para controlar a área de trabalho dinâmica
    const [activeView, setActiveView] = useState('pacientesDoDia'); 

    const fetchData = useCallback(async () => {
        // ... sua função fetchData continua a mesma ...
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

    // Função para renderizar a visão correta na área de trabalho
    const renderActiveView = () => {
        switch (activeView) {
            case 'pacientesDoDia':
                return (
                    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                         <Typography variant="h6">Pacientes do Dia</Typography>
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
                return <Typography>Selecione uma ação</Typography>;
        }
    };

    return (
        <Box sx={{ p: 3, backgroundColor: '#f4f6f8', height: 'calc(100vh - 64px)', display: 'flex', gap: 3 }}>
            
            {/* Coluna 1: Ações (Esquerda) */}
            <Box sx={{ width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <AcoesRapidas onViewChange={setActiveView} />
                {/* O componente "Pacientes do Dia" pode vir aqui embaixo, se desejar */}
                 <Box sx={{ flexGrow: 1 }}>
                     {/* Este é um bom lugar para a lista de pacientes do dia, já que é uma referência constante */}
                 </Box>
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