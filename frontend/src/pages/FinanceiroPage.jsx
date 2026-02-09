// src/pages/FinanceiroPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dayjs from 'dayjs';
import { Paper, Box, Tabs, Tab, Button, Stack, CircularProgress } from '@mui/material';
import { FaFileInvoiceDollar, FaMoneyBillWave, FaHandHoldingUsd, FaListAlt, FaChartLine } from 'react-icons/fa';
import { AccountBalanceWallet, ReceiptLong } from '@mui/icons-material';

import FinanceiroDashboardView from '../components/financeiro/FinanceiroDashboardView';
import ContasReceberView from '../components/financeiro/ContasReceberView';
import DespesasView from '../components/financeiro/DespesasView';
import FaturamentoConveniosView from '../components/financeiro/FaturamentoConveniosView';
import ProcedimentosView from '../components/financeiro/ProcedimentosView';
import LancamentoCaixaModal from '../components/financeiro/LancamentoCaixaModal';
import { faturamentoService } from '../services/faturamentoService';

function a11yProps(index) {
    return { id: `financeiro-tab-${index}`, 'aria-controls': `financeiro-tabpanel-${index}` };
}

export default function FinanceiroPage() {
    const [activeTab, setActiveTab] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState({ tab: 0, type: 'receita' });

    // Estados de Dados Centralizados
    const [lancamentos, setLancamentos] = useState([]);
    const [despesas, setDespesas] = useState([]);
    const [loading, setLoading] = useState(true);

    // 1. CARREGAMENTO DE DADOS (HÍBRIDO: LEGADO + NOVO)
    const carregarDados = useCallback(async () => {
        setLoading(true);
        try {
            console.log("🔄 [FinanceiroPage] Buscando dados (Legado + Novo)...");
            
            // A. Busca TUDO o que existe (Antigo e Novo) em paralelo
            const [
                resPagamentosLegado, 
                resDespesasLegado,
                resTransacoesReceita,
                resTransacoesDespesa
            ] = await Promise.all([
                faturamentoService.getPagamentos(), // Legado Receitas
                faturamentoService.getDespesas(),   // Legado Despesas
                faturamentoService.getTransacoes({ tipo: 'Receita' }), // Novas Receitas
                faturamentoService.getTransacoes({ tipo: 'Despesa' })  // Novas Despesas
            ]);

            // B. Unificação das Listas (Merge)
            const receitasUnificadas = [
                ...(resPagamentosLegado.data || []), 
                ...(resTransacoesReceita.data || [])
            ];
            
            const despesasUnificadas = [
                ...(resDespesasLegado.data || []), 
                ...(resTransacoesDespesa.data || [])
            ];

            // C. Ordenação por Data de Vencimento
            const sortFn = (a, b) => {
                const dataA = a.data_vencimento || a.data_despesa; // Despesa legada usa data_despesa
                const dataB = b.data_vencimento || b.data_despesa;
                return dayjs(dataA).diff(dayjs(dataB));
            };

            receitasUnificadas.sort(sortFn);
            despesasUnificadas.sort(sortFn);

            setLancamentos(receitasUnificadas);
            setDespesas(despesasUnificadas);
            
            console.log(`✅ Dados carregados. Receitas: ${receitasUnificadas.length}, Despesas: ${despesasUnificadas.length}`);
        } catch (err) {
            console.error("Erro ao carregar dados financeiros", err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Carrega ao montar
    useEffect(() => {
        carregarDados();
    }, [carregarDados]);

    // 2. MOTOR DE PROJEÇÃO (Dashboard)
    const projectionData = useMemo(() => {
        const months = {};
        lancamentos.forEach(l => {
            const monthYear = dayjs(l.data_vencimento).format('MMM/YY');
            if (!months[monthYear]) months[monthYear] = { name: monthYear, entradas: 0, saidas: 0 };
            // Só conta se não for "Renegociado" (pois o valor foi transferido para as novas parcelas)
            if (l.status !== 'Renegociado') {
                months[monthYear].entradas += parseFloat(l.valor || 0);
            }
        });
        despesas.forEach(d => {
            // Usa status novo ou campo pago antigo
            const isPago = d.status === 'Pago' || d.pago === true;
            if (!isPago && d.status !== 'Renegociado') {
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
            
            {/* LINHA DE TOPO */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider', mb: 1, px: 1, minHeight: '40px' }}>
                <Tabs value={activeTab} onChange={handleChange} variant="scrollable" sx={{ minHeight: '40px', '& .MuiTab-root': { minHeight: '40px', py: 0.5, fontSize: '0.75rem' } }}>
                    <Tab icon={<FaChartLine />} iconPosition="start" label="Dashboard" {...a11yProps(0)} sx={{ fontWeight: 'bold', textTransform: 'none' }} />
                    <Tab icon={<FaHandHoldingUsd />} iconPosition="start" label="Recebimentos" {...a11yProps(1)} sx={{ fontWeight: 'bold', textTransform: 'none' }} />
                    <Tab icon={<FaMoneyBillWave />} iconPosition="start" label="Contas a Pagar" {...a11yProps(2)} sx={{ fontWeight: 'bold', textTransform: 'none' }} />
                    <Tab icon={<FaFileInvoiceDollar />} iconPosition="start" label="Faturamento TISS" {...a11yProps(3)} sx={{ fontWeight: 'bold', textTransform: 'none' }} />
                    <Tab icon={<FaListAlt />} iconPosition="start" label="Procedimentos" {...a11yProps(4)} sx={{ fontWeight: 'bold', textTransform: 'none' }} />
                </Tabs>

                <Stack direction="row" spacing={1.5} sx={{ mb: 1 }}>
                    <Button variant="contained" color="primary" startIcon={<ReceiptLong />} onClick={() => handleOpenModal(0)} sx={{ fontWeight: 'bold', textTransform: 'none', borderRadius: 2, px: 3 }}>
                        Receber
                    </Button>
                    <Button variant="contained" color="error" startIcon={<AccountBalanceWallet />} onClick={() => handleOpenModal(1, 'despesa')} sx={{ fontWeight: 'bold', textTransform: 'none', borderRadius: 2, px: 3, bgcolor: '#d32f2f' }}>
                        Pagar
                    </Button>
                </Stack>
            </Box>

            <Box sx={{ p: 1 }}>
                {loading && activeTab !== 0 ? ( 
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                ) : (
                    <>
                        {activeTab === 0 && <FinanceiroDashboardView lancamentos={lancamentos} despesas={despesas} projectionData={projectionData} />}
                        
                        {activeTab === 1 && <ContasReceberView dadosIniciais={lancamentos} onReload={carregarDados} />}
                        
                        {activeTab === 2 && <DespesasView dadosIniciais={despesas} onReload={carregarDados} />}
                        
                        {activeTab === 3 && <FaturamentoConveniosView />} 
                        {activeTab === 4 && <ProcedimentosView />}
                    </>
                )}
            </Box>

            <LancamentoCaixaModal 
                open={modalOpen} 
                onClose={() => {
                    setModalOpen(false);
                    carregarDados(); 
                }} 
                initialTab={modalConfig.tab} 
                initialType={modalConfig.type} 
            />
        </Paper>
    );
}