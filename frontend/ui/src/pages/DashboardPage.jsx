// src/pages/DashboardPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Paper, Grid, CircularProgress } from '@mui/material';
import apiClient from '../api/axiosConfig';

// Componente reutilizável para os cards
const StatCard = ({ title, value, color = 'primary.main' }) => (
    <Paper sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6">{title}</Typography>
        <Typography variant="h3" color={color}>{value}</Typography>
    </Paper>
);

export default function DashboardPage() {
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        try {
            // A URL corresponde ao seu dashboard/urls.py
            const response = await apiClient.get('/dashboard/dashboard-stats/');
            setStats(response.data);
        } catch (error) {
            console.error("Erro ao carregar estatísticas do dashboard:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    if (!stats) {
        return <Typography>Não foi possível carregar as estatísticas.</Typography>;
    }

    return (
        <Box>
            <Typography variant="h4" gutterBottom>Dashboard do Dia</Typography>
            <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Total Agendado" value={stats.total_agendados_dia} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Confirmados" value={stats.confirmados_dia} color="success.main" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Realizados" value={stats.realizados_dia} color="info.main" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Cancelados" value={stats.cancelados_dia} color="error.main" />
                </Grid>
            </Grid>
        </Box>
    );
}