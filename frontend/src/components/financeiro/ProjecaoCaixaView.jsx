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
                            label: 'Saldo Projetado (Caixa)',
                            data: apiData.saldo_projetado,
                            borderColor: 'rgb(53, 162, 235)',
                            backgroundColor: 'rgba(53, 162, 235, 0.1)',
                            tension: 0.4,
                            fill: true,
                            yAxisID: 'y',
                            order: 1,
                            pointRadius: 0, // Remove bolinhas para limpar o gráfico
                            pointHoverRadius: 6
                        },
                        {
                            label: 'Contas a Pagar (Dia)',
                            data: apiData.despesas_previstas,
                            backgroundColor: 'rgba(255, 99, 132, 0.5)',
                            hoverBackgroundColor: 'rgba(255, 99, 132, 0.8)',
                            type: 'bar',
                            yAxisID: 'y1',
                            order: 2,
                            barThickness: 'flex',
                            maxBarThickness: 20
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
                texto: `Saldo negativo previsto (R$ ${menorSaldo.toFixed(2)}) no dia ${dataMenorSaldo}. Ação necessária.`
            });
        } else if (saldoFinal < saldoInicial) {
            status = status === 'critico' ? 'critico' : 'alerta';
            mensagens.push({
                tipo: 'aviso',
                titulo: 'Queima de Caixa',
                texto: `Projeção de terminar o período com menos dinheiro do que hoje (R$ ${(saldoInicial - saldoFinal).toFixed(2)} a menos).`
            });
        } else {
            mensagens.push({
                tipo: 'sucesso',
                titulo: 'Caixa Saudável',
                texto: `Projeção de crescimento de R$ ${(saldoFinal - saldoInicial).toFixed(2)} no período.`
            });
        }

        if (maiorDespesa > (saldoInicial * 0.25) && status !== 'critico' && maiorDespesa > 0) {
             mensagens.push({
                tipo: 'dica',
                titulo: 'Picos de Saída',
                texto: `Atenção aos dias com barras vermelhas altas. Tente negociar esses pagamentos.`
             });
        }

        return { saldoInicial, saldoFinal, menorSaldo, status, mensagens };
    }, [rawData]);

    const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { position: 'top', labels: { boxWidth: 15, padding: 15 } },
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
                ticks: { callback: (value) => formatMoney(value), maxTicksLimit: 6 }
            },
            y1: {
                type: 'linear', display: true, position: 'right',
                grid: { drawOnChartArea: false },
                min: 0,
                ticks: { maxTicksLimit: 4, color: 'rgba(255, 99, 132, 0.8)' }
            },
            x: { 
                grid: { display: false },
                ticks: { maxTicksLimit: isSmallScreen ? 5 : 10 } 
            }
        }
    };

    if (isLoading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error">Não foi possível calcular a projeção financeira.</Alert>;
    if (!chartData || !analysis) return null;

    return (
        <Box sx={{ mt: 2 }}>
            {/* 1. KPIs RÁPIDOS */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                    <Card elevation={0} sx={{ border: '1px solid #e0e0e0', bgcolor: '#fff' }}>
                        <CardContent sx={{ pb: '16px !important', display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ p: 1, borderRadius: '8px', bgcolor: '#e3f2fd', display: 'flex' }}>
                                <AccountBalanceWallet color="primary" fontSize="small" />
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight="600">SALDO ATUAL</Typography>
                                <Typography variant="h6" fontWeight="700">{formatMoney(analysis.saldoInicial)}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card elevation={0} sx={{ border: '1px solid #e0e0e0', bgcolor: '#fff' }}>
                        <CardContent sx={{ pb: '16px !important', display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ p: 1, borderRadius: '8px', bgcolor: analysis.saldoFinal >= analysis.saldoInicial ? '#e8f5e9' : '#ffebee', display: 'flex' }}>
                                {analysis.saldoFinal >= analysis.saldoInicial ? <TrendingUp color="success" fontSize="small" /> : <TrendingDown color="error" fontSize="small" />}
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight="600">SALDO FINAL (30D)</Typography>
                                <Typography variant="h6" fontWeight="700" color={analysis.saldoFinal >= analysis.saldoInicial ? 'success.main' : 'error.main'}>
                                    {formatMoney(analysis.saldoFinal)}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card elevation={0} sx={{ border: '1px solid #e0e0e0', bgcolor: '#fff' }}>
                        <CardContent sx={{ pb: '16px !important', display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ p: 1, borderRadius: '8px', bgcolor: analysis.menorSaldo < 0 ? '#ffebee' : '#fff3e0', display: 'flex' }}>
                                <Warning color={analysis.menorSaldo < 0 ? 'error' : 'warning'} fontSize="small" />
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight="600">PONTO CRÍTICO</Typography>
                                <Typography variant="h6" fontWeight="700" color={analysis.menorSaldo < 0 ? 'error.main' : 'text.primary'}>
                                    {formatMoney(analysis.menorSaldo)}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* AJUSTE DE LAYOUT: md={9} para gráfico e md={3} para sidebar */}
            <Grid container spacing={2} alignItems="stretch">
                {/* 2. GRÁFICO PRINCIPAL (Mais largo e mais alto) */}
                <Grid item xs={12} md={9}>
                    <Paper sx={{ p: 3, height: '100%' }} elevation={1}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                            <Typography variant="h6" fontWeight="bold" color="#1a233b">Fluxo de Caixa Previsto</Typography>
                            <Chip icon={<DateRange fontSize="small" />} label="30 Dias" size="small" variant="outlined" />
                        </Box>
                        {/* Altura aumentada para 500px */}
                        <Box sx={{ height: '500px' }}>
                            <Line data={chartData} options={options} />
                        </Box>
                    </Paper>
                </Grid>

                {/* 3. CONSELHEIRO FINANCEIRO (Mais estreito e compacto) */}
                <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2, height: '100%', bgcolor: '#fafafa', display: 'flex', flexDirection: 'column' }} elevation={0} variant="outlined">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Lightbulb sx={{ color: '#fbc02d' }} fontSize="small" />
                            <Typography variant="subtitle1" fontWeight="bold" color="#1a233b">
                                Análise Rápida
                            </Typography>
                        </Box>
                        <Divider sx={{ mb: 2 }} />

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flexGrow: 1 }}>
                            {analysis.mensagens.map((msg, index) => (
                                <Alert 
                                    key={index} 
                                    severity={msg.tipo === 'erro' ? 'error' : msg.tipo === 'aviso' ? 'warning' : msg.tipo === 'sucesso' ? 'success' : 'info'}
                                    variant="standard"
                                    sx={{ 
                                        bgcolor: '#fff', 
                                        border: '1px solid',
                                        borderColor: msg.tipo === 'erro' ? '#ef5350' : msg.tipo === 'aviso' ? '#ff9800' : msg.tipo === 'sucesso' ? '#4caf50' : '#03a9f4',
                                        '& .MuiAlert-icon': { fontSize: '1.2rem' },
                                        py: 0.5, px: 1.5
                                    }}
                                    icon={msg.tipo === 'sucesso' ? <CheckCircle fontSize="inherit" /> : msg.tipo === 'erro' ? <Warning fontSize="inherit" /> : msg.tipo === 'dica' ? <InfoOutlined fontSize="inherit" /> : undefined}
                                >
                                    <Typography variant="subtitle2" fontWeight="700" sx={{ fontSize: '0.85rem' }}>
                                        {msg.titulo}
                                    </Typography>
                                    <Typography variant="caption" display="block" sx={{ lineHeight: 1.2, fontSize: '0.75rem', mt: 0.5 }}>
                                        {msg.texto}
                                    </Typography>
                                </Alert>
                            ))}

                            {/* Espaço flexível para empurrar a dica final para baixo se necessário */}
                            <Box sx={{ flexGrow: 1 }} />

                            {analysis.status === 'bom' && analysis.mensagens.length < 2 && (
                                <Alert severity="info" variant="outlined" sx={{ bgcolor: '#fff', mt: 'auto' }} icon={<Lightbulb fontSize="inherit" />}>
                                    <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                                        <b>Dica:</b> Seu caixa está saudável. Tente manter uma reserva técnica para imprevistos.
                                    </Typography>
                                </Alert>
                            )}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}