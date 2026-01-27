// src/components/financeiro/LancamentoCaixaModal.jsx
import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, Box, Tabs, Tab, IconButton, Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import PagarAgendamentoTab from './PagarAgendamentoTab';
import LancamentoAvulsoTab from './LancamentoAvulsoTab';

export default function LancamentoCaixaModal({ 
    open, 
    onClose, 
    initialTab = 0, // 0: Paciente, 1: Avulso
    initialType = 'receita' // 'receita' ou 'despesa'
}) {
    const [activeTab, setActiveTab] = useState(initialTab);

    // Sincroniza a aba ativa sempre que o modal for aberto por botões diferentes
    useEffect(() => {
        if (open) {
            setActiveTab(initialTab);
        }
    }, [open, initialTab]);

    const handleChangeTab = (event, newValue) => {
        setActiveTab(newValue);
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            fullWidth 
            maxWidth="md"
            // Garante que o modal não feche por cliques acidentais fora dele durante lançamentos
            disableEscapeKeyDown
        >
            <DialogTitle sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                py: 1.5, 
                px: 2, 
                bgcolor: '#1a233b', 
                color: '#fff' 
            }}>
                <Typography variant="subtitle1" fontWeight="bold">
                    Fluxo de Caixa / Lançamento
                </Typography>
                <IconButton onClick={onClose} size="small" sx={{ color: '#fff' }}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>
            
            <DialogContent sx={{ p: 0, bgcolor: '#f8f9fa' }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fff' }}>
                    <Tabs 
                        value={activeTab} 
                        onChange={handleChangeTab} 
                        variant="fullWidth" 
                        indicatorColor="primary" 
                        sx={{ minHeight: '48px' }}
                    >
                        <Tab label="Receber de Paciente" sx={{ fontWeight: 'bold' }} />
                        <Tab label="Entrada/Saída Avulsa" sx={{ fontWeight: 'bold' }} />
                    </Tabs>
                </Box>
                
                <Box sx={{ p: 3 }}> 
                    {/* ABA 0: Lógica de Baixa em Débitos Clínicos */}
                    {activeTab === 0 && (
                        <PagarAgendamentoTab onClose={onClose} />
                    )}

                    {/* ABA 1: Lógica de Caixa Geral (Despesas e Receitas de Outros) */}
                    {activeTab === 1 && (
                        <LancamentoAvulsoTab 
                            onClose={onClose} 
                            initialType={initialType} 
                            // O key força o componente a remontar com o tipo correto (Receita ou Despesa)
                            key={`${initialType}-${open}`} 
                        />
                    )}
                </Box>
            </DialogContent>
        </Dialog>
    );
}