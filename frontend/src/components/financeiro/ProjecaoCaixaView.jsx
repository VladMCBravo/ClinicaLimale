import React, { useState, useEffect, useMemo } from 'react';
import { 
    Paper, Typography, Box, CircularProgress, Alert, Grid, Card, CardContent, Divider, Chip 
} from '@mui/material';
import { 
    TrendingUp, TrendingDown, Warning, CheckCircle, 
    Lightbulb, AccountBalanceWallet, DateRange 
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import { faturamentoService } from '../../services/faturamentoService';
import { 
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, BarElement 
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, BarElement);

export default function ProjecaoCaixaView() {
    const [chartData, setChartData] = useState(null);
    const [rawData, setRawData] = useState(null); // Guardamos os dados brutos para análise
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        faturamentoService.getProjecaoFinanceira()
            .then(response => {
                const apiData = response.data;
                setRawData(apiData); // Salva para uso nos KPIs e Conselheiro
                
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
                            order: 1
                        },
                        {
                            label: 'Contas a Pagar (Dia)',
                            data: apiData.despesas_previstas,
                            backgroundColor: 'rgba(255, 99, 132, 0.6)',
                            type: 'bar',
                            yAxisID: 'y1',
                            order: 2,
                            barThickness: 8
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

    // --- LÓGICA DO CONSELHEIRO FINANCEIRO (Frontend) ---
    const analysis = useMemo(() => {
        if (!rawData) return null;

        const saldoInicial = rawData.saldo_projetado[0] || 0;
        const saldoFinal = rawData.saldo_projetado[rawData.saldo_projetado.length - 1] || 0;
        const menorSaldo = Math.min(...rawData.saldo_projetado);
        const maiorDespesa = Math.max(...rawData.despesas_previstas);
        
        // Encontra o dia do menor saldo
        const indiceMenorSaldo = rawData.saldo_projetado.indexOf(menorSaldo);
        const dataMenorSaldo = rawData.labels[indiceMenorSaldo];

        // Lógica de Saúde
        let status = 'bom'; // bom, alerta, critico
        let mensagens = [];

        // 1. Verificação de Quebra de Caixa (Saldo Negativo)
        if (menorSaldo < 0) {
            status = 'critico';
            mensagens.push({
                tipo: 'erro',
                titulo: 'Risco de Quebra de Caixa',
                texto: `Atenção Crítica: Sua projeção indica saldo negativo (R$ ${menorSaldo.toFixed(2)}) no dia ${dataMenorSaldo}. Priorize receber pagamentos pendentes antes dessa data.`
            });
        } 
        // 2. Verificação de Tendência de Queima (Terminar com menos do que começou)
        else if (saldoFinal < saldoInicial) {
            status = status === 'critico' ? 'critico' : 'alerta';
            const perda = saldoInicial - saldoFinal;
            mensagens.push({
                tipo: 'aviso',
                titulo: 'Consumo de Caixa',
                texto: `Você está projetado para terminar o período com R$ ${perda.toFixed(2)} a menos do que hoje. Revise despesas não essenciais.`
            });
        }
        // 3. Cenário Positivo
        else {
            const lucro = saldoFinal - saldoInicial;
            mensagens.push({
                tipo: 'sucesso',
                titulo: 'Acúmulo de Capital',
                texto: `Parabéns! A projeção indica um crescimento de caixa de R$ ${lucro.toFixed(2)} nos próximos 30 dias. Ótimo momento para planejar investimentos.`
            });
        }

        // 4. Alerta de Picos de Despesa
        if (maiorDespesa > (saldoInicial * 0.2) && status !== 'critico') {
             // Se houver um dia pagando mais que 20% do saldo atual
             mensagens.push({
                tipo: 'dica',
                titulo: 'Concentração de Pagamentos',
                texto: `Há picos altos de despesa no gráfico. Tente negociar parcelamentos para suavizar o fluxo de saída.`
             });
        }

        return { saldoInicial, saldoFinal, menorSaldo, status, mensagens };
    }, [rawData]);

    const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { position: 'top' },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
                        if (context.parsed.y !== null) label += formatMoney(context.parsed.y);
                        return label;
                    }
                }
            }
        },
        scales: {
            y: {
                type: 'linear', display: true, position: 'left',
                grid: { color: '#f0f0f0' },
                ticks: { callback: (value) => formatMoney(value) } // Formata eixo Y
            },
            y1: {
                type: 'linear', display: true, position: 'right',
                grid: { drawOnChartArea: false },
                min: 0
            },
            x: { grid: { display: false } }
        }
    };

    if (isLoading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error">Não foi possível calcular a projeção financeira.</Alert>;
    if (!chartData || !analysis) return null;

    return (
        <Box sx={{ mt: 2 }}>
            {/* 1. CABEÇALHO COM KPIS RÁPIDOS */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                    <Card elevation={0} sx={{ border: '1px solid #e0e0e0', bgcolor: '#fff' }}>
                        <CardContent sx={{ pb: '16px !important', display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: '#e3f2fd' }}>
                                <AccountBalanceWallet color="primary" />
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold">SALDO HOJE</Typography>
                                <Typography variant="h6" fontWeight="bold">{formatMoney(analysis.saldoInicial)}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card elevation={0} sx={{ border: '1px solid #e0e0e0', bgcolor: '#fff' }}>
                        <CardContent sx={{ pb: '16px !important', display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: analysis.saldoFinal >= analysis.saldoInicial ? '#e8f5e9' : '#ffebee' }}>
                                {analysis.saldoFinal >= analysis.saldoInicial ? <TrendingUp color="success" /> : <TrendingDown color="error" />}
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold">PROJEÇÃO (30 DIAS)</Typography>
                                <Typography variant="h6" fontWeight="bold" color={analysis.saldoFinal >= analysis.saldoInicial ? 'success.main' : 'error.main'}>
                                    {formatMoney(analysis.saldoFinal)}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card elevation={0} sx={{ border: '1px solid #e0e0e0', bgcolor: '#fff' }}>
                        <CardContent sx={{ pb: '16px !important', display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: '#fff3e0' }}>
                                <DateRange color="warning" />
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold">MENOR SALDO PREVISTO</Typography>
                                <Typography variant="h6" fontWeight="bold" color={analysis.menorSaldo < 0 ? 'error.main' : 'text.primary'}>
                                    {formatMoney(analysis.menorSaldo)}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Grid container spacing={3}>
                {/* 2. GRÁFICO PRINCIPAL */}
                <Grid item xs={12} lg={8}>
                    <Paper sx={{ p: 3, height: '100%', minHeight: '400px' }} elevation={1}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="h6" fontWeight="bold" color="#1a233b">Fluxo de Caixa Futuro</Typography>
                            <Chip label="Próximos 30 dias" size="small" color="primary" variant="outlined" />
                        </Box>
                        <Box sx={{ height: 350 }}>
                            <Line data={chartData} options={options} />
                        </Box>
                    </Paper>
                </Grid>

                {/* 3. CONSELHEIRO FINANCEIRO (SIDEBAR) */}
                <Grid item xs={12} lg={4}>
                    <Paper sx={{ p: 3, height: '100%', bgcolor: '#fafafa' }} elevation={0} variant="outlined">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <Lightbulb sx={{ color: '#fbc02d' }} />
                            <Typography variant="h6" fontWeight="bold" color="#1a233b">
                                Análise Inteligente
                            </Typography>
                        </Box>
                        <Divider sx={{ mb: 2 }} />

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {analysis.mensagens.map((msg, index) => (
                                <Alert 
                                    key={index} 
                                    severity={msg.tipo === 'erro' ? 'error' : msg.tipo === 'aviso' ? 'warning' : msg.tipo === 'sucesso' ? 'success' : 'info'}
                                    variant="outlined"
                                    sx={{ bgcolor: '#fff' }}
                                    icon={msg.tipo === 'sucesso' ? <CheckCircle fontSize="inherit" /> : msg.tipo === 'erro' ? <Warning fontSize="inherit" /> : undefined}
                                >
                                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                        {msg.titulo}
                                    </Typography>
                                    <Typography variant="body2" sx={{ lineHeight: 1.3 }}>
                                        {msg.texto}
                                    </Typography>
                                </Alert>
                            ))}

                            {/* Dica Genérica Fixa se estiver tudo bem */}
                            {analysis.status === 'bom' && analysis.mensagens.length < 2 && (
                                <Alert severity="info" variant="outlined" sx={{ bgcolor: '#fff' }}>
                                    <Typography variant="subtitle2" fontWeight="bold">Dica de Gestão</Typography>
                                    <Typography variant="body2">
                                        Seu caixa está saudável. Considere criar uma reserva de emergência equivalente a 3 meses de despesas fixas.
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