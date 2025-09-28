// src/components/financeiro/LancamentoCaixaModal.jsx
import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, Box, Tabs, Tab, Button, Typography
} from '@mui/material';

// Por enquanto, vamos usar placeholders para o conteúdo das abas
// const PagarAgendamentoTab = () => <Typography>Conteúdo da Aba Pagar Agendamento</Typography>;
// const LancamentoAvulsoTab = () => <Typography>Conteúdo da Aba Lançamento Avulso</Typography>;

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
                
                {/* Conteúdo da Aba 1 */}
                {activeTab === 0 && (
                    <Box sx={{ p: 3 }}>
                        <Typography>
                            {/* Aqui entrará o componente PagarAgendamentoTab */}
                            Funcionalidade para buscar paciente e listar débitos pendentes. (A ser desenvolvido)
                        </Typography>
                    </Box>
                )}

                {/* Conteúdo da Aba 2 */}
                {activeTab === 1 && (
                    <Box sx={{ p: 3 }}>
                        <Typography>
                            {/* Aqui entrará o componente LancamentoAvulsoTab */}
                            Formulário para lançamentos de receitas/despesas avulsas. (A ser desenvolvido)
                        </Typography>
                    </Box>
                )}
            </DialogContent>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button onClick={onClose}>Fechar</Button>
            </Box>
        </Dialog>
    );
}