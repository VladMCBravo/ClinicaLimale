// src/pages/DashboardPage.jsx - VERSÃO CORRIGIDA
import React, { useState, useEffect, useCallback } from 'react';
import { 
    Box, Typography, Paper, Grid, CircularProgress, List, ListItem, 
    ListItemIcon, ListItemText, Divider, Avatar 
} from '@mui/material';
import apiClient from '../api/axiosConfig';
import { Link as RouterLink } from 'react-router-dom';
import CakeIcon from '@mui/icons-material/Cake';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import BusinessIcon from '@mui/icons-material/Business';

const StatCard = ({ title, value, color = 'primary.main', link }) => (
    // Adicionamos padding ao Box para garantir espaçamento interno
    <Paper component={RouterLink} to={link || '#'} sx={{ height: '100%', textDecoration: 'none' }}>
        <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">{title}</Typography>
            <Typography variant="h3" color={color}>{value}</Typography>
        </Box>
    </Paper>
);

export default function DashboardPage() {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const response = await apiClient.get('/dashboard/');
            setData(response.data);
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

    // Adicionamos o padding aqui para ter um espaçamento consistente
    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h4" gutterBottom>Dashboard</Typography>
            <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard title="Consultas de Hoje" value={data.agendamentos_hoje_count} link="/" />
                </Grid>

                {data.dados_financeiros && (
                    <>
                        <Grid item xs={12} sm={6} md={4}>
                            <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <Typography variant="h6" align="center">Balanço do Mês</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 1}}>
                                    <AttachMoneyIcon color="success" />
                                    <Typography variant="h5" color="green">
                                        R$ {Number(data.dados_financeiros.receitas_mes).toFixed(2)}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1}}>
                                    <MoneyOffIcon color="error" />
                                    <Typography variant="h5" color="red">
                                        R$ {Number(data.dados_financeiros.despesas_mes).toFixed(2)}
                                    </Typography>
                                </Box>
                            </Paper>
                        </Grid>
                         <Grid item xs={12} sm={6} md={4}>
                            <Paper sx={{p:2, height: '100%'}}>
                                <Typography variant="h6">Convênios Mais Usados</Typography>
                                <List dense>
                                    {/* --- A CORREÇÃO ESTÁ AQUI --- */}
                                    {/* A chave correta enviada pela nossa API agora é 'plano_utilizado__convenio__nome' */}
                                    {data.dados_financeiros.convenios_mais_usados.map((c, i) => (
                                        <ListItem key={i} disableGutters>
                                            <ListItemIcon sx={{minWidth: '32px'}}><BusinessIcon fontSize="small" /></ListItemIcon>
                                            <ListItemText primary={c['plano_utilizado__convenio__nome']} secondary={`${c.total} consulta(s)`} />
                                        </ListItem>
                                    ))}
                                </List>
                            </Paper>
                        </Grid>
                    </>
                )}

                {/* Card de Aniversariantes */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6">Aniversariantes da Semana</Typography>
                        <List>
                            {data.aniversariantes_semana.length > 0 ? data.aniversariantes_semana.map((p, index) => (
                                <React.Fragment key={p.id}>
                                    <ListItem>
                                        <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}><CakeIcon /></Avatar>
                                        <ListItemText 
                                            primary={p.nome_completo}
                                            secondary={`Aniversário em ${new Date(p.data_nascimento).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', timeZone: 'UTC' })}`}
                                        />
                                    </ListItem>
                                    {index < data.aniversariantes_semana.length - 1 && <Divider />}
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