import React, { useState, useEffect, useMemo } from 'react';
import { 
    Paper, Typography, Box, CircularProgress, Alert, Card, CardContent, Divider, Chip 
} from '@mui/material';
import { 
    TrendingUp, TrendingDown, Warning, AccountBalanceWallet, DateRange, Lightbulb, InfoOutlined, CheckCircle
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import { faturamentoService } from '../../services/faturamentoService';
import { 
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, BarElement 
} from 'chart.js';

// Importa o CSS criado
import './ProjecaoCaixa.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, BarElement);

export default function ProjecaoCaixaView() {
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
                            label: 'Saldo Acumulado',
                            data: apiData.saldo_projetado,
                            borderColor: '#0288d1', // Azul profissional
                            backgroundColor: 'rgba(2, 136, 209, 0.1)',
                            tension: 0.3,
                            fill: true,
                            yAxisID: 'y',
                            pointRadius: 2,
                            order: 1
                        },
                        {
                            label: 'Contas a Pagar',
                            data: apiData.despesas_previstas,
                            backgroundColor: 'rgba(211, 47, 47, 0.6)', // Vermelho despesa
                            type: 'bar',
                            yAxisID: 'y1',
                            order: 2,
                            barPercentage: 0.5,
                        }
                    ]
                });
            })
            .catch(err => {
                console.error("Erro projection:", err);
                setError(true);
            })
            .finally(() => setIsLoading(false));
    }, []);

    const analysis = useMemo(() => {
        if (!rawData) return null;
        const saldoInicial = rawData.saldo_projetado[0] || 0;
        const saldoFinal = rawData.saldo_projetado[rawData.saldo_projetado.length - 1] || 0;
        const menorSaldo = Math.min(...rawData.saldo_projetado);
        
        let status = 'bom';
        let mensagens = [];

        if (menorSaldo < 0) {
            status = 'critico';
            mensagens.push({ tipo: 'erro', titulo: 'Risco de Caixa Negativo', texto: `Previsão de saldo negativo (R$ ${menorSaldo.toFixed(2)}) durante o mês.` });
        }
        if (saldoFinal < saldoInicial) {
            mensagens.push({ tipo: 'aviso', titulo: 'Consumo de Reservas', texto: `Você terminará o período com R$ ${(saldoInicial - saldoFinal).toFixed(2)} a menos.` });
        } else {
            mensagens.push({ tipo: 'sucesso', titulo: 'Crescimento de Caixa', texto: `Projeção de lucro de R$ ${(saldoFinal - saldoInicial).toFixed(2)} no período.` });
        }

        return { saldoInicial, saldoFinal, menorSaldo, mensagens };
    }, [rawData]);

    const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

    const options = {
        responsive: true,
        maintainAspectRatio: false, // Importante para o CSS controlar a altura
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { position: 'top', align: 'end' },
            tooltip: {
                callbacks: {
                    label: (c) => ` ${c.dataset.label}: ${formatMoney(c.raw)}`
                }
            }
        },
        scales: {
            y: { 
                position: 'left', 
                grid: { color: '#f5f5f5' },
                ticks: { callback: (v) => formatMoney(v), maxTicksLimit: 6 }
            },
            y1: { 
                position: 'right', 
                display: true,
                grid: { drawOnChartArea: false },
                min: 0,
                ticks: { callback: (v) => formatMoney(v), maxTicksLimit: 4, color: '#d32f2f' }
            },
            x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } }
        }
    };

    if (isLoading) return <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error">Erro ao carregar dados.</Alert>;

    return (
        <div className="dashboard-container">
            {/* 1. KPIs */}
            <div className="kpi-grid">
                <Card variant="outlined">
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <AccountBalanceWallet color="primary" />
                        <div>
                            <Typography variant="caption" color="textSecondary" fontWeight="bold">SALDO HOJE</Typography>
                            <Typography variant="h6" fontWeight="bold">{formatMoney(analysis.saldoInicial)}</Typography>
                        </div>
                    </CardContent>
                </Card>
                <Card variant="outlined">
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {analysis.saldoFinal >= analysis.saldoInicial ? <TrendingUp color="success" /> : <TrendingDown color="error" />}
                        <div>
                            <Typography variant="caption" color="textSecondary" fontWeight="bold">SALDO EM 30 DIAS</Typography>
                            <Typography variant="h6" fontWeight="bold" color={analysis.saldoFinal >= analysis.saldoInicial ? 'success.main' : 'error.main'}>
                                {formatMoney(analysis.saldoFinal)}
                            </Typography>
                        </div>
                    </CardContent>
                </Card>
                <Card variant="outlined">
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Warning color={analysis.menorSaldo < 0 ? 'error' : 'warning'} />
                        <div>
                            <Typography variant="caption" color="textSecondary" fontWeight="bold">PONTO CRÍTICO</Typography>
                            <Typography variant="h6" fontWeight="bold" color={analysis.menorSaldo < 0 ? 'error.main' : 'text.primary'}>
                                {formatMoney(analysis.menorSaldo)}
                            </Typography>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 2. Área Principal Controlada por CSS Grid */}
            <div className="main-chart-grid">
                
                {/* Gráfico */}
                <Paper className="chart-paper" elevation={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold" color="#1a233b">Fluxo de Caixa</Typography>
                        <Chip icon={<DateRange fontSize="small" />} label="30 Dias" size="small" variant="outlined" />
                    </Box>
                    <div className="chart-wrapper">
                        <Line data={chartData} options={options} />
                    </div>
                </Paper>

                {/* Sidebar */}
                <Paper className="sidebar-paper" elevation={0}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Lightbulb sx={{ color: '#fbc02d' }} />
                        <Typography variant="subtitle1" fontWeight="bold" color="#1a233b">Análise</Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    
                    <div className="sidebar-content">
                        {analysis.mensagens.map((msg, i) => (
                            <Alert 
                                key={i} 
                                severity={msg.tipo === 'erro' ? 'error' : msg.tipo === 'aviso' ? 'warning' : 'success'}
                                variant="outlined"
                                icon={msg.tipo === 'sucesso' ? <CheckCircle fontSize="inherit"/> : undefined}
                                sx={{ bgcolor: '#fff' }}
                            >
                                <strong>{msg.titulo}</strong><br/>
                                <span style={{fontSize: '0.8rem'}}>{msg.texto}</span>
                            </Alert>
                        ))}
                        {analysis.mensagens.length === 0 && (
                            <Typography variant="body2" color="textSecondary" align="center">
                                Fluxo estável. Nenhuma anomalia detectada.
                            </Typography>
                        )}
                    </div>
                </Paper>
            </div>
        </div>
    );
}