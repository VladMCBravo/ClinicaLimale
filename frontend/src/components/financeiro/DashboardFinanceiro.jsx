// src/components/financeiro/DashboardFinanceiro.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
    TrendingUp, TrendingDown, AccountBalanceWallet, 
    AttachMoney, MoneyOff 
} from '@mui/icons-material';

import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

import { faturamentoService } from '../../services/faturamentoService';
import './FinancialDashboard.css';

ChartJS.register(ArcElement, ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function DashboardFinanceiro() {
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState('hoje');
    
    const [rawData, setRawData] = useState({ dashboard: null, relatorios: null });
    const [displayValues, setDisplayValues] = useState({ faturamento: 0, despesas: 0, lucro: 0, saldo: 0 });

    const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

    useEffect(() => {
        const loadAllData = async () => {
            try {
                const [dashRes, relRes] = await Promise.all([
                    faturamentoService.getDashboardFinanceiro(),
                    faturamentoService.getRelatorioFinanceiro()
                ]);
                setRawData({ dashboard: dashRes.data, relatorios: relRes.data });
            } catch (error) {
                console.error("Erro dados", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadAllData();
    }, []);

    useEffect(() => {
        if (!rawData.dashboard) return;
        let fat = 0, desp = 0, luc = 0;

        if (viewMode === 'hoje') {
            fat = parseFloat(rawData.dashboard.faturamento_do_dia || 0);
            desp = parseFloat(rawData.dashboard.despesas_do_dia || 0);
            luc = parseFloat(rawData.dashboard.lucro_do_dia || 0);
        } else {
            const hoje = new Date();
            const mesAtualStr = hoje.toISOString().slice(0, 7);
            const dadosMes = rawData.relatorios?.fluxo_caixa_mensal?.find(item => item.mes.startsWith(mesAtualStr));
            if (dadosMes) {
                fat = parseFloat(dadosMes.receitas || 0);
                desp = parseFloat(dadosMes.despesas || 0);
                luc = fat - desp;
            }
        }
        setDisplayValues({
            faturamento: fat, despesas: desp, lucro: luc,
            saldo: parseFloat(rawData.dashboard.saldo_em_conta || 0)
        });
    }, [viewMode, rawData]);

    const chartsData = useMemo(() => {
        if (!rawData.relatorios) return null;
        
        // Pega ultimos 6 meses
        const fluxoRecente = rawData.relatorios.fluxo_caixa_mensal.slice(-6);

        return {
            fluxo: {
                labels: fluxoRecente.map(item => 
                    new Date(item.mes).toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()
                ),
                datasets: [
                    { 
                        label: 'Entradas', 
                        data: fluxoRecente.map(i => i.receitas), 
                        backgroundColor: '#28a745', 
                        borderRadius: 4,
                        maxBarThickness: 30, // TRAVA A LARGURA DA BARRA
                    },
                    { 
                        label: 'Saídas', 
                        data: fluxoRecente.map(i => i.despesas), 
                        backgroundColor: '#dc3545', 
                        borderRadius: 4,
                        maxBarThickness: 30, // TRAVA A LARGURA DA BARRA
                    }
                ]
            },
            categorias: {
                labels: rawData.relatorios.despesas_por_categoria.map(i => i.categoria__nome),
                datasets: [{ 
                    data: rawData.relatorios.despesas_por_categoria.map(i => i.total),
                    backgroundColor: ['#1a233b', '#c0a46f', '#28a745', '#dc3545', '#95a5a6', '#6c5ce7', '#e17055'],
                    borderWidth: 0,
                }]
            }
        };
    }, [rawData.relatorios]);

    // Opções Gráfico Barras (Corrigindo eixo Y e Legenda)
    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { 
                display: true, // Mostra legenda pequena
                position: 'top',
                align: 'end',
                labels: { boxWidth: 10, usePointStyle: true, font: { size: 10 } }
            } 
        },
        scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10 } } },
            y: { 
                beginAtZero: true, // FORÇA O ZERO NO EIXO Y
                grid: { borderDash: [4, 4] }, 
                ticks: { font: { size: 10 }, callback: (v) => v >= 1000 ? `${v/1000}k` : v } 
            }
        }
    };

    // Opções Rosca (Legenda compacta na direita)
    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        layout: { padding: 0 },
        plugins: {
            legend: { 
                position: 'right', 
                labels: { boxWidth: 10, font: { size: 10 }, padding: 8 } 
            }
        }
    };

    if (isLoading) return <div className="financial-container"><p>Carregando...</p></div>;

    return (
        <div className="financial-container">
            
            {/* Controles */}
            <div className="dashboard-controls">
                <button className={`filter-btn ${viewMode === 'hoje' ? 'active' : ''}`} onClick={() => setViewMode('hoje')}>Hoje</button>
                <button className={`filter-btn ${viewMode === 'mes' ? 'active' : ''}`} onClick={() => setViewMode('mes')}>Mês</button>
            </div>

            {/* KPIS (Compactos) */}
            <section className="kpi-grid">
                <div className="kpi-card revenue">
                    <div className="kpi-info">
                        <h3>Entradas</h3>
                        <p className="kpi-value" style={{color: '#28a745'}}>{formatMoney(displayValues.faturamento)}</p>
                    </div>
                    <div className="kpi-icon"><AttachMoney fontSize="inherit" /></div>
                </div>
                <div className="kpi-card expense">
                    <div className="kpi-info">
                        <h3>Saídas</h3>
                        <p className="kpi-value" style={{color: '#dc3545'}}>{formatMoney(displayValues.despesas)}</p>
                    </div>
                    <div className="kpi-icon"><MoneyOff fontSize="inherit" /></div>
                </div>
                <div className="kpi-card neutral">
                    <div className="kpi-info">
                        <h3>Lucro</h3>
                        <p className="kpi-value" style={{color: displayValues.lucro >= 0 ? '#1a233b' : '#dc3545'}}>{formatMoney(displayValues.lucro)}</p>
                    </div>
                    <div className="kpi-icon"><TrendingUp fontSize="inherit" /></div>
                </div>
                <div className="kpi-card balance">
                    <div className="kpi-info">
                        <h3>Saldo</h3>
                        <p className="kpi-value">{formatMoney(displayValues.saldo)}</p>
                    </div>
                    <div className="kpi-icon"><AccountBalanceWallet fontSize="inherit" /></div>
                </div>
            </section>

            {/* GRÁFICOS (50% cada lado) */}
            <section className="dashboard-main">
                
                {/* Esquerda: Fluxo */}
                <div className="white-box">
                    <div className="box-header">
                        <h3 className="box-title">Fluxo de Caixa (6 Meses)</h3>
                    </div>
                    <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                        {chartsData && <Bar data={chartsData.fluxo} options={barOptions} />}
                    </div>
                </div>

                {/* Direita: Categorias (Rosca ocupa tudo) */}
                <div className="white-box">
                    <div className="box-header">
                        <h3 className="box-title">Por Categoria</h3>
                    </div>
                    <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                        {chartsData && <Doughnut data={chartsData.categorias} options={doughnutOptions} />}
                    </div>
                </div>

            </section>
        </div>
    );
}