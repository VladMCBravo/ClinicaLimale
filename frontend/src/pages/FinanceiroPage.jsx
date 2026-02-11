// src/pages/FinanceiroPage.jsx
import React, { useState } from 'react';
import dayjs from 'dayjs';
import { Paper, Box, Tabs, Tab, CircularProgress } from '@mui/material';
import { FaMoneyBillWave, FaHandHoldingUsd, FaChartLine } from 'react-icons/fa';

import FinanceiroDashboardView from '../components/financeiro/FinanceiroDashboardView';
import ContasReceberView from '../components/financeiro/ContasReceberView';
import DespesasView from '../components/financeiro/DespesasView';
import FaturamentoConveniosView from '../components/financeiro/FaturamentoConveniosView';
import ProcedimentosView from '../components/financeiro/ProcedimentosView';


function a11yProps(index) {
    return { id: `financeiro-tab-${index}`, 'aria-controls': `financeiro-tabpanel-${index}` };
}

export default function FinanceiroPage() {
    const [activeTab, setActiveTab] = useState(0);

    const handleChange = (event, newValue) => setActiveTab(newValue);

    // DICA DE PERFORMANCE:
    // O unmountOnExit no Dashboard garante que ele recalcule ao voltar pra ele
    // O keepMounted nas abas de tabela evita que perca a posição do scroll (opcional)

    return (
        <Paper sx={{ p: 2, margin: 'auto', width: '100%', minHeight: '85vh', backgroundColor: '#f4f5f7' }}>
            
            {/* LINHA DE TOPO: Apenas Navegação */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={activeTab} onChange={handleChange} variant="scrollable">
                    <Tab icon={<FaChartLine />} iconPosition="start" label="Dashboard & KPIs" {...a11yProps(0)} />
                    <Tab icon={<FaHandHoldingUsd />} iconPosition="start" label="Contas a Receber" {...a11yProps(1)} />
                    <Tab icon={<FaMoneyBillWave />} iconPosition="start" label="Contas a Pagar" {...a11yProps(2)} />
                    {/* Outras abas... */}
                </Tabs>
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
        </Paper>
    );
}