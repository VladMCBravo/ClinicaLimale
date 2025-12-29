import React, { useState, useEffect, useMemo } from 'react';
// Mantemos os ícones pois são bonitos e úteis, mas vamos estilizá-los com o CSS
import { 
    TrendingUp, TrendingDown, AccountBalanceWallet, 
    AttachMoney, MoneyOff, VerifiedUser 
} from '@mui/icons-material';

import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

import { faturamentoService } from '../../services/faturamentoService';
import './FinancialDashboard.css'; // Importando o CSS que criamos

// Registra ChartJS
ChartJS.register(ArcElement, ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function DashboardFinanceiro() {
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState({ dashboard: null, relatorios: null, insights: [] });

    // Formatador de Moeda
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
                
                // Insights Simulados
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
                        backgroundColor: '#28a745', // Verde do seu CSS
                        borderRadius: 4, 
                        barPercentage: 0.6 
                    },
                    { 
                        label: 'Saídas', 
                        data: data.relatorios.fluxo_caixa_mensal.map(i => i.despesas), 
                        backgroundColor: '#dc3545', // Vermelho do seu CSS
                        borderRadius: 4, 
                        barPercentage: 0.6 
                    }
                ]
            },
            categorias: {
                labels: data.relatorios.despesas_por_categoria.map(i => i.categoria__nome),
                datasets: [{ 
                    data: data.relatorios.despesas_por_categoria.map(i => i.total),
                    backgroundColor: ['#1a233b', '#c0a46f', '#28a745', '#dc3545', '#7f8c8d'], // Cores do tema
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            }
        };
    }, [data.relatorios]);

    // Configurações dos Gráficos
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { 
                position: 'bottom', 
                labels: { usePointStyle: true, font: { family: "'Segoe UI', sans-serif" } } 
            }
        }
    };

    if (isLoading) return <div className="financial-container"><p>Carregando dados financeiros...</p></div>;
    if (!data.dashboard) return <div className="financial-container"><p>Sem dados disponíveis.</p></div>;

    return (
        <div className="financial-container">
            
            {/* 1. CABEÇALHO */}
            <header className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">Visão Geral</h1>
                    <span style={{color: '#999', fontSize: '0.9rem'}}>Atualizado em tempo real</span>
                </div>
                <div className="dashboard-controls">
                    <button className="filter-btn active">Hoje</button>
                    <button className="filter-btn">Mês</button>
                </div>
            </header>

            {/* 2. KPIS (Cards Superiores) */}
            <section className="kpi-grid">
                
                {/* Faturamento */}
                <div className="kpi-card revenue">
                    <div className="kpi-info">
                        <h3>Faturamento Hoje</h3>
                        <p className="kpi-value" style={{color: '#28a745'}}>
                            {formatMoney(data.dashboard.faturamento_do_dia)}
                        </p>
                    </div>
                    <div className="kpi-icon">
                        <AttachMoney fontSize="inherit" />
                    </div>
                </div>

                {/* Despesas */}
                <div className="kpi-card expense">
                    <div className="kpi-info">
                        <h3>Despesas Hoje</h3>
                        <p className="kpi-value" style={{color: '#dc3545'}}>
                            {formatMoney(data.dashboard.despesas_do_dia)}
                        </p>
                    </div>
                    <div className="kpi-icon">
                        <MoneyOff fontSize="inherit" />
                    </div>
                </div>

                {/* Lucro */}
                <div className={`kpi-card ${data.dashboard.lucro_do_dia >= 0 ? 'revenue' : 'expense'}`}>
                    <div className="kpi-info">
                        <h3>Lucro Líquido</h3>
                        <p className="kpi-value" style={{color: data.dashboard.lucro_do_dia >= 0 ? '#28a745' : '#dc3545'}}>
                            {formatMoney(data.dashboard.lucro_do_dia)}
                        </p>
                    </div>
                    <div className="kpi-icon">
                        {data.dashboard.lucro_do_dia >= 0 ? <TrendingUp fontSize="inherit"/> : <TrendingDown fontSize="inherit"/>}
                    </div>
                </div>

                {/* Saldo (Destaque Azul/Dourado) */}
                <div className="kpi-card balance">
                    <div className="kpi-info">
                        <h3>Saldo em Conta</h3>
                        <p className="kpi-value">
                            {formatMoney(data.dashboard.saldo_em_conta)}
                        </p>
                    </div>
                    <div className="kpi-icon">
                        <AccountBalanceWallet fontSize="inherit" />
                    </div>
                </div>
            </section>

            {/* 3. ÁREA PRINCIPAL */}
            <section className="dashboard-main">
                
                {/* Gráfico de Barras (Fluxo) */}
                <div className="white-box">
                    <div className="box-header">
                        <h3 className="box-title">Fluxo de Caixa Semestral</h3>
                    </div>
                    <div style={{ height: '300px', width: '100%' }}>
                        {chartsData && <Bar data={chartsData.fluxo} options={commonOptions} />}
                    </div>
                </div>

                {/* Coluna Direita: Categorias + Insights */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Gráfico de Rosca */}
                    <div className="white-box">
                        <div className="box-header">
                            <h3 className="box-title">Por Categoria</h3>
                        </div>
                        <div style={{ height: '200px', width: '100%' }}>
                            {chartsData && <Doughnut data={chartsData.categorias} options={commonOptions} />}
                        </div>
                    </div>

                    {/* Insights (Lista customizada reutilizando estilos) */}
                    <div className="white-box">
                        <div className="box-header">
                            <h3 className="box-title">
                                <VerifiedUser sx={{ fontSize: 18, marginRight: 1, color: '#c0a46f' }} />
                                Insights
                            </h3>
                        </div>
                        <div className="transaction-list">
                            {data.insights.map((ins, i) => (
                                <div key={i} className="transaction-item">
                                    <div className="t-info">
                                        <span className="t-desc" style={{ fontSize: '0.9rem' }}>{ins.text}</span>
                                    </div>
                                    <div className={`t-amount ${ins.type === 'error' ? 'amount-neg' : 'amount-pos'}`}>
                                        •
                                    </div>
                                </div>
                            ))}
                            {data.insights.length === 0 && <p style={{color: '#999', padding: '10px'}}>Nenhum alerta.</p>}
                        </div>
                    </div>

                </div>

            </section>
        </div>
    );
}