// src/pages/FinanceiroPage.jsx
import React, { useState } from 'react';
import { Paper, Box, Tabs, Tab } from '@mui/material';

// Imports dos componentes
// O novo Dashboard Unificado substitui o antigo Inteligente e a aba de Relatórios
import DashboardFinanceiro from '../components/financeiro/DashboardFinanceiro'; 
import ProjecaoCaixaView from '../components/financeiro/ProjecaoCaixaView';
import PagamentosPendentesView from '../components/financeiro/PagamentosPendentesView';
import DespesasView from '../components/financeiro/DespesasView';
import FaturamentoConveniosView from '../components/financeiro/FaturamentoConveniosView';
import ProcedimentosView from '../components/financeiro/ProcedimentosView';

// Removemos: import RelatoriosView... (Agora está dentro do DashboardFinanceiro)

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
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs 
                    value={activeTab} 
                    onChange={handleChange} 
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    {/* Aba 0 agora é o Dashboard Unificado (Power BI style) */}
                    <Tab label="Visão Geral" {...a11yProps(0)} />
                    
                    <Tab label="Fluxo Futuro" {...a11yProps(1)} />
                    <Tab label="Contas a Pagar (Despesas)" {...a11yProps(2)} />
                    <Tab label="Contas a Receber" {...a11yProps(3)} />
                    <Tab label="Faturamento Convênios" {...a11yProps(4)} />
                    <Tab label="Tabela de Preços" {...a11yProps(5)} />
                    
                    {/* A aba de Relatórios (index 6) foi removida pois foi integrada no índice 0 */}
                </Tabs>
            </Box>

            <Box>
                {/* Carrega o novo Dashboard Unificado */}
                {activeTab === 0 && <DashboardFinanceiro />}
                
                {activeTab === 1 && <ProjecaoCaixaView />}
                {activeTab === 2 && <DespesasView />}
                {activeTab === 3 && <PagamentosPendentesView />}
                {activeTab === 4 && <FaturamentoConveniosView />}
                {activeTab === 5 && <ProcedimentosView />}
            </Box>
        </Paper>
    );
}