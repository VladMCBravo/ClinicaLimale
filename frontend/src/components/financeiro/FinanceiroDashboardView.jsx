import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, IconButton } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, ComposedChart, Line, LabelList
} from 'recharts';
import { FaMoneyBillWave, FaChartLine, FaRegClock, FaExclamationTriangle } from 'react-icons/fa';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

import { faturamentoService } from '../../services/faturamentoService';

dayjs.locale('pt-br');

const COLORS = ['#2e5b99', '#4b88d3', '#6caddf', '#96ccee', '#b8daff', '#e9ecef']; 
const ALERT_COLOR = '#d9534f';
const SUCCESS_COLOR = '#5cb85c';

// --- NAVEGADOR DE MÊS INTEGRADO ---
const NavegadorMes = ({ filtroData, setFiltroData }) => {
    const irParaMesAnterior = () => setFiltroData(prev => prev.subtract(1, 'month'));
    const irParaProximoMes = () => setFiltroData(prev => prev.add(1, 'month'));
    const irParaMesAtual = () => setFiltroData(dayjs());
    const nomeMes = filtroData.format('MMM').toLowerCase();

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#e9ecef', borderRadius: 1, px: 0.5, py: 0.2, height: 32 }}>
            <IconButton size="small" onClick={irParaMesAnterior} sx={{ p: 0.5 }}>
                <ChevronLeft fontSize="small" sx={{ color: '#495057' }} />
            </IconButton>
            <Typography 
                variant="caption" onClick={irParaMesAtual} 
                sx={{ cursor: 'pointer', fontWeight: 'bold', color: '#343a40', px: 1, minWidth: 35, textAlign: 'center', textTransform: 'uppercase', '&:hover': { color: 'primary.main' } }}
            >
                {nomeMes}
            </Typography>
            <IconButton size="small" onClick={irParaProximoMes} sx={{ p: 0.5 }}>
                <ChevronRight fontSize="small" sx={{ color: '#495057' }} />
            </IconButton>
        </Box>
    );
};

