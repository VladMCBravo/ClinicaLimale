import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, Stack, LinearProgress, Alert, Button, IconButton, TextField } from '@mui/material';
import { 
    TrendingDown, AccountBalanceWallet, AttachMoney, 
    Storefront, FilterAlt, CalendarMonth, Public, Refresh
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar 
} from 'recharts';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

import { faturamentoService } from '../../services/faturamentoService';
import { agendamentoService } from '../../services/agendamentoService';

dayjs.locale('pt-br');

const COLORS = {
    receita: '#2e7d32', despesa: '#d32f2f', saldo: '#1976d2',   
    fixa: '#0288d1', variavel: '#ed6c02', pendente: '#f57c00',
    atrasado: '#d32f2f', aporte: '#7b1fa2', ocupacao: '#009688'
};

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
const formatK = (val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val;

export default function FinanceiroDashboardView() {
    const [loading, setLoading] = useState(true);
    const [filtroData, setFiltroData] = useState(dayjs()); 
    const [modoGeral, setModoGeral] = useState(false);
    
    // Dados iniciais para não quebrar a renderização
    const [dados, setDados] = useState({
        kpis: { valorOperacional: 0, valorAportes: 0, totalDespesas: 0, despesasPagas: 0, saldo: 0, ticketMedio: 0, totalAtrasado: 0 },
        grafico_fluxo: [],
        custos_mes: { fixas: 0, variaveis: 0 }
    });

    const [operacional, setOperacional] = useState({ taxa_ocupacao: 0, ticket_medio_hora: 0 });

    const fetchDados = async () => {
        setLoading(true);
        console.log("🔄 [DASHBOARD] Buscando dados...");
        console.log("📅 [FILTRO] Modo Geral?", modoGeral, "| Data:", filtroData?.format('MM/YYYY'));

        try {
            const params = {};
            if (!modoGeral && filtroData) {
                params.mes = filtroData.month() + 1;
                params.ano = filtroData.year();
            }

            // Busca paralela
            const [resFin, resOp] = await Promise.all([
                faturamentoService.getDashboardFinanceiro(params).catch(err => { console.error("Erro Fin:", err); return { error: true }; }),
                agendamentoService.getDashboardKPIs ? agendamentoService.getDashboardKPIs(params).catch(() => ({ data: {} })) : { data: {} }
            ]);
            
            if (resFin.data) {
                console.log("✅ [API FINANCEIRO] Dados recebidos:", resFin.data);
                // Garante que grafico_fluxo seja array, mesmo se vier null
                const dadosTratados = {
                    ...resFin.data,
                    grafico_fluxo: Array.isArray(resFin.data.grafico_fluxo) ? resFin.data.grafico_fluxo : []
                };
                setDados(dadosTratados);
            }

            if (resOp.data) setOperacional(resOp.data);

        } catch (error) {
            console.error("❌ Erro crítico no dashboard", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDados();
    }, [filtroData, modoGeral]);

    // Extração segura
    const kpis = dados?.kpis || {};
    const custos_mes = dados?.custos_mes || { fixas: 0, variaveis: 0 };
    const grafico_fluxo = dados?.grafico_fluxo || [];

    const dataDespesasPie = [
        { name: 'Fixas', value: custos_mes.fixas || 0 },
        { name: 'Variáveis', value: custos_mes.variaveis || 0 }
    ];

    const dataStatusReceitas = [
        { name: 'Pago', valor: (kpis.valorOperacional || 0) + (kpis.valorAportes || 0), fill: COLORS.receita },
        { name: 'Atrasado', valor: kpis.totalAtrasado || 0, fill: COLORS.atrasado } 
    ];

    return (
        <Box sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* --- BARRA DE FILTROS COMPACTA --- */}
            <Box sx={{ 
                px: 1, py: 0.5, mb: 1, 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: '1px solid #eee', bgcolor: '#fff'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Button 
                        size="small" 
                        onClick={() => setModoGeral(!modoGeral)}
                        startIcon={modoGeral ? <Public fontSize="small"/> : <CalendarMonth fontSize="small"/>}
                        sx={{ 
                            textTransform: 'none', fontWeight: 'bold', 
                            color: modoGeral ? 'primary.main' : 'text.secondary',
                            bgcolor: modoGeral ? '#e3f2fd' : 'transparent',
                            borderRadius: 4, px: 2, height: 32
                        }}
                    >
                        {modoGeral ? "Visão Geral (12 Meses)" : "Visão Mensal"}
                    </Button>

                    {!modoGeral && (
                        <DatePicker 
                            views={['month', 'year']}
                            value={filtroData}
                            onChange={(v) => setFiltroData(v)}
                            slotProps={{ 
                                textField: { 
                                    size: 'small', 
                                    variant: 'standard', // Estilo sutil (apenas linha)
                                    InputProps: { disableUnderline: true, style: { fontSize: '0.85rem', fontWeight: 600 } },
                                    sx: { width: 100 } 
                                } 
                            }}
                        />
                    )}
                </Box>
                
                <IconButton size="small" onClick={fetchDados} title="Atualizar">
                    <Refresh fontSize="small" />
                </IconButton>
            </Box>

            {loading && <LinearProgress sx={{ height: 2 }} />}

            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
                {/* LINHA 1: KPIS COMPACTOS */}
                <Grid container spacing={1} sx={{ mb: 1 }}>
                    <KPICard title={modoGeral ? "FATURAMENTO (TOTAL)" : "FATURAMENTO (MÊS)"} value={kpis.valorOperacional} icon={<Storefront />} color={COLORS.receita} />
                    <KPICard title="DESPESAS" value={kpis.totalDespesas} icon={<TrendingDown />} color={COLORS.despesa} />
                    <KPICard title="SALDO" value={kpis.saldo} icon={<AccountBalanceWallet />} color={(kpis.saldo || 0) >= 0 ? COLORS.saldo : COLORS.despesa} />
                    <KPICard title="TICKET MÉDIO" value={kpis.ticketMedio} icon={<AttachMoney />} color="#555" />
                </Grid>

                <Grid container spacing={1} sx={{ height: 'calc(100% - 90px)' }}>
                    
                    {/* COLUNA ESQUERDA: GRÁFICO DE FLUXO */}
                    <Grid item xs={12} md={8} sx={{ height: '100%', minHeight: 220 }}>
                        <Paper variant="outlined" sx={{ p: 1.5, height: '100%', borderRadius: 2, display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="caption" fontWeight="bold" color="text.secondary">
                                    {modoGeral ? "EVOLUÇÃO ANUAL" : "FLUXO DIÁRIO"}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <LegendItem color={COLORS.receita} label="Entradas" />
                                    <LegendItem color={COLORS.despesa} label="Saídas" />
                                </Box>
                            </Box>
                            
                            {/* GRÁFICO COM DEBUG VISUAL SE VAZIO */}
                            <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={grafico_fluxo} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
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
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                                        <XAxis dataKey="name" style={{ fontSize: '0.65rem' }} axisLine={false} tickLine={false} dy={5} />
                                        <YAxis tickFormatter={formatK} style={{ fontSize: '0.65rem' }} axisLine={false} tickLine={false} />
                                        <RechartsTooltip formatter={(value) => formatMoney(value)} contentStyle={{ fontSize: '0.8rem' }} />
                                        <Area type="monotone" dataKey="entradas" stroke={COLORS.receita} strokeWidth={2} fill="url(#colorEntradas)" />
                                        <Area type="monotone" dataKey="saidas" stroke={COLORS.despesa} strokeWidth={2} fill="url(#colorSaidas)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                                {grafico_fluxo.length === 0 && !loading && (
                                    <Typography variant="caption" sx={{ width: '100%', textAlign: 'center', display: 'block', mt: -10, color: '#999' }}>
                                        Sem dados para o gráfico neste período.
                                    </Typography>
                                )}
                            </Box>
                        </Paper>
                    </Grid>

                    {/* COLUNA DIREITA: BREAKDOWNS */}
                    <Grid item xs={12} md={4} sx={{ height: '100%' }}>
                        <Stack spacing={1} sx={{ height: '100%' }}>
                            {/* Card Operacional Compacto */}
                            <Paper variant="outlined" sx={{ p: 1, bgcolor: '#e0f2f1', border: `1px solid ${COLORS.ocupacao}40`, flexShrink: 0 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography variant="caption" fontWeight="bold" color={COLORS.ocupacao}>OCUPAÇÃO</Typography>
                                    <Typography variant="caption" fontWeight="bold">{operacional.taxa_ocupacao || 0}%</Typography>
                                </Box>
                                <LinearProgress variant="determinate" value={operacional.taxa_ocupacao || 0} sx={{ height: 6, borderRadius: 4, mb: 0.5, bgcolor: 'white', '& .MuiLinearProgress-bar': { bgcolor: COLORS.ocupacao } }} />
                                <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>Ticket/Hora: <b>{formatMoney(operacional.ticket_medio_hora || 0)}</b></Typography>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 1, flex: 1, display: 'flex', alignItems: 'center' }}>
                                <ResponsiveContainer width="40%" height="100%">
                                    <RechartsPieChart>
                                        <Pie data={dataDespesasPie} innerRadius={15} outerRadius={30} paddingAngle={2} dataKey="value">
                                            {dataDespesasPie.map((entry, index) => <Cell key={index} fill={index === 0 ? COLORS.fixa : COLORS.variavel} />)}
                                        </Pie>
                                    </RechartsPieChart>
                                </ResponsiveContainer>
                                <Box sx={{ width: '60%', pl: 1 }}>
                                    <Typography variant="caption" fontWeight="bold" display="block" sx={{ mb: 0.5 }}>CUSTOS</Typography>
                                    <DetailRow label="Fixos" value={custos_mes.fixas || 0} color={COLORS.fixa} />
                                    <DetailRow label="Var." value={custos_mes.variaveis || 0} color={COLORS.variavel} />
                                </Box>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 1, flex: 1 }}>
                                <Typography variant="caption" fontWeight="bold" display="block" sx={{ mb: 0.5 }}>RECEBIMENTOS</Typography>
                                <ResponsiveContainer width="100%" height="70%">
                                    <BarChart layout="vertical" data={dataStatusReceitas} margin={{ left: -25, right: 10, bottom: 0, top: 0 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={60} style={{ fontSize: '0.6rem', fontWeight: 600 }} axisLine={false} tickLine={false} />
                                        <RechartsTooltip cursor={{fill: 'transparent'}} formatter={formatMoney} />
                                        <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={8}>
                                            {dataStatusReceitas.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </Paper>
                        </Stack>
                    </Grid>
                </Grid>
            </Box>
        </Box>
    );
}

// KPI Compacto
const KPICard = ({ title, value, icon, color }) => (
    <Grid item xs={6} md={3}>
        <Paper variant="outlined" sx={{ px: 1.5, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 70, borderLeft: `3px solid ${color}` }}>
            <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>{title}</Typography>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ color: color, lineHeight: 1.1, fontSize: '1rem' }}>{formatMoney(value)}</Typography>
            </Box>
            {React.cloneElement(icon, { sx: { fontSize: 20, color: color, opacity: 0.3 } })}
        </Paper>
    </Grid>
);

const LegendItem = ({ color, label }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Box sx={{ width: 8, height: 8, bgcolor: color, borderRadius: '50%' }} />
        <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.65rem' }}>{label}</Typography>
    </Box>
);

const DetailRow = ({ label, value, color }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0 }}>
        <Typography variant="caption" sx={{ color: color, fontWeight: 600, fontSize: '0.65rem' }}>{label}</Typography>
        <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.65rem' }}>{formatK(value)}</Typography>
    </Box>
);