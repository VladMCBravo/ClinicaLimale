import React, { useState, useEffect } from 'react';
import { Box, Tabs, Tab, Typography, Button, Paper, Divider } from '@mui/material';
import { FaPrint, FaChartPie, FaListUl } from 'react-icons/fa';
import CrmDashboardElegante from './CrmDashboardElegante';
import CRMKanbanPage from './CRMKanbanPage';
import { crmService } from '../../services/crmService';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function CRMPageBase() {
    const [abaPrincipal, setAbaPrincipal] = useState(0);
    const [kpis, setKpis] = useState({ receita: 0, cac: 0, ltv: 0 });

    useEffect(() => {
        crmService.getPainelExecutivo().then(res => {
            const dados = res.data;
            setKpis({
                receita: dados.kpis_financeiros?.receita_mensal || 0,
                cac: dados.kpis_estrategicos?.cac || 0,
                ltv: dados.kpis_estrategicos?.ltv || 0
            });
        }).catch(() => console.error("Erro ao carregar KPIs"));
    }, []);

    return (
        <Box sx={{ 
            height: 'calc(100vh - 64px)', 
            display: 'flex', 
            flexDirection: 'column', 
            bgcolor: '#f4f5f7',
            overflow: 'hidden' 
        }}>
            
            {/* CABEÇALHO SUPER COMPACTO */}
            <Paper elevation={0} sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 0, borderBottom: '1px solid #e0e0e0', flexShrink: 0, '@media print': { display: 'none' } }}>
                <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1C2E4A', lineHeight: 1.2 }}>Inteligência e Gestão</Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>Visão estratégica do CRM</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    <Tabs value={abaPrincipal} onChange={(e, val) => setAbaPrincipal(val)} textColor="primary" indicatorColor="primary" sx={{ minHeight: '32px' }}>
                        <Tab icon={<FaChartPie size={14} />} iconPosition="start" label="Dashboard" sx={{ fontWeight: 'bold', minHeight: '32px', py: 0, px: 1, fontSize: '0.8rem' }} />
                        <Tab icon={<FaListUl size={14} />} iconPosition="start" label="Funil" sx={{ fontWeight: 'bold', minHeight: '32px', py: 0, px: 1, fontSize: '0.8rem' }} />
                    </Tabs>
                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                    <Button variant="outlined" size="small" startIcon={<FaPrint />} onClick={() => window.print()} sx={{ borderColor: '#1C2E4A', color: '#1C2E4A', py: 0.2, fontSize: '0.75rem' }}>
                        Imprimir
                    </Button>
                </Box>
            </Paper>

            {/* ÁREA DE CONTEÚDO (Agora ocupa exatos 100% do espaço restante sem vazar) */}
            <Box sx={{ flexGrow: 1, p: 1.5, minHeight: 0, overflow: 'hidden', '@media print': { overflow: 'visible', p: 0 } }}>
                {abaPrincipal === 0 && <CrmDashboardElegante />}
                {abaPrincipal === 1 && <CRMKanbanPage />} 
            </Box>

            {/* RODAPÉ FIXO */}
            <Paper elevation={3} sx={{ p: 1, flexShrink: 0, bgcolor: '#1C2E4A', color: 'white', display: 'flex', justifyContent: 'space-around', borderRadius: 0, '@media print': { display: 'none' } }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>💰 Receita Prevista do Mês: {formatMoney(kpis.receita)}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>🎯 Custo por Paciente (CAC): {formatMoney(kpis.cac)}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>⭐ Ticket Médio Vitalício (LTV): {formatMoney(kpis.ltv)}</Typography>
            </Paper>
        </Box>
    );
}