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
import LancamentoCaixaModal from './LancamentoCaixaModal'; // Importar Modal
import { useSnackbar } from '../../contexts/SnackbarContext'; // Importar Snackbar
import './FinancialDashboard.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const TransactionIcon = ({ type }) => (
    <div className={`st-icon ${type === 'income' ? 'in' : 'out'}`}>
        {type === 'income' ? <ArrowUpward fontSize="inherit"/> : <ArrowDownward fontSize="inherit"/>}
    </div>
);

export default function DashboardFinanceiro() {
    const [isLoading, setIsLoading] = useState(true);
    const [showBalance, setShowBalance] = useState(true);
    const { showSnackbar } = useSnackbar();
    
    // Dados
    const [dashboardData, setDashboardData] = useState(null);
    const [extrato, setExtrato] = useState([]);
    const [alertas, setAlertas] = useState([]); // A variável se chama "alertas"

    // Estados para o Modal de Ação Rápida
    const [modalOpen, setModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState({ tab: 1, type: 'receita' });

    const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

    // Função para recarregar dados (passada para o modal atualizar ao salvar)
    const loadData = async () => {
        try {
            const [dashRes, relRes] = await Promise.all([
                faturamentoService.getDashboardFinanceiro(),
                faturamentoService.getRelatorioFinanceiro()
            ]);

            setDashboardData({
                ...dashRes.data,
                grafico: relRes.data.fluxo_caixa_mensal.slice(-6)
            });

            if (dashRes.data.extrato_real) {
                const extratoFormatado = dashRes.data.extrato_real.map(item => ({
                    ...item,
                    date: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                }));
                setExtrato(extratoFormatado);
            }

            if (dashRes.data.alertas_vencimento) {
                setAlertas(dashRes.data.alertas_vencimento);
            }

        } catch (error) {
            console.error("Erro dashboard", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // --- AÇÕES DOS BOTÕES ---
    const handlePagar = () => {
        setModalConfig({ tab: 1, type: 'despesa' }); // Aba 1 (Avulso), Tipo Despesa
        setModalOpen(true);
    };

    const handleReceber = () => {
        setModalConfig({ tab: 1, type: 'receita' }); // Aba 1 (Avulso), Tipo Receita
        setModalOpen(true);
    };

    const handleExtrato = () => {
        // Rola suavemente até a lista de extrato
        const element = document.getElementById('extrato-section');
        if (element) element.scrollIntoView({ behavior: 'smooth' });
    };

    const handleBoletos = () => {
        showSnackbar('Módulo de Boletos em desenvolvimento.', 'info');
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        loadData(); // Atualiza o saldo e extrato ao fechar o modal
    };

    // Configuração do Gráfico
    const miniChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
        scales: { x: { display: false }, y: { display: false, beginAtZero: true } },
        elements: { bar: { borderRadius: 3 } }
    };
    
    const miniChartData = {
        labels: dashboardData?.grafico?.map(i => i.mes) || [],
        datasets: [
            { data: dashboardData?.grafico?.map(i => i.receitas) || [], backgroundColor: '#c0a46f', barThickness: 8 },
            { data: dashboardData?.grafico?.map(i => i.despesas) || [], backgroundColor: '#1a233b', barThickness: 8 }
        ]
    };

    if (isLoading) return <div className="financial-container" style={{fontSize:'0.8rem'}}>Carregando...</div>;

    return (
        <div className="financial-container">
            
            {/* HEADER */}
            <header className="bank-header">
                <div className="bank-greeting">
                    <h1>Olá, Doutor(a)</h1>
                    <span>Resumo financeiro em tempo real.</span>
                </div>
                <div className="header-date">
                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
                </div>
            </header>

            {/* CARD MASTER & RESUMO */}
            <section className="bank-card-section">
                <div className="master-card">
                    <div className="card-top">
                        <div>
                            <div className="balance-label">Saldo Disponível</div>
                            {showBalance ? (
                                <div className="balance-amount">{formatMoney(dashboardData?.saldo_em_conta)}</div>
                            ) : (
                                <div className="balance-hidden">•••••••</div>
                            )}
                        </div>
                        <div onClick={() => setShowBalance(!showBalance)} style={{ cursor: 'pointer', opacity: 0.7 }}>
                            {showBalance ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </div>
                    </div>
                    <div className="card-actions"><div className="card-chip"></div></div>
                </div>

                <div className="month-summary">
                    <div className="summary-item income">
                        <div>
                            <span className="s-label">Entradas (Hoje)</span>
                            <div className="s-value" style={{color: '#28a745'}}>+ {formatMoney(dashboardData?.faturamento_do_dia)}</div>
                        </div>
                        <ArrowUpward className="s-icon" style={{color: '#28a745'}} />
                    </div>
                    <div className="summary-item expense">
                        <div>
                            <span className="s-label">Saídas (Hoje)</span>
                            <div className="s-value" style={{color: '#dc3545'}}>- {formatMoney(dashboardData?.despesas_do_dia)}</div>
                        </div>
                        <ArrowDownward className="s-icon" style={{color: '#dc3545'}} />
                    </div>
                </div>
            </section>

            {/* AÇÕES RÁPIDAS (COM FUNÇÕES AGORA) */}
            <section className="quick-actions">
                <button className="action-btn" onClick={handlePagar}>
                    <div className="icon-circle"><AddCard fontSize="small"/></div>
                    <span className="action-label">Pagar</span>
                </button>
                <button className="action-btn" onClick={handleReceber}>
                    <div className="icon-circle"><Pix fontSize="small"/></div>
                    <span className="action-label">Receber</span>
                </button>
                <button className="action-btn" onClick={handleExtrato}>
                    <div className="icon-circle"><ReceiptLong fontSize="small"/></div>
                    <span className="action-label">Extrato</span>
                </button>
                <button className="action-btn" onClick={handleBoletos}>
                    <div className="icon-circle"><Payment fontSize="small"/></div>
                    <span className="action-label">Boletos</span>
                </button>
            </section>

            {/* CORPO */}
            <div className="bank-body">
                
                {/* Extrato com ID para scroll */}
                <div id="extrato-section">
                    <div className="section-title">
                        <span>Últimas Movimentações</span>
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
                        {extrato.length === 0 && <p style={{padding: '20px', color:'#999', fontSize:'0.8rem'}}>Sem movimentações.</p>}
                    </div>
                </div>

                <div className="alerts-section">
                    <div className="alert-box">
                        <div className="section-title" style={{marginBottom: 8}}>
                            <span><NotificationsActive sx={{fontSize: 16, mr: 0.5, color:'#f39c12', verticalAlign:'text-bottom'}}/>Avisos</span>
                        </div>
                        {/* AQUI ESTAVA O ERRO: Mudamos de 'alerts' para 'alertas' */}
                        {alertas.length > 0 ? alertas.map(alert => (
                            <div key={alert.id} className="bill-item">
                                <span className="bill-date">{alert.date}</span>
                                <span className="bill-info">{alert.desc}</span>
                                <span className="bill-value">{formatMoney(alert.valor)}</span>
                            </div>
                        )) : <span style={{fontSize:'0.75rem', color:'#999'}}>Nenhum aviso.</span>}
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

            {/* MODAL DE LANÇAMENTO (Reutilizado) */}
            <LancamentoCaixaModal 
                open={modalOpen} 
                onClose={handleCloseModal}
                initialTab={modalConfig.tab}
                initialType={modalConfig.type}
            />
        </div>
    );
}