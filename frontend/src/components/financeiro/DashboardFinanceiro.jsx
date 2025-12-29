// src/components/financeiro/DashboardFinanceiro.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Grid, Paper, Typography, Box, CircularProgress, 
    LinearProgress, Avatar, Divider, Chip
} from '@mui/material';
import { 
    TrendingUp, TrendingDown, AccountBalanceWallet, 
    AttachMoney, MoneyOff, VerifiedUser, MoreVert
} from '@mui/icons-material';

import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

import { faturamentoService } from '../../services/faturamentoService';

// Registra ChartJS
ChartJS.register(ArcElement, ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// --- ESTILOS VISUAIS (DESIGN SYSTEM) ---
const cardStyle = {
    borderRadius: '16px', // Bordas bem arredondadas (estilo iOS/Moderno)
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)', // Sombra super suave
    p: 2.5,
    height: '100%',
    backgroundColor: '#fff',
    border: '1px solid rgba(0,0,0,0.02)'
};

const kpiIconBoxStyle = (color) => ({
    bgcolor: `${color}15`, // 15% de opacidade
    color: color,
    width: 48,
    height: 48,
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    mb: 2
});

// --- COMPONENTES VISUAIS ---

// Card de KPI Moderno
const KpiCardModern = ({ title, value, icon, color, trendValue, trendLabel }) => (
    <Paper sx={cardStyle} elevation={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={kpiIconBoxStyle(color)}>
                {icon}
            </Box>
            {/* Chip de Tendência (Ex: +12% vs mês anterior) - Simulado visualmente */}
            <Chip 
                label={trendLabel || "+2.5%"} 
                size="small" 
                icon={trendValue === 'down' ? <TrendingDown fontSize="small"/> : <TrendingUp fontSize="small"/>}
                sx={{ 
                    bgcolor: trendValue === 'down' ? '#ffebee' : '#e8f5e9', 
                    color: trendValue === 'down' ? '#c62828' : '#2e7d32',
                    fontWeight: 'bold',
                    borderRadius: '8px'
                }} 
            />
        </Box>
        
        <Box>
            <Typography variant="body2" color="text.secondary" fontWeight="500" sx={{ mb: 0.5 }}>
                {title}
            </Typography>
            <Typography variant="h5" fontWeight="800" sx={{ color: '#1a1a1a', letterSpacing: '-0.5px' }}>
                {value}
            </Typography>
        </Box>
    </Paper>
);

// Card Genérico para Gráficos
const ChartCardModern = ({ title, subtitle, children, height = 300 }) => (
    <Paper sx={cardStyle} elevation={0}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
                <Typography variant="h6" fontWeight="700" sx={{ fontSize: '1rem', color: '#1a1a1a' }}>
                    {title}
                </Typography>
                {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
            </Box>
            <MoreVert sx={{ color: '#bdbdbd', cursor: 'pointer' }} fontSize="small" />
        </Box>
        <Box sx={{ position: 'relative', height: `${height}px`, width: '100%' }}>
            {children}
        </Box>
    </Paper>
);

export default function DashboardFinanceiro() {
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState({ dashboard: null, relatorios: null, insights: [] });

    const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

    useEffect(() => {
        const loadAllData = async () => {
            try {
                const [dashRes, relRes] = await Promise.all([
                    faturamentoService.getDashboardFinanceiro(),
                    faturamentoService.getRelatorioFinanceiro()
                ]);

                const dashData = dashRes.data;
                const faturamento = parseFloat(dashData.faturamento_do_dia || 0);
                const despesas = parseFloat(dashData.despesas_do_dia || 0);
                
                // Insights Simulados para visual
                const insights = [];
                if (despesas > faturamento) insights.push({ type: 'warning', text: 'Despesas do dia excedem as entradas.' });
                if (dashData.saldo_em_conta < 0) insights.push({ type: 'error', text: 'Saldo negativo: Risco de juros.' });
                else insights.push({ type: 'success', text: 'Fluxo saudável: Saldo positivo mantido.' });
                
                setData({
                    dashboard: dashData,
                    relatorios: relRes.data,
                    insights: insights
                });
            } catch (error) {
                console.error("Erro dashboard", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadAllData();
    }, []);

    const chartsData = useMemo(() => {
        if (!data.relatorios) return null;
        return {
            fluxo: {
                labels: data.relatorios.fluxo_caixa_mensal.map(item => 
                    new Date(item.mes).toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()
                ),
                datasets: [
                    { 
                        label: 'Entradas', 
                        data: data.relatorios.fluxo_caixa_mensal.map(i => i.receitas), 
                        backgroundColor: '#3b82f6', // Azul moderno
                        borderRadius: 4, 
                        barPercentage: 0.6 
                    },
                    { 
                        label: 'Saídas', 
                        data: data.relatorios.fluxo_caixa_mensal.map(i => i.despesas), 
                        backgroundColor: '#ef4444', // Vermelho moderno
                        borderRadius: 4, 
                        barPercentage: 0.6 
                    }
                ]
            },
            categorias: {
                labels: data.relatorios.despesas_por_categoria.map(i => i.categoria__nome),
                datasets: [{ 
                    data: data.relatorios.despesas_por_categoria.map(i => i.total),
                    backgroundColor: ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6'],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            }
        };
    }, [data.relatorios]);

    // Configurações "Clean" para os gráficos
    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: { 
                beginAtZero: true, 
                grid: { borderDash: [5, 5], drawBorder: false, color: '#f0f0f0' }, // Linhas pontilhadas leves
                ticks: { font: { size: 11 }, color: '#9ca3af' }
            },
            x: { 
                grid: { display: false }, // Remove grade vertical
                ticks: { font: { size: 11 }, color: '#9ca3af' }
            }
        },
        plugins: {
            legend: { align: 'end', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } } }
        }
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%', // Deixa a rosca mais fina (elegante)
        plugins: {
            legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, font: { size: 10 }, color: '#6b7280' } }
        }
    };

    if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>;
    if (!data.dashboard) return <Typography>Sem dados.</Typography>;

    return (
        // Fundo cinza claro para destacar os cards brancos
        <Box sx={{ bgcolor: '#f8f9fa', p: 2, borderRadius: 2, minHeight: '80vh' }}>
            
            {/* Título da Seção (Opcional, se quiser dar um nome pro Dashboard) */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" fontWeight="800" sx={{ color: '#111827' }}>
                    Visão Geral
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Última atualização: Hoje
                </Typography>
            </Box>

            {/* LINHA 1: KPIs */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <KpiCardModern 
                        title="Faturamento Hoje" 
                        value={formatMoney(data.dashboard.faturamento_do_dia)} 
                        icon={<AttachMoney />} 
                        color="#3b82f6" // Blue
                        trendLabel="+ Bom"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <KpiCardModern 
                        title="Despesas Hoje" 
                        value={formatMoney(data.dashboard.despesas_do_dia)} 
                        icon={<MoneyOff />} 
                        color="#ef4444" // Red
                        trendValue="down"
                        trendLabel="Alerta"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <KpiCardModern 
                        title="Lucro Líquido" 
                        value={formatMoney(data.dashboard.lucro_do_dia)} 
                        icon={data.dashboard.lucro_do_dia >= 0 ? <TrendingUp /> : <TrendingDown />} 
                        color={data.dashboard.lucro_do_dia >= 0 ? "#10b981" : "#ef4444"} 
                        trendLabel={data.dashboard.lucro_do_dia >= 0 ? "Positivo" : "Negativo"}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <KpiCardModern 
                        title="Saldo Atual" 
                        value={formatMoney(data.dashboard.saldo_em_conta)} 
                        icon={<AccountBalanceWallet />} 
                        color="#8b5cf6" // Purple
                        trendLabel="Banco Inter"
                    />
                </Grid>
            </Grid>

            {/* LINHA 2: GRÁFICOS E INSIGHTS */}
            <Grid container spacing={3}>
                
                {/* Coluna Esquerda: Fluxo de Caixa (Maior) */}
                <Grid item xs={12} md={8}>
                    <ChartCardModern 
                        title="Fluxo de Caixa" 
                        subtitle="Comparativo de entradas e saídas (semestral)"
                        height={320}
                    >
                        {chartsData && <Bar data={chartsData.fluxo} options={barOptions} />}
                    </ChartCardModern>
                </Grid>

                {/* Coluna Direita: Categorias e Insights */}
                <Grid item xs={12} md={4}>
                    <Grid container spacing={3}>
                        
                        {/* Gráfico de Rosca (Doughnut) */}
                        <Grid item xs={12}>
                            <ChartCardModern title="Despesas por Categoria" height={200}>
                                {chartsData && <Doughnut data={chartsData.categorias} options={doughnutOptions} />}
                            </ChartCardModern>
                        </Grid>

                        {/* Card de Inteligência / Insights */}
                        <Grid item xs={12}>
                            <Paper sx={{ ...cardStyle, bgcolor: '#fff', borderLeft: '4px solid #f59e0b', p: 2 }} elevation={0}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                                    <VerifiedUser sx={{ color: '#f59e0b', mr: 1 }} fontSize="small"/>
                                    <Typography variant="subtitle2" fontWeight="bold" color="#111827">
                                        Monitoramento Inteligente
                                    </Typography>
                                </Box>
                                
                                {data.insights.map((ins, i) => (
                                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: ins.type === 'error' ? 'red' : ins.type === 'success' ? 'green' : 'orange', mr: 1.5 }} />
                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                                            {ins.text}
                                        </Typography>
                                    </Box>
                                ))}
                                {data.insights.length === 0 && (
                                    <Typography variant="caption" color="text.secondary">Tudo certo por aqui.</Typography>
                                )}
                            </Paper>
                        </Grid>

                    </Grid>
                </Grid>
            </Grid>
        </Box>
    );
}