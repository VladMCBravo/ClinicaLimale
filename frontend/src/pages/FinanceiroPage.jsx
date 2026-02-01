// src/pages/FinanceiroPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import { Paper, Box, Tabs, Tab, Button, Stack, Typography } from '@mui/material';
import { FaFileInvoiceDollar, FaMoneyBillWave, FaHandHoldingUsd, FaListAlt, FaChartLine } from 'react-icons/fa';
import { AccountBalanceWallet, ReceiptLong } from '@mui/icons-material';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';
import ContasReceberView from '../components/financeiro/ContasReceberView';
import DespesasView from '../components/financeiro/DespesasView';
import FaturamentoConveniosView from '../components/financeiro/FaturamentoConveniosView';
import ProcedimentosView from '../components/financeiro/ProcedimentosView';
import LancamentoCaixaModal from '../components/financeiro/LancamentoCaixaModal';
import { faturamentoService } from '../services/faturamentoService';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

function a11yProps(index) {
    return {
        id: `financeiro-tab-${index}`,
        'aria-controls': `financeiro-tabpanel-${index}`,
    };
}

export default function FinanceiroPage() {
    const [activeTab, setActiveTab] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState({ tab: 0, type: 'receita' });

    // Estados de Dados
    const [lancamentos, setLancamentos] = useState([]);
    const [despesas, setDespesas] = useState([]);

    // 1. CARREGAMENTO DE DADOS
    useEffect(() => {
        const carregarDados = async () => {
            try {
                const [resPagamentos, resDespesas] = await Promise.all([
                    faturamentoService.getPagamentos(),
                    faturamentoService.getDespesas()
                ]);
                setLancamentos(resPagamentos.data || []);
                setDespesas(resDespesas.data || []);
            } catch (err) {
                console.error("Erro ao carregar dados financeiros", err);
            }
        };
        carregarDados();
    }, []);

    // 2. MOTOR DE PROJEÇÃO
    const projectionData = useMemo(() => {
        const months = {};
        lancamentos.forEach(l => {
            const monthYear = dayjs(l.data_vencimento).format('MMM/YY');
            if (!months[monthYear]) months[monthYear] = { name: monthYear, entradas: 0, saidas: 0 };
            months[monthYear].entradas += parseFloat(l.valor || 0);
        });
        despesas.forEach(d => {
            if (!d.pago) {
                const monthYear = dayjs(d.data_despesa || d.data_vencimento).format('MMM/YY');
                if (!months[monthYear]) months[monthYear] = { name: monthYear, entradas: 0, saidas: 0 };
                months[monthYear].saidas += parseFloat(d.valor || 0);
            }
        });
        return Object.values(months).sort((a, b) => 
            dayjs(a.name, 'MMM/YY', 'pt-br').diff(dayjs(b.name, 'MMM/YY', 'pt-br'))
        );
    }, [lancamentos, despesas]);

    const handleChange = (event, newValue) => setActiveTab(newValue);

    const handleOpenModal = (tabIndex, type = 'receita') => {
        setModalConfig({ tab: tabIndex, type: type });
        setModalOpen(true);
    };

    return (
        <Paper sx={{ p: 2, margin: 'auto', width: '100%', minHeight: '85vh', backgroundColor: '#f4f5f7' }}>
            
            {/* LINHA DE TOPO: ABAS ALINHADAS COM BOTOES */}
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                borderBottom: 1, 
                borderColor: 'divider', 
                mb: 2,
                px: 1 
            }}>
                <Tabs 
                    value={activeTab} 
                    onChange={handleChange} 
                    variant="scrollable" 
                    scrollButtons="auto" 
                    textColor="primary" 
                    indicatorColor="primary"
                    sx={{ minHeight: '48px' }}
                >
                    <Tab icon={<FaChartLine />} iconPosition="start" label="Dashboard" {...a11yProps(0)} sx={{ fontWeight: 'bold', textTransform: 'none' }} />
                    <Tab icon={<FaHandHoldingUsd />} iconPosition="start" label="Recebimentos" {...a11yProps(1)} sx={{ fontWeight: 'bold', textTransform: 'none' }} />
                    <Tab icon={<FaMoneyBillWave />} iconPosition="start" label="Contas a Pagar" {...a11yProps(2)} sx={{ fontWeight: 'bold', textTransform: 'none' }} />
                    <Tab icon={<FaFileInvoiceDollar />} iconPosition="start" label="Faturamento TISS" {...a11yProps(3)} sx={{ fontWeight: 'bold', textTransform: 'none' }} />
                    <Tab icon={<FaListAlt />} iconPosition="start" label="Procedimentos" {...a11yProps(4)} sx={{ fontWeight: 'bold', textTransform: 'none' }} />
                </Tabs>

                {/* BOTÕES DE AÇÃO RÁPIDA */}
                <Stack direction="row" spacing={1.5} sx={{ mb: 1 }}>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        startIcon={<ReceiptLong />} 
                        onClick={() => handleOpenModal(0)} 
                        sx={{ fontWeight: 'bold', textTransform: 'none', borderRadius: 2, px: 3 }}
                    >
                        Receber
                    </Button>
                    <Button 
                        variant="contained" 
                        color="error" 
                        startIcon={<AccountBalanceWallet />} 
                        onClick={() => handleOpenModal(1, 'despesa')} 
                        sx={{ fontWeight: 'bold', textTransform: 'none', borderRadius: 2, px: 3, bgcolor: '#d32f2f' }}
                    >
                        Pagar
                    </Button>
                </Stack>
            </Box>

            <Box sx={{ p: 1 }}>
                {activeTab === 0 && (
    <Box sx={{ mt: 1 }}>
        <Grid container spacing={1.5}>
            {/* 1. GRÁFICO PRINCIPAL: FLUXO MENSAL (Projeção) */}
            <Grid item xs={12} md={7}>
                <Paper variant="outlined" sx={{ p: 1.5, height: 280, borderRadius: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', display: 'block', mb: 1 }}>
                        FLUXO DE CAIXA MENSAL (ENTRADAS VS SAÍDAS)
                    </Typography>
                    <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={projectionData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                            <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                            <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} tickFormatter={(v) => `R$ ${v}`} />
                            <RechartsTooltip />
                            <Bar dataKey="entradas" fill="#1976d2" radius={[3, 3, 0, 0]} barSize={25} />
                            <Bar dataKey="saidas" fill="#d32f2f" radius={[3, 3, 0, 0]} barSize={25} />
                        </BarChart>
                    </ResponsiveContainer>
                </Paper>
            </Grid>

            {/* 2. MINI INDICADORES DE CONVERSÃO/EFICIÊNCIA */}
            <Grid item xs={12} md={5}>
                <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                        <Paper variant="outlined" sx={{ p: 1.5, height: 132, textAlign: 'center', bgcolor: '#fff' }}>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold">TICKETS PENDENTES</Typography>
                            <Typography variant="h5" color="warning.main" fontWeight="bold" sx={{ mt: 1 }}>{lancamentos.filter(l => l.status === 'Pendente').length}</Typography>
                            <Typography variant="caption" color="text.secondary">Total a cobrar</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={6}>
                        <Paper variant="outlined" sx={{ p: 1.5, height: 132, textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold">CONVERSÃO PAGOS</Typography>
                            <Typography variant="h5" color="success.main" fontWeight="bold" sx={{ mt: 1 }}>
                                {lancamentos.length > 0 ? ((lancamentos.filter(l => l.status === 'Pago').length / lancamentos.length) * 100).toFixed(0) : 0}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Taxa de recebimento</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12}>
                         <Paper variant="outlined" sx={{ p: 1.5, height: 132, display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold">DÉBITOS ATRASADOS</Typography>
                                <Typography variant="h5" color="error.main" fontWeight="bold">
                                    {formatMoney(lancamentos.filter(l => l.status === 'Pendente' && dayjs(l.data_vencimento).isBefore(dayjs())).reduce((acc, i) => acc + Number(i.valor), 0))}
                                </Typography>
                            </Box>
                            <Warning color="error" sx={{ opacity: 0.2, fontSize: 40 }} />
                         </Paper>
                    </Grid>
                </Grid>
            </Grid>

            {/* 3. GRÁFICOS SECUNDÁRIOS: DISTRIBUIÇÃO DE DESPESAS */}
            <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 1.5, height: 220, borderRadius: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', display: 'block', mb: 1 }}>
                        DISTRIBUIÇÃO DE DESPESAS (FIXAS VS VARIÁVEIS)
                    </Typography>
                    <ResponsiveContainer width="100%" height="85%">
                        <BarChart layout="vertical" data={[
                            { name: 'Fixas', valor: despesas.filter(d => d.categoria_tipo === 'Fixa').reduce((acc, i) => acc + Number(i.valor), 0) },
                            { name: 'Variáveis', valor: despesas.filter(d => d.categoria_tipo !== 'Fixa').reduce((acc, i) => acc + Number(i.valor), 0) }
                        ]}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" tick={{fontSize: 11}} width={70} />
                            <RechartsTooltip />
                            <Bar dataKey="valor" fill="#455a64" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </Paper>
            </Grid>

            {/* 4. ATIVIDADE RECENTE (Lado a Lado) */}
            <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 1.5, height: 220, borderRadius: 2, overflow: 'hidden' }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', display: 'block', mb: 1 }}>
                        ÚLTIMOS LANÇAMENTOS
                    </Typography>
                    <Stack spacing={0.5}>
                        {lancamentos.slice(0, 5).map(l => (
                            <Box key={l.id} sx={{ display: 'flex', justifyContent: 'space-between', p: 0.5, borderBottom: '1px dashed #eee' }}>
                                <Typography sx={{ fontSize: '0.7rem', fontWeight: 600 }}>{l.paciente_nome?.substring(0, 20)}...</Typography>
                                <Typography sx={{ fontSize: '0.7rem', color: l.status === 'Pago' ? 'green' : 'orange' }}>{formatMoney(l.valor)}</Typography>
                            </Box>
                        ))}
                    </Stack>
                </Paper>
            </Grid>
        </Grid>
    </Box>
)}

                {activeTab === 1 && <ContasReceberView />}
                {activeTab === 2 && <DespesasView />}
                {activeTab === 3 && <FaturamentoConveniosView />} 
                {activeTab === 4 && <ProcedimentosView />}
            </Box>

            <LancamentoCaixaModal 
                open={modalOpen} 
                onClose={() => setModalOpen(false)} 
                initialTab={modalConfig.tab} 
                initialType={modalConfig.type} 
            />
        </Paper>
    );
}