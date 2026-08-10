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
        // Busca os dados globais para o rodapé fixo
        crmService.getPainelExecutivo().then(res => {
            const dados = res.data;
            setKpis({
                receita: dados.kpis_financeiros?.receita_mensal || 0,
                cac: dados.kpis_estrategicos?.cac || 0,
                ltv: dados.kpis_estrategicos?.ltv || 0
            });
        }).catch(() => console.error("Erro ao carregar KPIs do rodapé"));
    }, []);

    const handlePrint = () => {
        window.print();
    };

    return (
        <Box sx={{ 
            height: 'calc(100vh - 64px)', // Trava a tela (desconta sua navbar superior)
            display: 'flex', 
            flexDirection: 'column', 
            bgcolor: '#f4f5f7',
            overflow: 'hidden' 
        }}>
            
            {/* CABEÇALHO FIXO */}
            <Paper elevation={0} sx={{ p: { xs: 1, md: 2 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 0, borderBottom: '1px solid #e0e0e0', flexShrink: 0, '@media print': { display: 'none' } }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#1C2E4A' }}>Inteligência e Gestão (CRM)</Typography>
                    <Typography variant="caption" color="textSecondary">Visão estratégica e acompanhamento de pacientes</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Tabs value={abaPrincipal} onChange={(e, val) => setAbaPrincipal(val)} textColor="primary" indicatorColor="primary">
                        <Tab icon={<FaChartPie size={16} />} iconPosition="start" label="Dashboard Executivo" sx={{ fontWeight: 'bold', minHeight: '48px' }} />
                        <Tab icon={<FaListUl size={16} />} iconPosition="start" label="Funil e Pacientes" sx={{ fontWeight: 'bold', minHeight: '48px' }} />
                    </Tabs>
                    <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                    <Button variant="outlined" startIcon={<FaPrint />} onClick={handlePrint} sx={{ borderColor: '#1C2E4A', color: '#1C2E4A', '&:hover': { bgcolor: '#f0f4f8' } }}>
                        Imprimir Tela
                    </Button>
                </Box>
            </Paper>

            {/* ÁREA DE CONTEÚDO (A ÚNICA QUE ROLA PARA BAIXO) */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, '@media print': { overflow: 'visible', p: 0 } }}>
                {abaPrincipal === 0 && <CrmDashboardElegante />}
                {abaPrincipal === 1 && <CRMKanbanPage />} 
            </Box>

            {/* RODAPÉ FIXO DE INFORMAÇÕES */}
            <Paper elevation={3} sx={{ p: 1.5, flexShrink: 0, bgcolor: '#1C2E4A', color: 'white', display: 'flex', justifyContent: 'space-around', borderRadius: 0, '@media print': { display: 'none' } }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>💰 Receita Prevista do Mês: {formatMoney(kpis.receita)}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>🎯 Custo por Paciente (CAC): {formatMoney(kpis.cac)}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>⭐ Ticket Médio Vitalício (LTV): {formatMoney(kpis.ltv)}</Typography>
            </Paper>
        </Box>
    );
}