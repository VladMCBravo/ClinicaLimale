import React, { useMemo } from 'react';
import { Box, Grid, Paper, Typography, Divider, Stack } from '@mui/material';
import { TrendingUp, TrendingDown, AccountBalanceWallet, AttachMoney, Storefront } from '@mui/icons-material'; // Ícone novo: Storefront
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar 
} from 'recharts';
import dayjs from 'dayjs';

// --- CONFIGURAÇÕES VISUAIS ---
const COLORS = {
    receita: '#2e7d32', // Verde
    despesa: '#d32f2f', // Vermelho
    saldo: '#1976d2',   // Azul
    fixa: '#0288d1',    // Azul Claro
    variavel: '#ed6c02',// Laranja
    pendente: '#f57c00',
    atrasado: '#d32f2f',
    aporte: '#7b1fa2'   // Roxo para Aportes
};

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatK = (val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val;

export default function FinanceiroDashboardView({ lancamentos = [], despesas = [], projectionData = [] }) {
    
    // --- CÁLCULOS ESTRATÉGICOS (MEMOIZED) ---
    const kpis = useMemo(() => {
        // --- 1. RECEITAS ---
        const receitasPagas = lancamentos.filter(l => l.status === 'Pago');

        // SEPARAÇÃO CRÍTICA: Operacional (Pacientes) vs Aportes (Sem Paciente)
        const receitasOperacionais = receitasPagas.filter(l => l.paciente !== null && l.paciente !== undefined);
        const receitasAportes = receitasPagas.filter(l => l.paciente === null || l.paciente === undefined);

        // Totais
        const valorOperacional = receitasOperacionais.reduce((acc, l) => acc + Number(l.valor), 0);
        const valorAportes = receitasAportes.reduce((acc, l) => acc + Number(l.valor), 0);
        const valorTotalCaixa = valorOperacional + valorAportes; // Para cálculo de saldo

        const totalReceber = lancamentos.filter(l => l.status === 'Pendente').reduce((acc, l) => acc + Number(l.valor), 0);
        
        // --- 2. TICKET MÉDIO (Apenas Operacional) ---
        // Faturamento Real / Quantidade de Atendimentos Pagos
        const ticketMedio = receitasOperacionais.length > 0 
            ? valorOperacional / receitasOperacionais.length 
            : 0;

        // --- 3. DESPESAS ---
        const totalDespesas = despesas.reduce((acc, d) => acc + Number(d.valor), 0);
        const despesasPagas = despesas.filter(d => d.pago).reduce((acc, d) => acc + Number(d.valor), 0);
        
        // 4. Fixas vs Variáveis
        const fixas = despesas.filter(d => d.categoria_tipo === 'Fixa').reduce((acc, d) => acc + Number(d.valor), 0);
        const variaveis = despesas.filter(d => d.categoria_tipo !== 'Fixa').reduce((acc, d) => acc + Number(d.valor), 0);

        return {
            valorOperacional, // KPI Principal de Vendas
            valorAportes,     // KPI Secundário (Sócios)
            valorTotalCaixa,  // Para Saldo Real
            
            totalDespesas,
            despesasPagas,
            
            // O Saldo considera TUDO que tem no banco (Operacional + Aportes - Despesas Pagas)
            saldo: valorTotalCaixa - despesasPagas,
            
            ticketMedio,
            fixas,
            variaveis,
            totalReceber
        };
    }, [lancamentos, despesas]);

    // Dados para o Gráfico de Rosca (Despesas)
    const dataDespesasPie = [
        { name: 'Fixas', value: kpis.fixas },
        { name: 'Variáveis', value: kpis.variaveis }
    ];

    // Dados para Barra de Status (Focada na operação)
    const dataStatusReceitas = [
        { name: 'Pago (Op)', valor: kpis.valorOperacional, fill: COLORS.receita },
        { name: 'Pendente', valor: kpis.totalReceber, fill: COLORS.pendente },
        { name: 'Atrasado', valor: lancamentos.filter(l => l.status === 'Pendente' && dayjs(l.data_vencimento).isBefore(dayjs(), 'day')).reduce((acc, l) => acc + Number(l.valor), 0), fill: COLORS.atrasado }
    ];

    return (
        <Box sx={{ p: 1, overflow: 'hidden', height: '100%' }}>
            
            {/* LINHA 1: BIG NUMBERS (KPIs) */}
            <Grid container spacing={1} sx={{ mb: 1 }}>
                
                {/* 1. FATURAMENTO CLÍNICO (Apenas Pacientes) */}
                <KPICard 
                    title="FATURAMENTO CLÍNICO" 
                    value={kpis.valorOperacional} 
                    icon={<Storefront />} 
                    color={COLORS.receita} 
                    // Mostra o aporte pequeno embaixo para referência
                    subtext={`+ ${formatMoney(kpis.valorAportes)} de aportes`} 
                />
                
                {/* 2. DESPESAS TOTAIS */}
                <KPICard 
                    title="DESPESA TOTAL" 
                    value={kpis.totalDespesas} 
                    icon={<TrendingDown />} 
                    color={COLORS.despesa} 
                    subtext={`Pago: ${formatMoney(kpis.despesasPagas)}`} 
                />
                
                {/* 3. SALDO REAL (Considera Aportes) */}
                <KPICard 
                    title="SALDO EM CAIXA" 
                    value={kpis.saldo} 
                    icon={<AccountBalanceWallet />} 
                    color={kpis.saldo >= 0 ? COLORS.saldo : COLORS.despesa} 
                    subtext="Disponível (Inc. Aportes)" 
                />
                
                {/* 4. TICKET MÉDIO (Real) */}
                <KPICard 
                    title="TICKET MÉDIO" 
                    value={kpis.ticketMedio} 
                    icon={<AttachMoney />} 
                    color="#555" 
                    subtext="Por paciente atendido" 
                />
            </Grid>

            <Grid container spacing={1}>
                {/* LINHA 2: COLUNA PRINCIPAL (Gráfico Mensal) */}
                <Grid item xs={12} md={8}>
                    <Paper variant="outlined" sx={{ p: 1.5, height: 260, borderRadius: 2, display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="subtitle2" fontWeight="bold" color="text.secondary">FLUXO DE CAIXA MENSAL</Typography>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <LegendItem color={COLORS.receita} label="Entradas" />
                                <LegendItem color={COLORS.despesa} label="Saídas" />
                            </Box>
                        </Box>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={projectionData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
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
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                                <XAxis dataKey="name" style={{ fontSize: '0.7rem', fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis tickFormatter={formatK} style={{ fontSize: '0.7rem' }} axisLine={false} tickLine={false} />
                                <RechartsTooltip 
                                    formatter={(value) => formatMoney(value)}
                                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                                />
                                <Area type="monotone" dataKey="entradas" stroke={COLORS.receita} strokeWidth={2} fillOpacity={1} fill="url(#colorEntradas)" />
                                <Area type="monotone" dataKey="saidas" stroke={COLORS.despesa} strokeWidth={2} fillOpacity={1} fill="url(#colorSaidas)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* LINHA 2: COLUNA LATERAL (Breakdowns) */}
                <Grid item xs={12} md={4}>
                    <Stack spacing={1}>
                        {/* Gráfico 1: Despesas Fixas vs Variáveis */}
                        <Paper variant="outlined" sx={{ p: 1, height: 125, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ width: '50%', height: '100%' }}>
                                <ResponsiveContainer>
                                    <RechartsPieChart>
                                        <Pie data={dataDespesasPie} innerRadius={25} outerRadius={40} paddingAngle={2} dataKey="value">
                                            {dataDespesasPie.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? COLORS.fixa : COLORS.variavel} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip formatter={formatMoney} />
                                    </RechartsPieChart>
                                </ResponsiveContainer>
                            </Box>
                            <Box sx={{ width: '50%', pr: 1 }}>
                                <Typography variant="caption" fontWeight="bold" display="block">DESPESAS</Typography>
                                <Divider sx={{ my: 0.5 }} />
                                <DetailRow label="Fixas" value={kpis.fixas} color={COLORS.fixa} />
                                <DetailRow label="Variáveis" value={kpis.variaveis} color={COLORS.variavel} />
                            </Box>
                        </Paper>

                        {/* Gráfico 2: Status Recebimentos */}
                        <Paper variant="outlined" sx={{ p: 1, height: 125, display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="caption" fontWeight="bold" sx={{ mb: 0.5 }}>STATUS DE RECEBIMENTOS</Typography>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={dataStatusReceitas} margin={{ left: 0, right: 30 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={60} style={{ fontSize: '0.65rem', fontWeight: 600 }} axisLine={false} tickLine={false} />
                                    <RechartsTooltip cursor={{fill: 'transparent'}} formatter={formatMoney} />
                                    <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={12}>
                                        {dataStatusReceitas.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
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

// --- SUBCOMPONENTES ---

const KPICard = ({ title, value, icon, color, subtext }) => (
    <Grid item xs={6} md={3}>
        <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 85, borderLeft: `4px solid ${color}` }}>
            <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ fontSize: '0.7rem' }}>{title}</Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ color: color, lineHeight: 1.2, fontSize: '1.1rem' }}>
                    {formatMoney(value)}
                </Typography>
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