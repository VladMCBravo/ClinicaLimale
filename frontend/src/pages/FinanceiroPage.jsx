// src/pages/FinanceiroPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import { Paper, Box, Tabs, Tab, Button, Stack, Grid, Card, CardContent, Typography } from '@mui/material';
import { FaFileInvoiceDollar, FaMoneyBillWave, FaHandHoldingUsd, FaListAlt, FaChartLine } from 'react-icons/fa';
import { AccountBalanceWallet, ReceiptLong, EventNote } from '@mui/icons-material';

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
                    faturamentoService.getDespesas()
                ]);
                
                const listaPagamentos = resPagamentos.data || [];
                const listaDespesas = resDespesas.data || [];

                setLancamentos(listaPagamentos);
                setDespesas(listaDespesas);
                
                // Cálculo do resumo baseado nos dados carregados
                const totalR = listaPagamentos
                    .filter(l => l.status === 'Pendente')
                    .reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);
                
                const totalP = listaDespesas
                    .filter(d => !d.pago)
                    .reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);

                setResumo({ totalReceber: totalR, totalPagar: totalP });
            } catch (err) {
                console.error("Erro ao carregar dados da dashboard", err);
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
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: '#1a233b' }}>Projeção de Entradas e Saídas</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Visualização baseada nos parcelamentos de longo prazo.</Typography>
                            <Paper sx={{ p: 4, textAlign: 'center', border: '2px dashed #ddd', borderRadius: 3 }}>
                                <EventNote sx={{ fontSize: 50, color: '#ccc', mb: 1 }} />
                                <Typography color="text.secondary">
                                    {projectionData.length > 0 
                                        ? `Dados de projeção prontos (${projectionData.length} meses encontrados).` 
                                        : "O motor de projeção está processando os lançamentos..."}
                                </Typography>
                            </Paper>
                        </Grid>
                    </Grid>
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