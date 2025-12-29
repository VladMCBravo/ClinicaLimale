import React, { useState, useEffect } from 'react';
import { Grid, Paper, Typography, Box, CircularProgress, Card, CardContent, Alert, LinearProgress, Chip } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';

// Subcomponente para Cards de KPI
const KPICard = ({ title, value, subtext, trend, color = 'text.primary' }) => (
    <Card elevation={2}>
        <CardContent>
            <Typography color="text.secondary" variant="subtitle2" gutterBottom>{title}</Typography>
            <Typography variant="h4" component="div" color={color} sx={{ fontWeight: 'bold' }}>
                {typeof value === 'number' ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : value}
            </Typography>
            {subtext && (
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    {trend === 'up' && <TrendingUpIcon color="success" fontSize="small" />}
                    {trend === 'down' && <TrendingDownIcon color="error" fontSize="small" />}
                    <Typography variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>
                        {subtext}
                    </Typography>
                </Box>
            )}
        </CardContent>
    </Card>
);

// Subcomponente para o Score de Saúde
const HealthScore = ({ score }) => {
    let color = 'error';
    let label = 'Crítico';
    if (score >= 50) { color = 'warning'; label = 'Atenção'; }
    if (score >= 80) { color = 'success'; label = 'Saudável'; }

    return (
        <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'center' }} elevation={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <HealthAndSafetyIcon color={color} sx={{ fontSize: 40, mr: 1 }} />
                <Typography variant="h6">Saúde Financeira</Typography>
            </Box>
            <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
                <CircularProgress variant="determinate" value={score} color={color} size={80} thickness={4} />
                <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="h5" component="div" color="text.secondary">{Math.round(score)}</Typography>
                </Box>
            </Box>
            <Chip label={label} color={color} />
        </Paper>
    );
};

export default function DashboardInteligente() {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { showSnackbar } = useSnackbar();

    useEffect(() => {
        faturamentoService.getDashboardFinanceiro()
            .then(response => {
                // LÓGICA DE INTELIGÊNCIA (FRONTEND POR ENQUANTO)
                // Calculamos indicadores que o backend ainda não manda
                const faturamento = parseFloat(response.data.faturamento_do_dia || 0);
                const despesas = parseFloat(response.data.despesas_do_dia || 0);
                const lucro = response.data.lucro_do_dia || 0;
                
                // Cálculo simples de Score (Exemplo: Lucro positivo + Saldo > 0)
                let scoreCalculado = 50; 
                if (lucro > 0) scoreCalculado += 20;
                if (response.data.saldo_em_conta > 0) scoreCalculado += 30;
                if (despesas > faturamento) scoreCalculado -= 20;

                const dadosEnriquecidos = {
                    ...response.data,
                    score_saude: Math.min(100, Math.max(0, scoreCalculado)),
                    insights: []
                };

                // Gerador de Insights
                if (despesas > faturamento) {
                    dadosEnriquecidos.insights.push({ type: 'warning', text: 'Atenção: As despesas de hoje superaram o faturamento.' });
                }
                if (response.data.saldo_em_conta < 0) {
                    dadosEnriquecidos.insights.push({ type: 'error', text: 'Crítico: Sua conta bancária está no negativo.' });
                } else if (response.data.saldo_em_conta > despesas * 3) {
                    dadosEnriquecidos.insights.push({ type: 'success', text: 'Boa liquidez: Você tem caixa para cobrir as despesas atuais.' });
                }

                setData(dadosEnriquecidos);
            })
            .catch((err) => {
                console.error(err);
                showSnackbar('Erro ao carregar inteligência financeira.', 'error');
            })
            .finally(() => setIsLoading(false));
    }, [showSnackbar]);

    if (isLoading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
    if (!data) return null;

    return (
        <Box sx={{ mb: 4 }}>
            {/* Insights no topo */}
            <Box sx={{ mb: 3 }}>
                {data.insights.map((insight, index) => (
                    <Alert severity={insight.type} key={index} sx={{ mb: 1 }} variant="filled">
                        {insight.text}
                    </Alert>
                ))}
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                    <HealthScore score={data.score_saude} />
                </Grid>

                <Grid item xs={12} md={9}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={4}>
                            <KPICard 
                                title="Faturamento Hoje" 
                                value={data.faturamento_do_dia}
                                trend="up"
                                color="primary.main"
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <KPICard 
                                title="Lucro Hoje" 
                                value={data.lucro_do_dia}
                                subtext={data.lucro_do_dia > 0 ? "Operação rentável" : "Prejuízo no dia"}
                                trend={data.lucro_do_dia > 0 ? 'up' : 'down'}
                                color={data.lucro_do_dia >= 0 ? "success.main" : "error.main"}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <KPICard 
                                title="Saldo Bancário" 
                                value={parseFloat(data.saldo_em_conta)}
                                subtext="Sincronizado via Inter"
                                color="text.secondary"
                            />
                        </Grid>
                        
                        <Grid item xs={12}>
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="caption" color="text.secondary">Meta de Faturamento Mensal (Ex: R$ 100k)</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                    <Box sx={{ width: '100%', mr: 1 }}>
                                        {/* Simulação de 45% da meta */}
                                        <LinearProgress variant="determinate" value={45} sx={{ height: 10, borderRadius: 5 }} />
                                    </Box>
                                    <Box sx={{ minWidth: 35 }}>
                                        <Typography variant="body2" color="text.secondary">45%</Typography>
                                    </Box>
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </Box>
    );
}