// src/pages/FinanceiroPage.jsx - VERSÃO HÍBRIDA COMPLETA (DASHBOARD + ABAS)

import React, { useState } from 'react';
import { Paper, Typography, Box, Tabs, Tab } from '@mui/material';

// Importe todos os componentes que serão usados nas abas
import DashboardResumo from '../components/financeiro/DashboardResumo';
import PagamentosPendentesView from '../components/financeiro/PagamentosPendentesView';
import DespesasView from '../components/financeiro/DespesasView';
import RelatoriosView from '../components/financeiro/RelatoriosView';
import FaturamentoConveniosView from '../components/financeiro/FaturamentoConveniosView';
import ProcedimentosView from '../components/financeiro/ProcedimentosView';

// Função auxiliar de acessibilidade (importante para abas)
function a11yProps(index) {
    return {
        id: `financeiro-tab-${index}`,
        'aria-controls': `financeiro-tabpanel-${index}`,
    };
}

export default function FinanceiroPage() {
    // Corrigido: `useState` em vez de `a useState`
    const [activeTab, setActiveTab] = useState(0);

    const handleChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    return (
        <Paper sx={{ p: 2, margin: 'auto', width: '100%' }}>
            <Typography variant="h5" gutterBottom>
                Gestão Financeira
            </Typography>
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs 
                    value={activeTab} 
                    onChange={handleChange} 
                    aria-label="abas de gestão financeira"
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    {/* --- LISTA DE ABAS COMPLETA --- */}
                    <Tab label="Visão Geral" {...a11yProps(0)} />
                    <Tab label="Pagamentos Pendentes" {...a11yProps(1)} />
                    <Tab label="Despesas" {...a11yProps(2)} />
                    <Tab label="Procedimentos e Preços" {...a11yProps(3)} />
                    <Tab label="Faturamento de Convênios" {...a11yProps(4)} />
                    <Tab label="Relatórios Gráficos" {...a11yProps(5)} />
                </Tabs>
            </Box>

            {/* --- CONTEÚDO CORRESPONDENTE A CADA ABA --- */}
            <Box sx={{ mt: 3, p: 1 }}>
                {activeTab === 0 && <DashboardResumo />}
                {activeTab === 1 && <PagamentosPendentesView />}
                {activeTab === 2 && <DespesasView />}
                {activeTab === 3 && <ProcedimentosView />}
                {activeTab === 4 && <FaturamentoConveniosView />}
                {activeTab === 5 && <RelatoriosView />}
            </Box>
        </Paper>
    );
}