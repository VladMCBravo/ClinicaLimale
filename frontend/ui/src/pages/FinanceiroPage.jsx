// src/pages/FinanceiroPage.jsx
import React from 'react';
// CORREÇÃO: Adicione 'Navigate' ao import do react-router-dom
import { Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import { Paper, Typography, Box, Tabs, Tab } from '@mui/material';

// Importe os componentes reais
import PagamentosPendentesView from '../components/financeiro/PagamentosPendentesView';
import DespesasView from '../components/financeiro/DespesasView';
import RelatoriosView from '../components/financeiro/RelatoriosView'; // <-- IMPORTE O NOVO COMPONENTE

export default function FinanceiroPage() {
    const location = useLocation();
    const currentTab = location.pathname.split('/')[2] || 'pendentes';

    return (
        <Paper sx={{ p: 2, margin: 'auto' }}>
            <Typography variant="h5" gutterBottom>Gestão Financeira</Typography>
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={currentTab}>
                    <Tab label="Pagamentos Pendentes" value="pendentes" component={NavLink} to="/financeiro/pendentes" />
                    <Tab label="Despesas" value="despesas" component={NavLink} to="/financeiro/despesas" />
                    <Tab label="Relatórios" value="relatorios" component={NavLink} to="/financeiro/relatorios" />
                </Tabs>
            </Box>

            <Box sx={{ mt: 2 }}>
                 <Routes>
                    <Route path="/" element={<Navigate to="pendentes" replace />} />
                    <Route path="pendentes" element={<PagamentosPendentesView />} />
                    <Route path="despesas" element={<DespesasView />} />
                    <Route path="relatorios" element={<RelatoriosView />} /> {/* <-- USE O COMPONENTE AQUI */}
                </Routes>
            </Box>
        </Paper>
    );
}