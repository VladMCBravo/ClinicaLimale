// src/pages/DashboardPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Paper, Grid, CircularProgress, List, ListItem, ListItemText, Divider, Avatar } from '@mui/material';
import apiClient from '../api/axiosConfig';
import { Link as RouterLink } from 'react-router-dom';
import CakeIcon from '@mui/icons-material/Cake'; // Ícone de aniversário

// Card de estatísticas (continua o mesmo)
const StatCard = ({ title, value, color = 'primary.main' }) => (
    <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
        <Typography variant="h6">{title}</Typography>
        <Typography variant="h3" color={color}>{value}</Typography>
    </Paper>
);

export default function DashboardPage() {
    const [data, setData] = useState(null);
    const [aniversariantes, setAniversariantes] = useState([]); // <-- NOVO ESTADO
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fazemos as duas chamadas de API em paralelo
            const [statsRes, aniversariantesRes] = await Promise.all([
                apiClient.get('/dashboard/dashboard-stats/'),
                apiClient.get('/dashboard/aniversariantes/') // <-- NOVA CHAMADA
            ]);
            setData(statsRes.data);
            setAniversariantes(aniversariantesRes.data);
        } catch (error) {
            console.error("Erro ao carregar dados do dashboard:", error);
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
        return <Typography>Não foi possível carregar os dados do dashboard.</Typography>;
    }

    return (
        <Box>
            <Typography variant="h4" gutterBottom>Dashboard do Dia</Typography>
            <Grid container spacing={3}>
                {/* Cards de estatísticas (continuam os mesmos) */}
                <Grid item xs={12} sm={6} md={3}><StatCard title="Total Agendado" value={data.total_agendados_dia} /></Grid>
                <Grid item xs={12} sm={6} md={3}><StatCard title="Confirmados" value={data.confirmados_dia} color="success.main" /></Grid>
                <Grid item xs={12} sm={6} md={3}><StatCard title="Realizados" value={data.realizados_dia} color="info.main" /></Grid>
                <Grid item xs={12} sm={6} md={3}><StatCard title="Cancelados" value={data.cancelados_dia} color="error.main" /></Grid>

                {/* --- NOVO CARD DE ANIVERSARIANTES --- */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6">Aniversariantes da Semana</Typography>
                        <List>
                            {aniversariantes.length > 0 ? aniversariantes.map((p, index) => (
                                <React.Fragment key={p.id}>
                                    <ListItem>
                                        <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                                            <CakeIcon />
                                        </Avatar>
                                        <ListItemText 
                                            primary={p.nome_completo}
                                            secondary={`Aniversário em ${new Date(p.data_nascimento).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', timeZone: 'UTC' })}`}
                                        />
                                    </ListItem>
                                    {index < aniversariantes.length - 1 && <Divider />}
                                </React.Fragment>
                            )) : (
                                <ListItem><ListItemText primary="Nenhum aniversariante na próxima semana." /></ListItem>
                            )}
                        </List>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}