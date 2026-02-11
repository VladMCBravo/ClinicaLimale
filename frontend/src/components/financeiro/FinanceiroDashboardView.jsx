// src/components/financeiro/FinanceiroDashboardView.jsx
import React, { useState, useEffect } from 'react';
import { 
    Button, IconButton, LinearProgress 
} from '@mui/material';
import { 
    TrendingDown, AccountBalanceWallet, AttachMoney, 
    Storefront, Refresh, Public, CalendarMonth
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar 
} from 'recharts';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

// Importa o CSS Unificado
import './Financeiro.css';

import { faturamentoService } from '../../services/faturamentoService';
import { agendamentoService } from '../../services/agendamentoService';

dayjs.locale('pt-br');

const COLORS = {
    receita: '#2e7d32', despesa: '#d32f2f', saldo: '#1976d2',   
    fixa: '#0288d1', variavel: '#ed6c02', pendente: '#f57c00',
    atrasado: '#d32f2f', ocupacao: '#009688'
};

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
const formatK = (val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val;

export default function FinanceiroDashboardView() {
    const [loading, setLoading] = useState(true);
    const [filtroData, setFiltroData] = useState(dayjs()); 
    const [modoGeral, setModoGeral] = useState(false);
    
    const [dados, setDados] = useState({
        kpis: { valorOperacional: 0, valorAportes: 0, totalDespesas: 0, despesasPagas: 0, saldo: 0, ticketMedio: 0 },
        grafico_fluxo: [],
        custos_mes: { fixas: 0, variaveis: 0 }
    });

    const [operacional, setOperacional] = useState({ taxa_ocupacao: 0, ticket_medio_hora: 0 });

    const fetchDados = async () => {
        setLoading(true);
        try {
            const params = {};
            if (!modoGeral && filtroData) {
                params.mes = filtroData.month() + 1;
                params.ano = filtroData.year();
            }

            const [resFin, resOp] = await Promise.all([
                faturamentoService.getDashboardFinanceiro(params).catch(() => ({ data: null })),
                agendamentoService.getDashboardKPIs ? agendamentoService.getDashboardKPIs(params).catch(() => ({ data: {} })) : { data: {} }
            ]);
            
            if (resFin.data) {
                setDados({
                    ...resFin.data,
                    grafico_fluxo: Array.isArray(resFin.data.grafico_fluxo) ? resFin.data.grafico_fluxo : []
                });
            }
            if (resOp.data) setOperacional(resOp.data);

        } catch (error) {
            console.error("Erro dashboard", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDados(); }, [filtroData, modoGeral]);

    const kpis = dados?.kpis || {};
    const custos = dados?.custos_mes || { fixas: 0, variaveis: 0 };
    const fluxo = dados?.grafico_fluxo || [];

    const dataPie = [
        { name: 'Fixas', value: custos.fixas || 0 },
        { name: 'Variáveis', value: custos.variaveis || 0 }
    ];

    return (
        <div className="fin-container">
            {/* 1. BARRA DE FILTROS */}
            <div className="fin-toolbar">
                <div className="fin-filter-group">
                    <Button 
                        className="fin-btn-toggle"
                        variant={modoGeral ? "contained" : "outlined"} 
                        color={modoGeral ? "primary" : "inherit"}
                        onClick={() => setModoGeral(!modoGeral)}
                        startIcon={modoGeral ? <Public fontSize="small"/> : <CalendarMonth fontSize="small"/>}
                        size="small"
                    >
                        {modoGeral ? "Visão Geral" : "Visão Mensal"}
                    </Button>

                    {!modoGeral && (
                        <DatePicker 
                            views={['month', 'year']}
                            value={filtroData}
                            onChange={(v) => setFiltroData(v)}
                            slotProps={{ textField: { size: 'small', variant: 'standard', sx: { width: 100 } } }}
                        />
                    )}
                </div>
                <IconButton size="small" onClick={fetchDados} title="Atualizar"><Refresh fontSize="small" /></IconButton>
            </div>

            {loading && <LinearProgress sx={{ mb: 1, height: 2 }} />}

            {/* 2. CARDS DE KPI */}
            <div className="fin-kpi-grid">
                <KPICard title="FATURAMENTO" value={kpis.valorOperacional} icon={<Storefront />} color="success" subtext={`+ ${formatMoney(kpis.valorAportes)} aportes`} />
                <KPICard title="DESPESAS" value={kpis.totalDespesas} icon={<TrendingDown />} color="danger" subtext={`Pago: ${formatMoney(kpis.despesasPagas)}`} />
                <KPICard title="SALDO LÍQUIDO" value={kpis.saldo} icon={<AccountBalanceWallet />} color={(kpis.saldo||0) >= 0 ? "primary" : "danger"} subtext="Realizado" />
                <KPICard title="TICKET MÉDIO" value={kpis.ticketMedio} icon={<AttachMoney />} color="warning" subtext="Por atendimento" />
            </div>

            {/* 3. GRÁFICOS */}
            <div className="fin-charts-grid">
                
                {/* GRÁFICO PRINCIPAL */}
                <div className="fin-chart-box">
                    <div className="fin-chart-header">
                        <span className="fin-chart-title">
                            {modoGeral ? "EVOLUÇÃO ANUAL" : "FLUXO DIÁRIO"}
                        </span>
                        <div style={{ display: 'flex', gap: 10, fontSize: '0.65rem' }}>
                            <span style={{ color: COLORS.receita }}>● Entradas</span>
                            <span style={{ color: COLORS.despesa }}>● Saídas</span>
                        </div>
                    </div>
                    <div className="fin-chart-content">
                        {fluxo.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={fluxo} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={COLORS.receita} stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor={COLORS.receita} stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={COLORS.despesa} stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor={COLORS.despesa} stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="name" style={{ fontSize: '0.65rem' }} axisLine={false} tickLine={false} dy={5} />
                                    <YAxis tickFormatter={formatK} style={{ fontSize: '0.65rem' }} axisLine={false} tickLine={false} />
                                    <RechartsTooltip formatter={(value) => formatMoney(value)} contentStyle={{ fontSize: '0.8rem' }} />
                                    <Area type="monotone" dataKey="entradas" stroke={COLORS.receita} strokeWidth={2} fill="url(#colorEntradas)" />
                                    <Area type="monotone" dataKey="saidas" stroke={COLORS.despesa} strokeWidth={2} fill="url(#colorSaidas)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '0.8rem' }}>Sem dados</div>
                        )}
                    </div>
                </div>

                {/* SIDEBAR */}
                <div className="fin-sidebar-stack">
                    {/* Operacional */}
                    <div className="fin-mini-panel" style={{ backgroundColor: '#e0f2f1', borderColor: '#b2dfdb' }}>
                        <div className="fin-row">
                            <span style={{ color: COLORS.ocupacao, fontWeight: 'bold' }}>OCUPAÇÃO</span>
                            <span style={{ color: COLORS.ocupacao, fontWeight: 'bold' }}>{operacional.taxa_ocupacao || 0}%</span>
                        </div>
                        <LinearProgress variant="determinate" value={operacional.taxa_ocupacao || 0} sx={{ height: 6, borderRadius: 4, mb: 1, bgcolor: 'white', '& .MuiLinearProgress-bar': { bgcolor: COLORS.ocupacao } }} />
                        <div className="fin-row">
                            <span className="fin-label" style={{ fontSize: '0.65rem' }}>Faturamento/Hora:</span>
                            <span className="fin-val" style={{ fontSize: '0.7rem' }}>{formatMoney(operacional.ticket_medio_hora)}</span>
                        </div>
                    </div>

                    {/* Custos */}
                    <div className="fin-mini-panel">
                        <div className="fin-chart-title" style={{ marginBottom: 5 }}>CUSTOS</div>
                        <div style={{ display: 'flex', alignItems: 'center', height: '100%', minHeight: 0 }}>
                            <div style={{ width: '40%', height: 70 }}>
                                <ResponsiveContainer>
                                    <RechartsPieChart>
                                        <Pie data={dataPie} innerRadius={12} outerRadius={28} paddingAngle={2} dataKey="value">
                                            {dataPie.map((entry, index) => <Cell key={index} fill={index === 0 ? COLORS.fixa : COLORS.variavel} />)}
                                        </Pie>
                                    </RechartsPieChart>
                                </ResponsiveContainer>
                            </div>
                            <div style={{ width: '60%', paddingLeft: 5 }}>
                                <div className="fin-row"><span style={{ color: COLORS.fixa }}>Fixos</span> <span>{formatK(custos.fixas)}</span></div>
                                <div className="fin-row"><span style={{ color: COLORS.variavel }}>Var.</span> <span>{formatK(custos.variaveis)}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const KPICard = ({ title, value, icon, color, subtext }) => (
    <div className={`fin-card border-l-${color}`}>
        <div className="fin-card-content">
            <span className="fin-card-title">{title}</span>
            <span className="fin-card-value" style={{ color: color === 'danger' ? COLORS.despesa : (color === 'success' ? COLORS.receita : '#1a233b') }}>
                {formatMoney(value)}
            </span>
            <span className="fin-card-sub">{subtext}</span>
        </div>
        <div className="fin-card-icon" style={{ color: color === 'danger' ? COLORS.despesa : COLORS.receita }}>
            {icon}
        </div>
    </div>
);