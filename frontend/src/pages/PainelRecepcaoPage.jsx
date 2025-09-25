// src/pages/PainelRecepcaoPage.jsx - VERSÃO CORRIGIDA E ESTRUTURADA

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Grid, CircularProgress, Paper, Button } from '@mui/material';
import apiClient from '../api/axiosConfig';

// --- NOVOS COMPONENTES QUE VAMOS CRIAR E IMPORTAR ---
// (Por enquanto, podemos criá-los no mesmo arquivo para simplificar, e depois separar)

// Componente para os Cards de KPI
import KpiCards from '../components/painel/KpiCards'; 
// Componente para a lista de Aniversariantes
import Aniversariantes from '../components/painel/Aniversariantes';
// Componente para os botões de Ações Rápidas
import AcoesRapidas from '../components/painel/AcoesRapidas';


export default function PainelRecepcaoPage() {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Sua lógica de busca de dados, que vamos reaproveitar
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Vamos assumir que o endpoint /dashboard/ continua funcionando por enquanto
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
        return <Typography sx={{ p: 2 }}>Não foi possível carregar os dados do painel.</Typography>;
    }

    return (
        <Box sx={{ p: 2, flexGrow: 1 }}>
            <Typography variant="h4" gutterBottom>Painel de Controle</Typography>
            
            <Grid container spacing={3}>
                
                {/* === COLUNA PRINCIPAL (ESQUERDA) === */}
                <Grid item xs={12} lg={8}>
                    <Grid container spacing={3}>
                        
                        <Grid item xs={12}>
                            {/* Usamos o componente KpiCards, passando os dados */}
                            <KpiCards data={data} />
                        </Grid>
                        
                        <Grid item xs={12}>
                            <Paper sx={{ p: 2, height: '100%' }}>
                                <Typography variant="h6">Lista de Espera</Typography>
                                <Typography sx={{ mt: 1 }} color="text.secondary">
                                    (Componente a ser desenvolvido)
                                </Typography>
                            </Paper>
                        </Grid>
                    </Grid>
                </Grid>

                {/* === COLUNA LATERAL (DIREITA) === */}
                <Grid item xs={12} lg={4}>
                    <Grid container spacing={3}>
                        
                        <Grid item xs={12}>
                             <AcoesRapidas />
                        </Grid>
                        
                        <Grid item xs={12}>
                           <Paper sx={{ p: 2, height: '100%' }}>
                                <Typography variant="h6">Pacientes do Dia</Typography>
                                <Typography sx={{ mt: 1 }} color="text.secondary">
                                    (Componente a ser desenvolvido)
                                </Typography>
                            </Paper>
                        </Grid>

                        <Grid item xs={12}>
                           {/* Usamos o componente Aniversariantes, passando apenas a lista que ele precisa */}
                           <Aniversariantes aniversariantes={data.aniversariantes_mes} />
                        </Grid>
                    </Grid>
                </Grid>

            </Grid>
        </Box>
    );
}