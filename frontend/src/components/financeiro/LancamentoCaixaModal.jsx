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
    initialTab = 0, 
    initialType = 'receita',
    initialData = null // Se este campo vier preenchido, o modal vira modo "Edição/Baixa"
}) {
    const [activeTab, setActiveTab] = useState(initialTab);

    // Sincroniza a aba ativa sempre que o modal for aberto por botões diferentes
    useEffect(() => {
        if (open) {
            // Se clicou num "Check" de despesa (initialData existe), 
            // força a aba 1 (Avulso) e o tipo 'despesa'
            setActiveTab(initialData ? 1 : initialTab);
        }
    }, [open, initialData, initialTab]);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogContent sx={{ p: 0 }}>
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="fullWidth">
                    <Tab label="Receber de Paciente" />
                    <Tab label="Entrada/Saída Avulsa" />
                </Tabs>
                
                <Box sx={{ p: 3 }}> 
                    {activeTab === 0 && <PagarAgendamentoTab onClose={onClose} />}
                    {activeTab === 1 && (
                        <LancamentoAvulsoTab 
                            onClose={onClose} 
                            initialType={initialData ? 'despesa' : initialType} 
                            existingData={initialData} // Passa os dados para a aba
                            key={initialData?.id || 'novo'} 
                        />
                    )}
                </Box>
            </DialogContent>
        </Dialog>
    );
}