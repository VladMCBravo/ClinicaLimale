// src/components/financeiro/PagamentoModal.jsx - VERSÃO FINAL

import React, { useState, useEffect } from 'react';
import {
    Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, 
    DialogTitle, TextField, Select, MenuItem, InputLabel, FormControl, Typography
} from '@mui/material';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';

const initialFormState = { valor: '', forma_pagamento: '' };

// 1. A prop agora é 'pagamento'
export default function PagamentoModal({ open, onClose, onSave, pagamento }) {
    const [formData, setFormData] = useState(initialFormState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showSnackbar } = useSnackbar();

    // 2. Popula o formulário com os dados do pagamento quando o modal abre
    useEffect(() => {
        if (pagamento) {
            setFormData({
                valor: pagamento.valor > 0 ? pagamento.valor : '', // Se o valor for 0, deixa em branco para o usuário preencher
                forma_pagamento: '',
            });
        }
    }, [pagamento]);

    const handleClose = () => {
        setFormData(initialFormState);
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // 3. A requisição agora é PATCH para ATUALIZAR o pagamento existente
            await apiClient.patch(`/faturamento/pagamentos/${pagamento.id}/`, {
                valor: formData.valor,
                forma_pagamento: formData.forma_pagamento,
                status: 'Pago' // O objetivo principal: mudar o status para 'Pago'
            });
            showSnackbar('Pagamento registado com sucesso!', 'success');
            onSave();
            handleClose();
        } catch (error) {
            console.error("Erro ao registar pagamento:", error.response?.data);
            showSnackbar('Erro ao registar pagamento.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!pagamento) return null;

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
            <DialogTitle>Registar Pagamento</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    {/* 4. As informações vêm do objeto 'pagamento' */}
                    <Typography variant="subtitle1">Paciente: <strong>{pagamento.paciente_nome}</strong></Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Consulta de {pagamento.agendamento.tipo_consulta} em {new Date(pagamento.agendamento.data_hora_inicio).toLocaleDateString('pt-BR')}
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