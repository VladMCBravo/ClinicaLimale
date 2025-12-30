import React, { useState, useEffect } from 'react';
import {
    Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, 
    DialogTitle, TextField, Select, MenuItem, InputLabel, FormControl, Typography, Chip, Divider
} from '@mui/material';
import { CheckCircle, Description, Event } from '@mui/icons-material';
import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';

const initialFormState = { valor: '', forma_pagamento: '' };

export default function PagamentoModal({ open, onClose, onSave, pagamento }) {
    const [formData, setFormData] = useState(initialFormState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showSnackbar } = useSnackbar();

    useEffect(() => {
        if (pagamento) {
            setFormData({
                valor: pagamento.valor > 0 ? pagamento.valor : '',
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
            const dataToSend = {
                valor: formData.valor,
                forma_pagamento: formData.forma_pagamento,
                status: 'Pago'
            };
            
            await faturamentoService.updatePagamento(pagamento.id, dataToSend);
            
            showSnackbar('Recebimento confirmado com sucesso!', 'success');
            onSave(); // Atualiza a lista pai
            handleClose();
        } catch (error) {
            console.error("Erro ao registrar pagamento:", error);
            showSnackbar('Erro ao registrar pagamento.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!pagamento) return null;

    // Formatação de data segura
    const getDataFormatada = () => {
        if (pagamento.agendamento) {
            return new Date(pagamento.agendamento.data_hora_inicio).toLocaleString('pt-BR');
        }
        return new Date().toLocaleDateString('pt-BR'); // Data de hoje para avulsos
    };

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircle color="success" />
                Confirmar Recebimento
            </DialogTitle>
            
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 2, mb: 2 }}>
                        {/* 1. Nome do Pagador (Paciente ou Origem) */}
                        <Typography variant="subtitle2" color="text.secondary">
                            {pagamento.paciente ? 'PACIENTE' : 'ORIGEM'}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1a233b', mb: 1 }}>
                            {pagamento.paciente_nome || 'Lançamento Avulso'}
                        </Typography>
                        
                        <Divider sx={{ my: 1 }} />

                        {/* 2. Detalhes (Blinda contra erro de agendamento null) */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                            {pagamento.agendamento ? (
                                <>
                                    <Event fontSize="small" color="action" />
                                    <Typography variant="body2">
                                        {pagamento.agendamento.tipo_consulta} - {getDataFormatada()}
                                    </Typography>
                                </>
                            ) : (
                                <>
                                    <Description fontSize="small" color="action" />
                                    <Typography variant="body2">
                                        {pagamento.descricao || 'Sem descrição'}
                                    </Typography>
                                </>
                            )}
                        </Box>
                    </Box>

                    {/* Formulário de Pagamento */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            name="valor"
                            label="Valor Recebido (R$)"
                            type="number"
                            value={formData.valor}
                            onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                            required
                            autoFocus
                            fullWidth
                            InputProps={{
                                style: { fontSize: '1.2rem', fontWeight: 'bold', color: '#2e7d32' }
                            }}
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
                                <MenuItem value="PIX">PIX</MenuItem>
                                <MenuItem value="CartaoDebito">Cartão de Débito</MenuItem>
                                <MenuItem value="CartaoCredito">Cartão de Crédito</MenuItem>
                                <MenuItem value="MaquinaCartao">Máquina de Cartão</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={handleClose} color="inherit">Cancelar</Button>
                    <Button 
                        type="submit" 
                        variant="contained" 
                        color="success" 
                        disabled={isSubmitting}
                        sx={{ px: 4, fontWeight: 'bold' }}
                    >
                        {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'CONFIRMAR RECEBIMENTO'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}