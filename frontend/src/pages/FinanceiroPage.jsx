// src/pages/FinanceiroPage.jsx
import React, { useState } from 'react';
import { Paper, Box, Tabs, Tab } from '@mui/material';
import { FaMoneyBillWave, FaHandHoldingUsd, FaChartLine } from 'react-icons/fa';

// Importa o CSS Global (Garante que carregue)
import '../components/financeiro/Financeiro.css';

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
        <Paper className="fin-container" sx={{ p: 0, m: 0, borderRadius: 0, boxShadow: 'none' }}>
            
            {/* Header de Navegação Simplificado */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 0, bgcolor: '#fff', px: 2 }}>
                <Tabs value={activeTab} onChange={handleChange} variant="scrollable">
                    <Tab icon={<FaChartLine />} iconPosition="start" label="Dashboard" {...a11yProps(0)} />
                    <Tab icon={<FaHandHoldingUsd />} iconPosition="start" label="Receber" {...a11yProps(1)} />
                    <Tab icon={<FaMoneyBillWave />} iconPosition="start" label="Pagar" {...a11yProps(2)} />
                    <Tab label="Convênios" {...a11yProps(3)} />
                    <Tab label="Procedimentos" {...a11yProps(4)} />
                </Tabs>
            </Box>

            {/* Conteúdo das Abas */}
            <Box sx={{ p: 0, height: 'calc(100% - 50px)' }}>
                {activeTab === 0 && <FinanceiroDashboardView />}
                {activeTab === 1 && <ContasReceberView />}
                {activeTab === 2 && <DespesasView />}
                {activeTab === 3 && <FaturamentoConveniosView />} 
                {activeTab === 4 && <ProcedimentosView />}
            </Box>
        </Paper>
    );
}