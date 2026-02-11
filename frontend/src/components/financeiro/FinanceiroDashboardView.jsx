import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, Stack, LinearProgress } from '@mui/material';
import { 
    TrendingDown, AccountBalanceWallet, AttachMoney, 
    Storefront, EventAvailable
} from '@mui/icons-material';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar 
} from 'recharts';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

import { faturamentoService } from '../../services/faturamentoService';
import { agendamentoService } from '../../services/agendamentoService';

dayjs.locale('pt-br');

// Configuração de Cores
const COLORS = {
    receita: '#2e7d32', 
    despesa: '#d32f2f', 
    saldo: '#1976d2',   
    fixa: '#0288d1',    
    variavel: '#ed6c02',
    pendente: '#f57c00',
    atrasado: '#d32f2f', 
    aporte: '#7b1fa2',
    ocupacao: '#009688'
};

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
const formatK = (val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val;

export default function FinanceiroDashboardView() {
    const [loading, setLoading] = useState(true);
    
    // Estado inicial seguro
    const [dados, setDados] = useState({
        kpis: { 
            valorOperacional: 0, valorAportes: 0, 
            totalDespesas: 0, despesasPagas: 0, 
            saldo: 0, ticketMedio: 0, totalAtrasado: 0 
        },
        grafico_fluxo: [],
        custos_mes: { fixas: 0, variaveis: 0 }
    });

    const [operacional, setOperacional] = useState({
        taxa_ocupacao: 0, ticket_medio_hora: 0
    });

    useEffect(() => {
        const fetchDados = async () => {
            setLoading(true);
            try {
                // Busca dados Financeiros (SQL Backend) e Operacionais (Agenda) em paralelo
                const [resFin, resOp] = await Promise.all([
                    faturamentoService.getDashboardFinanceiro(),
                    agendamentoService.getDashboardKPIs ? agendamentoService.getDashboardKPIs() : { data: {} }
                ]);
                
                if(resFin.data) setDados(resFin.data);
                if(resOp.data) setOperacional(resOp.data);

            } catch (error) {
                console.error("Erro ao carregar dashboard", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDados();
    }, []);

    const { kpis, grafico_fluxo, custos_mes } = dados;

    // Preparação de dados para Gráficos Laterais
    const dataDespesasPie = [
        { name: 'Fixas', value: custos_mes.fixas },
        { name: 'Variáveis', value: custos_mes.variaveis }
    ];

    // Gráfico de Recebimentos: Focado em "Quanto entrou" vs "Quanto deveria ter entrado e atrasou"
    const dataStatusReceitas = [
        { name: 'Pago', valor: kpis.valorOperacional + kpis.valorAportes, fill: COLORS.receita },
        { name: 'Atrasado', valor: kpis.totalAtrasado, fill: COLORS.atrasado } 
    ];

    if (loading) return <LinearProgress />;

    return (
        <Box sx={{ p: 1, overflow: 'hidden', height: '100%' }}>
            
            {/* LINHA 1: KPIS (Calculados no Backend) */}
            <Grid container spacing={1} sx={{ mb: 1 }}>
                
                <KPICard 
                    title="FATURAMENTO CLÍNICO" 
                    value={kpis.valorOperacional} 
                    icon={<Storefront />} color={COLORS.receita} 
                    subtext={`+ ${formatMoney(kpis.valorAportes)} aportes`} 
                />
                
                <KPICard 
                    title="DESPESA TOTAL" 
                    value={kpis.totalDespesas} 
                    icon={<TrendingDown />} color={COLORS.despesa} 
                    subtext={`Pago: ${formatMoney(kpis.despesasPagas)}`} 
                />
                
                <KPICard 
                    title="SALDO EM CAIXA" 
                    value={kpis.saldo} 
                    icon={<AccountBalanceWallet />} 
                    color={kpis.saldo >= 0 ? COLORS.saldo : COLORS.despesa} 
                    subtext="Disponível Real" 
                />
                
                <KPICard 
                    title="TICKET MÉDIO" 
                    value={kpis.ticketMedio} 
                    icon={<AttachMoney />} color="#555" 
                    subtext="Por paciente" 
                />
            </Grid>

            <Grid container spacing={1}>
                {/* LINHA 2: GRÁFICO PRINCIPAL (Fluxo de Caixa) */}
                <Grid item xs={12} md={8}>
                    <Paper variant="outlined" sx={{ p: 1.5, height: 280, borderRadius: 2, display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="subtitle2" fontWeight="bold" color="text.secondary">
                                FLUXO DE CAIXA ({dayjs().format('MMMM/YYYY').toUpperCase()})
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <LegendItem color={COLORS.receita} label="Entradas" />
                                <LegendItem color={COLORS.despesa} label="Saídas" />
                            </Box>
                        </Box>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={grafico_fluxo} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
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
                                <XAxis dataKey="name" style={{ fontSize: '0.7rem', fontWeight: 600 }} axisLine={false} tickLine={false} dy={5} />
                                <YAxis tickFormatter={formatK} style={{ fontSize: '0.7rem' }} axisLine={false} tickLine={false} />
                                <RechartsTooltip formatter={(value) => formatMoney(value)} />
                                <Area type="monotone" dataKey="entradas" stroke={COLORS.receita} strokeWidth={2} fillOpacity={1} fill="url(#colorEntradas)" />
                                <Area type="monotone" dataKey="saidas" stroke={COLORS.despesa} strokeWidth={2} fillOpacity={1} fill="url(#colorSaidas)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* LINHA 2: LATERAL (Operacional + Custos + Recebimentos) */}
                <Grid item xs={12} md={4}>
                    <Stack spacing={1}>
                        
                        {/* 1. Capacidade Operacional (Vem da Agenda) */}
                        <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#e0f2f1', border: `1px solid ${COLORS.ocupacao}50` }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="caption" fontWeight="bold" color={COLORS.ocupacao}>CAPACIDADE OPERACIONAL</Typography>
                                <Typography variant="caption" fontWeight="bold">{operacional.taxa_ocupacao || 0}%</Typography>
                            </Box>
                            <LinearProgress variant="determinate" value={operacional.taxa_ocupacao || 0} sx={{ height: 8, borderRadius: 4, mb: 1, bgcolor: 'white', '& .MuiLinearProgress-bar': { bgcolor: COLORS.ocupacao } }} />
                            <Typography variant="caption">Faturamento/Hora: <b>{formatMoney(operacional.ticket_medio_hora || 0)}</b></Typography>
                        </Paper>

                        {/* 2. Pizza de Custos (Vem do Backend) */}
                        <Paper variant="outlined" sx={{ p: 1, height: 90, display: 'flex', alignItems: 'center' }}>
                            <ResponsiveContainer width="40%">
                                <RechartsPieChart>
                                    <Pie data={dataDespesasPie} innerRadius={15} outerRadius={30} paddingAngle={2} dataKey="value">
                                        {dataDespesasPie.map((entry, index) => <Cell key={index} fill={index === 0 ? COLORS.fixa : COLORS.variavel} />)}
                                    </Pie>
                                </RechartsPieChart>
                            </ResponsiveContainer>
                            <Box sx={{ width: '60%', pl: 1 }}>
                                <Typography variant="caption" fontWeight="bold" display="block" sx={{ mb: 0.5 }}>CUSTOS (Mês)</Typography>
                                <DetailRow label="Fixos" value={custos_mes.fixas} color={COLORS.fixa} />
                                <DetailRow label="Variáveis" value={custos_mes.variaveis} color={COLORS.variavel} />
                            </Box>
                        </Paper>

                        {/* 3. Gráfico Recebimentos (LAYOUT CORRIGIDO) */}
                        <Paper variant="outlined" sx={{ p: 1, height: 90, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="caption" fontWeight="bold" sx={{ mb: 0.5, fontSize: '0.75rem' }}>RECEBIMENTOS (Total)</Typography>
                            <ResponsiveContainer width="100%" height={60}>
                                <BarChart layout="vertical" data={dataStatusReceitas} margin={{ left: -20, right: 30, bottom: 0, top: 0 }}>
                                    <XAxis type="number" hide />
                                    {/* AQUI ESTAVA O PROBLEMA: Aumentei width para 70 e diminui a fonte */}
                                    <YAxis 
                                        dataKey="name" 
                                        type="category" 
                                        width={70} 
                                        style={{ fontSize: '0.65rem', fontWeight: 600 }} 
                                        axisLine={false} 
                                        tickLine={false} 
                                    />
                                    <RechartsTooltip cursor={{fill: 'transparent'}} formatter={formatMoney} />
                                    <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={10}>
                                        {dataStatusReceitas.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    );
}

const KPICard = ({ title, value, icon, color, subtext }) => (
    <Grid item xs={6} md={3}>
        <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 85, borderLeft: `4px solid ${color}` }}>
            <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ fontSize: '0.7rem' }}>{title}</Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ color: color, fontSize: '1.1rem' }}>{formatMoney(value)}</Typography>
                <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#888' }}>{subtext}</Typography>
            </Box>
            {React.cloneElement(icon, { sx: { fontSize: 24, color: color, opacity: 0.2 } })}
        </Paper>
    </Grid>
);

const LegendItem = ({ color, label }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Box sx={{ width: 10, height: 10, bgcolor: color, borderRadius: '50%' }} />
        <Typography variant="caption" fontWeight="bold">{label}</Typography>
    </Box>
);

const DetailRow = ({ label, value, color }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
        <Typography variant="caption" sx={{ color: color, fontWeight: 600 }}>{label}</Typography>
        <Typography variant="caption" fontWeight="bold">{formatK(value)}</Typography>
    </Box>
);