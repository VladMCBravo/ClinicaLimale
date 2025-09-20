// src/pages/FinanceiroPage.jsx - VERSÃO CORRIGIDA E SIMPLIFICADA

import React from 'react';
// --- IMPORTAÇÃO CORRIGIDA ---
// Removemos useState, Tabs e Tab que não são mais usados e adicionamos Grid.
import { Paper, Typography, Box, Grid } from '@mui/material';

// Importe todos os componentes que farão parte do dashboard
import DashboardResumo from '../components/financeiro/DashboardResumo';
import PagamentosPendentesView from '../components/financeiro/PagamentosPendentesView';
import DespesasView from '../components/financeiro/DespesasView';
import RelatoriosView from '../components/financeiro/RelatoriosView';
import FaturamentoConveniosView from '../components/financeiro/FaturamentoConveniosView';
import ProcedimentosView from '../components/financeiro/ProcedimentosView';

export default function FinanceiroPage() {
    return (
        <Box sx={{ width: '100%', p: 2 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
                Dashboard Financeiro
            </Typography>

            {/* 1. O Resumo do Dia aparece no topo */}
            <DashboardResumo />

            {/* 2. O Grid para os blocos interativos */}
            <Grid container spacing={3}>
                
                {/* Bloco de Pagamentos Pendentes */}
                <Grid item xs={12} lg={7}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                        {/* Removemos o título de dentro do componente para o layout ficar mais limpo */}
                        <Typography variant="h6" gutterBottom>Pagamentos Pendentes</Typography>
                        <PagamentosPendentesView />
                    </Paper>
                </Grid>
                
                {/* Bloco de Despesas */}
                <Grid item xs={12} lg={5}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h6" gutterBottom>Adicionar Despesa</Typography>
                        <DespesasView />
                    </Paper>
                </Grid>

                {/* Bloco de Relatórios (Gráficos) */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                        <RelatoriosView />
                    </Paper>
                </Grid>
                
                {/* Bloco de Procedimentos e Faturamento (Adicionados) */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                        <ProcedimentosView />
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                        <FaturamentoConveniosView />
                    </Paper>
                </Grid>

            </Grid>
        </Box>
    );
}