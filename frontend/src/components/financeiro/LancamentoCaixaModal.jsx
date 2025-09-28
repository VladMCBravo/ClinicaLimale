// src/components/financeiro/LancamentoCaixaModal.jsx
import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, Box, Tabs, Tab, Button, Typography
} from '@mui/material';
import PagarAgendamentoTab from './PagarAgendamentoTab'; // <-- IMPORTE O NOVO COMPONENTE

export default function LancamentoCaixaModal({ open, onClose }) {
    const [activeTab, setActiveTab] = useState(0);

    const handleChangeTab = (event, newValue) => {
        setActiveTab(newValue);
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Lançamento no Caixa</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', p: 0 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={activeTab} onChange={handleChangeTab} variant="fullWidth">
                        <Tab label="Pagar Agendamento" />
                        <Tab label="Lançamento Avulso" />
                    </Tabs>
                </Box>
                
                {activeTab === 0 && (
                    <Box sx={{ p: 3, minHeight: '400px' }}>
                        {/* SUBSTITUÍMOS O PLACEHOLDER PELO COMPONENTE REAL */}
                        <PagarAgendamentoTab onClose={onClose} />
                    </Box>
                )}

                {activeTab === 1 && (
                    <Box sx={{ p: 3, minHeight: '400px' }}>
                        <Typography>
                            Formulário para lançamentos de receitas/despesas avulsas. (A ser desenvolvido)
                        </Typography>
                    </Box>
                )}
            </DialogContent>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', borderTop: 1, borderColor: 'divider' }}>
                <Button onClick={onClose}>Fechar</Button>
            </Box>
        </Dialog>
    );
}