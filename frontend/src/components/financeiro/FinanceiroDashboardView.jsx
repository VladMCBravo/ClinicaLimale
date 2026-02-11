// src/components/financeiro/FinanceiroDashboardView.jsx
import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, Stack, LinearProgress, Alert, Button, Divider } from '@mui/material';
import { 
    TrendingDown, AccountBalanceWallet, AttachMoney, 
    Storefront, FilterAlt, CalendarMonth, Public
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
    const [erroAPI, setErroAPI] = useState(false);
    
    // --- ESTADO DO FILTRO ---
    // null = Visão Geral. Objeto dayjs = Mês específico.
    const [filtroData, setFiltroData] = useState(dayjs()); // Inicia no mês atual por padrão
    const [modoGeral, setModoGeral] = useState(false); // Toggle para "Todos os tempos"

    const [dados, setDados] = useState(null);
    const [operacional, setOperacional] = useState({ taxa_ocupacao: 0, ticket_medio_hora: 0 });

    const fetchDados = async () => {
        setLoading(true);
        try {
            const params = {};
            
            // Lógica do Filtro
            if (!modoGeral && filtroData) {
                params.mes = filtroData.month() + 1;
                params.ano = filtroData.year();
            }
            // Se modoGeral for true, mandamos params vazio e o backend entende.

            const [resFin, resOp] = await Promise.all([
                faturamentoService.getDashboardFinanceiro(params).catch(err => ({ error: true })),
                // KPI Operacional também deve respeitar o filtro de mês se possível, 
                // mas se o endpoint não suportar, pegamos o padrão.
                agendamentoService.getDashboardKPIs ? agendamentoService.getDashboardKPIs(params).catch(() => ({ data: {} })) : { data: {} }
            ]);
            
            if(resFin.data && resFin.data.kpis) {
                setDados(resFin.data);
                setErroAPI(false);
            } else {
                setErroAPI(true);
            }

            if(resOp.data) setOperacional(resOp.data);

        } catch (error) {
            console.error("Erro dashboard", error);
            setErroAPI(true);
        } finally {
            setLoading(false);
        }
    };

    // Recarrega sempre que o filtro mudar
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

    // Handlers de Filtro
    const handleSetGeral = () => {
        setModoGeral(true);
        setFiltroData(null);
    };

    const handleSetMes = (newValue) => {
        setModoGeral(false);
        setFiltroData(newValue || dayjs());
    };

    return (
        <Box sx={{ p: 1, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* --- BARRA DE FILTROS --- */}
            <Paper elevation={0} sx={{ p: 1, mb: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'transparent' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FilterAlt color="action" />
                    <Typography variant="subtitle2" fontWeight="bold" color="text.secondary">FILTRAR POR:</Typography>
                </Box>

                <Box sx={{ display: 'flex', bgcolor: 'white', borderRadius: 1, p: 0.5, border: '1px solid #e0e0e0' }}>
                    <Button 
                        size="small" 
                        variant={modoGeral ? "contained" : "text"} 
                        color={modoGeral ? "primary" : "inherit"}
                        onClick={handleSetGeral}
                        startIcon={<Public />}
                        sx={{ fontWeight: 'bold' }}
                    >
                        GERAL (Tudo)
                    </Button>
                    <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                    <DatePicker 
                        views={['month', 'year']}
                        value={filtroData}
                        onChange={handleSetMes}
                        slotProps={{ 
                            textField: { 
                                size: 'small', 
                                placeholder: "Selecione Mês",
                                variant: 'standard',
                                InputProps: { disableUnderline: true },
                                sx: { width: 140, ml: 1 } 
                            } 
                        }}
                        disabled={modoGeral} // Desabilita visualmente se estiver em modo geral
                    />
                    {!modoGeral && <CalendarMonth color="action" sx={{ mr: 1, opacity: 0.6 }} />}
                </Box>

                {loading && <Typography variant="caption" color="text.secondary">Atualizando...</Typography>}
            </Paper>

            {erroAPI && <Alert severity="warning" sx={{ mb: 1 }}>Erro ao carregar dados. Verifique a conexão.</Alert>}

            {loading && !dados ? (
                <LinearProgress />
            ) : (
                <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                    
                    {/* KPI CARDS */}
                    <Grid container spacing={1} sx={{ mb: 1 }}>
                        <KPICard 
                            title={modoGeral ? "FATURAMENTO TOTAL" : "FATURAMENTO (MÊS)"}
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
                            color={(kpis.saldo || 0) >= 0 ? COLORS.saldo : COLORS.despesa} 
                            subtext={modoGeral ? "Acumulado Real" : "Resultado do Período"} 
                        />
                        <KPICard 
                            title="TICKET MÉDIO" 
                            value={kpis.ticketMedio} 
                            icon={<AttachMoney />} color="#555" 
                            subtext="Por paciente" 
                        />
                    </Grid>

                    <Grid container spacing={1} sx={{ height: 'calc(100% - 100px)' }}> {/* Ajuste de altura */}
                        
                        {/* GRÁFICO PRINCIPAL */}
                        <Grid item xs={12} md={8} sx={{ height: '100%', minHeight: 250 }}>
                            <Paper variant="outlined" sx={{ p: 1.5, height: '100%', borderRadius: 2, display: 'flex', flexDirection: 'column' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="subtitle2" fontWeight="bold" color="text.secondary">
                                        {modoGeral ? "EVOLUÇÃO DO FLUXO (ÚLTIMOS 12 MESES)" : "FLUXO DIÁRIO DO MÊS"}
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

                        {/* COLUNA LATERAL */}
                        <Grid item xs={12} md={4} sx={{ height: '100%' }}>
                            <Stack spacing={1} sx={{ height: '100%' }}>
                                <Paper variant="outlined" sx={{ p: 1.5, flex: 1, bgcolor: '#e0f2f1', border: `1px solid ${COLORS.ocupacao}50`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="caption" fontWeight="bold" color={COLORS.ocupacao}>CAPACIDADE OPERACIONAL</Typography>
                                        <Typography variant="caption" fontWeight="bold">{operacional.taxa_ocupacao || 0}%</Typography>
                                    </Box>
                                    <LinearProgress variant="determinate" value={operacional.taxa_ocupacao || 0} sx={{ height: 8, borderRadius: 4, mb: 1, bgcolor: 'white', '& .MuiLinearProgress-bar': { bgcolor: COLORS.ocupacao } }} />
                                    <Typography variant="caption">Faturamento/Hora: <b>{formatMoney(operacional.ticket_medio_hora || 0)}</b></Typography>
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
                                        <Typography variant="caption" fontWeight="bold" display="block" sx={{ mb: 0.5 }}>CUSTOS ({modoGeral ? "Média" : "Mês"})</Typography>
                                        <DetailRow label="Fixos" value={custos_mes.fixas || 0} color={COLORS.fixa} />
                                        <DetailRow label="Variáveis" value={custos_mes.variaveis || 0} color={COLORS.variavel} />
                                    </Box>
                                </Paper>

                                <Paper variant="outlined" sx={{ p: 1, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <Typography variant="caption" fontWeight="bold" sx={{ mb: 0.5, fontSize: '0.75rem' }}>RECEBIMENTOS</Typography>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart layout="vertical" data={dataStatusReceitas} margin={{ left: -20, right: 30, bottom: 0, top: 0 }}>
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" width={70} style={{ fontSize: '0.65rem', fontWeight: 600 }} axisLine={false} tickLine={false} />
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
            )}
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