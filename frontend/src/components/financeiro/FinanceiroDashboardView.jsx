import React, { useState, useEffect } from 'react';
import { 
    Box, Grid, Paper, Typography, Dialog, DialogTitle, DialogContent, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton,
    Tabs, Tab // <-- Importações novas para as abas
} from '@mui/material';
import { Close, AccountBalanceWallet, ShowChart, AssignmentInd } from '@mui/icons-material';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, ComposedChart, Line, LabelList
} from 'recharts';
import { FaMoneyBillWave, FaChartLine, FaRegClock, FaExclamationTriangle } from 'react-icons/fa';
import { faturamentoService } from '../../services/faturamentoService';

const COLORS = ['#2e5b99', '#4b88d3', '#6caddf', '#96ccee', '#b8daff', '#e9ecef']; 
const ALERT_COLOR = '#d9534f';
const SUCCESS_COLOR = '#5cb85c';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function FinanceiroDashboardView() {
    // --- NOVO ESTADO: Controle das Sub-abas ---
    const [subAbaAtual, setSubAbaAtual] = useState(0);

    // --- ESTADOS ORIGINAIS MANTIDOS ---
    const [kpis, setKpis] = useState({
        valorOperacional: 0, totalDespesas: 0, saldo: 0, ticketMedio: 0, totalReceber: 0, totalAtrasado: 0
    });
    const [consultasProc, setConsultasProc] = useState([]);
    const [medicos, setMedicos] = useState([]);
    const [recebimentos, setRecebimentos] = useState([]);
    const [evolucao, setEvolucao] = useState([]);

    const [modalMesOpen, setModalMesOpen] = useState(false);
    const [detalheMes, setDetalheMes] = useState(null);
    
    const [modalMedOpen, setModalMedOpen] = useState(false);
    const [detalheMed, setDetalheMed] = useState(null);

    useEffect(() => {
        faturamentoService.getDashboardFinanceiro()
            .then(res => {
                if(res.data) {
                    if(res.data.kpis) setKpis(res.data.kpis);
                    if(res.data.grafico_consultas_proc) setConsultasProc(res.data.grafico_consultas_proc);
                    if(res.data.grafico_medicos) setMedicos(res.data.grafico_medicos);
                    if(res.data.grafico_recebimentos) setRecebimentos(res.data.grafico_recebimentos);
                    if(res.data.grafico_evolucao) setEvolucao(res.data.grafico_evolucao);
                }
            })
            .catch(err => console.error("Erro ao carregar Dashboard Financeiro:", err));
    }, []);

    const handleOpenMes = (data) => {
        if(data && data.activePayload) {
            setDetalheMes(data.activePayload[0].payload);
            setModalMesOpen(true);
        }
    };

    const handleOpenMed = (data) => {
        if(data && data.activePayload) {
            setDetalheMed(data.activePayload[0].payload);
            setModalMedOpen(true);
        }
    };

    const KpiCard = ({ titulo, valor, cor, icone }) => (
        <Paper className="tasy-flat-panel" sx={{ p: 1, display: 'flex', alignItems: 'center', height: '100%', borderLeft: `4px solid ${cor}` }}>
            <Box sx={{ flexGrow: 1 }}>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#6c757d', textTransform: 'uppercase' }}>
                    {titulo}
                </Typography>
                <Typography sx={{ fontSize: '1rem', fontWeight: 900, color: '#343a40', mt: 0.2 }}>
                    {valor}
                </Typography>
            </Box>
            <Box sx={{ color: cor, opacity: 0.8, fontSize: '1.2rem' }}>
                {icone}
            </Box>
        </Paper>
    );

    const medicosLimpos = medicos.map(m => ({
        ...m,
        nomeLimpo: m.nome.replace('Dr(a). ', '').replace('Dr. ', '').replace('Dra. ', '')
    }));

    return (
        <Box className="tasy-workspace" sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 1, backgroundColor: '#f1f3f5', overflow: 'hidden' }}>
            
            {/* NOVO CABEÇALHO COMPACTO: Título na esquerda, Abas na direita */}
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
                
                <Tabs 
                    value={subAbaAtual} 
                    onChange={(e, val) => setSubAbaAtual(val)} 
                    indicatorColor="primary" 
                    textColor="primary"
                    sx={{ minHeight: 36 }}
                >
                    <Tab icon={<ShowChart sx={{ fontSize: 16 }}/>} iconPosition="start" label="Dashboard & Projeções" sx={{ minHeight: 36, fontSize: '0.70rem', fontWeight: 'bold', p: 1 }} />
                    <Tab icon={<AccountBalanceWallet sx={{ fontSize: 16 }}/>} iconPosition="start" label="Receitas & Despesas" sx={{ minHeight: 36, fontSize: '0.70rem', fontWeight: 'bold', p: 1 }} />
                    <Tab icon={<AssignmentInd sx={{ fontSize: 16 }}/>} iconPosition="start" label="Operação & Rentabilidade" sx={{ minHeight: 36, fontSize: '0.70rem', fontWeight: 'bold', p: 1 }} />
                </Tabs>
            </Paper>

            {/* ÁREA DE CONTEÚDO (Muda conforme a aba clicada) */}
            <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                
                {/* --- ABA 1: O SEU DASHBOARD ATUAL FOI COLOCADO AQUI DENTRO --- */}
                {subAbaAtual === 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
                        <Grid container spacing={1} sx={{ flexShrink: 0 }}>
                            <Grid item xs={2}><KpiCard titulo="Faturamento Realizado" valor={formatCurrency(kpis.valorOperacional)} cor={SUCCESS_COLOR} icone={<FaChartLine />} /></Grid>
                            <Grid item xs={2}><KpiCard titulo="Despesas Pagas" valor={formatCurrency(kpis.despesasPagas)} cor={ALERT_COLOR} icone={<FaMoneyBillWave />} /></Grid>
                            <Grid item xs={2}><KpiCard titulo="Saldo em Caixa" valor={formatCurrency(kpis.saldo)} cor={kpis.saldo >= 0 ? SUCCESS_COLOR : ALERT_COLOR} icone={<FaMoneyBillWave />} /></Grid>
                            <Grid item xs={2}><KpiCard titulo="Ticket Médio" valor={formatCurrency(kpis.ticketMedio)} cor="#0275d8" icone={<FaChartLine />} /></Grid>
                            <Grid item xs={2}><KpiCard titulo="Contas a Receber" valor={formatCurrency(kpis.totalReceber)} cor="#f0ad4e" icone={<FaRegClock />} /></Grid>
                            <Grid item xs={2}><KpiCard titulo="Inadimplência (Atraso)" valor={formatCurrency(kpis.totalAtrasado)} cor={ALERT_COLOR} icone={<FaExclamationTriangle />} /></Grid>
                        </Grid>

                        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1, minHeight: 0 }}>
                            <Box sx={{ flex: 1, display: 'flex', gap: 1, minHeight: 0 }}>
                                <Paper className="tasy-flat-panel" sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1 }}>
                                    <div className="tasy-section-header" style={{ margin: '-8px -8px 8px -8px' }}>Consultas vs Procedimentos (Qtd. 6 Meses) - Clique na barra para detalhes</div>
                                    <Box sx={{ flexGrow: 1, minHeight: 0, cursor: 'pointer' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={consultasProc} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} onClick={handleOpenMes}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ecef"/>
                                                <XAxis dataKey="mes" tick={{fontSize: 11}} axisLine={false} tickLine={false} />
                                                <YAxis tick={{fontSize: 11}} axisLine={false} tickLine={false} />
                                                <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '4px', border: '1px solid #dee2e6' }} cursor={{fill: '#f8f9fa'}} />
                                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                                                <Bar dataKey="consultas_qtd" name="Qtd. Consultas" fill="#2e5b99" radius={[2, 2, 0, 0]} barSize={20} />
                                                <Bar dataKey="procedimentos_qtd" name="Qtd. Procedimentos" fill="#6caddf" radius={[2, 2, 0, 0]} barSize={20} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </Paper>

                                <Paper className="tasy-flat-panel" sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1 }}>
                                    <div className="tasy-section-header" style={{ margin: '-8px -8px 8px -8px' }}>Modo de Recebimento (6 Meses)</div>
                                    <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', alignItems: 'center' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={recebimentos} innerRadius="50%" outerRadius="80%" paddingAngle={2} dataKey="valor" nameKey="nome">
                                                    {recebimentos.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ fontSize: '12px', borderRadius: '4px', border: '1px solid #dee2e6' }} />
                                                <Legend verticalAlign="middle" align="right" layout="vertical" wrapperStyle={{ fontSize: '11px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </Paper>
                            </Box>

                            <Box sx={{ flex: 1, display: 'flex', gap: 1, minHeight: 0 }}>
                                <Paper className="tasy-flat-panel" sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1 }}>
                                    <div className="tasy-section-header" style={{ margin: '-8px -8px 8px -8px' }}>Geração de Receita por Médico (6 Meses) - Clique na barra para detalhes</div>
                                    <Box sx={{ flexGrow: 1, minHeight: 0, cursor: 'pointer' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={medicosLimpos} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 0 }} onClick={handleOpenMed}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e9ecef"/>
                                                <XAxis type="number" hide /> 
                                                <YAxis dataKey="nomeLimpo" type="category" hide /> 
                                                <Tooltip 
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

                                <Paper className="tasy-flat-panel" sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1 }}>
                                    <div className="tasy-section-header" style={{ margin: '-8px -8px 8px -8px' }}>Evolução de Saldo em Caixa (6 Meses)</div>
                                    <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={evolucao} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ecef" />
                                                <XAxis dataKey="mes" tick={{fontSize: 11}} axisLine={false} tickLine={false} />
                                                <YAxis tick={{fontSize: 11}} axisLine={false} tickLine={false} tickFormatter={(val) => `R$ ${val/1000}k`} />
                                                <Tooltip formatter={(val) => formatCurrency(val)} contentStyle={{ fontSize: '12px', borderRadius: '4px', border: '1px solid #dee2e6' }} />
                                                <Line type="monotone" dataKey="saldo" name="Saldo Efetivo" stroke="#5cb85c" strokeWidth={2} dot={{ r: 4 }} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </Paper>
                            </Box>
                        </Box>
                    </Box>
                )}

                {/* --- ABA 2: RESERVADA --- */}
                {subAbaAtual === 1 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#adb5bd' }}>
                        <Typography variant="subtitle1" fontWeight="bold">Aba 2: Receitas & Despesas (Próximo Passo)</Typography>
                    </Box>
                )}

                {/* --- ABA 3: RESERVADA --- */}
                {subAbaAtual === 2 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#adb5bd' }}>
                        <Typography variant="subtitle1" fontWeight="bold">Aba 3: Operação & Rentabilidade (Próximo Passo)</Typography>
                    </Box>
                )}

            </Box>

            {/* MODAIS MANTIDOS INTACTOS AQUI EMBAIXO */}
            <Dialog open={modalMesOpen} onClose={() => setModalMesOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ p: 2, bgcolor: '#f8f9fa', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                        Detalhamento Operacional: {detalheMes?.mes}
                    </Typography>
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
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                                        {(detalheMes?.consultas_qtd || 0) + (detalheMes?.procedimentos_qtd || 0)}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: '900', color: '#1a233b' }}>
                                        {formatCurrency((detalheMes?.consultas_valor || 0) + (detalheMes?.procedimentos_valor || 0))}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
            </Dialog>

            <Dialog open={modalMedOpen} onClose={() => setModalMedOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ p: 2, bgcolor: '#f8f9fa', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                        Detalhamento: {detalheMed?.nome}
                    </Typography>
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
                                        <TableCell align="right" sx={{ color: row.valor > 0 ? '#2e7d32' : '#999', fontWeight: row.valor > 0 ? 'bold' : 'normal' }}>
                                            {formatCurrency(row.valor)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>ACUMULADO (6 MESES)</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>{detalheMed?.atendimentos}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: '900', color: '#1a233b' }}>
                                        {formatCurrency(detalheMed?.receita)}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
            </Dialog>

        </Box>
    );
}