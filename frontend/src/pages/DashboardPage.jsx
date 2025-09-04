// src/pages/DashboardPage.jsx - VERSÃO FINAL COM CARDS DINÂMICOS POR PERFIL

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Box, Typography, Paper, Grid, CircularProgress, List, ListItem, 
    ListItemIcon, ListItemText, Divider, Avatar 
} from '@mui/material';
import apiClient from '../api/axiosConfig';
import { Link as RouterLink } from 'react-router-dom';
import CakeIcon from '@mui/icons-material/Cake';

// NOVO: Adicionamos mais ícones para os novos cards
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';


// Componente de Card de Estatística (pequeno ajuste para o ícone)
const StatCard = ({ title, value, icon, color = 'primary.main', link }) => (
    <Paper component={RouterLink} to={link || '#'} sx={{ height: '100%', textDecoration: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center', p: 2 }}>
        <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ color: 'text.secondary' }}>{title}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 1 }}>
                {icon}
                <Typography variant="h3" color={color}>{value}</Typography>
            </Box>
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

    // A mágica acontece aqui: renderizamos os cards condicionalmente.
    return (
        <Box sx={{ p: 2, flexGrow: 1 }}>
            <Typography variant="h4" gutterBottom>Dashboard</Typography>
            <Grid container spacing={3}>
                
                {/* --- CARDS RENDERIZADOS CONDICIONALMENTE --- */}

                {/* KPI: Faturamento Bruto (Apenas Admin) */}
                {data.receitas_mes != null && (
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard title="Faturamento do Mês" value={`R$ ${Number(data.receitas_mes).toFixed(2)}`} icon={<AttachMoneyIcon sx={{ fontSize: 40 }} color="success" />} color="success.main" />
                    </Grid>
                )}

                {/* KPI: Despesas (Apenas Admin) */}
                {data.despesas_mes != null && (
                     <Grid item xs={12} sm={6} md={3}>
                        <StatCard title="Despesas do Mês" value={`R$ ${Number(data.despesas_mes).toFixed(2)}`} icon={<MoneyOffIcon sx={{ fontSize: 40 }} color="error" />} color="error.main" />
                    </Grid>
                )}
                
                {/* KPI: Lucro Líquido (Apenas Admin) */}
                {data.lucro_liquido_mes != null && (
                     <Grid item xs={12} sm={6} md={3}>
                        <StatCard title="Lucro do Mês" value={`R$ ${Number(data.lucro_liquido_mes).toFixed(2)}`} icon={<AccountBalanceIcon sx={{ fontSize: 40 }} color="primary" />} />
                    </Grid>
                )}

                {/* KPI: Consultas de Hoje (Admin e Recepção) */}
                {data.agendamentos_hoje_count != null && (
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard title="Consultas de Hoje" value={data.agendamentos_hoje_count} icon={<EventAvailableIcon sx={{ fontSize: 40 }} color="primary" />} link="/" />
                    </Grid>
                )}
                
                {/* KPI: Pacientes Novos (Admin e Recepção) */}
                {data.pacientes_novos_mes_count != null && (
                     <Grid item xs={12} sm={6} md={3}>
                        <StatCard title="Pacientes Novos (Mês)" value={data.pacientes_novos_mes_count} icon={<PersonAddIcon sx={{ fontSize: 40 }} color="secondary" />} link="/pacientes" />
                    </Grid>
                )}

                {/* KPI: Consultas a Confirmar (Apenas Recepção) */}
                {data.consultas_a_confirmar_count != null && (
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard title="Consultas a Confirmar" value={data.consultas_a_confirmar_count} icon={<PlaylistAddCheckIcon sx={{ fontSize: 40 }} color="warning" />} />
                    </Grid>
                )}

                {/* --- LISTAS DE INFORMAÇÕES --- */}

                {/* Lista de Aniversariantes (Admin e Recepção) */}
                {data.aniversariantes_mes && (
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2, height: '100%' }}>
                            <Typography variant="h6">Aniversariantes do Mês</Typography>
                            <List>
                                {data.aniversariantes_mes.length > 0 ? data.aniversariantes_mes.map((p, index) => (
                                    <React.Fragment key={p.id}>
                                        <ListItem>
                                            <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}><CakeIcon /></Avatar>
                                            <ListItemText 
                                                primary={p.nome_completo}
                                                secondary={`Aniversário em ${new Date(p.data_nascimento).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', timeZone: 'UTC' })}`}
                                            />
                                        </ListItem>
                                        {index < data.aniversariantes_mes.length - 1 && <Divider />}
                                    </React.Fragment>
                                )) : (
                                    <ListItem><ListItemText primary="Nenhum aniversariante no próximo mês." /></ListItem>
                                )}
                            </List>
                        </Paper>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
}