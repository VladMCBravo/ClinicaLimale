import React from 'react';
import { Grid, Paper, Box, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

// Ícones
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';

const StatCard = ({ title, value, icon, color = 'primary.main', link }) => (
    <Paper component={RouterLink} to={link || '#'} sx={{ height: '100%', textDecoration: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center', p: 2, minHeight: 120 }}>
        <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ color: 'text.secondary' }}>{title}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 1 }}>
                {icon}
                <Typography variant="h3" color={color}>{value}</Typography>
            </Box>
        </Box>
    </Paper>
);

export default function KpiCards({ data }) {
    return (
        <Grid container spacing={3}>
            {data.receitas_mes != null && (
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Faturamento Mês" value={`R$ ${Number(data.receitas_mes).toFixed(2)}`} icon={<AttachMoneyIcon sx={{ fontSize: 40 }} />} color="success.main" />
                </Grid>
            )}
            {data.despesas_mes != null && (
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Despesas Mês" value={`R$ ${Number(data.despesas_mes).toFixed(2)}`} icon={<MoneyOffIcon sx={{ fontSize: 40 }} />} color="error.main" />
                </Grid>
            )}
            {data.lucro_liquido_mes != null && (
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Lucro Mês" value={`R$ ${Number(data.lucro_liquido_mes).toFixed(2)}`} icon={<AccountBalanceIcon sx={{ fontSize: 40 }} />} color="primary.main" />
                </Grid>
            )}
            {data.agendamentos_hoje_count != null && (
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Consultas Hoje" value={data.agendamentos_hoje_count} icon={<EventAvailableIcon sx={{ fontSize: 40 }} />} link="/" />
                </Grid>
            )}
            {data.pacientes_novos_mes_count != null && (
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Pacientes Novos" value={data.pacientes_novos_mes_count} icon={<PersonAddIcon sx={{ fontSize: 40 }} />} color="secondary.main" link="/pacientes" />
                </Grid>
            )}
            {data.consultas_a_confirmar_count != null && (
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="A Confirmar" value={data.consultas_a_confirmar_count} icon={<PlaylistAddCheckIcon sx={{ fontSize: 40 }} />} color="warning.main" />
                </Grid>
            )}
        </Grid>
    );
}