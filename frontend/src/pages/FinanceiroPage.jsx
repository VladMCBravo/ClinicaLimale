import React, { useState } from 'react';
import { Paper, Box, Tabs, Tab } from '@mui/material'; // Removido Typography

// Imports dos componentes...
import DashboardInteligente from '../components/financeiro/DashboardInteligente';
import ProjecaoCaixaView from '../components/financeiro/ProjecaoCaixaView';
import PagamentosPendentesView from '../components/financeiro/PagamentosPendentesView';
import DespesasView from '../components/financeiro/DespesasView';
import RelatoriosView from '../components/financeiro/RelatoriosView';
import FaturamentoConveniosView from '../components/financeiro/FaturamentoConveniosView';
import ProcedimentosView from '../components/financeiro/ProcedimentosView';

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
        <Paper sx={{ p: 2, margin: 'auto', width: '100%', minHeight: '80vh' }}>
            {/* REMOVIDO O TYPOGRAPHY "GESTÃO FINANCEIRA" AQUI */}
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs 
                    value={activeTab} 
                    onChange={handleChange} 
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    <Tab label="Painel Inteligente" {...a11yProps(0)} />
                    <Tab label="Fluxo Futuro" {...a11yProps(1)} />
                    <Tab label="Contas a Pagar (Despesas)" {...a11yProps(2)} />
                    <Tab label="Contas a Receber" {...a11yProps(3)} />
                    <Tab label="Faturamento Convênios" {...a11yProps(4)} />
                    <Tab label="Tabela de Preços" {...a11yProps(5)} />
                    <Tab label="Relatórios" {...a11yProps(6)} />
                </Tabs>
            </Box>

            <Box>
                {activeTab === 0 && <DashboardInteligente />}
                {activeTab === 1 && <ProjecaoCaixaView />}
                {activeTab === 2 && <DespesasView />}
                {activeTab === 3 && <PagamentosPendentesView />}
                {activeTab === 4 && <FaturamentoConveniosView />}
                {activeTab === 5 && <ProcedimentosView />}
                {activeTab === 6 && <RelatoriosView />}
            </Box>
        </Paper>
    );
}