// src/components/financeiro/DashboardFinanceiro.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Grid, Paper, Typography, Box, CircularProgress, Alert, 
    LinearProgress, Divider, Tooltip, IconButton
} from '@mui/material';
import { 
    TrendingUp, TrendingDown, AccountBalanceWallet, 
    AttachMoney, MoneyOff, HealthAndSafety 
} from '@mui/icons-material'; // Ícones mais modernos

import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

import { faturamentoService } from '../../services/faturamentoService';

// Registra componentes do ChartJS
ChartJS.register(ArcElement, ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// --- Componentes Visuais Pequenos ---

const MiniKPI = ({ title, value, icon, color, subtext }) => (
    <Paper elevation={1} sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
        <Box>
            <Typography variant="caption" color="text.secondary" fontWeight="bold" textTransform="uppercase">
                {title}
            </Typography>
            <Typography variant="h6" fontWeight="bold" color={color} sx={{ lineHeight: 1.2, my: 0.5 }}>
                {value}
            </Typography>
            {subtext && <Typography variant="caption" color="text.secondary">{subtext}</Typography>}
        </Box>
        <Box sx={{ 
            bgcolor: `${color}15`, // Cor com transparência
            color: color, 
            p: 1, 
            borderRadius: '50%',
            display: 'flex'
        }}>
            {icon}
        </Box>
    </Paper>
);

const ChartCard = ({ title, children }) => (
    <Paper elevation={1} sx={{ p: 1.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" gutterBottom>
            {title}
        </Typography>
        <Box sx={{ flexGrow: 1, position: 'relative', minHeight: '180px' }}>
            {children}
        </Box>
    </Paper>
);

// ------------------------------------

export default function DashboardFinanceiro() {
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState({ dashboard: null, relatorios: null, insights: [] });

    const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

    useEffect(() => {
        const loadAllData = async () => {
            try {
                // Chama as duas rotas ao mesmo tempo
                const [dashRes, relRes] = await Promise.all([
                    faturamentoService.getDashboardFinanceiro(),
                    faturamentoService.getRelatorioFinanceiro()
                ]);

                // Processamento de Inteligência (Frontend)
                const dashData = dashRes.data;
                const faturamento = parseFloat(dashData.faturamento_do_dia || 0);
                const despesas = parseFloat(dashData.despesas_do_dia || 0);
                const lucro = dashData.lucro_do_dia || 0;
                
                const insights = [];
                if (despesas > faturamento) insights.push({ type: 'warning', text: 'Despesas superam faturamento hoje.' });
                if (dashData.saldo_em_conta < 0) insights.push({ type: 'error', text: 'Conta no negativo!' });
                
                setData({
                    dashboard: dashData,
                    relatorios: relRes.data,
                    insights: insights
                });

            } catch (error) {
                console.error("Erro ao carregar dashboard unificado", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadAllData();
    }, []);

    // Preparação dos Gráficos (Memoizado para performance)
    const chartsData = useMemo(() => {
        if (!data.relatorios) return null;

        return {
            fluxo: {
                labels: data.relatorios.fluxo_caixa_mensal.map(item => 
                    new Date(item.mes).toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()
                ),
                datasets: [
                    { label: 'Entradas', data: data.relatorios.fluxo_caixa_mensal.map(i => i.receitas), backgroundColor: '#2e7d32', borderRadius: 2 },
                    { label: 'Saídas', data: data.relatorios.fluxo_caixa_mensal.map(i => i.despesas), backgroundColor: '#d32f2f', borderRadius: 2 }
                ]
            },
            categorias: {
                labels: data.relatorios.despesas_por_categoria.map(i => i.categoria__nome),
                datasets: [{ 
                    data: data.relatorios.despesas_por_categoria.map(i => i.total),
                    backgroundColor: ['#ef5350', '#ab47bc', '#42a5f5', '#26a69a', '#ffa726'],
                    borderWidth: 0
                }]
            },
            formas: {
                labels: data.relatorios.faturamento_por_forma.map(i => i.forma_pagamento),
                datasets: [{ 
                    data: data.relatorios.faturamento_por_forma.map(i => i.total),
                    backgroundColor: ['#66bb6a', '#29b6f6', '#ffca28', '#8d6e63'],
                    borderWidth: 0
                }]
            }
        };
    }, [data.relatorios]);

    // Opções comuns para gráficos ficarem compactos
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false, // IMPORTANTE: Deixa o gráfico esticar para caber no container
        plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }
        }
    };

    if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    if (!data.dashboard) return <Typography>Sem dados disponíveis.</Typography>;

    return (
        <Box sx={{ pb: 2 }}>
            {/* LINHA 1: KPIS PRINCIPAIS (Compactos) */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <MiniKPI 
                        title="Faturamento (Dia)" 
                        value={formatMoney(data.dashboard.faturamento_do_dia)} 
                        icon={<AttachMoney />} 
                        color="#2e7d32" 
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MiniKPI 
                        title="Despesas (Dia)" 
                        value={formatMoney(data.dashboard.despesas_do_dia)} 
                        icon={<MoneyOff />} 
                        color="#c62828" 
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MiniKPI 
                        title="Lucro Líquido (Dia)" 
                        value={formatMoney(data.dashboard.lucro_do_dia)} 
                        icon={data.dashboard.lucro_do_dia >= 0 ? <TrendingUp /> : <TrendingDown />} 
                        color={data.dashboard.lucro_do_dia >= 0 ? "#1565c0" : "#d32f2f"} 
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MiniKPI 
                        title="Saldo em Conta" 
                        value={formatMoney(data.dashboard.saldo_em_conta)} 
                        icon={<AccountBalanceWallet />} 
                        color="#6a1b9a" 
                        subtext="Integração Bancária"
                    />
                </Grid>
            </Grid>

            {/* LINHA 2: GRÁFICOS E INSIGHTS */}
            <Grid container spacing={2}>
                
                {/* Coluna Esquerda: Fluxo de Caixa (Ocupa mais espaço) */}
                <Grid item xs={12} md={6}>
                    <ChartCard title="Fluxo de Caixa (6 Meses)">
                        {chartsData && <Bar data={chartsData.fluxo} options={commonOptions} />}
                    </ChartCard>
                </Grid>

                {/* Coluna Direita: Pizzas e Saúde */}
                <Grid item xs={12} md={6}>
                    <Grid container spacing={2} sx={{ height: '100%' }}>
                        
                        {/* Pizza 1 */}
                        <Grid item xs={12} sm={6} sx={{ height: '240px' }}>
                            <ChartCard title="Despesas por Categoria">
                                {chartsData && <Pie data={chartsData.categorias} options={commonOptions} />}
                            </ChartCard>
                        </Grid>
                        
                        {/* Pizza 2 */}
                        <Grid item xs={12} sm={6} sx={{ height: '240px' }}>
                            <ChartCard title="Receitas por Forma">
                                {chartsData && <Pie data={chartsData.formas} options={commonOptions} />}
                            </ChartCard>
                        </Grid>

                        {/* Bloco de Insights / Saúde (Estilo Footer da dashboard) */}
                        <Grid item xs={12}>
                            <Paper elevation={1} sx={{ p: 1.5, bgcolor: '#fff3e0', borderLeft: '4px solid #ff9800' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <HealthAndSafety sx={{ mr: 1, color: '#f57c00' }} />
                                    <Typography variant="subtitle2" fontWeight="bold" color="#e65100">
                                        Monitoramento Inteligente
                                    </Typography>
                                </Box>
                                {data.insights.length > 0 ? (
                                    data.insights.map((ins, i) => (
                                        <Typography key={i} variant="body2" sx={{ display: 'block', mb: 0.5, fontSize: '0.8rem' }}>
                                            • {ins.text}
                                        </Typography>
                                    ))
                                ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                        Nenhum alerta crítico. Sua operação está saudável hoje.
                                    </Typography>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </Box>
    );
}