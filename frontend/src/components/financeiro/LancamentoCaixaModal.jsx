import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, Box, Tabs, Tab, Button, IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import PagarAgendamentoTab from './PagarAgendamentoTab';
import LancamentoAvulsoTab from './LancamentoAvulsoTab';

export default function LancamentoCaixaModal({ open, onClose }) {
    const [activeTab, setActiveTab] = useState(0);

    const handleChangeTab = (event, newValue) => {
        setActiveTab(newValue);
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Novo Lançamento no Caixa
                <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
            </DialogTitle>
            
            <DialogContent sx={{ p: 0 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f5f5f5' }}>
                    <Tabs value={activeTab} onChange={handleChangeTab} variant="fullWidth" indicatorColor="primary">
                        <Tab label="Buscar Pendência de Paciente" />
                        <Tab label="Receita/Despesa Avulsa" />
                    </Tabs>
                </Box>
                
                <Box sx={{ p: 3 }}>
                    {activeTab === 0 && (
                        <PagarAgendamentoTab onClose={onClose} />
                    )}

                    {activeTab === 1 && (
                        <LancamentoAvulsoTab onClose={onClose} />
                    )}
                </Box>
            </DialogContent>
        </Dialog>
    );
}