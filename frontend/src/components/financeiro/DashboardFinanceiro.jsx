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
    const [viewMode, setViewMode] = useState('hoje'); // 'hoje' ou 'mes'
    
    // Estado para guardar os dados brutos da API
    const [rawData, setRawData] = useState({ 
        dashboard: null, 
        relatorios: null 
    });

    // Estado para os valores exibidos nos Cards (calculados)
    const [displayValues, setDisplayValues] = useState({
        faturamento: 0,
        despesas: 0,
        lucro: 0,
        saldo: 0
    });

    const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

    useEffect(() => {
        const loadAllData = async () => {
            try {
                const [dashRes, relRes] = await Promise.all([
                    faturamentoService.getDashboardFinanceiro(),
                    faturamentoService.getRelatorioFinanceiro()
                ]);

                setRawData({
                    dashboard: dashRes.data,
                    relatorios: relRes.data
                });
            } catch (error) {
                console.error("Erro ao buscar dados", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadAllData();
    }, []);

    // Recalcula os valores quando muda o viewMode ou os dados chegam
    useEffect(() => {
        if (!rawData.dashboard) return;

        let fat = 0, desp = 0, luc = 0;

        if (viewMode === 'hoje') {
            // Usa dados diretos do endpoint de dashboard (Snapshot do dia)
            fat = parseFloat(rawData.dashboard.faturamento_do_dia || 0);
            desp = parseFloat(rawData.dashboard.despesas_do_dia || 0);
            luc = parseFloat(rawData.dashboard.lucro_do_dia || 0);
        } else {
            // MODO MÊS: Calcula baseado no relatório mensal do mês atual
            const hoje = new Date();
            const mesAtualStr = hoje.toISOString().slice(0, 7); // "2025-12"

            // Procura no array de fluxo mensal o item do mês atual
            const dadosMes = rawData.relatorios?.fluxo_caixa_mensal?.find(item => item.mes.startsWith(mesAtualStr));

            if (dadosMes) {
                fat = parseFloat(dadosMes.receitas || 0);
                desp = parseFloat(dadosMes.despesas || 0);
                luc = fat - desp;
            } else {
                // Fallback se não achar o mês (ex: dia 1 do mês e ainda não tem registro)
                fat = 0; desp = 0; luc = 0;
            }
        }

        setDisplayValues({
            faturamento: fat,
            despesas: desp,
            lucro: luc,
            saldo: parseFloat(rawData.dashboard.saldo_em_conta || 0) // Saldo é sempre o atual do banco
        });

    }, [viewMode, rawData]);

    const chartsData = useMemo(() => {
        if (!rawData.relatorios) return null;
        
        // FILTRO: Pega apenas os últimos 6 meses para o gráfico
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
                        borderRadius: 3,
                        barPercentage: 0.6,
                        categoryPercentage: 0.8
                    },
                    { 
                        label: 'Saídas', 
                        data: fluxoRecente.map(i => i.despesas), 
                        backgroundColor: '#dc3545', 
                        borderRadius: 3,
                        barPercentage: 0.6,
                        categoryPercentage: 0.8
                    }
                ]
            },
            categorias: {
                labels: rawData.relatorios.despesas_por_categoria.map(i => i.categoria__nome),
                datasets: [{ 
                    data: rawData.relatorios.despesas_por_categoria.map(i => i.total),
                    backgroundColor: ['#1a233b', '#c0a46f', '#28a745', '#dc3545', '#95a5a6', '#6c5ce7'],
                    borderWidth: 0,
                }]
            }
        };
    }, [rawData.relatorios]);

    // Opções de Gráfico minimalistas
    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false } // Remove legenda para economizar espaço vertical
        },
        scales: {
            x: { grid: { display: false }, ticks: { font: { size: 9 } } },
            y: { grid: { borderDash: [4, 4] }, ticks: { font: { size: 9 }, callback: (v) => v >= 1000 ? `${v/1000}k` : v } }
        }
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
            legend: { 
                position: 'right', 
                labels: { boxWidth: 8, font: { size: 9 }, padding: 10 } 
            }
        }
    };

    if (isLoading) return <div className="financial-container" style={{justifyContent:'center'}}><p>Carregando...</p></div>;

    return (
        <div className="financial-container">
            
            {/* Controles: Funcionando agora */}
            <div className="dashboard-controls">
                <button 
                    className={`filter-btn ${viewMode === 'hoje' ? 'active' : ''}`}
                    onClick={() => setViewMode('hoje')}
                >
                    Hoje
                </button>
                <button 
                    className={`filter-btn ${viewMode === 'mes' ? 'active' : ''}`}
                    onClick={() => setViewMode('mes')}
                >
                    Este Mês
                </button>
            </div>

            {/* KPIS */}
            <section className="kpi-grid">
                <div className="kpi-card revenue">
                    <div className="kpi-info">
                        <h3>{viewMode === 'hoje' ? 'Faturamento Hoje' : 'Faturamento Mês'}</h3>
                        <p className="kpi-value" style={{color: '#28a745'}}>
                            {formatMoney(displayValues.faturamento)}
                        </p>
                    </div>
                    <div className="kpi-icon"><AttachMoney fontSize="inherit" /></div>
                </div>

                <div className="kpi-card expense">
                    <div className="kpi-info">
                        <h3>{viewMode === 'hoje' ? 'Despesas Hoje' : 'Despesas Mês'}</h3>
                        <p className="kpi-value" style={{color: '#dc3545'}}>
                            {formatMoney(displayValues.despesas)}
                        </p>
                    </div>
                    <div className="kpi-icon"><MoneyOff fontSize="inherit" /></div>
                </div>

                <div className="kpi-card neutral">
                    <div className="kpi-info">
                        <h3>Lucro Líquido</h3>
                        <p className="kpi-value" style={{color: displayValues.lucro >= 0 ? '#1a233b' : '#dc3545'}}>
                            {formatMoney(displayValues.lucro)}
                        </p>
                    </div>
                    <div className="kpi-icon"><TrendingUp fontSize="inherit" /></div>
                </div>

                <div className="kpi-card balance">
                    <div className="kpi-info">
                        <h3>Saldo Conta</h3>
                        <p className="kpi-value">
                            {formatMoney(displayValues.saldo)}
                        </p>
                    </div>
                    <div className="kpi-icon"><AccountBalanceWallet fontSize="inherit" /></div>
                </div>
            </section>

            {/* GRÁFICOS */}
            <section className="dashboard-main">
                
                {/* Gráfico de Barras */}
                <div className="white-box" style={{ overflow: 'hidden' }}>
                    <div className="box-header">
                        <h3 className="box-title">Fluxo Semestral (Últimos 6 meses)</h3>
                    </div>
                    <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                        {chartsData && <Bar data={chartsData.fluxo} options={barOptions} />}
                    </div>
                </div>

                {/* Coluna Direita (Vertical Flex) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    
                    {/* Rosca */}
                    <div className="white-box" style={{ flex: 1, minHeight: 0 }}>
                        <div className="box-header">
                            <h3 className="box-title">Categorias</h3>
                        </div>
                        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                            {chartsData && <Doughnut data={chartsData.categorias} options={doughnutOptions} />}
                        </div>
                    </div>

                    {/* Resumo/Insights */}
                    <div className="white-box" style={{ height: 'auto', maxHeight: '120px' }}>
                        <div className="box-header">
                            <h3 className="box-title">
                                <VerifiedUser sx={{ fontSize: 14, marginRight: 1, color: '#c0a46f' }} />
                                Resumo Rápido
                            </h3>
                        </div>
                        <div className="transaction-list">
                            {displayValues.despesas > displayValues.faturamento && (
                                <div className="transaction-item">
                                    <span className="t-desc">Despesas excedem entradas.</span>
                                    <span className="t-amount amount-neg"> Atenção</span>
                                </div>
                            )}
                            {displayValues.saldo < 0 && (
                                <div className="transaction-item">
                                    <span className="t-desc">Saldo bancário negativo.</span>
                                    <span className="t-amount amount-neg">Crítico</span>
                                </div>
                            )}
                            {displayValues.faturamento > displayValues.despesas && (
                                <div className="transaction-item">
                                    <span className="t-desc">Fluxo positivo no período.</span>
                                    <span className="t-amount amount-pos">Ótimo</span>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </section>
        </div>
    );
}