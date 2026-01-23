// src/pages/FinanceiroPage.jsx
import React, { useState } from 'react';
import { Paper, Box, Tabs, Tab } from '@mui/material';
import { FaFileInvoiceDollar, FaMoneyBillWave, FaHandHoldingUsd, FaListAlt } from 'react-icons/fa';

// Componentes Operacionais (O Motor)
import ContasReceberView from '../components/financeiro/ContasReceberView';
import DespesasView from '../components/financeiro/DespesasView';
import FaturamentoConveniosView from '../components/financeiro/FaturamentoConveniosView'; // Assumindo que você tem/vai manter
import ProcedimentosView from '../components/financeiro/ProcedimentosView'; // Tabela de Preços

function a11yProps(index) {
    return {
        id: `financeiro-tab-${index}`,
        'aria-controls': `financeiro-tabpanel-${index}`,
    };
}

export default function FinanceiroPage() {
    const [activeTab, setActiveTab] = useState(0);

    const handleChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    return (
        <Paper sx={{ p: 2, margin: 'auto', width: '100%', minHeight: '80vh', backgroundColor: '#f4f5f7' }}>
            
            {/* Cabeçalho Simplificado */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs 
                    value={activeTab} 
                    onChange={handleChange} 
                    variant="scrollable"
                    scrollButtons="auto"
                    textColor="primary"
                    indicatorColor="primary"
                >
                    <Tab icon={<FaHandHoldingUsd />} iconPosition="start" label="Contas a Receber (Caixa)" {...a11yProps(0)} />
                    <Tab icon={<FaMoneyBillWave />} iconPosition="start" label="Contas a Pagar (Despesas)" {...a11yProps(1)} />
                    <Tab icon={<FaFileInvoiceDollar />} iconPosition="start" label="Faturamento TISS" {...a11yProps(2)} />
                    <Tab icon={<FaListAlt />} iconPosition="start" label="Tabela de Preços" {...a11yProps(3)} />
                </Tabs>
            </Box>

            <Box sx={{ p: 1 }}>
                {/* Lógica Limalé: 
                    Aqui é operação pura. Gráficos de análise foram para o CRM Executivo.
                */}
                {activeTab === 0 && <ContasReceberView />}
                {activeTab === 1 && <DespesasView />}
                {activeTab === 2 && <FaturamentoConveniosView />} 
                {activeTab === 3 && <ProcedimentosView />}
            </Box>
        </Paper>
    );
}