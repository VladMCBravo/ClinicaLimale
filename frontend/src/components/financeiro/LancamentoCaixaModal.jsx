import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, Box, Tabs, Tab, IconButton
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
                
                {/* Reduzi o padding aqui para ganhar espaço vertical */}
                <Box sx={{ p: 2 }}> 
                    {activeTab === 0 && <PagarAgendamentoTab onClose={onClose} />}
                    {activeTab === 1 && <LancamentoAvulsoTab onClose={onClose} />}
                </Box>
            </DialogContent>
        </Dialog>
    );
}