export default function FinanceiroDashboardView() {
    // 1. Estados
    const [filtroData, setFiltroData] = useState(dayjs()); // <-- Estado Global do Dashboard
    
    const [kpis, setKpis] = useState({
        valorOperacional: 0, totalDespesas: 0, saldo: 0, ticketMedio: 0, totalReceber: 0, totalAtrasado: 0
    });
    const [consultasProc, setConsultasProc] = useState([]);
    const [medicos, setMedicos] = useState([]);
    const [recebimentos, setRecebimentos] = useState([]);
    const [evolucao, setEvolucao] = useState([]);

    // 2. Dispara a busca toda vez que o mês mudar
    useEffect(() => {
        const params = {
            mes: filtroData.month() + 1,
            ano: filtroData.year()
        };

        faturamentoService.getDashboardFinanceiro(params)
            .then(res => {
                if(res.data) {
                    if(res.data.kpis) setKpis(res.data.kpis);
                    if(res.data.grafico_consultas_proc) setConsultasProc(res.data.grafico_consultas_proc);
                    if(res.data.grafico_medicos) setMedicos(res.data.grafico_medicos);
                    if(res.data.grafico_recebimentos) setRecebimentos(res.data.grafico_recebimentos);
                    if(res.data.grafico_evolucao) setEvolucao(res.data.grafico_evolucao);
                }
            })
            .catch(err => console.error("Erro ao carregar Dashboard:", err));
    }, [filtroData]); // Dependência adicionada aqui!

    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

    const KpiCard = ({ titulo, valor, cor, icone }) => (
        <Paper className="tasy-flat-panel" sx={{ p: 1.5, display: 'flex', alignItems: 'center', height: '100%', borderLeft: `4px solid ${cor}` }}>
            <Box sx={{ flexGrow: 1 }}>
                <Typography sx={{ fontSize: '0.70rem', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase' }}>
                    {titulo}
                </Typography>
                <Typography sx={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#343a40', mt: 0.5 }}>
                    {valor}
                </Typography>
            </Box>
            <Box sx={{ color: cor, opacity: 0.8, fontSize: '1.5rem' }}>
                {icone}
            </Box>
        </Paper>
    );

    // Remove o "Dr(a). " da string que vem do backend para caber limpo na barra
    const medicosLimpos = medicos.map(m => ({
        ...m,
        nome: m.nome.replace('Dr(a). ', '').replace('Dr. ', '').replace('Dra. ', '')
    }));

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 1, backgroundColor: '#f1f3f5', overflow: 'hidden' }}>
            
            {/* 0. BARRA DE FILTRO GERAL DO DASHBOARD */}
            <Paper className="tasy-flat-panel" sx={{ p: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                <Typography variant="subtitle2" fontWeight="bold" color="#343a40" sx={{ ml: 1, textTransform: 'uppercase', fontSize: '0.75rem' }}>
                    Competência do Dashboard:
                </Typography>
                <DatePicker 
                    views={['month', 'year']} 
                    value={filtroData} 
                    onChange={(v) => setFiltroData(v)} 
                    className="tasy-compact-input"
                    slotProps={{ textField: { size: 'small', sx: { width: 130 } } }}
                />
                <NavegadorMes filtroData={filtroData} setFiltroData={setFiltroData} />
            </Paper>

            {/* 1. LINHA DE KPIS */}
            <Grid container spacing={1} sx={{ mb: 1, flexShrink: 0 }}>
                <Grid item xs={2}><KpiCard titulo="Faturamento Realizado" valor={formatCurrency(kpis.valorOperacional)} cor={SUCCESS_COLOR} icone={<FaChartLine />} /></Grid>
                <Grid item xs={2}><KpiCard titulo="Despesas Pagas" valor={formatCurrency(kpis.despesasPagas)} cor={ALERT_COLOR} icone={<FaMoneyBillWave />} /></Grid>
                <Grid item xs={2}><KpiCard titulo="Saldo em Caixa" valor={formatCurrency(kpis.saldo)} cor={kpis.saldo >= 0 ? SUCCESS_COLOR : ALERT_COLOR} icone={<FaMoneyBillWave />} /></Grid>
                <Grid item xs={2}><KpiCard titulo="Ticket Médio" valor={formatCurrency(kpis.ticketMedio)} cor="#0275d8" icone={<FaChartLine />} /></Grid>
                <Grid item xs={2}><KpiCard titulo="Contas a Receber" valor={formatCurrency(kpis.totalReceber)} cor="#f0ad4e" icone={<FaRegClock />} /></Grid>
                <Grid item xs={2}><KpiCard titulo="Inadimplência (Atraso)" valor={formatCurrency(kpis.totalAtrasado)} cor={ALERT_COLOR} icone={<FaExclamationTriangle />} /></Grid>
            </Grid>

            {/* 2. ÁREA DOS GRÁFICOS */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1, minHeight: 0 }}>
                
                <Box sx={{ flex: 1, display: 'flex', gap: 1, minHeight: 0 }}>
                    <Paper className="tasy-flat-panel" sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1 }}>
                        <div className="tasy-section-header" style={{ margin: '-8px -8px 8px -8px' }}>Consultas vs Procedimentos (Histórico de 6 Meses)</div>
                        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={consultasProc} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ecef"/>
                                    <XAxis dataKey="mes" tick={{fontSize: 11}} axisLine={false} tickLine={false} />
                                    <YAxis tick={{fontSize: 11}} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '4px', border: '1px solid #dee2e6' }} cursor={{fill: '#f8f9fa'}} />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    <Bar dataKey="consultas" name="Consultas" fill="#2e5b99" radius={[2, 2, 0, 0]} barSize={20} />
                                    <Bar dataKey="procedimentos" name="Procedimentos" fill="#6caddf" radius={[2, 2, 0, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>

                    <Paper className="tasy-flat-panel" sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1 }}>
                        <div className="tasy-section-header" style={{ margin: '-8px -8px 8px -8px' }}>Recebimento por Meio de Pagamento (Mês Atual)</div>
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
                        <div className="tasy-section-header" style={{ margin: '-8px -8px 8px -8px' }}>Geração de Receita por Médico (Mês Atual)</div>
                        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={medicosLimpos} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e9ecef"/>
                                    <XAxis type="number" hide /> 
                                    <YAxis dataKey="nome" type="category" hide /> 
                                    
                                    {/* TOOLTIP CUSTOMIZADO PARA MOSTRAR DINHEIRO E QUANTIDADE */}
                                    <Tooltip 
                                        cursor={{fill: '#f8f9fa'}}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <Paper sx={{ p: 1.5, border: '1px solid #dee2e6', borderRadius: 1 }}>
                                                        <Typography variant="subtitle2" fontWeight="bold" color="#343a40">{data.nome}</Typography>
                                                        <Typography variant="body2" color="success.main" fontWeight="bold" mt={0.5}>
                                                            Receita Gerada: {formatCurrency(data.receita)}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary" display="block">
                                                            Pacientes Atendidos: {data.atendimentos}
                                                        </Typography>
                                                    </Paper>
                                                );
                                            }
                                            return null;
                                        }}
                                    />

                                    {/* A BARRA AGORA CRESCE BASEADA NO DINHEIRO (dataKey="receita") */}
                                    <Bar dataKey="receita" name="Receita" fill="#4b88d3" radius={[0, 2, 2, 0]} barSize={22}>
                                        <LabelList dataKey="nome" position="insideLeft" fill="#ffffff" fontSize={11} offset={8} />
                                        <LabelList dataKey="receita" formatter={(val) => formatCurrency(val)} position="insideRight" fill="#ffffff" fontSize={11} offset={8} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>

                    <Paper className="tasy-flat-panel" sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1 }}>
                        <div className="tasy-section-header" style={{ margin: '-8px -8px 8px -8px' }}>Evolução de Saldo em Caixa (Histórico de 6 Meses)</div>
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
    );
}