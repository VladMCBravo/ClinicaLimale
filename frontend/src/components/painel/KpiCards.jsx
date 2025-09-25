// src/components/painel/KpiCards.jsx - VERSÃO OPERACIONAL (SEM FINANCEIRO)

import React from 'react';
import { Grid, Paper, Box, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

// Ícones
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';

// O StatCard continua o mesmo, mas vamos usá-lo de forma mais sutil
const StatCard = ({ title, value, icon, color = 'primary.main', link }) => (
    // MUDANÇA: Usamos variant="outlined" para um visual mais limpo e removemos a altura mínima
    <Paper component={RouterLink} to={link || '#'} sx={{ textDecoration: 'none', p: 2 }} variant="outlined">
        <Box sx={{ textAlign: 'center' }}>
            {/* MUDANÇA: Trocamos h6 por subtitle1 para um título menos pesado */}
            <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>{title}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 1 }}>
                {icon}
                {/* MUDANÇA: Trocamos h3 por h4 para um número menor */}
                <Typography variant="h4" color={color}>{value}</Typography>
            </Box>
        </Box>
    </Paper>
);

export default function KpiCards({ data }) {
    return (
        // Usamos um Grid aninhado para garantir o espaçamento correto
        <Grid container spacing={2}> 
            {/* --- REMOVEMOS OS CARDS DE FATURAMENTO, DESPESAS E LUCRO --- */}

            {data.agendamentos_hoje_count != null && (
                <Grid item xs={12} sm={4}>
                    <StatCard title="Consultas Hoje" value={data.agendamentos_hoje_count} icon={<EventAvailableIcon />} link="/" />
                </Grid>
            )}
            {data.pacientes_novos_mes_count != null && (
                <Grid item xs={12} sm={4}>
                    <StatCard title="Pacientes Novos" value={data.pacientes_novos_mes_count} icon={<PersonAddIcon />} color="secondary.main" link="/pacientes" />
                </Grid>
            )}
            {data.consultas_a_confirmar_count != null && (
                <Grid item xs={12} sm={4}>
                    <StatCard title="A Confirmar" value={data.consultas_a_confirmar_count} icon={<PlaylistAddCheckIcon />} color="warning.main" />
                </Grid>
            )}
        </Grid>
    );
}