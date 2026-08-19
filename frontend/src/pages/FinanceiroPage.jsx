// src/pages/FinanceiroPage.jsx
import React, { useState } from 'react';
import { Paper, Box, Tabs, Tab } from '@mui/material';
import { FaMoneyBillWave, FaHandHoldingUsd, FaChartLine, FaFileMedical, FaRegHandshake } from 'react-icons/fa';

// Importa o CSS Global
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
            
            {/* Header de Navegação Fino e Compacto */}
            <Box className="fin-tabs-container">
                <Tabs 
                    value={activeTab} 
                    onChange={handleChange} 
                    className="fin-tabs-root"
                    variant="standard"
                    centered={false}
                    TabIndicatorProps={{ style: { height: 3, borderRadius: '3px 3px 0 0' } }}
                >
                    <Tab 
                        icon={<FaChartLine size={14} />} 
                        label="Dashboard" 
                        {...a11yProps(0)} 
                        className="fin-tab-item" 
                    />
                    <Tab 
                        icon={<FaHandHoldingUsd size={14} />} 
                        label="Receber" 
                        {...a11yProps(1)} 
                        className="fin-tab-item" 
                    />
                    <Tab 
                        icon={<FaMoneyBillWave size={14} />} 
                        label="Pagar" 
                        {...a11yProps(2)} 
                        className="fin-tab-item" 
                    />
                    <Tab 
                        icon={<FaRegHandshake size={14} />} 
                        label="Convênios" 
                        {...a11yProps(3)} 
                        className="fin-tab-item" 
                    />
                    <Tab
                        icon={<FaFileMedical size={14} />}
                        label="Procedimentos"
                        {...a11yProps(4)}
                        className="fin-tab-item"
                    />
                </Tabs>
            </Box>

            {/* Conteúdo das Abas (Ocupa o resto da tela) */}
            <Box sx={{ p: 0, height: 'calc(100% - 42px)', overflow: 'hidden' }}>
                {activeTab === 0 && <FinanceiroDashboardView />}
                {activeTab === 1 && <ContasReceberView />}
                {activeTab === 2 && <DespesasView />}
                {activeTab === 3 && <FaturamentoConveniosView />}
                {activeTab === 4 && <ProcedimentosView />}
            </Box>
        </Paper>
    );
}