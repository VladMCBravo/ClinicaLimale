import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, Box, Tabs, Tab, IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import PagarAgendamentoTab from './PagarAgendamentoTab';
import LancamentoAvulsoTab from './LancamentoAvulsoTab';

// Adicione as props initialTab e initialType
export default function LancamentoCaixaModal({ open, onClose, initialTab = 0, initialType = 'receita' }) {
    const [activeTab, setActiveTab] = useState(initialTab);

    // Atualiza a aba quando o modal abre com uma prop diferente
    useEffect(() => {
        if (open) {
            setActiveTab(initialTab);
        }
    }, [open, initialTab]);

    const handleChangeTab = (event, newValue) => {
        setActiveTab(newValue);
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, px: 2, fontSize: '1rem' }}>
                Novo Lançamento
                <IconButton onClick={onClose} size="small"><CloseIcon fontSize="small" /></IconButton>
            </DialogTitle>
            
            <DialogContent sx={{ p: 0, bgcolor: '#f8f9fa' }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fff' }}>
                    <Tabs value={activeTab} onChange={handleChangeTab} variant="fullWidth" indicatorColor="primary" sx={{ minHeight: '40px' }}>
                        <Tab label="Pendência Paciente" sx={{ minHeight: '40px', py: 0 }} />
                        <Tab label="Receita/Despesa Avulsa" sx={{ minHeight: '40px', py: 0 }} />
                    </Tabs>
                </Box>
                
                <Box sx={{ p: 2 }}> 
                    {activeTab === 0 && <PagarAgendamentoTab onClose={onClose} />}
                    {/* ADICIONE key={initialType} AQUI ABAIXO */}
                    {activeTab === 1 && (
                        <LancamentoAvulsoTab 
                            onClose={onClose} 
                            initialType={initialType} 
                            key={initialType} // <--- O SEGREDO: Força o componente a resetar quando o tipo muda
                        />
                    )}
                </Box>
            </DialogContent>
        </Dialog>
    );
}