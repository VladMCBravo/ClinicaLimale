// src/components/financeiro/LancamentoCaixaModal.jsx
import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, Box, Tabs, Tab, IconButton, Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import PagarAgendamentoTab from './PagarAgendamentoTab';
import LancamentoAvulsoTab from './LancamentoAvulsoTab';

export default function LancamentoCaixaModal({ open, onClose, initialData = null }) {
    // 0: Receber de Paciente, 1: Entrada/Saída Avulsa
    const [activeTab, setActiveTab] = useState(0);

    useEffect(() => {
        if (open) {
            // Se houver initialData e NÃO tiver agendamento_id, é um lançamento AVULSO
            const isAvulso = initialData && !initialData.agendamento_id;
            setActiveTab(isAvulso ? 1 : 0);
        }
    }, [open, initialData]);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogContent sx={{ p: 0 }}>
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="fullWidth">
                    <Tab label="Receber de Paciente" />
                    <Tab label="Entrada/Saída Avulsa" />
                </Tabs>
                
                <Box sx={{ p: 3 }}> 
                {activeTab === 0 && (
                    <PagarAgendamentoTab 
                        onClose={onClose} 
                        initialPaciente={initialData?.paciente} // Pré-seleciona o paciente se vier da linha
                    />
                )}
                {activeTab === 1 && (
                    <LancamentoAvulsoTab 
                        onClose={onClose} 
                        existingData={initialData} 
                    />
                )}
            </Box>
            </DialogContent>
        </Dialog>
    );
}