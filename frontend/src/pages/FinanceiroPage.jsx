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
                    <Box sx={{ height: 450, mt: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold', color: 'text.secondary' }}>
                            PROJEÇÃO MENSAL (ENTRADAS VS SAÍDAS)
                        </Typography>
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

            <LancamentoCaixaModal 
                open={modalOpen} 
                onClose={() => setModalOpen(false)} 
                initialTab={modalConfig.tab} 
                initialType={modalConfig.type} 
            />
        </Paper>
    );
}