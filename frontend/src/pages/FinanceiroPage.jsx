// src/pages/FinanceiroPage.jsx
import React, { useState } from 'react';
import { Paper, Box, Tabs, Tab } from '@mui/material';
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

    return (
        <Paper sx={{ p: 2, margin: 'auto', width: '100%', minHeight: '85vh', backgroundColor: '#f4f5f7' }}>
            
            {/* LINHA DE TOPO: Apenas Navegação */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={activeTab} onChange={handleChange} variant="scrollable">
                    <Tab icon={<FaChartLine />} iconPosition="start" label="Dashboard & KPIs" {...a11yProps(0)} />
                    <Tab icon={<FaHandHoldingUsd />} iconPosition="start" label="Contas a Receber" {...a11yProps(1)} />
                    <Tab icon={<FaMoneyBillWave />} iconPosition="start" label="Contas a Pagar" {...a11yProps(2)} />
                    {/* Se você tiver essas views, mantenha, senão comente */}
                    <Tab label="Convênios" {...a11yProps(3)} />
                    <Tab label="Procedimentos" {...a11yProps(4)} />
                </Tabs>
            </Box>

            <Box sx={{ p: 1 }}>
                {/* CORREÇÃO CRÍTICA:
                    Removemos as props (lancamentos, despesas, etc) pois agora cada View 
                    carrega seus próprios dados. Removemos também o 'loading' global.
                */}
                
                {activeTab === 0 && <FinanceiroDashboardView />}
                
                {activeTab === 1 && <ContasReceberView />}
                
                {activeTab === 2 && <DespesasView />}
                
                {activeTab === 3 && <FaturamentoConveniosView />} 
                
                {activeTab === 4 && <ProcedimentosView />}
            </Box>
        </Paper>
    );
}