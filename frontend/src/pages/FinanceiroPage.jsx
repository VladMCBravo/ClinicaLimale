// src/pages/FinanceiroPage.jsx - VERSÃO DASHBOARD REORGANIZADO

import React from 'react';
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
            <Typography variant="h4" gutterBottom sx={{ mb: 2, fontWeight: 'bold' }}>
                Dashboard Financeiro
            </Typography>

            {/* LINHA 1: RESUMO DO DIA (Mantido no topo, é o mais importante) */}
            <DashboardResumo />

            {/* O Grid principal que organiza todos os blocos abaixo */}
            <Grid container spacing={3}>
                
                {/* LINHA 2: BLOCO DE PAGAMENTOS PENDENTES (Ação principal do dia) */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                        {/* É bom manter os títulos dentro dos blocos para dar contexto */}
                        <PagamentosPendentesView />
                    </Paper>
                </Grid>
                
                {/* LINHA 3: DESPESAS E RELATÓRIOS LADO A LADO */}
                {/* Bloco de Despesas (Formulário e Tabela) */}
                <Grid item xs={12} md={7}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                         <Typography variant="h6" gutterBottom>Gestão de Despesas</Typography>
                        <DespesasView />
                    </Paper>
                </Grid>

                {/* Bloco de Relatórios (Gráficos) */}
                <Grid item xs={12} md={5}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                        <RelatoriosView />
                    </Paper>
                </Grid>

                {/* LINHA 4: TABELAS DE GESTÃO */}
                {/* Bloco de Procedimentos e Preços */}
                <Grid item xs={12} lg={7}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                        <ProcedimentosView />
                    </Paper>
                </Grid>

                {/* Bloco de Faturamento de Convênios */}
                <Grid item xs={12} lg={5}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                        <FaturamentoConveniosView />
                    </Paper>
                </Grid>

            </Grid>
        </Box>
    );
}