import React, { useState, useEffect, useMemo } from 'react';
import { 
    Paper, Typography, Box, CircularProgress, Alert, Card, CardContent, Divider, Chip 
} from '@mui/material';
import { 
    TrendingUp, TrendingDown, Warning, AccountBalanceWallet, DateRange, Lightbulb, CheckCircle
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import { faturamentoService } from '../../services/faturamentoService';
import { 
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, BarElement 
} from 'chart.js';

// Importa o CSS compacto
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
                            label: 'Saldo', // Label mais curto
                            data: apiData.saldo_projetado,
                            borderColor: '#0288d1',
                            backgroundColor: 'rgba(2, 136, 209, 0.1)',
                            tension: 0.3,
                            fill: true,
                            yAxisID: 'y',
                            pointRadius: 0, // Sem bolinhas para limpar visual
                            pointHoverRadius: 4,
                            order: 1
                        },
                        {
                            label: 'Pagar', // Label mais curto
                            data: apiData.despesas_previstas,
                            backgroundColor: 'rgba(211, 47, 47, 0.6)',
                            type: 'bar',
                            yAxisID: 'y1',
                            order: 2,
                            barPercentage: 0.6,
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
            mensagens.push({ tipo: 'erro', titulo: 'Risco de Caixa', texto: `Saldo negativo (R$ ${menorSaldo.toFixed(0)}) previsto.` });
        }
        if (saldoFinal < saldoInicial) {
            mensagens.push({ tipo: 'aviso', titulo: 'Consumo de Reservas', texto: `Queda de R$ ${(saldoInicial - saldoFinal).toFixed(0)} no período.` });
        } else {
            mensagens.push({ tipo: 'sucesso', titulo: 'Crescimento', texto: `Lucro de R$ ${(saldoFinal - saldoInicial).toFixed(0)} no período.` });
        }

        return { saldoInicial, saldoFinal, menorSaldo, mensagens };
    }, [rawData]);

    const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { 
                position: 'top', 
                align: 'end',
                labels: { boxWidth: 8, padding: 6, font: { size: 10 } } // Legenda menor
            },
            tooltip: {
                callbacks: { label: (c) => ` ${c.dataset.label}: ${formatMoney(c.raw)}` }
            }
        },
        scales: {
            y: { 
                position: 'left', 
                grid: { color: '#f5f5f5' },
                ticks: { 
                    callback: (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: "compact" }).format(v), // Notação compacta (1k, 1M)
                    maxTicksLimit: 5,
                    font: { size: 10 }
                }
            },
            y1: { 
                position: 'right', 
                display: true,
                grid: { drawOnChartArea: false },
                min: 0,
                ticks: { display: false } // Esconde números da barra vermelha pra limpar
            },
            x: { 
                grid: { display: false }, 
                ticks: { maxTicksLimit: 6, font: { size: 10 } } 
            }
        }
    };

    if (isLoading) return <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress size={30} /></Box>;
    if (error) return <Alert severity="error">Erro ao carregar dados.</Alert>;

    return (
        <div className="dashboard-container">
            {/* 1. KPIs Compactos */}
            <div className="kpi-grid">
                <Card variant="outlined">
                    <div className="kpi-card-content">
                        <Box sx={{ p: 0.5, bgcolor: '#e3f2fd', borderRadius: 1, display: 'flex' }}>
                            <AccountBalanceWallet color="primary" fontSize="small" />
                        </Box>
                        <div>
                            <Typography variant="caption" color="textSecondary" fontWeight="bold" fontSize="0.7rem">SALDO HOJE</Typography>
                            <Typography variant="subtitle1" fontWeight="bold" lineHeight={1.1}>{formatMoney(analysis.saldoInicial)}</Typography>
                        </div>
                    </div>
                </Card>
                <Card variant="outlined">
                    <div className="kpi-card-content">
                        <Box sx={{ p: 0.5, bgcolor: analysis.saldoFinal >= analysis.saldoInicial ? '#e8f5e9' : '#ffebee', borderRadius: 1, display: 'flex' }}>
                            {analysis.saldoFinal >= analysis.saldoInicial ? <TrendingUp color="success" fontSize="small" /> : <TrendingDown color="error" fontSize="small" />}
                        </Box>
                        <div>
                            <Typography variant="caption" color="textSecondary" fontWeight="bold" fontSize="0.7rem">EM 30 DIAS</Typography>
                            <Typography variant="subtitle1" fontWeight="bold" lineHeight={1.1} color={analysis.saldoFinal >= analysis.saldoInicial ? 'success.main' : 'error.main'}>
                                {formatMoney(analysis.saldoFinal)}
                            </Typography>
                        </div>
                    </div>
                </Card>
                <Card variant="outlined">
                    <div className="kpi-card-content">
                        <Box sx={{ p: 0.5, bgcolor: analysis.menorSaldo < 0 ? '#ffebee' : '#fff3e0', borderRadius: 1, display: 'flex' }}>
                            <Warning color={analysis.menorSaldo < 0 ? 'error' : 'warning'} fontSize="small" />
                        </Box>
                        <div>
                            <Typography variant="caption" color="textSecondary" fontWeight="bold" fontSize="0.7rem">PONTO CRÍTICO</Typography>
                            <Typography variant="subtitle1" fontWeight="bold" lineHeight={1.1} color={analysis.menorSaldo < 0 ? 'error.main' : 'text.primary'}>
                                {formatMoney(analysis.menorSaldo)}
                            </Typography>
                        </div>
                    </div>
                </Card>
            </div>

            {/* 2. Área Principal */}
            <div className="main-chart-grid">
                
                {/* Gráfico */}
                <Paper className="chart-paper" elevation={1}>
                    <div className="chart-header">
                        <Typography variant="subtitle2" fontWeight="bold" color="#1a233b">Fluxo de Caixa</Typography>
                        <Chip icon={<DateRange style={{fontSize: 14}} />} label="30 Dias" size="small" variant="outlined" style={{height: 20, fontSize: '0.7rem'}} />
                    </div>
                    <div className="chart-wrapper">
                        <Line data={chartData} options={options} />
                    </div>
                </Paper>

                {/* Sidebar */}
                <Paper className="sidebar-paper" elevation={0}>
                    <div className="sidebar-header">
                        <Lightbulb sx={{ color: '#fbc02d', fontSize: 18 }} />
                        <Typography variant="subtitle2" fontWeight="bold" color="#1a233b">Análise</Typography>
                    </div>
                    <Divider sx={{ mb: 1 }} />
                    
                    <div className="sidebar-content">
                        {analysis.mensagens.map((msg, i) => (
                            <Alert 
                                key={i} 
                                severity={msg.tipo === 'erro' ? 'error' : msg.tipo === 'aviso' ? 'warning' : 'success'}
                                variant="outlined"
                                icon={msg.tipo === 'sucesso' ? <CheckCircle style={{fontSize: 16}}/> : undefined}
                                sx={{ 
                                    bgcolor: '#fff', 
                                    py: 0, px: 1, 
                                    '& .MuiAlert-message': { py: 0.5 },
                                    '& .MuiAlert-icon': { py: 0.5, mr: 1 } 
                                }}
                            >
                                <Typography variant="caption" fontWeight="bold" display="block">{msg.titulo}</Typography>
                                <Typography variant="caption" style={{fontSize: '0.7rem'}}>{msg.texto}</Typography>
                            </Alert>
                        ))}
                        {analysis.mensagens.length === 0 && (
                            <Typography variant="caption" color="textSecondary" align="center" sx={{mt: 2}}>
                                Fluxo estável.
                            </Typography>
                        )}
                    </div>
                </Paper>
            </div>
        </div>
    );
}