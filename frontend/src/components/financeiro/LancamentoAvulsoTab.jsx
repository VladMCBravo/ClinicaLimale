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

export default function LancamentoAvulsoTab({ onClose, initialType = 'receita' }) {
    const [tipo, setTipo] = useState(initialType);
    const [jaLiquidado, setJaLiquidado] = useState(true); 
    const [categorias, setCategorias] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({ 
        descricao: '',
        valor: '',
        qtd_parcelas: 1,
        categoria: '',
        forma_pagamento: 'Dinheiro',
        data_vencimento: dayjs().format('YYYY-MM-DD'),
        data_pagamento: dayjs().format('YYYY-MM-DD') 
    });
    
    const { showSnackbar } = useSnackbar();

    useEffect(() => {
        // Carrega apenas categorias de despesa, já que receitas avulsas costumam ser diretas
        faturamentoService.getCategoriasDespesa().then(res => setCategorias(res.data));
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

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!formData.descricao || !formData.valor) {
            return showSnackbar('Preencha descrição e valor.', 'warning');
        }

        setIsSubmitting(true);
        const payload = {
            ...formData,
            tipo: tipo,
            status: jaLiquidado ? 'Pago' : 'Pendente',
            pago: jaLiquidado
        };

        try {
            await faturamentoService.createLancamentoAvulso(payload);
            showSnackbar(`Lançamento de ${tipo} salvo!`, 'success');
            onClose(); 
        } catch (error) {
            showSnackbar(`Erro ao salvar lançamento.`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const limiteParcelas = tipo === 'receita' ? 10 : 64;

    return (
    <Box component="form" onSubmit={handleSubmit}>
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

        <Grid container spacing={3}>
            {/* COLUNA 1: DADOS GERAIS */}
            <Grid item xs={12} md={7}>
                <Paper sx={{ p: 2 }} variant="outlined">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight="bold">Dados do Lançamento</Typography>
                        <FormControlLabel
                            control={<Switch size="small" checked={jaLiquidado} onChange={(e) => setJaLiquidado(e.target.checked)} />}
                            label={<Typography variant="caption" fontWeight="bold">{jaLiquidado ? 'LIQUIDADO' : 'AGENDADO'}</Typography>}
                        />
                    </Box>

                    <TextField 
                        name="descricao" label="Descrição" 
                        fullWidth size="small" margin="dense" required
                        value={formData.descricao} onChange={handleChange}
                    />

                    {tipo === 'despesa' && (
                        <TextField 
                            select name="categoria" label="Categoria" 
                            fullWidth size="small" margin="dense" required
                            value={formData.categoria} onChange={handleChange}
                        >
                            {categorias.map(cat => (
                                <MenuItem key={cat.id} value={cat.id}>{cat.nome}</MenuItem>
                            ))}
                        </TextField>
                    )}

                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid item xs={6}>
                            <DatePicker
                                label="Vencimento"
                                value={dayjs(formData.data_vencimento)}
                                onChange={(v) => setFormData({...formData, data_vencimento: v.format('YYYY-MM-DD')})}
                                slotProps={{ textField: { size: 'small', fullWidth: true } }}
                            />
                        </Grid>
                        {jaLiquidado && (
                            <Grid item xs={6}>
                                <DatePicker
                                    label="Data do Caixa"
                                    value={dayjs(formData.data_pagamento)}
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

                        {/* ÚNICO CAMPO DE PARCELAS: Inteligente para os dois tipos */}
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
                    </Box>

                    <Button 
                        type="submit" variant="contained" fullWidth 
                        disabled={isSubmitting}
                        sx={{ mt: 4, py: 1.5, fontWeight: 'bold', bgcolor: '#1a233b' }}
                    >
                        {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'CONFIRMAR LANÇAMENTO'}
                    </Button>
                </Paper>
            </Grid>
        </Grid>
    </Box>
);
}