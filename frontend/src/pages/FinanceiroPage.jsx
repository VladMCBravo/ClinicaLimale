// src/pages/FinanceiroPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import { Paper, Box, Tabs, Tab, Button, Stack, Grid, Card, CardContent, Typography } from '@mui/material';
import { FaFileInvoiceDollar, FaMoneyBillWave, FaHandHoldingUsd, FaListAlt, FaChartLine } from 'react-icons/fa';
import { AccountBalanceWallet, ReceiptLong, EventNote } from '@mui/icons-material';
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
    const [resumo, setResumo] = useState({ totalReceber: 0, totalPagar: 0 });

    // 1. CARREGAMENTO DE DADOS (Nível Superior)
    useEffect(() => {
    const carregarDados = async () => {
        try {
            const [resPagamentos, resDespesas] = await Promise.all([
                faturamentoService.getPagamentos(),
                faturamentoService.getDespesas() // Carrega tudo uma única vez aqui
            ]);
            
            setLancamentos(resPagamentos.data || []);
            setDespesas(resDespesas.data || []); // Cache centralizado
            // ... cálculos de resumo
        } catch (err) {
            console.error("Erro estratégico", err);
        }
    };
    carregarDados();
}, []);

    // 2. MOTOR DE PROJEÇÃO (Processamento de Dados)
    const projectionData = useMemo(() => {
        const months = {};
        
        // Entradas Futuras
        lancamentos.forEach(l => {
            const monthYear = dayjs(l.data_vencimento).format('MMM/YY');
            if (!months[monthYear]) months[monthYear] = { name: monthYear, entradas: 0, saidas: 0 };
            months[monthYear].entradas += parseFloat(l.valor || 0);
        });

        // Saídas Futuras
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
        <Paper sx={{ p: 2, margin: 'auto', width: '100%', minHeight: '80vh', backgroundColor: '#f4f5f7' }}>
            
            <Box sx={{ mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={7}>
                        <Stack direction="row" spacing={1}>
                            <Card sx={{ minWidth: 160, bgcolor: '#e3f2fd', borderLeft: '4px solid #1976d2' }}>
                                <CardContent sx={{ p: '12px !important' }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight="bold">A RECEBER (PENDENTE)</Typography>
                                    <Typography variant="subtitle1" color="primary" fontWeight="bold">
                                        {formatMoney(resumo.totalReceber)}
                                    </Typography>
                                </CardContent>
                            </Card>
                            <Card sx={{ minWidth: 160, bgcolor: '#fff4e5', borderLeft: '4px solid #ed6c02' }}>
                                <CardContent sx={{ p: '12px !important' }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight="bold">SAÍDAS PENDENTES</Typography>
                                    <Typography variant="subtitle1" color="#ed6c02" fontWeight="bold">
                                        {formatMoney(resumo.totalPagar)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Stack>
                    </Grid>
                    
                    <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Stack direction="row" spacing={1}>
                            <Button variant="contained" color="primary" startIcon={<ReceiptLong />} onClick={() => handleOpenModal(0)} sx={{ fontWeight: 'bold', textTransform: 'none', borderRadius: 2 }}>Receber</Button>
                            <Button variant="outlined" color="error" startIcon={<AccountBalanceWallet />} onClick={() => handleOpenModal(1, 'despesa')} sx={{ fontWeight: 'bold', textTransform: 'none', borderRadius: 2 }}>Despesa</Button>
                        </Stack>
                    </Grid>
                </Grid>
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={activeTab} onChange={handleChange} variant="scrollable" scrollButtons="auto" textColor="primary" indicatorColor="primary">
                    <Tab icon={<FaChartLine />} iconPosition="start" label="Dashboard de Fluxo" {...a11yProps(0)} />
                    <Tab icon={<FaHandHoldingUsd />} iconPosition="start" label="Caixa / Recebimentos" {...a11yProps(1)} />
                    <Tab icon={<FaMoneyBillWave />} iconPosition="start" label="Contas a Pagar" {...a11yProps(2)} />
                    <Tab icon={<FaFileInvoiceDollar />} iconPosition="start" label="Faturamento TISS" {...a11yProps(3)} />
                    <Tab icon={<FaListAlt />} iconPosition="start" label="Procedimentos" {...a11yProps(4)} />
                </Tabs>
            </Box>

            <Box sx={{ p: 1 }}>
                {activeTab === 0 && (
    <Box sx={{ height: 400, mt: 2 }}>
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `R$ ${value}`} />
                <RechartsTooltip formatter={(val) => formatMoney(val)} />
                <Bar dataKey="entradas" fill="#1976d2" name="Entradas" radius={[4, 4, 0, 0]} />
                <Bar dataKey="saidas" fill="#d32f2f" name="Saídas" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    </Box>
)}

                {activeTab === 1 && <ContasReceberView />}
                {activeTab === 2 && <DespesasView />}
                {activeTab === 3 && <FaturamentoConveniosView />} 
                {activeTab === 4 && <ProcedimentosView />}
            </Box>

            <LancamentoCaixaModal open={modalOpen} onClose={() => setModalOpen(false)} initialTab={modalConfig.tab} initialType={modalConfig.type} />
        </Paper>
    );
}