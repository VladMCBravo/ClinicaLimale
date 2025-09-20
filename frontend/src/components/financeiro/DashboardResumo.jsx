// src/components/financeiro/DashboardResumo.jsx

import React, { useState, useEffect } from 'react';
import { Grid, Paper, Typography, Box, CircularProgress, Card, CardContent } from '@mui/material';
import { faturamentoService } from '../../services/faturamentoService'; // Precisaremos adicionar a nova função aqui
import { useSnackbar } from '../../contexts/SnackbarContext';

// Um componente simples para os cards de destaque
const StatCard = ({ title, value, color = 'text.primary' }) => (
    <Card>
        <CardContent>
            <Typography color="text.secondary" gutterBottom>{title}</Typography>
            <Typography variant="h5" component="div" color={color}>
                {typeof value === 'number' ? `R$ ${value.toFixed(2)}` : '--'}
            </Typography>
        </CardContent>
    </Card>
);

export default function DashboardResumo() {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { showSnackbar } = useSnackbar();

    useEffect(() => {
        // Precisamos adicionar a chamada ao nosso faturamentoService
        faturamentoService.getDashboardFinanceiro()
            .then(response => setData(response.data))
            .catch(() => showSnackbar('Erro ao carregar o resumo financeiro.', 'error'))
            .finally(() => setIsLoading(false));
    }, [showSnackbar]);

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    if (!data) return null;

    return (
        <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>Resumo do Dia</Typography>
            <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Saldo em Conta (Simulado)" value={parseFloat(data.saldo_em_conta)} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Faturamento do Dia" value={data.faturamento_do_dia} color="success.main" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Despesas do Dia" value={data.despesas_do_dia} color="error.main" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Lucro do Dia" value={data.lucro_do_dia} />
                </Grid>
            </Grid>
        </Box>
    );
}