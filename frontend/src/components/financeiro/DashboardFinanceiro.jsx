// src/components/financeiro/DashboardFinanceiro.jsx
import React, { useState, useEffect } from 'react';
import { 
    Visibility, VisibilityOff, 
    ArrowUpward, ArrowDownward, 
    AddCard, Pix, ReceiptLong, Payment,
    NotificationsActive, BarChart
} from '@mui/icons-material';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Bar } from 'react-chartjs-2';

import { faturamentoService } from '../../services/faturamentoService';
import './FinancialDashboard.css';

// Registra componentes do ChartJS
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const TransactionIcon = ({ type }) => (
    <div className={`st-icon ${type === 'income' ? 'in' : 'out'}`}>
        {type === 'income' ? <ArrowUpward fontSize="inherit"/> : <ArrowDownward fontSize="inherit"/>}
    </div>
);

export default function DashboardFinanceiro() {
    const [isLoading, setIsLoading] = useState(true);
    const [showBalance, setShowBalance] = useState(true);
    
    // Dados
    const [dashboardData, setDashboardData] = useState(null);
    const [extrato, setExtrato] = useState([]);
    const [alertas, setAlertas] = useState([]);

    const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [dashRes, relRes] = await Promise.all([
                    faturamentoService.getDashboardFinanceiro(),
                    faturamentoService.getRelatorioFinanceiro()
                ]);

                setDashboardData({
                    ...dashRes.data,
                    grafico: relRes.data.fluxo_caixa_mensal.slice(-6) // Últimos 6 meses
                });

                // Simulação do Extrato (Mantendo lógica anterior)
                const pendentes = dashRes.data.pagamentos_pendentes_hoje || [];
                const mockExtrato = [
                    ...pendentes.map(p => ({
                        id: `p-${Math.random()}`,
                        desc: `Recebimento - ${p.paciente}`,
                        date: 'Hoje',
                        amount: parseFloat(p.valor),
                        type: 'income',
                        status: 'Pendente'
                    })),
                    { id: 1, desc: 'Pagamento Aluguel', date: 'Ontem', amount: 2500.00, type: 'expense' },
                    { id: 2, desc: 'Consulta Particular', date: 'Ontem', amount: 350.00, type: 'income' },
                    { id: 3, desc: 'Material Escritório', date: '28/12', amount: 120.50, type: 'expense' },
                    { id: 4, desc: 'Manutenção Rede', date: '27/12', amount: 450.00, type: 'expense' },
                ];
                setExtrato(mockExtrato);

                setAlertas([
                    { id: 1, desc: 'Internet Vivo', date: 'Amanhã', valor: 149.90 },
                    { id: 2, desc: 'Manutenção AC', date: '02/01', valor: 300.00 }
                ]);

            } catch (error) {
                console.error("Erro dashboard", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // Configuração do Gráfico SUPER Minimalista (Sparkline style)
    const miniChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
            legend: { display: false },
            tooltip: { enabled: true } 
        },
        scales: {
            x: { display: false }, // Remove eixo X
            y: { display: false, beginAtZero: true }  // Remove eixo Y
        },
        elements: {
            bar: { borderRadius: 3 }
        }
    };
    
    const miniChartData = {
        labels: dashboardData?.grafico?.map(i => i.mes) || [],
        datasets: [
            {
                data: dashboardData?.grafico?.map(i => i.receitas) || [],
                backgroundColor: '#c0a46f',
                barThickness: 8 // Barras bem fininhas
            },
            {
                data: dashboardData?.grafico?.map(i => i.despesas) || [],
                backgroundColor: '#1a233b',
                barThickness: 8
            }
        ]
    };

    if (isLoading) return <div className="financial-container" style={{fontSize:'0.8rem'}}>Carregando...</div>;

    return (
        <div className="financial-container">
            
            {/* HEADER COMPACTO */}
            <header className="bank-header">
                <div className="bank-greeting">
                    <h1>Olá, Doutor(a)</h1>
                    <span>Resumo financeiro em tempo real.</span>
                </div>
                <div className="header-date">
                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
                </div>
            </header>

            {/* CARD MASTER & RESUMO (Alinhados) */}
            <section className="bank-card-section">
                
                {/* Cartão Saldo */}
                <div className="master-card">
                    <div className="card-top">
                        <div>
                            <div className="balance-label">Saldo Disponível</div>
                            {showBalance ? (
                                <div className="balance-amount">
                                    {formatMoney(dashboardData?.saldo_em_conta)}
                                </div>
                            ) : (
                                <div className="balance-hidden">•••••••</div>
                            )}
                        </div>
                        <div onClick={() => setShowBalance(!showBalance)} style={{ cursor: 'pointer', opacity: 0.7 }}>
                            {showBalance ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </div>
                    </div>
                    <div className="card-actions">
                        <div className="card-chip"></div>
                    </div>
                </div>

                {/* Resumo Mês (Compacto) */}
                <div className="month-summary">
                    <div className="summary-item income">
                        <div>
                            <span className="s-label">Entradas (Hoje)</span>
                            <div className="s-value" style={{color: '#28a745'}}>
                                + {formatMoney(dashboardData?.faturamento_do_dia)}
                            </div>
                        </div>
                        <ArrowUpward className="s-icon" style={{color: '#28a745'}} />
                    </div>
                    <div className="summary-item expense">
                        <div>
                            <span className="s-label">Saídas (Hoje)</span>
                            <div className="s-value" style={{color: '#dc3545'}}>
                                - {formatMoney(dashboardData?.despesas_do_dia)}
                            </div>
                        </div>
                        <ArrowDownward className="s-icon" style={{color: '#dc3545'}} />
                    </div>
                </div>
            </section>

            {/* AÇÕES RÁPIDAS */}
            <section className="quick-actions">
                <button className="action-btn">
                    <div className="icon-circle"><AddCard fontSize="small"/></div>
                    <span className="action-label">Pagar</span>
                </button>
                <button className="action-btn">
                    <div className="icon-circle"><Pix fontSize="small"/></div>
                    <span className="action-label">Receber</span>
                </button>
                <button className="action-btn">
                    <div className="icon-circle"><ReceiptLong fontSize="small"/></div>
                    <span className="action-label">Extrato</span>
                </button>
                <button className="action-btn">
                    <div className="icon-circle"><Payment fontSize="small"/></div>
                    <span className="action-label">Boletos</span>
                </button>
            </section>

            {/* CORPO (Extrato + Lateral) */}
            <div className="bank-body">
                
                {/* Extrato */}
                <div>
                    <div className="section-title">
                        <span>Últimas Movimentações</span>
                        <a href="#" style={{fontSize:'0.75rem', color:'#c0a46f', textDecoration:'none'}}>Ver tudo</a>
                    </div>
                    <div className="statement-list">
                        {extrato.map((item, index) => (
                            <div key={index} className="statement-item">
                                <div style={{display:'flex', alignItems:'center'}}>
                                    <TransactionIcon type={item.type} />
                                    <div className="st-info">
                                        <span className="st-desc">{item.desc}</span>
                                        <span className="st-date">{item.date}</span>
                                    </div>
                                </div>
                                <div className={`st-value ${item.type === 'income' ? 'val-in' : 'val-out'}`}>
                                    {item.type === 'income' ? '+' : '-'} {formatMoney(item.amount)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Lateral: Avisos + Gráfico */}
                <div className="alerts-section">
                    <div className="alert-box">
                        <div className="section-title" style={{marginBottom: 8}}>
                            <span><NotificationsActive sx={{fontSize: 16, mr: 0.5, color:'#f39c12', verticalAlign:'text-bottom'}}/>Avisos</span>
                        </div>
                        {alertas.map(alert => (
                            <div key={alert.id} className="bill-item">
                                <span className="bill-date">{alert.date}</span>
                                <span className="bill-info">{alert.desc}</span>
                                <span className="bill-value">{formatMoney(alert.valor)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="alert-box">
                        <div className="section-title" style={{marginBottom: 0}}>
                            <span><BarChart sx={{fontSize: 16, mr: 0.5, color:'#1a233b', verticalAlign:'text-bottom'}}/>Fluxo</span>
                        </div>
                        <div className="mini-chart-container">
                            <Bar data={miniChartData} options={miniChartOptions} />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}