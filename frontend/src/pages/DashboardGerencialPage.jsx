// src/pages/DashboardGerencialPage.jsx
import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Grid, Typography } from '@mui/material';
import apiClient from '../api/axiosConfig';

// Importe os componentes que agora pertencem a este dashboard
import KpiCards from '../components/painel/KpiCards';
import Aniversariantes from '../components/painel/Aniversariantes';
// No futuro, você pode adicionar outros componentes, como gráficos.
// import GraficoFaturamento from '../components/dashboard/GraficoFaturamento';

export default function DashboardGerencialPage() {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Usamos o mesmo endpoint, pois ele já retorna os dados necessários
                const response = await apiClient.get('/dashboard/');
                setData(response.data);
            } catch (error) {
                console.error("Erro ao carregar dados do dashboard:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    if (isLoading || !data) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Dashboard Gerencial
            </Typography>

            {/* Seção de KPIs Principais */}
            <Box sx={{ mb: 4 }}>
                <KpiCards data={data} />
            </Box>

            {/* Seção com Informações Adicionais em Colunas */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    {/* O componente de aniversariantes se encaixa perfeitamente aqui */}
                    <Aniversariantes aniversariantes={data.aniversariantes_mes} />
                </Grid>

                <Grid item xs={12} md={6}>
                    {/* Este é um ótimo lugar para adicionar futuros componentes, como: */}
                    {/* <GraficoFaturamento /> */}
                    {/* <MetasDoMes /> */}
                </Grid>
            </Grid>
        </Box>
    );
}