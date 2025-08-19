import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper, CircularProgress } from '@mui/material';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';

// Registra os componentes necessários do Chart.js para que a biblioteca funcione
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function RelatoriosView() {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReportData = async () => {
      const token = sessionStorage.getItem('authToken');
      try {
        const response = await fetch('http://127.0.0.1:8000/api/relatorios/financeiro/', {
          headers: { 'Authorization': `Token ${token}` }
        });
        if (!response.ok) throw new Error('Falha ao buscar dados do relatório.');
        const data = await response.json();
        setReportData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReportData();
  }, []);

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Typography color="error">Erro: {error}</Typography>;
  }

  if (!reportData) {
    return <Typography>Nenhum dado para exibir.</Typography>;
  }

  // --- PREPARAÇÃO DOS DADOS E OPÇÕES PARA OS GRÁFICOS ---

  const faturamentoPorFormaData = {
    labels: reportData.faturamento_por_forma.map(item => item.forma_pagamento),
    datasets: [{
      label: 'Faturamento',
      data: reportData.faturamento_por_forma.map(item => item.total),
      backgroundColor: ['#005A8D', '#BFA15C', '#546E7A', '#78909C', '#90A4AE'],
    }],
  };

  const fluxoDeCaixaData = {
    labels: reportData.fluxo_caixa_mensal.map(item => new Date(item.mes + '-02').toLocaleDateString('pt-BR', {month: 'long', year: '2-digit'})), // Formata a data
    datasets: [
      {
        label: 'Receitas (R$)',
        data: reportData.fluxo_caixa_mensal.map(item => item.receitas),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
      {
        label: 'Despesas (R$)',
        data: reportData.fluxo_caixa_mensal.map(item => item.despesas),
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || context.label || '';
            let value = context.parsed.y || context.parsed || 0;
            return `${label}: R$ ${value.toFixed(2).replace('.', ',')}`;
          }
        }
      }
    },
  };

  // --- CÁLCULO DOS TOTAIS PARA OS CARDS ---
  const totalReceitas = reportData.faturamento_por_forma.reduce((acc, item) => acc + parseFloat(item.total), 0);
  const totalDespesas = reportData.despesas_por_categoria.reduce((acc, item) => acc + parseFloat(item.total), 0);
  const saldo = totalReceitas - totalDespesas;


  return (
    <Box>
      <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
        Visão Geral Financeira
      </Typography>

      {/* CARDS COM OS TOTAIS */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'success.light', color: 'white' }}>
            <Typography>Total de Receitas</Typography>
            <Typography variant="h5">R$ {totalReceitas.toFixed(2).replace('.', ',')}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'error.light', color: 'white' }}>
            <Typography>Total de Despesas</Typography>
            <Typography variant="h5">R$ {totalDespesas.toFixed(2).replace('.', ',')}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography>Saldo</Typography>
            <Typography variant="h5" sx={{ color: saldo >= 0 ? 'success.main' : 'error.main' }}>
              R$ {saldo.toFixed(2).replace('.', ',')}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
      
      {/* GRÁFICOS */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={5}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" align="center" gutterBottom>Faturamento por Forma de Pagamento</Typography>
            <Doughnut data={faturamentoPorFormaData} options={chartOptions} />
          </Paper>
        </Grid>
        <Grid item xs={12} lg={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" align="center" gutterBottom>Fluxo de Caixa Mensal</Typography>
            <Bar data={fluxoDeCaixaData} options={chartOptions} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}