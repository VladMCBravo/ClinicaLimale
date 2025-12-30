// src/components/financeiro/DashboardFinanceiro.jsx
import React, { useState, useEffect } from 'react';
import { 
    Visibility, VisibilityOff, 
    ArrowUpward, ArrowDownward, 
    AddCard, Pix, ReceiptLong, Payment,
    NotificationsActive
} from '@mui/icons-material';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Bar } from 'react-chartjs-2';

import { faturamentoService } from '../../services/faturamentoService';
import './FinancialDashboard.css';

// Registra componentes do ChartJS
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

// Componente para o ícone do Extrato
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
                // 1. Busca Dashboard (Saldos) e Relatórios (Gráficos)
                const [dashRes, relRes] = await Promise.all([
                    faturamentoService.getDashboardFinanceiro(),
                    faturamentoService.getRelatorioFinanceiro()
                ]);

                setDashboardData({
                    ...dashRes.data,
                    // Dados para gráfico mini
                    grafico: relRes.data.fluxo_caixa_mensal.slice(-4) // Últimos 4 meses
                });

                // 2. SIMULAÇÃO DO EXTRATO (Já que não temos endpoint de extrato unificado ainda)
                // Na prática, você criaria um endpoint /extrato/ no backend que retorna tudo misturado ordenado por data.
                // Aqui vou pegar os "pendentes de hoje" e simular alguns históricos para visual
                const pendentes = dashRes.data.pagamentos_pendentes_hoje || [];
                
                // Mock de dados para preencher o visual de "banco"
                // Substitua isso por chamadas reais de faturamentoService.getDespesas() e getPagamentos()
                const mockExtrato = [
                    ...pendentes.map(p => ({
                        id: `p-${Math.random()}`,
                        desc: `Recebimento - ${p.paciente}`,
                        date: 'Hoje',
                        amount: parseFloat(p.valor),
                        type: 'income',
                        status: 'Pendente' // Mostraremos na lista
                    })),
                    // Exemplos fixos para dar a cara de "Extrato" (remover quando tiver endpoint real)
                    { id: 1, desc: 'Pagamento Aluguel', date: 'Ontem', amount: 2500.00, type: 'expense' },
                    { id: 2, desc: 'Consulta Particular', date: 'Ontem', amount: 350.00, type: 'income' },
                    { id: 3, desc: 'Compra Material Escritório', date: '28/12', amount: 120.50, type: 'expense' },
                ];
                setExtrato(mockExtrato);

                // 3. Alertas (Contas a vencer)
                // Se o backend retornar despesas próximas do vencimento, use aqui.
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

    // Configuração Mini Gráfico (Barras Limpas)
    const miniChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10 } } },
            y: { display: false } // Esconde eixo Y para ficar clean
        }
    };
    
    const miniChartData = {
        labels: dashboardData?.grafico?.map(i => {
            // Formata '2025-01' para 'JAN'
            const [ano, mes] = i.mes.split('-');
            const date = new Date(ano, mes - 1);
            return date.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase();
        }) || [],
        datasets: [
            {
                data: dashboardData?.grafico?.map(i => i.receitas) || [],
                backgroundColor: '#c0a46f', // Dourado nas barras
                borderRadius: 4,
                barThickness: 15
            }
        ]
    };

    if (isLoading) return <div className="financial-container">Carregando Banco...</div>;

    return (
        <div className="financial-container">
            
            {/* 1. HEADER */}
            <header className="bank-header">
                <div className="bank-greeting">
                    <h1>Olá, Doutor(a)</h1>
                    <span>Seu resumo financeiro está atualizado.</span>
                </div>
                <div style={{ color: '#1a233b', fontWeight: 'bold' }}>
                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
            </header>

            {/* 2. CARTÃO MESTRE + RESUMO */}
            <section className="bank-card-section">
                
                {/* O Cartão Azul */}
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
                            {showBalance ? <VisibilityOff /> : <Visibility />}
                        </div>
                    </div>
                    
                    <div className="card-actions">
                        <div className="card-chip"></div>
                        {/* Outros detalhes visuais do cartão se quiser */}
                    </div>
                </div>

                {/* Resumo Mês (Entradas/Saídas) */}
                <div className="month-summary">
                    <div className="summary-item income">
                        <div>
                            <span className="s-label">Entradas (Hoje)</span>
                            <div className="s-value" style={{color: '#28a745'}}>
                                + {formatMoney(dashboardData?.faturamento_do_dia)}
                            </div>
                        </div>
                        <ArrowUpward sx={{ color: '#28a745', opacity: 0.2, fontSize: 30 }} />
                    </div>
                    <div className="summary-item expense">
                        <div>
                            <span className="s-label">Saídas (Hoje)</span>
                            <div className="s-value" style={{color: '#dc3545'}}>
                                - {formatMoney(dashboardData?.despesas_do_dia)}
                            </div>
                        </div>
                        <ArrowDownward sx={{ color: '#dc3545', opacity: 0.2, fontSize: 30 }} />
                    </div>
                </div>
            </section>

            {/* 3. AÇÕES RÁPIDAS */}
            <section className="quick-actions">
                <button className="action-btn">
                    <div className="icon-circle"><AddCard /></div>
                    <span className="action-label">Pagar</span>
                </button>
                <button className="action-btn">
                    <div className="icon-circle"><Pix /></div>
                    <span className="action-label">Receber</span>
                </button>
                <button className="action-btn">
                    <div className="icon-circle"><ReceiptLong /></div>
                    <span className="action-label">Extrato</span>
                </button>
                <button className="action-btn">
                    <div className="icon-circle"><Payment /></div>
                    <span className="action-label">Boletos</span>
                </button>
            </section>

            {/* 4. CORPO (EXTRATO E AVISOS) */}
            <div className="bank-body">
                
                {/* Esquerda: Extrato Recente */}
                <div>
                    <div className="section-title">
                        <span>Últimas Movimentações</span>
                        <a href="#" style={{fontSize:'0.85rem', color:'#c0a46f', textDecoration:'none'}}>Ver completo</a>
                    </div>
                    <div className="statement-list">
                        {extrato.map((item, index) => (
                            <div key={index} className="statement-item">
                                <div style={{display:'flex', alignItems:'center'}}>
                                    <TransactionIcon type={item.type} />
                                    <div className="st-info">
                                        <span className="st-desc">{item.desc}</span>
                                        <span className="st-date">{item.date} • {item.type === 'income' ? 'Receita' : 'Despesa'}</span>
                                    </div>
                                </div>
                                <div className={`st-value ${item.type === 'income' ? 'val-in' : 'val-out'}`}>
                                    {item.type === 'income' ? '+' : '-'} {formatMoney(item.amount)}
                                </div>
                            </div>
                        ))}
                        {extrato.length === 0 && <p style={{padding:20, color:'#999'}}>Nenhuma movimentação recente.</p>}
                    </div>
                </div>

                {/* Direita: Avisos e Plus */}
                <div className="alerts-section">
                    
                    {/* Alertas */}
                    <div className="alert-box">
                        <div className="section-title" style={{marginBottom: 10}}>
                            <span><NotificationsActive sx={{fontSize: 18, mr: 1, color:'#f39c12'}}/>Avisos</span>
                        </div>
                        {alertas.map(alert => (
                            <div key={alert.id} className="bill-item">
                                <span className="bill-date">{alert.date}</span>
                                <span className="bill-info">{alert.desc}</span>
                                <span className="bill-value">{formatMoney(alert.valor)}</span>
                            </div>
                        ))}
                    </div>

                    {/* Gráfico "Plus" no rodapé lateral */}
                    <div className="alert-box">
                        <div className="section-title" style={{marginBottom: 5}}>
                            <span>Fluxo (4 meses)</span>
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