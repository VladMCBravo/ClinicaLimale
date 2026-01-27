// src/pages/FinanceiroPage.jsx
import React, { useState } from 'react';
import { Paper, Box, Tabs, Tab, Button, Stack } from '@mui/material';
import { FaFileInvoiceDollar, FaMoneyBillWave, FaHandHoldingUsd, FaListAlt } from 'react-icons/fa';
import { AddCircleOutline, AccountBalanceWallet, ReceiptLong } from '@mui/icons-material';

import ContasReceberView from '../components/financeiro/ContasReceberView';
import DespesasView from '../components/financeiro/DespesasView';
import FaturamentoConveniosView from '../components/financeiro/FaturamentoConveniosView';
import ProcedimentosView from '../components/financeiro/ProcedimentosView';
import LancamentoCaixaModal from '../components/financeiro/LancamentoCaixaModal';

function a11yProps(index) {
    return {
        id: `financeiro-tab-${index}`,
        'aria-controls': `financeiro-tabpanel-${index}`,
    };
}

export default function FinanceiroPage() {
    const [activeTab, setActiveTab] = useState(0);
    
    // Controle do Modal Unificado (utilizado na recepção e financeiro)
    const [modalOpen, setModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState({ tab: 0, type: 'receita' });

    const handleChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const handleOpenModal = (tabIndex, type = 'receita') => {
        setModalConfig({ tab: tabIndex, type: type });
        setModalOpen(true);
    };

    return (
        <Paper sx={{ p: 2, margin: 'auto', width: '100%', minHeight: '80vh', backgroundColor: '#f4f5f7' }}>
            
            {/* 1. BARRA DE AÇÕES RÁPIDAS (Padrão Recepção + Financeiro) */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Stack direction="row" spacing={1}>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        startIcon={<ReceiptLong />}
                        onClick={() => handleOpenModal(0)} // Abre em "Pendência Paciente"
                        sx={{ fontWeight: 'bold', textTransform: 'none', borderRadius: 2 }}
                    >
                        Receber de Paciente
                    </Button>
                    <Button 
                        variant="outlined" 
                        color="success" 
                        startIcon={<AddCircleOutline />}
                        onClick={() => handleOpenModal(1, 'receita')} // Aba Avulsa, Tipo Receita
                        sx={{ fontWeight: 'bold', textTransform: 'none', borderRadius: 2 }}
                    >
                        Receita Avulsa
                    </Button>
                    <Button 
                        variant="outlined" 
                        color="error" 
                        startIcon={<AccountBalanceWallet />}
                        onClick={() => handleOpenModal(1, 'despesa')} // Aba Avulsa, Tipo Despesa
                        sx={{ fontWeight: 'bold', textTransform: 'none', borderRadius: 2 }}
                    >
                        Nova Despesa
                    </Button>
                </Stack>
            </Box>

            {/* 2. NAVEGAÇÃO POR ABAS */}
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

            {/* 3. CONTEÚDO DAS VIEWS */}
            <Box sx={{ p: 1 }}>
                {activeTab === 0 && <ContasReceberView />}
                {activeTab === 1 && <DespesasView />}
                {activeTab === 2 && <FaturamentoConveniosView />} 
                {activeTab === 3 && <ProcedimentosView />}
            </Box>

            {/* MODAL CENTRALIZADO */}
            <LancamentoCaixaModal 
                open={modalOpen} 
                onClose={() => setModalOpen(false)} 
                initialTab={modalConfig.tab} 
                initialType={modalConfig.type} 
            />
        </Paper>
    );
}