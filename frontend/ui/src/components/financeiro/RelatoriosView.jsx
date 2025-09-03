// src/components/financeiro/RelatoriosView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Box, CircularProgress, Typography, Paper, Grid } from '@mui/material';

import { faturamentoService } from '../../services/faturamentoService'; // <-- ADICIONADO
// Importando os componentes de gráficos e o core do Chart.js
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Registro dos componentes necessários do Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function RelatoriosView() {
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchReports = useCallback(async () => {
        setIsLoading(true);
        try {
            // AQUI ESTÁ A MUDANÇA: Usando o serviço
            const response = await faturamentoService.getRelatorioFinanceiro();
            setReportData(response.data);
        } catch (error) {
            console.error("Erro ao buscar relatórios:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);


    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    if (!reportData) {
        return <Typography>Não foi possível carregar os dados do relatório.</Typography>;
    }

    // --- Preparando os dados para os gráficos ---
    const faturamentoPorFormaData = {
        labels: reportData.faturamento_por_forma.map(item => item.forma_pagamento),
        datasets: [{
            data: reportData.faturamento_por_forma.map(item => item.total),
            backgroundColor: ['#4CAF50', '#2196F3', '#FFC107', '#FF5722', '#9C27B0'],
        }],
    };

    const despesasPorCategoriaData = {
        labels: reportData.despesas_por_categoria.map(item => item.categoria__nome),
        datasets: [{
            data: reportData.despesas_por_categoria.map(item => item.total),
            backgroundColor: ['#F44336', '#E91E63', '#3F51B5', '#009688', '#FF9800'],
        }],
    };
    
    const fluxoCaixaData = {
        labels: reportData.fluxo_caixa_mensal.map(item => new Date(item.mes).toLocaleString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })),
        datasets: [
            {
                label: 'Receitas',
                data: reportData.fluxo_caixa_mensal.map(item => item.receitas),
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
            },
            {
                label: 'Despesas',
                data: reportData.fluxo_caixa_mensal.map(item => item.despesas),
                backgroundColor: 'rgba(255, 99, 132, 0.6)',
            }
        ]
    };

    return (
        <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" align="center">Faturamento por Forma de Pagamento</Typography>
                    <Pie data={faturamentoPorFormaData} />
                </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" align="center">Despesas por Categoria</Typography>
                    <Pie data={despesasPorCategoriaData} />
                </Paper>
            </Grid>
            <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" align="center">Fluxo de Caixa Mensal</Typography>
                    <Bar data={fluxoCaixaData} options={{ responsive: true, plugins: { title: { display: true, text: 'Receitas vs. Despesas' } } }}/>
                </Paper>
            </Grid>
        </Grid>
    );
}