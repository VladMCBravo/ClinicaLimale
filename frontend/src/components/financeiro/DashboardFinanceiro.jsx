// src/components/financeiro/DashboardFinanceiro.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
    TrendingUp, TrendingDown, AccountBalanceWallet, 
    AttachMoney, MoneyOff, VerifiedUser 
} from '@mui/icons-material';

import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

import { faturamentoService } from '../../services/faturamentoService';
import './FinancialDashboard.css';

ChartJS.register(ArcElement, ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function DashboardFinanceiro() {
    const [isLoading, setIsLoading] = useState(true);
    // Inicializa com estrutura zerada para não quebrar antes da API
    const [data, setData] = useState({ 
        dashboard: { 
            faturamento_do_dia: 0, 
            despesas_do_dia: 0, 
            lucro_do_dia: 0, 
            saldo_em_conta: 0 
        }, 
        relatorios: null, 
        insights: [] 
    });

    const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

    useEffect(() => {
        const loadAllData = async () => {
            try {
                // Chamada real à API
                const [dashRes, relRes] = await Promise.all([
                    faturamentoService.getDashboardFinanceiro(),
                    faturamentoService.getRelatorioFinanceiro()
                ]);

                const dashData = dashRes.data;
                const faturamento = parseFloat(dashData.faturamento_do_dia || 0);
                const despesas = parseFloat(dashData.despesas_do_dia || 0);
                
                // Gera insights baseados nos dados REAIS
                const insights = [];
                if (despesas > faturamento) insights.push({ type: 'warning', text: 'Despesas excedem entradas hoje.' });
                if (dashData.saldo_em_conta < 0) insights.push({ type: 'error', text: 'Atenção: Saldo negativo.' });
                if (faturamento > 0 && despesas === 0) insights.push({ type: 'success', text: 'Receita sem despesas lançadas.' });
                
                setData({
                    dashboard: dashData,
                    relatorios: relRes.data,
                    insights: insights
                });
            } catch (error) {
                console.error("Erro ao buscar dados reais", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadAllData();
    }, []);

    const chartsData = useMemo(() => {
        if (!data.relatorios) return null;
        
        // Processamento de dados REAIS para o gráfico
        return {
            fluxo: {
                labels: data.relatorios.fluxo_caixa_mensal.map(item => 
                    new Date(item.mes).toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()
                ),
                datasets: [
                    { 
                        label: 'Entradas', 
                        data: data.relatorios.fluxo_caixa_mensal.map(i => i.receitas), 
                        backgroundColor: '#28a745', 
                        borderRadius: 3,
                        barThickness: 20, // Barras mais finas
                    },
                    { 
                        label: 'Saídas', 
                        data: data.relatorios.fluxo_caixa_mensal.map(i => i.despesas), 
                        backgroundColor: '#dc3545', 
                        borderRadius: 3,
                        barThickness: 20,
                    }
                ]
            },
            categorias: {
                labels: data.relatorios.despesas_por_categoria.map(i => i.categoria__nome),
                datasets: [{ 
                    data: data.relatorios.despesas_por_categoria.map(i => i.total),
                    backgroundColor: ['#1a233b', '#c0a46f', '#28a745', '#dc3545', '#95a5a6'],
                    borderWidth: 0,
                }]
            }
        };
    }, [data.relatorios]);

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { 
                position: 'bottom', 
                labels: { usePointStyle: true, boxWidth: 6, font: { size: 10 } } // Legenda menor
            }
        },
        scales: {
            x: { ticks: { font: { size: 10 } } },
            y: { ticks: { font: { size: 10 } } }
        }
    };

    if (isLoading) return <div className="financial-container" style={{padding: '20px'}}><p>Carregando finanças...</p></div>;

    return (
        <div className="financial-container">
            
            {/* Controles discretos no topo direito (Sem Título "Visão Geral") */}
            <div className="dashboard-controls">
                <button className="filter-btn active">Hoje</button>
                <button className="filter-btn">Mês</button>
            </div>

            {/* KPIS SLIM */}
            <section className="kpi-grid">
                <div className="kpi-card revenue">
                    <div className="kpi-info">
                        <h3>Faturamento</h3>
                        <p className="kpi-value" style={{color: '#28a745'}}>
                            {formatMoney(data.dashboard.faturamento_do_dia)}
                        </p>
                    </div>
                    <div className="kpi-icon"><AttachMoney fontSize="inherit" /></div>
                </div>

                <div className="kpi-card expense">
                    <div className="kpi-info">
                        <h3>Despesas</h3>
                        <p className="kpi-value" style={{color: '#dc3545'}}>
                            {formatMoney(data.dashboard.despesas_do_dia)}
                        </p>
                    </div>
                    <div className="kpi-icon"><MoneyOff fontSize="inherit" /></div>
                </div>

                <div className="kpi-card neutral">
                    <div className="kpi-info">
                        <h3>Lucro</h3>
                        <p className="kpi-value" style={{color: data.dashboard.lucro_do_dia >= 0 ? '#1a233b' : '#dc3545'}}>
                            {formatMoney(data.dashboard.lucro_do_dia)}
                        </p>
                    </div>
                    <div className="kpi-icon"><TrendingUp fontSize="inherit" /></div>
                </div>

                <div className="kpi-card balance">
                    <div className="kpi-info">
                        <h3>Saldo</h3>
                        <p className="kpi-value">
                            {formatMoney(data.dashboard.saldo_em_conta)}
                        </p>
                    </div>
                    <div className="kpi-icon"><AccountBalanceWallet fontSize="inherit" /></div>
                </div>
            </section>

            {/* GRÁFICOS (Layout fixo para não rolar) */}
            <section className="dashboard-main">
                
                {/* Gráfico de Barras */}
                <div className="white-box">
                    <div className="box-header">
                        <h3 className="box-title">Fluxo Semestral</h3>
                    </div>
                    {/* Altura forçada reduzida para 220px */}
                    <div style={{ height: '220px', width: '100%' }}>
                        {chartsData && <Bar data={chartsData.fluxo} options={commonOptions} />}
                    </div>
                </div>

                {/* Coluna Direita */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    
                    {/* Rosca */}
                    <div className="white-box" style={{ flex: 1 }}>
                        <div className="box-header">
                            <h3 className="box-title">Categorias</h3>
                        </div>
                        {/* Altura forçada reduzida para 140px */}
                        <div style={{ height: '140px', width: '100%' }}>
                            {chartsData && <Doughnut data={chartsData.categorias} options={{...commonOptions, plugins: { legend: { display: false }}}} />}
                        </div>
                    </div>

                    {/* Insights Compactos */}
                    <div className="white-box" style={{ flex: 1 }}>
                        <div className="box-header">
                            <h3 className="box-title">
                                <VerifiedUser sx={{ fontSize: 16, marginRight: 1, color: '#c0a46f', verticalAlign: 'middle' }} />
                                Resumo
                            </h3>
                        </div>
                        <div className="transaction-list">
                            {data.insights.length > 0 ? (
                                data.insights.map((ins, i) => (
                                    <div key={i} className="transaction-item">
                                        <span className="t-desc">{ins.text}</span>
                                        <span className={`t-amount ${ins.type === 'error' ? 'amount-neg' : 'amount-pos'}`}>●</span>
                                    </div>
                                ))
                            ) : (
                                <span style={{fontSize: '0.8rem', color: '#999'}}>Sem alertas.</span>
                            )}
                        </div>
                    </div>

                </div>
            </section>
        </div>
    );
}