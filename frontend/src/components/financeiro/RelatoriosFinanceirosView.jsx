// src/components/financeiro/RelatoriosFinanceirosView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { IconButton, LinearProgress } from '@mui/material';
import { Refresh } from '@mui/icons-material';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from 'recharts';

import './Financeiro.css';
import { faturamentoService } from '../../services/faturamentoService';

const COLORS = {
    receita: '#2e7d32', despesa: '#d32f2f', saldo: '#1976d2', neutro: '#6b7280',
    barras: ['#1976d2', '#0288d1', '#009688', '#7b1fa2', '#ed6c02', '#5d4037'],
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

    // --- Dados derivados para o gráfico de projeção (junta as 3 séries por dia) ---
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

    return (
        <div className="fin-container" style={{ overflowY: 'auto', height: '100%' }}>
            {/* TOOLBAR */}
            <div className="fin-toolbar">
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1a233b' }}>
                    RELATÓRIOS &amp; PROJEÇÃO DE CAIXA
                </span>
                <IconButton size="small" onClick={fetchDados} title="Atualizar"><Refresh fontSize="small" /></IconButton>
            </div>

            {loading && <LinearProgress sx={{ mb: 1, height: 2 }} />}

            {/* KPIS DA PROJEÇÃO */}
            <div className="fin-kpi-grid">
                <MiniKpi title="SALDO ATUAL" value={kpisProjecao.saldoHoje} color={kpisProjecao.saldoHoje >= 0 ? COLORS.saldo : COLORS.despesa} subtext="Realizado até hoje" />
                <MiniKpi title="SALDO PROJETADO" value={kpisProjecao.saldoFinal} color={kpisProjecao.saldoFinal >= 0 ? COLORS.saldo : COLORS.despesa} subtext={`Em ${dadosProjecaoChart.length || 30} dias`} />
                <MiniKpi title="A RECEBER NO PERÍODO" value={kpisProjecao.totalAReceber} color={COLORS.receita} subtext="Contas pendentes já lançadas" />
                <MiniKpi title="A PAGAR NO PERÍODO" value={kpisProjecao.totalAPagar} color={COLORS.despesa} subtext="Despesas em aberto" />
            </div>

            {/* GRÁFICO PRINCIPAL: PROJEÇÃO DE SALDO */}
            <div className="fin-chart-box" style={{ height: 260, marginBottom: 8 }}>
                <div className="fin-chart-header">
                    <span className="fin-chart-title">PROJEÇÃO DE SALDO EM CAIXA</span>
                    <div style={{ display: 'flex', gap: 10, fontSize: '0.65rem' }}>
                        <span style={{ color: COLORS.saldo }}>● Saldo projetado</span>
                    </div>
                </div>
                <div className="fin-chart-content">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dadosProjecaoChart} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COLORS.saldo} stopOpacity={0.25} />
                                    <stop offset="95%" stopColor={COLORS.saldo} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="name" style={{ fontSize: '0.65rem' }} axisLine={false} tickLine={false} dy={5} />
                            <YAxis tickFormatter={formatK} style={{ fontSize: '0.65rem' }} axisLine={false} tickLine={false} />
                            <RechartsTooltip formatter={(value) => formatMoney(value)} contentStyle={{ fontSize: '0.8rem', borderRadius: 8 }} />
                            <Area type="monotone" dataKey="saldo" name="Saldo projetado" stroke={COLORS.saldo} strokeWidth={2} fill="url(#colorSaldo)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* LINHA: FATURAMENTO POR FORMA | DESPESAS POR CATEGORIA */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div className="fin-chart-box" style={{ height: 220 }}>
                    <div className="fin-chart-header">
                        <span className="fin-chart-title">FATURAMENTO POR FORMA DE PAGAMENTO</span>
                    </div>
                    <div className="fin-chart-content">
                        {faturamentoPorForma.length === 0 ? (
                            <EmptyState texto="Sem receitas pagas registradas ainda." />
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={faturamentoPorForma} layout="vertical" margin={{ top: 5, right: 15, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                    <XAxis type="number" tickFormatter={formatK} style={{ fontSize: '0.65rem' }} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="forma_pagamento" width={90} style={{ fontSize: '0.65rem' }} axisLine={false} tickLine={false} />
                                    <RechartsTooltip formatter={(value) => formatMoney(value)} contentStyle={{ fontSize: '0.8rem', borderRadius: 8 }} />
                                    <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                                        {faturamentoPorForma.map((_, index) => (
                                            <Cell key={index} fill={COLORS.barras[index % COLORS.barras.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="fin-chart-box" style={{ height: 220 }}>
                    <div className="fin-chart-header">
                        <span className="fin-chart-title">DESPESAS POR CATEGORIA</span>
                    </div>
                    <div className="fin-chart-content">
                        {despesasPorCategoria.length === 0 ? (
                            <EmptyState texto="Sem despesas registradas ainda." />
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={despesasPorCategoria} layout="vertical" margin={{ top: 5, right: 15, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                    <XAxis type="number" tickFormatter={formatK} style={{ fontSize: '0.65rem' }} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="categoria_nome" width={90} style={{ fontSize: '0.65rem' }} axisLine={false} tickLine={false} />
                                    <RechartsTooltip formatter={(value) => formatMoney(value)} contentStyle={{ fontSize: '0.8rem', borderRadius: 8 }} />
                                    <Bar dataKey="total" fill={COLORS.despesa} radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* FLUXO DE CAIXA MENSAL */}
            <div className="fin-chart-box" style={{ height: 240 }}>
                <div className="fin-chart-header">
                    <span className="fin-chart-title">FLUXO DE CAIXA MENSAL (HISTÓRICO)</span>
                    <div style={{ display: 'flex', gap: 10, fontSize: '0.65rem' }}>
                        <span style={{ color: COLORS.receita }}>● Receitas</span>
                        <span style={{ color: COLORS.despesa }}>● Despesas</span>
                    </div>
                </div>
                <div className="fin-chart-content">
                    {fluxoCaixaMensal.length === 0 ? (
                        <EmptyState texto="Ainda não há histórico mensal suficiente." />
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={fluxoCaixaMensal} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="mes" style={{ fontSize: '0.65rem' }} axisLine={false} tickLine={false} dy={5} />
                                <YAxis tickFormatter={formatK} style={{ fontSize: '0.65rem' }} axisLine={false} tickLine={false} />
                                <RechartsTooltip formatter={(value) => formatMoney(value)} contentStyle={{ fontSize: '0.8rem', borderRadius: 8 }} />
                                <Bar dataKey="receitas" name="Receitas" fill={COLORS.receita} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="despesas" name="Despesas" fill={COLORS.despesa} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
}

const MiniKpi = ({ title, value, color, subtext }) => (
    <div className="fin-card">
        <div className="fin-card-content">
            <span className="fin-card-title">{title}</span>
            <span className="fin-card-value" style={{ color }}>{formatMoney(value)}</span>
            <span className="fin-card-sub">{subtext}</span>
        </div>
    </div>
);

const EmptyState = ({ texto }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: '0.75rem' }}>
        {texto}
    </div>
);
