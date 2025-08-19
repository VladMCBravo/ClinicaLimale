// src/components/financeiro/PagamentoModal.jsx
import React, { useState } from 'react';
import {
    Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, 
    DialogTitle, TextField, Select, MenuItem, InputLabel, FormControl, Typography
} from '@mui/material';
import apiClient from '../../api/axiosConfig';

const initialFormState = { valor: '', forma_pagamento: '' };

export default function PagamentoModal({ open, onClose, onSave, agendamento }) {
    const [formData, setFormData] = useState(initialFormState);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Limpa o formulário sempre que o modal for fechado
    const handleClose = () => {
        setFormData(initialFormState);
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // A URL corresponde à sua API: agendamentos/<id>/pagamentos/
            await apiClient.post(`/agendamentos/${agendamento.id}/pagamentos/`, formData);
            onSave(); // Avisa a página pai para recarregar a lista
            handleClose(); // Fecha o modal
        } catch (error) {
            console.error("Erro ao registrar pagamento:", error.response?.data);
            // Aqui você pode adicionar um alerta de erro
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!agendamento) return null; // Não renderiza o modal sem um agendamento selecionado

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
            <DialogTitle>Registrar Pagamento</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Typography variant="subtitle1">Paciente: <strong>{agendamento.paciente}</strong></Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Consulta de {agendamento.tipo_consulta} em {new Date(agendamento.data_hora_inicio).toLocaleDateString('pt-BR')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                        <TextField
                            name="valor"
                            label="Valor a Pagar (R$)"
                            type="number"
                            value={formData.valor}
                            onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                            required
                            autoFocus
                        />
                        <FormControl fullWidth required>
                            <InputLabel id="forma-pagamento-label">Forma de Pagamento</InputLabel>
                            <Select
                                labelId="forma-pagamento-label"
                                name="forma_pagamento"
                                value={formData.forma_pagamento}
                                label="Forma de Pagamento"
                                onChange={(e) => setFormData({ ...formData, forma_pagamento: e.target.value })}
                            >
                                <MenuItem value="Dinheiro">Dinheiro</MenuItem>
                                <MenuItem value="CartaoCredito">Cartão de Crédito</MenuItem>
                                <MenuItem value="CartaoDebito">Cartão de Débito</MenuItem>
                                <MenuItem value="PIX">PIX</MenuItem>
                                <MenuItem value="Convenio">Convênio</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancelar</Button>
                    <Button type="submit" variant="contained" disabled={isSubmitting}>
                        {isSubmitting ? <CircularProgress size={24} /> : 'Confirmar Pagamento'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}