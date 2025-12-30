import React, { useState, useEffect, useMemo } from 'react';
import { 
    Paper, Typography, Box, CircularProgress, Alert, Grid, Card, CardContent, Divider, Chip, useTheme, useMediaQuery
} from '@mui/material';
import { 
    TrendingUp, TrendingDown, Warning, CheckCircle, 
    Lightbulb, AccountBalanceWallet, DateRange, InfoOutlined
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import { faturamentoService } from '../../services/faturamentoService';
import { 
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, BarElement 
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, BarElement);

export default function ProjecaoCaixaView() {
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
    const [chartData, setChartData] = useState(null);
    const [rawData, setRawData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        faturamentoService.getProjecaoFinanceira()
            .then(response => {
                const apiData = response.data;
                setRawData(apiData);
                
                setChartData({
                    labels: apiData.labels,
                    datasets: [
                        {
                            label: 'Saldo',
                            data: apiData.saldo_projetado,
                            borderColor: 'rgb(53, 162, 235)',
                            backgroundColor: 'rgba(53, 162, 235, 0.1)',
                            tension: 0.4,
                            fill: true,
                            yAxisID: 'y',
                            order: 1,
                            pointRadius: 0, 
                            pointHoverRadius: 6
                        },
                        {
                            label: 'Despesa (Dia)',
                            data: apiData.despesas_previstas,
                            backgroundColor: 'rgba(255, 99, 132, 0.5)',
                            hoverBackgroundColor: 'rgba(255, 99, 132, 0.8)',
                            type: 'bar',
                            yAxisID: 'y1',
                            order: 2,
                            barThickness: 'flex',
                            maxBarThickness: 15
                        }
                    ]
                });
            })
            .catch(err => {
                console.error("Erro na projeção:", err);
                setError(true);
            })
            .finally(() => setIsLoading(false));
    }, []);

    const analysis = useMemo(() => {
        if (!rawData) return null;

        const saldoInicial = rawData.saldo_projetado[0] || 0;
        const saldoFinal = rawData.saldo_projetado[rawData.saldo_projetado.length - 1] || 0;
        const menorSaldo = Math.min(...rawData.saldo_projetado);
        const maiorDespesa = Math.max(...rawData.despesas_previstas);
        const dataMenorSaldo = rawData.labels[rawData.saldo_projetado.indexOf(menorSaldo)];

        let status = 'bom';
        let mensagens = [];

        if (menorSaldo < 0) {
            status = 'critico';
            mensagens.push({
                tipo: 'erro',
                titulo: 'Risco de Quebra',
                texto: `Saldo negativo (R$ ${menorSaldo.toFixed(2)}) previsto p/ dia ${dataMenorSaldo}.`
            });
        } else if (saldoFinal < saldoInicial) {
            status = status === 'critico' ? 'critico' : 'alerta';
            mensagens.push({
                tipo: 'aviso',
                titulo: 'Queima de Caixa',
                texto: `Previsão de terminar o mês com R$ ${(saldoInicial - saldoFinal).toFixed(2)} a menos.`
            });
        } else {
            mensagens.push({
                tipo: 'sucesso',
                titulo: 'Caixa Saudável',
                texto: `Previsão de crescimento de R$ ${(saldoFinal - saldoInicial).toFixed(2)}.`
            });
        }

        if (maiorDespesa > (saldoInicial * 0.25) && status !== 'critico' && maiorDespesa > 0) {
             mensagens.push({
                tipo: 'dica',
                titulo: 'Picos de Saída',
                texto: `Atenção aos dias com barras vermelhas altas.`
             });
        }

        return { saldoInicial, saldoFinal, menorSaldo, status, mensagens };
    }, [rawData]);

    const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

    const options = {
        responsive: true,
        maintainAspectRatio: false, // CRUCIAL para não esmagar
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { position: 'top', align: 'end', labels: { boxWidth: 10, padding: 10, font: { size: 11 } } },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
                        if (context.parsed.y !== null) label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
                        return label;
                    }
                }
            }
        },
        scales: {
            y: {
                type: 'linear', display: true, position: 'left',
                grid: { color: '#f0f0f0' },
                ticks: { callback: (value) => formatMoney(value), maxTicksLimit: 5, font: { size: 10 } }
            },
            y1: {
                type: 'linear', display: true, position: 'right',
                grid: { drawOnChartArea: false },
                min: 0,
                ticks: { maxTicksLimit: 3, color: 'rgba(255, 99, 132, 0.8)', font: { size: 10 } }
            },
            x: { 
                grid: { display: false },
                ticks: { maxTicksLimit: isSmallScreen ? 4 : 8, font: { size: 10 } } 
            }
        }
    };

    if (isLoading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error">Não foi possível calcular a projeção financeira.</Alert>;
    if (!chartData || !analysis) return null;

    return (
        <Box sx={{ mt: 1 }}>
            {/* 1. KPIs RÁPIDOS (Cards menores) */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={4}>
                    <Card elevation={0} sx={{ border: '1px solid #e0e0e0', bgcolor: '#fff', height: '100%' }}>
                        <CardContent sx={{ p: '12px !important', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ p: 0.8, borderRadius: '6px', bgcolor: '#e3f2fd', display: 'flex' }}>
                                <AccountBalanceWallet color="primary" fontSize="small" />
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight="600" fontSize="0.7rem">SALDO ATUAL</Typography>
                                <Typography variant="subtitle1" fontWeight="700" lineHeight={1.1}>{formatMoney(analysis.saldoInicial)}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card elevation={0} sx={{ border: '1px solid #e0e0e0', bgcolor: '#fff', height: '100%' }}>
                        <CardContent sx={{ p: '12px !important', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ p: 0.8, borderRadius: '6px', bgcolor: analysis.saldoFinal >= analysis.saldoInicial ? '#e8f5e9' : '#ffebee', display: 'flex' }}>
                                {analysis.saldoFinal >= analysis.saldoInicial ? <TrendingUp color="success" fontSize="small" /> : <TrendingDown color="error" fontSize="small" />}
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight="600" fontSize="0.7rem">SALDO FINAL (30D)</Typography>
                                <Typography variant="subtitle1" fontWeight="700" lineHeight={1.1} color={analysis.saldoFinal >= analysis.saldoInicial ? 'success.main' : 'error.main'}>
                                    {formatMoney(analysis.saldoFinal)}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card elevation={0} sx={{ border: '1px solid #e0e0e0', bgcolor: '#fff', height: '100%' }}>
                        <CardContent sx={{ p: '12px !important', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ p: 0.8, borderRadius: '6px', bgcolor: analysis.menorSaldo < 0 ? '#ffebee' : '#fff3e0', display: 'flex' }}>
                                <Warning color={analysis.menorSaldo < 0 ? 'error' : 'warning'} fontSize="small" />
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight="600" fontSize="0.7rem">PONTO CRÍTICO</Typography>
                                <Typography variant="subtitle1" fontWeight="700" lineHeight={1.1} color={analysis.menorSaldo < 0 ? 'error.main' : 'text.primary'}>
                                    {formatMoney(analysis.menorSaldo)}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* 2. ÁREA PRINCIPAL BALANCEADA (8 vs 4) */}
            <Grid container spacing={2} sx={{ alignItems: 'stretch' }}> {/* alignItems stretch força altura igual */}
                
                {/* GRÁFICO (66% da tela) */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }} elevation={1}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                            <Typography variant="subtitle1" fontWeight="bold" color="#1a233b">Fluxo Previsto</Typography>
                            <Chip icon={<DateRange fontSize="small" />} label="30 Dias" size="small" variant="outlined" sx={{height: '24px', fontSize: '0.7rem'}} />
                        </Box>
                        
                        {/* ALTURA FIXA CONTROLADA: 350px é suficiente para laptops */}
                        <Box sx={{ flexGrow: 1, minHeight: '350px', maxHeight: '350px', width: '100%' }}>
                            <Line data={chartData} options={options} />
                        </Box>
                    </Paper>
                </Grid>

                {/* SIDEBAR (33% da tela) */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, height: '100%', bgcolor: '#fafafa', display: 'flex', flexDirection: 'column' }} elevation={0} variant="outlined">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Lightbulb sx={{ color: '#fbc02d' }} fontSize="small" />
                            <Typography variant="subtitle1" fontWeight="bold" color="#1a233b">
                                Análise
                            </Typography>
                        </Box>
                        <Divider sx={{ mb: 2 }} />

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {analysis.mensagens.map((msg, index) => (
                                <Alert 
                                    key={index} 
                                    severity={msg.tipo === 'erro' ? 'error' : msg.tipo === 'aviso' ? 'warning' : msg.tipo === 'sucesso' ? 'success' : 'info'}
                                    variant="outlined"
                                    sx={{ 
                                        bgcolor: '#fff', 
                                        py: 0, px: 1.5,
                                        '& .MuiAlert-message': { py: 1 },
                                        '& .MuiAlert-icon': { py: 1 }
                                    }}
                                >
                                    <Typography variant="subtitle2" fontWeight="700" sx={{ fontSize: '0.8rem' }}>
                                        {msg.titulo}
                                    </Typography>
                                    <Typography variant="caption" display="block" sx={{ lineHeight: 1.2, fontSize: '0.75rem', mt: 0.2 }}>
                                        {msg.texto}
                                    </Typography>
                                </Alert>
                            ))}

                            {/* Dica de preenchimento caso tenha pouca msg */}
                            {analysis.mensagens.length === 0 && (
                                <Typography variant="body2" color="text.secondary" align="center" sx={{mt: 4}}>
                                    Nenhuma inconsistência encontrada no fluxo.
                                </Typography>
                            )}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}