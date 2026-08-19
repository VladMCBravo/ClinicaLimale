import React, { useState, useEffect, useMemo } from 'react';
import { 
    Box, Grid, Paper, Typography, Dialog, DialogTitle, DialogContent, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton,
    Tabs, Tab, CircularProgress, Chip
} from '@mui/material';
import { Close, AccountBalanceWallet, ShowChart, AssignmentInd } from '@mui/icons-material';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    ComposedChart, Line, LabelList, AreaChart, Area, Cell
} from 'recharts';
import { FaMoneyBillWave, FaChartLine, FaRegClock, FaExclamationTriangle, FaUserMd, FaClock } from 'react-icons/fa';

import { faturamentoService } from '../../services/faturamentoService';
import { crmService } from '../../services/crmService'; // <-- Serviço de Rentabilidade Adicionado

const COLORS = {
    receita: '#2e7d32', 
    despesa: '#d32f2f', 
    saldo: '#5cb85c',
    barras: ['#2e5b99', '#4b88d3', '#6caddf', '#96ccee', '#b8daff']
};
const ALERT_COLOR = '#d9534f';
const SUCCESS_COLOR = '#5cb85c';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
const formatK = (val) => (Math.abs(val) >= 1000 ? `${(val / 1000).toFixed(0)}k` : val);

const EmptyState = ({ text }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#adb5bd', fontSize: '0.75rem', fontWeight: 'bold' }}>
        {text}
    </Box>
);

