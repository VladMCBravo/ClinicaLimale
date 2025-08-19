// src/pages/DashboardPage.jsx

import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper, CircularProgress } from '@mui/material';
import PageLayout from '../components/PageLayout';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';


function StatCard({ title, value, icon, color }) {
  return (
    <Paper sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
      <Box sx={{
        backgroundColor: color,
        borderRadius: '50%',
        width: 56,
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mr: 2,
        color: '#fff'
      }}>
        {icon}
      </Box>
      <Box>
        <Typography color="textSecondary">{title}</Typography>
        <Typography variant="h4" component="p"><b>{value}</b></Typography>
      </Box>
    </Paper>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      const token = sessionStorage.getItem('authToken');
      try {
        const response = await fetch('http://127.0.0.1:8000/api/dashboard-stats/', {
          headers: { 'Authorization': `Token ${token}` },
        });
        if (!response.ok) throw new Error('Falha ao buscar estatísticas.');
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Typography color="error">Erro: {error}</Typography>;
  }

  return (
    <PageLayout title="Dashboard">
      {stats && (
        <Grid container spacing={3}>
          <Grid xs={12} sm={6} md={3}>
            <StatCard
              title="Agendados (Hoje)"
              value={stats.total_agendados_dia}
              icon={<EventAvailableIcon />}
              color="#1976d2"
            />
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <StatCard
              title="Confirmados"
              value={stats.confirmados_dia}
              icon={<CheckCircleOutlineIcon />}
              color="#388e3c"
            />
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <StatCard
              title="Realizados"
              value={stats.realizados_dia}
              icon={<TaskAltIcon />}
              color="#f57c00"
            />
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <StatCard
              title="Cancelados"
              value={stats.cancelados_dia}
              icon={<CancelOutlinedIcon />}
              color="#d32f2f"
            />
          </Grid>
        </Grid>
      )}
    </PageLayout>
  );
}