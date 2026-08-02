import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, ComposedChart, Line
} from 'recharts';
import { FaMoneyBillWave, FaChartLine, FaRegClock, FaExclamationTriangle } from 'react-icons/fa';
import { faturamentoService } from '../../services/faturamentoService';

const COLORS = ['#2e5b99', '#4b88d3', '#6caddf', '#96ccee', '#b8daff', '#e9ecef']; 
const ALERT_COLOR = '#d9534f';
const SUCCESS_COLOR = '#5cb85c';

export default function FinanceiroDashboardView() {
    // 1. Estados para KPIs e Gráficos (começam vazios)
    const [kpis, setKpis] = useState({
        valorOperacional: 0, totalDespesas: 0, saldo: 0, ticketMedio: 0, totalReceber: 0, totalAtrasado: 0
    });
    const [consultasProc, setConsultasProc] = useState([]);
    const [medicos, setMedicos] = useState([]);
    const [recebimentos, setRecebimentos] = useState([]);
    const [evolucao, setEvolucao] = useState([]);

    // 2. Busca os dados reais ao carregar o componente
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

    // Remove o "Dr(a). " da string que vem do backend
    const medicosLimpos = medicos.map(m => ({
        ...m,
        nome: m.nome.replace('Dr(a). ', '')
    }));

    return (
        // O container principal ocupa 100% do espaço que restou abaixo das abas, sem scroll
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 1, backgroundColor: '#f1f3f5', overflow: 'hidden' }}>
            
            {/* 1. LINHA DE KPIS (Altura fixa e compacta) */}
            <Grid container spacing={1} sx={{ mb: 1, flexShrink: 0 }}>
                <Grid item xs={2}><KpiCard titulo="Faturamento Realizado" valor={formatCurrency(kpis.valorOperacional)} cor={SUCCESS_COLOR} icone={<FaChartLine />} /></Grid>
                <Grid item xs={2}><KpiCard titulo="Despesas Pagas" valor={formatCurrency(kpis.despesasPagas)} cor={ALERT_COLOR} icone={<FaMoneyBillWave />} /></Grid>
                <Grid item xs={2}><KpiCard titulo="Saldo em Caixa" valor={formatCurrency(kpis.saldo)} cor={kpis.saldo >= 0 ? SUCCESS_COLOR : ALERT_COLOR} icone={<FaMoneyBillWave />} /></Grid>
                <Grid item xs={2}><KpiCard titulo="Ticket Médio" valor={formatCurrency(kpis.ticketMedio)} cor="#0275d8" icone={<FaChartLine />} /></Grid>
                <Grid item xs={2}><KpiCard titulo="Contas a Receber" valor={formatCurrency(kpis.totalReceber)} cor="#f0ad4e" icone={<FaRegClock />} /></Grid>
                <Grid item xs={2}><KpiCard titulo="Inadimplência (Atraso)" valor={formatCurrency(kpis.totalAtrasado)} cor={ALERT_COLOR} icone={<FaExclamationTriangle />} /></Grid>
            </Grid>

            {/* 2. ÁREA DOS GRÁFICOS (Flex Grow para preencher a tela toda) */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1, minHeight: 0 }}>
                
                {/* Linha Superior de Gráficos */}
                <Box sx={{ flex: 1, display: 'flex', gap: 1, minHeight: 0 }}>
                    
                    {/* Gráfico 1: Consultas vs Procedimentos */}
                    <Paper className="tasy-flat-panel" sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1 }}>
                        <div className="tasy-section-header" style={{ margin: '-8px -8px 8px -8px' }}>Consultas vs Procedimentos (6 Meses)</div>
                        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                {/* CORREÇÃO AQUI: data={consultasProc} */}
                                <BarChart data={consultasProc} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ecef"/>
                                    <XAxis dataKey="mes" tick={{fontSize: 11}} axisLine={false} tickLine={false} />
                                    <YAxis tick={{fontSize: 11}} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '2px', border: '1px solid #dee2e6' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    <Bar dataKey="consultas" name="Consultas" fill="#2e5b99" radius={[2, 2, 0, 0]} barSize={20} />
                                    <Bar dataKey="procedimentos" name="Procedimentos" fill="#6caddf" radius={[2, 2, 0, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>

                    {/* Gráfico 2: Modos de Recebimento */}
                    <Paper className="tasy-flat-panel" sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1 }}>
                        <div className="tasy-section-header" style={{ margin: '-8px -8px 8px -8px' }}>Modo de Recebimento</div>
                        <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', alignItems: 'center' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    {/* CORREÇÃO AQUI: data={recebimentos} */}
                                    <Pie data={recebimentos} innerRadius="50%" outerRadius="80%" paddingAngle={2} dataKey="valor" nameKey="nome">
                                        {/* CORREÇÃO AQUI: recebimentos.map */}
                                        {recebimentos.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ fontSize: '12px' }} />
                                    <Legend verticalAlign="middle" align="right" layout="vertical" wrapperStyle={{ fontSize: '11px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Box>

                {/* Linha Inferior de Gráficos */}
                <Box sx={{ flex: 1, display: 'flex', gap: 1, minHeight: 0 }}>
                    
                    {/* Gráfico 3: Atendimentos por Médico */}
                    <Paper className="tasy-flat-panel" sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1 }}>
                        <div className="tasy-section-header" style={{ margin: '-8px -8px 8px -8px' }}>Atendimentos por Médico</div>
                        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                {/* CORREÇÃO AQUI: data={medicos} */}
                                <BarChart data={medicosLimpos} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e9ecef"/>
                                    <XAxis type="number" hide /> {/* Escondemos a régua de baixo para ficar mais limpo */}
                                    <YAxis dataKey="nome" type="category" hide /> {/* Escondemos os nomes fora da barra */}
                                    <Tooltip contentStyle={{ fontSize: '12px' }} />
                                    <Bar dataKey="atendimentos" name="Atendimentos" fill="#4b88d3" radius={[0, 2, 2, 0]} barSize={22}>
                                        {/* Nome do Médico na Esquerda */}
                                        <LabelList dataKey="nome" position="insideLeft" fill="#ffffff" fontSize={11} offset={8} />
                                        {/* Quantidade na Direita */}
                                        <LabelList dataKey="atendimentos" position="insideRight" fill="#ffffff" fontSize={11} offset={8} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>

                    {/* Gráfico 4: Evolução Financeira */}
                    <Paper className="tasy-flat-panel" sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1 }}>
                        <div className="tasy-section-header" style={{ margin: '-8px -8px 8px -8px' }}>Evolução de Saldo (Fictício)</div>
                        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                {/* CORREÇÃO AQUI: data={consultasProc} */}
                                <ComposedChart data={evolucao} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="mes" tick={{fontSize: 11}} axisLine={false} tickLine={false} />
                                    {/* Formata o Eixo Y para K (Ex: 15.000 vira 15k) para não comer espaço */}
                                    <YAxis tick={{fontSize: 11}} axisLine={false} tickLine={false} tickFormatter={(val) => `R$ ${val/1000}k`} />
                                    <Tooltip formatter={(val) => formatCurrency(val)} contentStyle={{ fontSize: '12px' }} />
                                    {/* Agora puxando o dataKey="saldo" */}
                                    <Line type="monotone" dataKey="saldo" name="Saldo do Mês" stroke="#5cb85c" strokeWidth={2} dot={{ r: 4 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Box>
            </Box>

        </Box>
    );
}