export default function FinanceiroDashboardView() {
    const [subAbaAtual, setSubAbaAtual] = useState(0);
    const [loading, setLoading] = useState(true);

    // --- ESTADOS DE DADOS ---
    // Aba 1: Dashboard Base
    const [kpis, setKpis] = useState({ valorOperacional: 0, despesasPagas: 0, saldo: 0, ticketMedio: 0, totalReceber: 0, totalAtrasado: 0 });
    const [evolucao, setEvolucao] = useState([]);
    
    // Aba 1: Projeções
    const [projecao, setProjecao] = useState({ labels: [], saldo_projetado: [] });

    // Aba 2: Relatórios de Receitas e Despesas
    const [relatorio, setRelatorio] = useState({ faturamento_por_forma: [], despesas_por_categoria: [], fluxo_caixa_mensal: [] });

    // Aba 3: Operação e Rentabilidade
    const [consultasProc, setConsultasProc] = useState([]);
    const [medicos, setMedicos] = useState([]);
    const [rentabilidade, setRentabilidade] = useState([]);

    // Modais de Drill-Down
    const [modalMesOpen, setModalMesOpen] = useState(false);
    const [detalheMes, setDetalheMes] = useState(null);
    const [modalMedOpen, setModalMedOpen] = useState(false);
    const [detalheMed, setDetalheMed] = useState(null);

    useEffect(() => {
        setLoading(true);
        Promise.allSettled([
            faturamentoService.getDashboardFinanceiro(),
            faturamentoService.getProjecaoFinanceira(),
            faturamentoService.getRelatorioFinanceiro(),
            crmService.getRentabilidade()
        ]).then((results) => {
            const [resDash, resProj, resRel, resRent] = results;
            
            if (resDash.status === 'fulfilled' && resDash.value.data) {
                if(resDash.value.data.kpis) setKpis(resDash.value.data.kpis);
                if(resDash.value.data.grafico_evolucao) setEvolucao(resDash.value.data.grafico_evolucao);
                if(resDash.value.data.grafico_consultas_proc) setConsultasProc(resDash.value.data.grafico_consultas_proc);
                if(resDash.value.data.grafico_medicos) setMedicos(resDash.value.data.grafico_medicos);
            }
            if (resProj.status === 'fulfilled' && resProj.value.data) setProjecao(resProj.value.data);
            if (resRel.status === 'fulfilled' && resRel.value.data) setRelatorio(resRel.value.data);
            if (resRent.status === 'fulfilled' && resRent.value.data) setRentabilidade(resRent.value.data);
            
            setLoading(false);
        });
    }, []);

    // --- TRATAMENTO DE DADOS ---
    const dadosProjecaoChart = useMemo(() => {
        const labels = projecao.labels || [];
        return labels.map((label, i) => ({
            name: label,
            saldo: (projecao.saldo_projetado || [])[i] ?? 0,
        }));
    }, [projecao]);

    const medicosLimpos = medicos.map(m => ({
        ...m,
        nomeLimpo: m.nome.replace('Dr(a). ', '').replace('Dr. ', '').replace('Dra. ', '')
    }));

    const fluxoCaixaMensal = relatorio.fluxo_caixa_mensal || [];
    const faturamentoPorForma = relatorio.faturamento_por_forma || [];
    const despesasPorCategoria = relatorio.despesas_por_categoria || [];

    // --- SUB-COMPONENTES ---
    const handleOpenMes = (data) => { if(data && data.activePayload) { setDetalheMes(data.activePayload[0].payload); setModalMesOpen(true); } };
    const handleOpenMed = (data) => { if(data && data.activePayload) { setDetalheMed(data.activePayload[0].payload); setModalMedOpen(true); } };

    const KpiCard = ({ titulo, valor, cor, icone }) => (
        <Paper className="tasy-flat-panel" sx={{ p: 1, display: 'flex', alignItems: 'center', height: '100%', borderLeft: `4px solid ${cor}` }}>
            <Box sx={{ flexGrow: 1 }}>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#6c757d', textTransform: 'uppercase' }}>{titulo}</Typography>
                <Typography sx={{ fontSize: '1rem', fontWeight: 900, color: '#343a40', mt: 0.2 }}>{valor}</Typography>
            </Box>
            <Box sx={{ color: cor, opacity: 0.8, fontSize: '1.2rem' }}>{icone}</Box>
        </Paper>
    );

    return (
        <Box className="tasy-workspace" sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 1, backgroundColor: '#f1f3f5', overflow: 'hidden' }}>
            
            {/* CABEÇALHO COMPACTO */}
            <Paper className="tasy-flat-panel" sx={{ mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, pr: 1 }}>
                <Box sx={{ p: 1, pl: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ bgcolor: '#e3f2fd', p: 0.6, borderRadius: 1, display: 'flex', alignItems: 'center' }}>
                        <AccountBalanceWallet sx={{ color: '#1565c0', fontSize: 18 }} />
                    </Box>
                    <Box>
                        <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" lineHeight={1} fontSize="0.65rem">
                            GESTÃO CLÍNICA
                        </Typography>
                        <Typography variant="subtitle2" fontWeight="800" color="#343a40" lineHeight={1}>
                            Inteligência Financeira
                        </Typography>
                    </Box>
                </Box>
                
                <Tabs value={subAbaAtual} onChange={(e, val) => setSubAbaAtual(val)} indicatorColor="primary" textColor="primary" sx={{ minHeight: 36 }}>
                    <Tab icon={<ShowChart sx={{ fontSize: 16 }}/>} iconPosition="start" label="Dashboard & Projeções" sx={{ minHeight: 36, fontSize: '0.70rem', fontWeight: 'bold', p: 1 }} />
                    <Tab icon={<AccountBalanceWallet sx={{ fontSize: 16 }}/>} iconPosition="start" label="Receitas & Despesas" sx={{ minHeight: 36, fontSize: '0.70rem', fontWeight: 'bold', p: 1 }} />
                    <Tab icon={<AssignmentInd sx={{ fontSize: 16 }}/>} iconPosition="start" label="Operação & Rentabilidade" sx={{ minHeight: 36, fontSize: '0.70rem', fontWeight: 'bold', p: 1 }} />
                </Tabs>
            </Paper>

            {loading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={24} /></Box>}

            {/* ÁREA DE CONTEÚDO */}
            {!loading && (
                <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    
                    {/* ========================================== */}
                    {/* ABA 1: DASHBOARD & PROJEÇÕES               */}
                    {/* ========================================== */}
                    {subAbaAtual === 0 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
                            {/* KPIs */}
                            <Grid container spacing={1} sx={{ flexShrink: 0 }}>
                                <Grid item xs={2}><KpiCard titulo="Faturamento Realizado" valor={formatCurrency(kpis.valorOperacional)} cor={SUCCESS_COLOR} icone={<FaChartLine />} /></Grid>
                                <Grid item xs={2}><KpiCard titulo="Despesas Pagas" valor={formatCurrency(kpis.despesasPagas)} cor={ALERT_COLOR} icone={<FaMoneyBillWave />} /></Grid>
                                <Grid item xs={2}><KpiCard titulo="Saldo em Caixa" valor={formatCurrency(kpis.saldo)} cor={kpis.saldo >= 0 ? SUCCESS_COLOR : ALERT_COLOR} icone={<FaMoneyBillWave />} /></Grid>
                                <Grid item xs={2}><KpiCard titulo="Ticket Médio" valor={formatCurrency(kpis.ticketMedio)} cor="#0275d8" icone={<FaChartLine />} /></Grid>
                                <Grid item xs={2}><KpiCard titulo="Contas a Receber" valor={formatCurrency(kpis.totalReceber)} cor="#f0ad4e" icone={<FaRegClock />} /></Grid>
                                <Grid item xs={2}><KpiCard titulo="Inadimplência (Atraso)" valor={formatCurrency(kpis.totalAtrasado)} cor={ALERT_COLOR} icone={<FaExclamationTriangle />} /></Grid>
                            </Grid>

                            {/* Gráficos Principais de Saldo */}
                            <Box sx={{ flex: 1, display: 'flex', gap: 1, minHeight: 0 }}>
                                <Paper className="tasy-flat-panel" sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1 }}>
                                    <div className="tasy-section-header" style={{ margin: '-8px -8px 8px -8px' }}>Evolução Histórica de Saldo (6 Meses)</div>
                                    <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={evolucao} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ecef" />
                                                <XAxis dataKey="mes" tick={{fontSize: 11}} axisLine={false} tickLine={false} />
                                                <YAxis tick={{fontSize: 11}} axisLine={false} tickLine={false} tickFormatter={(val) => `R$ ${val/1000}k`} />
                                                <RechartsTooltip formatter={(val) => formatCurrency(val)} contentStyle={{ fontSize: '12px', borderRadius: '4px', border: '1px solid #dee2e6' }} />
                                                <Line type="monotone" dataKey="saldo" name="Saldo Efetivo" stroke={COLORS.saldo} strokeWidth={2} dot={{ r: 4 }} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </Paper>

                                <Paper className="tasy-flat-panel" sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1 }}>
                                    <div className="tasy-section-header" style={{ margin: '-8px -8px 8px -8px' }}>Projeção de Saldo (Próximos Dias)</div>
                                    <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                                        {dadosProjecaoChart.length === 0 ? <EmptyState text="Sem dados de projeção." /> : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={dadosProjecaoChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor={COLORS.barras[0]} stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor={COLORS.barras[0]} stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ecef" />
                                                    <XAxis dataKey="name" style={{ fontSize: '0.65rem', fill: '#6c757d' }} axisLine={false} tickLine={false} />
                                                    <YAxis tickFormatter={formatK} style={{ fontSize: '0.65rem', fill: '#6c757d' }} axisLine={false} tickLine={false} />
                                                    <RechartsTooltip formatter={(value) => formatCurrency(value)} contentStyle={{ fontSize: '0.75rem', borderRadius: 4, border: '1px solid #dee2e6' }} />
                                                    <Area type="monotone" dataKey="saldo" name="Saldo Estimado" stroke={COLORS.barras[0]} strokeWidth={3} fill="url(#colorSaldo)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        )}
                                    </Box>
                                </Paper>
                            </Box>
                        </Box>
                    )}

                    {/* ========================================== */}
                    {/* ABA 2: RECEITAS & DESPESAS                 */}
                    {/* ========================================== */}
                    {subAbaAtual === 1 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
                            <Paper className="tasy-flat-panel" sx={{ flex: 1.2, display: 'flex', flexDirection: 'column', p: 1 }}>
                                <div className="tasy-section-header" style={{ margin: '-8px -8px 8px -8px' }}>Histórico Mensal: Receitas vs Despesas</div>
                                <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                                    {fluxoCaixaMensal.length === 0 ? <EmptyState text="Sem histórico suficiente." /> : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={fluxoCaixaMensal} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ecef" />
                                                <XAxis dataKey="mes" style={{ fontSize: '0.65rem', fill: '#6c757d' }} axisLine={false} tickLine={false} />
                                                <YAxis tickFormatter={formatK} style={{ fontSize: '0.65rem', fill: '#6c757d' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip formatter={(value) => formatCurrency(value)} contentStyle={{ fontSize: '0.75rem', borderRadius: 4, border: '1px solid #dee2e6' }} cursor={{fill: '#f8f9fa'}} />
                                                <Legend wrapperStyle={{ fontSize: '0.65rem' }} />
                                                <Bar dataKey="receitas" name="Receitas" fill={COLORS.receita} radius={[2, 2, 0, 0]} barSize={20} />
                                                <Bar dataKey="despesas" name="Despesas" fill={COLORS.despesa} radius={[2, 2, 0, 0]} barSize={20} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </Box>
                            </Paper>

                            <Box sx={{ flex: 1, display: 'flex', gap: 1, minHeight: 0 }}>
                                <Paper className="tasy-flat-panel" sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1 }}>
                                    <div className="tasy-section-header" style={{ margin: '-8px -8px 8px -8px' }}>Receita: Meios de Pagamento</div>
                                    <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                                        {faturamentoPorForma.length === 0 ? <EmptyState text="Sem receitas registradas." /> : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={faturamentoPorForma} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e9ecef" />
                                                    <XAxis type="number" tickFormatter={formatK} style={{ fontSize: '0.65rem', fill: '#6c757d' }} axisLine={false} tickLine={false} />
                                                    <YAxis type="category" dataKey="forma_pagamento" width={90} style={{ fontSize: '0.6rem', fill: '#495057', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                                    <RechartsTooltip formatter={(value) => formatCurrency(value)} contentStyle={{ fontSize: '0.75rem', borderRadius: 4, border: '1px solid #dee2e6' }} cursor={{fill: '#f8f9fa'}} />
                                                    <Bar dataKey="total" name="Valor" radius={[0, 2, 2, 0]} barSize={16}>
                                                        {faturamentoPorForma.map((_, index) => <Cell key={index} fill={COLORS.barras[index % COLORS.barras.length]} />)}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        )}
                                    </Box>
                                </Paper>

                                <Paper className="tasy-flat-panel" sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1 }}>
                                    <div className="tasy-section-header" style={{ margin: '-8px -8px 8px -8px' }}>Despesa: Distribuição por Categoria</div>
                                    <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                                        {despesasPorCategoria.length === 0 ? <EmptyState text="Sem despesas registradas." /> : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={despesasPorCategoria} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e9ecef" />
                                                    <XAxis type="number" tickFormatter={formatK} style={{ fontSize: '0.65rem', fill: '#6c757d' }} axisLine={false} tickLine={false} />
                                                    <YAxis type="category" dataKey="categoria_nome" width={110} style={{ fontSize: '0.6rem', fill: '#495057', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                                    <RechartsTooltip formatter={(value) => formatCurrency(value)} contentStyle={{ fontSize: '0.75rem', borderRadius: 4, border: '1px solid #dee2e6' }} cursor={{fill: '#f8f9fa'}} />
                                                    <Bar dataKey="total" name="Valor" fill={COLORS.despesa} radius={[0, 2, 2, 0]} barSize={16} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        )}
                                    </Box>
                                </Paper>
                            </Box>
                        </Box>
                    )}

                    {/* ========================================== */}
                    {/* ABA 3: OPERAÇÃO & RENTABILIDADE            */}
                    {/* ========================================== */}
                    {subAbaAtual === 2 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
                            <Box sx={{ flex: 1, display: 'flex', gap: 1, minHeight: 0 }}>
                                <Paper className="tasy-flat-panel" sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1 }}>
                                    <div className="tasy-section-header" style={{ margin: '-8px -8px 8px -8px' }}>Consultas vs Procedimentos (Qtd. 6 Meses) - Clique na barra para detalhes</div>
                                    <Box sx={{ flexGrow: 1, minHeight: 0, cursor: 'pointer' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={consultasProc} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} onClick={handleOpenMes}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ecef"/>
                                                <XAxis dataKey="mes" tick={{fontSize: 11}} axisLine={false} tickLine={false} />
                                                <YAxis tick={{fontSize: 11}} axisLine={false} tickLine={false} />
                                                <RechartsTooltip contentStyle={{ fontSize: '12px', borderRadius: '4px', border: '1px solid #dee2e6' }} cursor={{fill: '#f8f9fa'}} />
                                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                                                <Bar dataKey="consultas_qtd" name="Qtd. Consultas" fill="#2e5b99" radius={[2, 2, 0, 0]} barSize={20} />
                                                <Bar dataKey="procedimentos_qtd" name="Qtd. Procedimentos" fill="#6caddf" radius={[2, 2, 0, 0]} barSize={20} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </Paper>

                                <Paper className="tasy-flat-panel" sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1 }}>
                                    <div className="tasy-section-header" style={{ margin: '-8px -8px 8px -8px' }}>Geração de Receita por Médico (6 Meses) - Clique na barra para detalhes</div>
                                    <Box sx={{ flexGrow: 1, minHeight: 0, cursor: 'pointer' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={medicosLimpos} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 0 }} onClick={handleOpenMed}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e9ecef"/>
                                                <XAxis type="number" hide /> 
                                                <YAxis dataKey="nomeLimpo" type="category" hide /> 
                                                <RechartsTooltip 
                                                    cursor={{fill: '#f8f9fa'}}
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            const data = payload[0].payload;
                                                            return (
                                                                <Paper sx={{ p: 1.5, border: '1px solid #dee2e6', borderRadius: 1 }}>
                                                                    <Typography variant="subtitle2" fontWeight="bold" color="#343a40">{data.nome}</Typography>
                                                                    <Typography variant="body2" color="success.main" fontWeight="bold" mt={0.5}>Receita: {formatCurrency(data.receita)}</Typography>
                                                                    <Typography variant="caption" color="text.secondary" display="block">Atendimentos (6m): {data.atendimentos}</Typography>
                                                                </Paper>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                                <Bar dataKey="receita" name="Receita" fill="#4b88d3" radius={[0, 2, 2, 0]} maxBarSize={30}>
                                                    <LabelList dataKey="nomeLimpo" position="insideLeft" fill="#ffffff" fontSize={11} offset={8} />
                                                    <LabelList dataKey="receita" formatter={(val) => formatCurrency(val)} position="insideRight" fill="#ffffff" fontSize={11} offset={8} />
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </Paper>
                            </Box>

                            {/* Tabela de Rentabilidade Refatorada */}
                            <Paper className="tasy-flat-panel" sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1 }}>
                                <div className="tasy-section-header" style={{ margin: '-8px -8px 8px -8px' }}>
                                    Ranking de Rentabilidade (Lucro Líquido por Procedimento)
                                </div>
                                <TableContainer sx={{ flexGrow: 1, overflowY: 'auto' }}>
                                    <Table stickyHeader size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 800, color: '#495057', bgcolor: '#f8f9fa', py: 0.5 }}>Exame / Procedimento</TableCell>
                                                <TableCell sx={{ fontWeight: 800, color: '#495057', bgcolor: '#f8f9fa', py: 0.5 }}>Médico</TableCell>
                                                <TableCell sx={{ fontWeight: 800, color: '#495057', bgcolor: '#f8f9fa', py: 0.5 }}>Turno</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 800, color: '#495057', bgcolor: '#f8f9fa', py: 0.5 }}>Volume</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 800, color: '#495057', bgcolor: '#f8f9fa', py: 0.5 }}>Lucro Líquido</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {rentabilidade.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} align="center" sx={{ py: 3, color: '#868e96', fontSize: '13px' }}>Nenhum dado financeiro processado para este filtro.</TableCell>
                                                </TableRow>
                                            ) : rentabilidade.map((row, idx) => (
                                                <TableRow key={idx} hover>
                                                    <TableCell sx={{ fontWeight: 600, color: '#343a40', fontSize: '12px', py: 0.5 }}>{row.exame}</TableCell>
                                                    <TableCell sx={{ py: 0.5 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '12px', color: '#495057' }}>
                                                            <FaUserMd color="#adb5bd" /> {row.medico}
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell sx={{ py: 0.5 }}>
                                                        <Chip icon={<FaClock size={10} />} label={row.turno} size="small" sx={{ fontSize: '10px', fontWeight: 'bold', height: '20px', bgcolor: row.turno === 'Manhã' ? '#e3f2fd' : row.turno === 'Tarde' ? '#fff3e0' : '#f3e5f5', color: row.turno === 'Manhã' ? '#1565c0' : row.turno === 'Tarde' ? '#e65100' : '#6a1b9a' }} />
                                                    </TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 500, fontSize: '12px', py: 0.5 }}>{row.exames_realizados}</TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 800, color: '#2e7d32', fontSize: '12px', py: 0.5 }}>{formatCurrency(row.rentabilidade)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
                        </Box>
                    )}
                </Box>
            )}

            {/* MODAIS (Mantidos Intactos) */}
            <Dialog open={modalMesOpen} onClose={() => setModalMesOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ p: 2, bgcolor: '#f8f9fa', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1" fontWeight="bold">Detalhamento Operacional: {detalheMes?.mes}</Typography>
                    <IconButton size="small" onClick={() => setModalMesOpen(false)}><Close /></IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    <TableContainer>
                        <Table>
                            <TableHead sx={{ bgcolor: '#e9ecef' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Tipo de Serviço</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Quantidade</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Receita Gerada</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow>
                                    <TableCell>Consultas Médicas</TableCell>
                                    <TableCell align="center">{detalheMes?.consultas_qtd}</TableCell>
                                    <TableCell align="right" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>{formatCurrency(detalheMes?.consultas_valor)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Procedimentos / Exames</TableCell>
                                    <TableCell align="center">{detalheMes?.procedimentos_qtd}</TableCell>
                                    <TableCell align="right" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>{formatCurrency(detalheMes?.procedimentos_valor)}</TableCell>
                                </TableRow>
                                <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>TOTAL DO MÊS</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>{(detalheMes?.consultas_qtd || 0) + (detalheMes?.procedimentos_qtd || 0)}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: '900', color: '#1a233b' }}>{formatCurrency((detalheMes?.consultas_valor || 0) + (detalheMes?.procedimentos_valor || 0))}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
            </Dialog>

            <Dialog open={modalMedOpen} onClose={() => setModalMedOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ p: 2, bgcolor: '#f8f9fa', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1" fontWeight="bold">Detalhamento: {detalheMed?.nome}</Typography>
                    <IconButton size="small" onClick={() => setModalMedOpen(false)}><Close /></IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    <TableContainer>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: '#e9ecef' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Mês</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Atendimentos</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Receita Gerada</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {detalheMed?.detalhes?.map((row, idx) => (
                                    <TableRow key={idx} hover>
                                        <TableCell>{row.mes}</TableCell>
                                        <TableCell align="center">{row.qtd}</TableCell>
                                        <TableCell align="right" sx={{ color: row.valor > 0 ? '#2e7d32' : '#999', fontWeight: row.valor > 0 ? 'bold' : 'normal' }}>{formatCurrency(row.valor)}</TableCell>
                                    </TableRow>
                                ))}
                                <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>ACUMULADO (6 MESES)</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>{detalheMed?.atendimentos}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: '900', color: '#1a233b' }}>{formatCurrency(detalheMed?.receita)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
            </Dialog>
        </Box>
    );
}