import React, { useState, useEffect, useMemo } from 'react';
import { 
    Box, Grid, Paper, Typography, IconButton, LinearProgress 
} from '@mui/material';
import { Refresh, ShowChart, AccountBalanceWallet } from '@mui/icons-material';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';

import './Financeiro.css';
import { faturamentoService } from '../../services/faturamentoService';

// Cores mais corporativas e sóbrias
const COLORS = {
    receita: '#2e7d32', 
    despesa: '#d32f2f', 
    saldo: '#1976d2', 
    barras: ['#2e5b99', '#4b88d3', '#6caddf', '#96ccee', '#b8daff']
};

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
const formatK = (val) => (Math.abs(val) >= 1000 ? `${(val / 1000).toFixed(0)}k` : val);

export default function RelatoriosFinanceirosView() {
    const [loading, setLoading] = useState(true);
    const [relatorio, setRelatorio] = useState({ faturamento_por_forma: [], despesas_por_categoria: [], fluxo_caixa_mensal: [] });
    const [projecao, setProjecao] = useState({ labels: [], saldo_projetado: [], receitas_previstas: [], despesas_previstas: [] });

    const fetchDados = async () => {
        setLoading(true);
        try {
            const [resRelatorio, resProjecao] = await Promise.all([
                faturamentoService.getRelatorioFinanceiro().catch(() => ({ data: null })),
                faturamentoService.getProjecaoFinanceira().catch(() => ({ data: null })),
            ]);
            if (resRelatorio.data) setRelatorio(resRelatorio.data);
            if (resProjecao.data) setProjecao(resProjecao.data);
        } catch (error) {
            console.error('Erro ao carregar relatórios financeiros', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDados(); }, []);

    // --- Tratamento de Dados (Mantido do Original) ---
    const dadosProjecaoChart = useMemo(() => {
        const labels = projecao.labels || [];
        return labels.map((label, i) => ({
            name: label,
            saldo: (projecao.saldo_projetado || [])[i] ?? 0,
            receitas: (projecao.receitas_previstas || [])[i] ?? 0,
            despesas: (projecao.despesas_previstas || [])[i] ?? 0,
        }));
    }, [projecao]);

    const kpisProjecao = useMemo(() => {
        const saldos = projecao.saldo_projetado || [];
        const receitas = projecao.receitas_previstas || [];
        const despesas = projecao.despesas_previstas || [];
        return {
            saldoHoje: saldos[0] ?? 0,
            saldoFinal: saldos.length ? saldos[saldos.length - 1] : 0,
            totalAReceber: receitas.reduce((acc, v) => acc + v, 0),
            totalAPagar: despesas.reduce((acc, v) => acc + v, 0),
        };
    }, [projecao]);

    const faturamentoPorForma = relatorio.faturamento_por_forma || [];
    const despesasPorCategoria = relatorio.despesas_por_categoria || [];
    const fluxoCaixaMensal = relatorio.fluxo_caixa_mensal || [];

    // Sub-componente de KPI estilo Tasy
    const KpiCard = ({ title, value, color, subtext }) => (
        <Paper className="tasy-flat-panel" sx={{ p: 1.5, display: 'flex', flexDirection: 'column', height: '100%', borderLeft: `4px solid ${color}` }}>
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#6c757d', textTransform: 'uppercase' }}>
                {title}
            </Typography>
            <Typography sx={{ fontSize: '1.2rem', fontWeight: 900, color: '#343a40', mt: 0.5 }}>
                {formatMoney(value)}
            </Typography>
            <Typography sx={{ fontSize: '0.65rem', color: '#adb5bd', mt: 'auto', pt: 1 }}>
                {subtext}
            </Typography>
        </Paper>
    );

    const EmptyState = ({ text }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#adb5bd', fontSize: '0.75rem', fontWeight: 'bold' }}>
            {text}
        </Box>
    );

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 1, backgroundColor: '#f1f3f5', overflow: 'hidden' }}>
            
            {/* CABEÇALHO */}
            <Paper className="tasy-flat-panel" sx={{ p: 1, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 1 }}>
                    <Box sx={{ bgcolor: '#e3f2fd', p: 0.8, borderRadius: 1, display: 'flex', alignItems: 'center' }}>
                        <ShowChart sx={{ color: '#1565c0', fontSize: 20 }} />
                    </Box>
                    <Box>
                        <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" lineHeight={1}>
                            INTELIGÊNCIA
                        </Typography>
                        <Typography variant="subtitle1" fontWeight="800" color="#343a40" lineHeight={1.2}>
                            Saúde Financeira e Projeções
                        </Typography>
                    </Box>
                </Box>
                <IconButton size="small" onClick={fetchDados} title="Atualizar Dados" sx={{ bgcolor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 1 }}>
                    <Refresh fontSize="small" sx={{ color: '#495057' }} />
                </IconButton>
            </Paper>

            {loading && <LinearProgress sx={{ height: 2, mb: 1 }} />}

            {/* KPIS (Linha Fixa) */}
            <Grid container spacing={1} sx={{ mb: 1, flexShrink: 0 }}>
                <Grid item xs={3}><KpiCard title="SALDO EM CAIXA (HOJE)" value={kpisProjecao.saldoHoje} color={kpisProjecao.saldoHoje >= 0 ? COLORS.saldo : COLORS.despesa} subtext="Realizado e disponível" /></Grid>
                <Grid item xs={3}><KpiCard title="SALDO PROJETADO (FUTURO)" value={kpisProjecao.saldoFinal} color={kpisProjecao.saldoFinal >= 0 ? COLORS.saldo : COLORS.despesa} subtext={`Previsão em ${dadosProjecaoChart.length || 30} dias`} /></Grid>
                <Grid item xs={3}><KpiCard title="A RECEBER NO PERÍODO" value={kpisProjecao.totalAReceber} color={COLORS.receita} subtext="Contas a receber lançadas" /></Grid>
                <Grid item xs={3}><KpiCard title="A PAGAR NO PERÍODO" value={kpisProjecao.totalAPagar} color={COLORS.despesa} subtext="Despesas fixas e variáveis" /></Grid>
            </Grid>

            {/* ÁREA DOS GRÁFICOS (Flex Grow para preencher sem scroll) */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1, minHeight: 0 }}>
                
                {/* LINHA SUPERIOR (Gráficos de Tempo/Fluxo) - Ocupa 55% da altura restante */}
                <Box sx={{ flex: 55, display: 'flex', gap: 1, minHeight: 0 }}>
                    
                    {/* GRÁFICO 1: PROJEÇÃO DE SALDO */}
                    <Paper className="tasy-flat-panel" sx={{ flex: 2, display: 'flex', flexDirection: 'column', p: 1 }}>
                        <div className="tasy-section-header" style={{ margin: '-8px -8px 8px -8px' }}>
                            Evolução Projetada de Saldo (Próximos Dias)
                        </div>
                        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dadosProjecaoChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={COLORS.saldo} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={COLORS.saldo} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ecef" />
                                    <XAxis dataKey="name" style={{ fontSize: '0.65rem', fill: '#6c757d' }} axisLine={false} tickLine={false} />
                                    <YAxis tickFormatter={formatK} style={{ fontSize: '0.65rem', fill: '#6c757d' }} axisLine={false} tickLine={false} />
                                    <RechartsTooltip formatter={(value) => formatMoney(value)} contentStyle={{ fontSize: '0.75rem', borderRadius: 4, border: '1px solid #dee2e6' }} />
                                    <Area type="monotone" dataKey="saldo" name="Saldo Estimado" stroke={COLORS.saldo} strokeWidth={3} fill="url(#colorSaldo)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>

                    {/* GRÁFICO 2: FLUXO MENSAL */}
                    <Paper className="tasy-flat-panel" sx={{ flex: 1.5, display: 'flex', flexDirection: 'column', p: 1 }}>
                        <div className="tasy-section-header" style={{ margin: '-8px -8px 8px -8px' }}>
                            Histórico de Receitas vs Despesas
                        </div>
                        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                            {fluxoCaixaMensal.length === 0 ? <EmptyState text="Sem histórico suficiente." /> : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={fluxoCaixaMensal} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ecef" />
                                        <XAxis dataKey="mes" style={{ fontSize: '0.65rem', fill: '#6c757d' }} axisLine={false} tickLine={false} />
                                        <YAxis tickFormatter={formatK} style={{ fontSize: '0.65rem', fill: '#6c757d' }} axisLine={false} tickLine={false} />
                                        <RechartsTooltip formatter={(value) => formatMoney(value)} contentStyle={{ fontSize: '0.75rem', borderRadius: 4, border: '1px solid #dee2e6' }} cursor={{fill: '#f8f9fa'}} />
                                        <Legend wrapperStyle={{ fontSize: '0.65rem' }} />
                                        <Bar dataKey="receitas" name="Receitas" fill={COLORS.receita} radius={[2, 2, 0, 0]} barSize={15} />
                                        <Bar dataKey="despesas" name="Despesas" fill={COLORS.despesa} radius={[2, 2, 0, 0]} barSize={15} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </Box>
                    </Paper>
                </Box>

                {/* LINHA INFERIOR (Gráficos de Detalhamento) - Ocupa 45% da altura restante */}
                <Box sx={{ flex: 45, display: 'flex', gap: 1, minHeight: 0 }}>
                    
                    {/* GRÁFICO 3: FORMAS DE PAGAMENTO */}
                    <Paper className="tasy-flat-panel" sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1 }}>
                        <div className="tasy-section-header" style={{ margin: '-8px -8px 8px -8px' }}>
                            Receita: Meios de Pagamento
                        </div>
                        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                            {faturamentoPorForma.length === 0 ? <EmptyState text="Sem receitas registradas." /> : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={faturamentoPorForma} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e9ecef" />
                                        <XAxis type="number" tickFormatter={formatK} style={{ fontSize: '0.65rem', fill: '#6c757d' }} axisLine={false} tickLine={false} />
                                        <YAxis type="category" dataKey="forma_pagamento" width={80} style={{ fontSize: '0.6rem', fill: '#495057', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                        <RechartsTooltip formatter={(value) => formatMoney(value)} contentStyle={{ fontSize: '0.75rem', borderRadius: 4, border: '1px solid #dee2e6' }} cursor={{fill: '#f8f9fa'}} />
                                        <Bar dataKey="total" name="Valor" radius={[0, 2, 2, 0]} barSize={16}>
                                            {faturamentoPorForma.map((_, index) => (
                                                <Cell key={index} fill={COLORS.barras[index % COLORS.barras.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </Box>
                    </Paper>

                    {/* GRÁFICO 4: DESPESAS POR CATEGORIA */}
                    <Paper className="tasy-flat-panel" sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1 }}>
                        <div className="tasy-section-header" style={{ margin: '-8px -8px 8px -8px' }}>
                            Despesa: Distribuição por Categoria
                        </div>
                        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                            {despesasPorCategoria.length === 0 ? <EmptyState text="Sem despesas registradas." /> : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={despesasPorCategoria} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e9ecef" />
                                        <XAxis type="number" tickFormatter={formatK} style={{ fontSize: '0.65rem', fill: '#6c757d' }} axisLine={false} tickLine={false} />
                                        <YAxis type="category" dataKey="categoria_nome" width={100} style={{ fontSize: '0.6rem', fill: '#495057', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                        <RechartsTooltip formatter={(value) => formatMoney(value)} contentStyle={{ fontSize: '0.75rem', borderRadius: 4, border: '1px solid #dee2e6' }} cursor={{fill: '#f8f9fa'}} />
                                        <Bar dataKey="total" name="Valor" fill={COLORS.despesa} radius={[0, 2, 2, 0]} barSize={16} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </Box>
                    </Paper>
                </Box>
            </Box>
        </Box>
    );
}