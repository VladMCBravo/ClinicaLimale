// src/components/financeiro/LancamentoAvulsoTab.jsx
import React, { useState, useEffect } from 'react';
import {
    Box, Grid, TextField, Button, CircularProgress, 
    ToggleButton, ToggleButtonGroup, Typography, Paper, InputAdornment, MenuItem,
    FormControlLabel, Switch, Divider, Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AttachMoney, MoneyOff, CalendarMonth, Person } from '@mui/icons-material';
import dayjs from 'dayjs';

import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';

export default function LancamentoAvulsoTab({ onClose, initialType = 'despesa', existingData = null }) {
    const isEditing = !!existingData?.id;
    // Se tiver paciente vinculado, força ser Receita
    const hasPaciente = !!existingData?.paciente || !!existingData?.paciente_nome;
    
    const [tipo, setTipo] = useState(existingData ? (existingData.tipo || initialType) : initialType);
    
    // CORREÇÃO: Inicia sempre como Pendente (false) se for novo lançamento
    const [jaLiquidado, setJaLiquidado] = useState(existingData ? existingData.pago : false);
    
    const [categorias, setCategorias] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showSnackbar } = useSnackbar();

    const [formData, setFormData] = useState({
        id: existingData?.id || null, 
        descricao: existingData?.descricao || '',
        valor: existingData?.valor || '',
        categoria: existingData?.categoria?.id || existingData?.categoria || '', 
        forma_pagamento: existingData?.forma_pagamento || 'PIX',
        data_vencimento: existingData?.data_vencimento ? dayjs(existingData.data_vencimento) : dayjs(),
        data_pagamento: existingData?.data_pagamento ? dayjs(existingData.data_pagamento) : dayjs(),
        qtd_parcelas: 1
    });

    useEffect(() => {
        if (existingData) {
            setFormData({
                id: existingData.id,
                descricao: existingData.descricao || '',
                valor: existingData.valor,
                categoria: existingData.categoria?.id || existingData.categoria || '',
                forma_pagamento: existingData.forma_pagamento || 'PIX',
                data_vencimento: dayjs(existingData.data_vencimento || existingData.data_despesa),
                data_pagamento: existingData.data_pagamento ? dayjs(existingData.data_pagamento) : dayjs(),
                qtd_parcelas: 1
            });
            // Respeita o status que veio da edição/pai
            setJaLiquidado(existingData.pago || false);
            
            if (!existingData.tipo) {
                setTipo(existingData.data_despesa ? 'despesa' : 'receita');
            }
        }
    }, [existingData]);

    useEffect(() => { carregarCategorias(); }, []);

    const carregarCategorias = async () => {
        try {
            const res = await faturamentoService.getCategoriasDespesa();
            setCategorias(res.data || []);
        } catch (error) { console.error(error); }
    };

    const handleTipoChange = (event, newTipo) => {
        if (newTipo !== null && !hasPaciente) { // Bloqueia troca se for paciente
            setTipo(newTipo);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.descricao || !formData.valor) {
            showSnackbar('Preencha descrição e valor.', 'warning');
            return;
        }
        if (tipo === 'despesa' && !formData.categoria) {
            showSnackbar('Selecione uma categoria.', 'warning');
            return;
        }

        setIsSubmitting(true);

        try {
            const basePayload = {
                descricao: formData.descricao,
                valor: parseFloat(formData.valor),
                forma_pagamento: formData.forma_pagamento,
                data_vencimento: dayjs(formData.data_vencimento).format('YYYY-MM-DD'),
                status: jaLiquidado ? 'Pago' : 'Pendente', 
                pago: jaLiquidado, 
                data_pagamento: jaLiquidado ? dayjs(formData.data_pagamento).format('YYYY-MM-DD') : null,
            };

            if (isEditing) {
                if (tipo === 'despesa') {
                    await faturamentoService.updateDespesa(formData.id, {
                        ...basePayload,
                        categoria: formData.categoria,
                        data_despesa: basePayload.data_vencimento
                    });
                } else {
                    await faturamentoService.updatePagamento(formData.id, basePayload);
                }
                showSnackbar('Atualizado com sucesso!', 'success');
            } else {
                if (tipo === 'despesa') {
                    await faturamentoService.createDespesa({
                        ...basePayload,
                        categoria: formData.categoria,
                        data_despesa: basePayload.data_vencimento,
                        qtd_parcelas: parseInt(formData.qtd_parcelas),
                        repetir_valor: true 
                    });
                } else {
                    await faturamentoService.createLancamentoAvulso({
                        ...basePayload,
                        qtd_parcelas: parseInt(formData.qtd_parcelas),
                        paciente: null 
                    });
                }
                showSnackbar('Lançado com sucesso!', 'success');
            }
            if (onClose) onClose();

        } catch (error) {
            showSnackbar('Erro ao salvar lançamento.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Arrays de parcelas dinâmicos
    const parcelasReceita = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const parcelasDespesa = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 24, 36, 48, 64];

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            
            {/* ALERT SE FOR PACIENTE */}
            {hasPaciente && (
                <Paper sx={{ p: 1.5, mb: 2, bgcolor: '#e3f2fd', display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Person color="primary" />
                    <Box>
                        <Typography variant="caption" fontWeight="bold" color="primary">VÍNCULO COM PACIENTE</Typography>
                        <Typography variant="body2" fontWeight="bold">
                            {existingData.paciente_nome || "Paciente Identificado"}
                        </Typography>
                    </Box>
                </Paper>
            )}

            {/* SELETOR DE TIPO */}
            {!isEditing && !hasPaciente && (
                <Paper elevation={0} sx={{ p: 1, mb: 3, bgcolor: '#f5f5f5', display: 'flex', justifyContent: 'center' }}>
                    <ToggleButtonGroup 
                        value={tipo} exclusive onChange={handleTipoChange} size="small"
                        disabled={isEditing}
                    >
                        <ToggleButton value="receita" color="success" sx={{ px: 3, fontWeight: 'bold' }}>
                            <AttachMoney sx={{ mr: 1 }} /> RECEITA
                        </ToggleButton>
                        <ToggleButton value="despesa" color="error" sx={{ px: 3, fontWeight: 'bold' }}>
                            <MoneyOff sx={{ mr: 1 }} /> DESPESA
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Paper>
            )}

            <Grid container spacing={3}>
                <Grid item xs={12} md={7}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        
                        <TextField 
                            label="Descrição" 
                            name="descricao" 
                            fullWidth 
                            required 
                            value={formData.descricao} 
                            onChange={handleChange}
                        />

                        {tipo === 'despesa' && (
                            <TextField
                                select label="Categoria" name="categoria" fullWidth required
                                value={formData.categoria} onChange={handleChange}
                            >
                                {categorias.map((cat) => (
                                    <MenuItem key={cat.id} value={cat.id}>{cat.nome}</MenuItem>
                                ))}
                            </TextField>
                        )}

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <DatePicker
                                label="Vencimento"
                                value={formData.data_vencimento}
                                onChange={(v) => setFormData(prev => ({ ...prev, data_vencimento: v }))}
                                slotProps={{ textField: { fullWidth: true, required: true } }}
                            />
                            
                            {/* CORREÇÃO: PARCELAS DINÂMICAS */}
                            {!isEditing && (
                                <TextField
                                    select label="Parcelas" name="qtd_parcelas"
                                    value={formData.qtd_parcelas} onChange={handleChange} sx={{ minWidth: 100 }}
                                >
                                    {(tipo === 'receita' ? parcelasReceita : parcelasDespesa).map((num) => (
                                        <MenuItem key={num} value={num}>{num}x</MenuItem>
                                    ))}
                                </TextField>
                            )}
                        </Box>

                        <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: jaLiquidado ? '#e8f5e9' : '#fff3e0' }}>
                            <Box>
                                <Typography variant="subtitle2" fontWeight="bold" color={jaLiquidado ? "success.main" : "warning.dark"}>
                                    STATUS: {jaLiquidado ? "PAGO / RECEBIDO" : "PENDENTE"}
                                </Typography>
                            </Box>
                            <Switch 
                                checked={jaLiquidado} 
                                onChange={(e) => setJaLiquidado(e.target.checked)} 
                                color={tipo === 'receita' ? "success" : "error"}
                            />
                        </Paper>

                        {jaLiquidado && (
                            <DatePicker
                                label="Data do Pagamento"
                                value={formData.data_pagamento}
                                onChange={(v) => setFormData(prev => ({ ...prev, data_pagamento: v }))}
                                slotProps={{ textField: { fullWidth: true } }}
                            />
                        )}
                    </Box>
                </Grid>

                <Grid item xs={12} md={5}>
                    <Paper elevation={3} sx={{ p: 3, height: '100%', bgcolor: '#fafafa', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="overline" color="text.secondary" fontWeight="bold">VALOR</Typography>
                        <TextField
                            name="valor" fullWidth required type="number"
                            value={formData.valor} onChange={handleChange}
                            InputProps={{
                                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                                style: { fontSize: '1.5rem', fontWeight: 'bold', color: tipo === 'receita' ? '#2e7d32' : '#c62828' }
                            }}
                            sx={{ mb: 2 }}
                        />

                        <Divider sx={{ my: 2 }} />

                        <TextField
                            select label="Forma de Pagamento" name="forma_pagamento" fullWidth
                            value={formData.forma_pagamento} onChange={handleChange}
                        >
                            <MenuItem value="Dinheiro">Dinheiro</MenuItem>
                            <MenuItem value="PIX">PIX</MenuItem>
                            <MenuItem value="CartaoCredito">Cartão de Crédito</MenuItem>
                            <MenuItem value="CartaoDebito">Cartão de Débito</MenuItem>
                            <MenuItem value="Convenio">Convênio</MenuItem>
                        </TextField>

                        <Box sx={{ flexGrow: 1 }} />

                        <Button 
                            type="submit" variant="contained" size="large" fullWidth disabled={isSubmitting}
                            color={tipo === 'receita' ? "success" : "error"} 
                            sx={{ mt: 3, py: 1.5, fontWeight: 'bold' }}
                        >
                            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : "SALVAR"}
                        </Button>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}