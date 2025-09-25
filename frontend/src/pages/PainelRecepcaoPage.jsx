// src/pages/PainelRecepcaoPage.jsx - VERSÃO COM LAYOUT E ESTILO REFINADOS

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Grid, CircularProgress, Paper } from '@mui/material';
import apiClient from '../api/axiosConfig';

import KpiCards from '../components/painel/KpiCards'; 
import Aniversariantes from '../components/painel/Aniversariantes';
import AcoesRapidas from '../components/painel/AcoesRapidas';

export default function PainelRecepcaoPage() {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

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

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    if (!data) {
        return <Typography sx={{ p: 3 }}>Não foi possível carregar os dados do painel.</Typography>;
    }

    return (
        // MUDANÇA: Adicionamos um fundo sutil e mais padding
        <Box sx={{ p: 3, flexGrow: 1, backgroundColor: '#f4f6f8', minHeight: 'calc(100vh - 64px)' }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>Painel de Controle</Typography>
            
            <Grid container spacing={3}>
                
                {/* === COLUNA PRINCIPAL (ESQUERDA) === */}
                <Grid item xs={12} md={8}>
                    <Grid container spacing={3}>
                        
                        <Grid item xs={12}>
                            <KpiCards data={data} />
                        </Grid>
                        
                        <Grid item xs={12}>
                            {/* MUDANÇA: Aplicando o novo estilo de painel */}
                            <Paper sx={{ p: 2, height: '100%' }} variant="outlined">
                                <Typography variant="h6">Lista de Espera</Typography>
                                <Typography sx={{ mt: 1 }} color="text.secondary">
                                    (Componente a ser desenvolvido)
                                </Typography>
                            </Paper>
                        </Grid>

                         <Grid item xs={12}>
                            <Paper sx={{ p: 2, height: '100%' }} variant="outlined">
                                <Typography variant="h6">Pacientes do Dia</Typography>
                                <Typography sx={{ mt: 1 }} color="text.secondary">
                                    (Componente a ser desenvolvido)
                                </Typography>
                            </Paper>
                        </Grid>

                    </Grid>
                </Grid>

                {/* === COLUNA LATERAL (DIREITA) === */}
                <Grid item xs={12} md={4}>
                    <Grid container spacing={3} sx={{ flexDirection: 'column' }}>
                        
                        <Grid item xs={12}>
                             {/* O componente AcoesRapidas já deve usar Paper variant="outlined" */}
                             <AcoesRapidas /> 
                        </Grid>
                        
                        <Grid item xs={12}>
                           {/* O componente Aniversariantes já deve usar Paper variant="outlined" */}
                           <Aniversariantes aniversariantes={data.aniversariantes_mes} />
                        </Grid>

                    </Grid>
                </Grid>

            </Grid>
        </Box>
    );
}
