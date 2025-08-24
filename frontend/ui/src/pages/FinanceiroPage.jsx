// src/pages/FinanceiroPage.jsx - VERSÃO CORRIGIDA E SIMPLIFICADA

import React, { useState } from 'react';
import { Paper, Typography, Box, Tabs, Tab } from '@mui/material';

// Importe os componentes das abas
import PagamentosPendentesView from '../components/financeiro/PagamentosPendentesView';
import DespesasView from '../components/financeiro/DespesasView';
import RelatoriosView from '../components/financeiro/RelatoriosView';
import FaturamentoConveniosView from '../components/financeiro/FaturamentoConveniosView';

// Função auxiliar para acessibilidade das abas
function a11yProps(index) {
    return {
        id: `financeiro-tab-${index}`,
        'aria-controls': `financeiro-tabpanel-${index}`,
    };
}

export default function FinanceiroPage() {
    // 1. Usamos um estado local para controlar a aba ativa. Começa na aba 0 (Pagamentos Pendentes).
    const [activeTab, setActiveTab] = useState(0);

    const handleChange = (event, newValue) => {
        setActiveTab(newValue);
    };

     // --- ADICIONE ESTA LINHA ---
    console.log("Página Financeira renderizou. Aba ativa é:", activeTab);

    return (
        <Paper sx={{ p: 2, margin: 'auto', width: '100%' }}>
            <Typography variant="h5" gutterBottom>Gestão Financeira</Typography>
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                {/* 2. As Tabs agora são controladas pelo estado 'activeTab' */}
                <Tabs value={activeTab} onChange={handleChange} aria-label="abas de gestão financeira">
                    <Tab label="Pagamentos Pendentes" {...a11yProps(0)} />
                    <Tab label="Despesas" {...a11yProps(1)} />
                    <Tab label="Relatórios" {...a11yProps(2)} />
                    <Tab label="Faturamento de Convênios" {...a11yProps(3)} />
                </Tabs>
            </Box>

            <Box sx={{ mt: 3, p: 1 }}>
                {/* 3. O conteúdo exibido depende diretamente do estado 'activeTab' */}
                {activeTab === 0 && <PagamentosPendentesView />}
                {activeTab === 1 && <DespesasView />}
                {activeTab === 2 && <RelatoriosView />}
                {activeTab === 3 && <FaturamentoConveniosView />}
            </Box>
        </Paper>
    );
}