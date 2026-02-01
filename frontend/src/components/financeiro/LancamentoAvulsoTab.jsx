// src/components/financeiro/LancamentoAvulsoTab.jsx
import React, { useState, useEffect } from 'react';
import {
    Box, Grid, TextField, Button, CircularProgress, 
    ToggleButton, ToggleButtonGroup, Typography, Paper, InputAdornment, MenuItem,
    FormControlLabel, Switch
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AttachMoney, MoneyOff } from '@mui/icons-material';
import dayjs from 'dayjs';

import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';

// 1. Adicione esta função auxiliar no topo para blindar contra datas inválidas
const safeDayjs = (date) => {
    const d = dayjs(date);
    return d.isValid() ? d : dayjs();
};

export default function LancamentoAvulsoTab({ onClose, initialType, existingData = null }) {
    const isEditing = !!existingData?.id;
    const [tipo, setTipo] = useState(initialType);
    const [jaLiquidado, setJaLiquidado] = useState(existingData?.pago || false);
    const [categorias, setCategorias] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        id: existingData?.id || null, 
        descricao: existingData?.descricao || '',
        valor: existingData?.valor || '',
        categoria: existingData?.categoria || '',
        forma_pagamento: existingData?.forma_pagamento || 'Dinheiro',
        data_vencimento: existingData?.data_vencimento || dayjs().format('YYYY-MM-DD'),
        data_pagamento: existingData?.data_pagamento || dayjs().format('YYYY-MM-DD'),
        qtd_parcelas: 1 // Mantemos 1 para novos, mas ignoramos em edição
    });
    
    const { showSnackbar } = useSnackbar();

    useEffect(() => {
        if (existingData) {
            setFormData(existingData);
            setJaLiquidado(existingData.pago);
        }
    }, [existingData]);

    useEffect(() => {
        // Carrega apenas categorias de despesa
        faturamentoService.getCategoriasDespesa()
            .then(res => setCategorias(res.data || []))
            .catch(err => console.error("Erro categorias", err));
    }, []);

    const handleTipoChange = (event, newTipo) => {
        if (newTipo !== null) {
            setTipo(newTipo);
            setJaLiquidado(true);
            setFormData(prev => ({ ...prev, data_pagamento: dayjs().format('YYYY-MM-DD') }));
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const payload = { 
            ...formData, 
            pago: jaLiquidado,
            tipo: tipo 
        };

        try {
            if (isEditing) {
                // UPDATE: Corrige ou reverte o pagamento
                await faturamentoService.updateDespesa(formData.id, payload);
                showSnackbar('Alteração salva com sucesso!', 'success');
            } else {
                // CREATE: Gera novo lançamento
                await faturamentoService.createLancamentoAvulso(payload);
                showSnackbar('Lançamento realizado!', 'success');
            }
            onClose();
        } catch (error) {
            showSnackbar('Erro ao salvar.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const limiteParcelas = tipo === 'receita' ? 10 : 64;

    return (
        <Box component="form" onSubmit={handleSubmit}>
            {!isEditing && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                    <ToggleButtonGroup value={tipo} exclusive onChange={handleTipoChange} size="small">
                        <ToggleButton value="receita" color="success" sx={{ px: 4 }}>
                            <AttachMoney sx={{ mr: 1 }} /> RECEITA AVULSA
                        </ToggleButton>
                        <ToggleButton value="despesa" color="error" sx={{ px: 4 }}>
                            <MoneyOff sx={{ mr: 1 }} /> DESPESA
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>
            )}

        <Grid container spacing={3}>
            {/* COLUNA 1: DADOS GERAIS */}
            <Grid item xs={12} md={7}>
                <Paper sx={{ p: 2 }} variant="outlined">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                            {isEditing ? `Revisão de Parcela: ${formData.descricao}` : 'Dados do Lançamento'}
                        </Typography>
                        <FormControlLabel
                            control={
                                <Switch 
                                    size="small" 
                                    checked={jaLiquidado} 
                                    onChange={(e) => setJaLiquidado(e.target.checked)} 
                                />
                            }
                            label={
                                <Typography variant="caption" fontWeight="bold" color={jaLiquidado ? "success.main" : "warning.main"}>
                                    {jaLiquidado ? 'LIQUIDADO' : 'AGENDADO'}
                                </Typography>
                            }
                        />
                    </Box>

                    <TextField 
                        name="descricao" label="Descrição" 
                        fullWidth size="small" margin="dense" required
                        value={formData.descricao} onChange={handleChange}
                        disabled={isEditing} // Bloqueia alteração de nome em parcelas (ex: 6/24) para manter o rastro
                    />

                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid item xs={6}>
                            <DatePicker
                                label="Vencimento"
                                // CORREÇÃO DATA INVÁLIDA: Usa safeDayjs para garantir objeto válido
                                value={safeDayjs(formData.data_vencimento)}
                                onChange={(v) => setFormData({...formData, data_vencimento: v.format('YYYY-MM-DD')})}
                                slotProps={{ textField: { size: 'small', fullWidth: true } }}
                            />
                        </Grid>
                        {jaLiquidado && (
                            <Grid item xs={6}>
                                <DatePicker
                                    label="Data do Caixa"
                                    value={safeDayjs(formData.data_pagamento || formData.data_vencimento)}
                                    onChange={(v) => setFormData({...formData, data_pagamento: v.format('YYYY-MM-DD')})}
                                    slotProps={{ textField: { size: 'small', fullWidth: true, color: 'success' } }}
                                />
                            </Grid>
                        )}
                    </Grid>
                </Paper>
            </Grid>

            {/* COLUNA 2: VALORES E PAGAMENTO */}
            <Grid item xs={12} md={5}>
                <Paper sx={{ p: 2, bgcolor: '#fcfcfc', height: '100%' }} variant="outlined">
                    <TextField 
                        name="valor" label="Valor Total" type="number" fullWidth required
                        value={formData.valor} onChange={handleChange}
                        InputProps={{ 
                            startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                            sx: { fontWeight: 'bold', fontSize: '1.2rem' }
                        }}
                    />

                    <Box sx={{ mt: 3 }}>
                        <Typography variant="caption" fontWeight="bold" color="text.secondary">
                            {tipo === 'receita' ? 'FORMA DE RECEBIMENTO' : 'CONDIÇÃO'}
                        </Typography>
                        <TextField 
                            select fullWidth size="small" name="forma_pagamento"
                            value={formData.forma_pagamento} onChange={handleChange}
                            sx={{ mt: 1 }}
                        >
                            <MenuItem value="Dinheiro">Dinheiro</MenuItem>
                            <MenuItem value="PIX">PIX / Transferência</MenuItem>
                            <MenuItem value="Cartao">Cartão</MenuItem>
                        </TextField>

                        {/* DESATIVAR PARCELAS EM EDIÇÃO: Impede que uma parcela (ex: 6/24) gere um novo carnê */}
                        {!isEditing && (
                            <TextField 
                                select 
                                label={tipo === 'receita' ? "Parcelas" : "Parcelas (Recorrência)"}
                                fullWidth 
                                size="small" 
                                name="qtd_parcelas"
                                value={formData.qtd_parcelas || 1} 
                                onChange={handleChange}
                                sx={{ mt: 2 }}
                                helperText={tipo === 'despesa' ? "Gera lançamentos mensais automáticos" : ""}
                            >
                                {[...Array(limiteParcelas)].map((_, i) => (
                                    <MenuItem key={i + 1} value={i + 1}>
                                        {i + 1}x {formData.valor ? `de R$ ${(formData.valor / (i + 1)).toFixed(2)}` : ''}
                                    </MenuItem>
                                ))}
                            </TextField>
                        )}
                    </Box>

                    <Button 
                        type="submit" variant="contained" fullWidth 
                        disabled={isSubmitting}
                        sx={{ mt: 4, py: 1.5, fontWeight: 'bold', bgcolor: '#1a233b' }}
                    >
                        {isSubmitting ? (
                            <CircularProgress size={24} color="inherit" />
                        ) : (
                            isEditing ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR LANÇAMENTO'
                        )}
                    </Button>
                </Paper>
            </Grid>
        </Grid>
    </Box>
);
}