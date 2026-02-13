// src/components/financeiro/LancamentoAvulsoTab.jsx
import React, { useState, useEffect } from 'react';
import {
    Box, Grid, TextField, Button, CircularProgress, 
    ToggleButton, ToggleButtonGroup, Typography, Paper, InputAdornment, MenuItem,
    Switch, Divider
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AttachMoney, MoneyOff, CalendarMonth, Person, InfoOutlined } from '@mui/icons-material';
import dayjs from 'dayjs';

import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function LancamentoAvulsoTab({ onClose, initialType = 'despesa', existingData = null }) {
    const isEditing = !!existingData?.id;
    const hasPaciente = !!existingData?.paciente || !!existingData?.paciente_nome;
    
    const [tipo, setTipo] = useState(existingData ? (existingData.tipo || initialType) : initialType);
    
    // Status Inicia Sempre como Pendente (false)
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
            setJaLiquidado(existingData.pago || false);
            if (!existingData.tipo) setTipo(existingData.data_despesa ? 'despesa' : 'receita');
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
        if (newTipo !== null && !hasPaciente) setTipo(newTipo);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Cálculos em Tempo Real para o Resumo
    const baseValor = parseFloat(formData.valor) || 0;
    const parcelas = parseInt(formData.qtd_parcelas) || 1;
    const totalCalculado = baseValor * parcelas;

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
                forma_pagamento: formData.forma_pagamento,
                data_vencimento: dayjs(formData.data_vencimento).format('YYYY-MM-DD'),
                status: jaLiquidado ? 'Pago' : 'Pendente', 
                pago: jaLiquidado, 
                data_pagamento: jaLiquidado ? dayjs(formData.data_pagamento).format('YYYY-MM-DD') : null,
            };

            if (isEditing) {
                // EDIÇÃO (É sempre 1 parcela, envia o valor unitário)
                if (tipo === 'despesa') {
                    await faturamentoService.updateDespesa(formData.id, {
                        ...basePayload,
                        valor: baseValor,
                        categoria: formData.categoria,
                        data_despesa: basePayload.data_vencimento
                    });
                } else {
                    await faturamentoService.updatePagamento(formData.id, {
                        ...basePayload,
                        valor: baseValor
                    });
                }
                showSnackbar('Atualizado com sucesso!', 'success');
            } else {
                // CRIAÇÃO LOTE/PARCELAMENTO
                if (tipo === 'despesa') {
                    await faturamentoService.createDespesa({
                        ...basePayload,
                        valor: baseValor, // Backend repete este valor X vezes
                        categoria: formData.categoria,
                        data_despesa: basePayload.data_vencimento,
                        qtd_parcelas: parcelas,
                        repetir_valor: true 
                    });
                } else {
                    await faturamentoService.createLancamentoAvulso({
                        ...basePayload,
                        valor: totalCalculado, // Receita: Backend espera o Total e divide sozinho
                        qtd_parcelas: parcelas,
                        paciente: null 
                    });
                }
                showSnackbar(`${tipo === 'despesa' ? 'Despesa' : 'Receita'} lançada!`, 'success');
            }
            if (onClose) onClose();

        } catch (error) {
            showSnackbar('Erro ao salvar lançamento.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const parcelasReceita = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const parcelasDespesa = Array.from({ length: 72 }, (_, i) => i + 1);

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            
            {hasPaciente && (
                <Paper sx={{ p: 1.5, mb: 2, bgcolor: '#e3f2fd', display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Person color="primary" />
                    <Box>
                        <Typography variant="caption" fontWeight="bold" color="primary">VÍNCULO COM PACIENTE</Typography>
                        <Typography variant="body2" fontWeight="bold">{existingData.paciente_nome || "Identificado"}</Typography>
                    </Box>
                </Paper>
            )}

            {!isEditing && !hasPaciente && (
                <Paper elevation={0} sx={{ p: 1, mb: 3, bgcolor: '#f5f5f5', display: 'flex', justifyContent: 'center' }}>
                    <ToggleButtonGroup value={tipo} exclusive onChange={handleTipoChange} size="small" disabled={isEditing}>
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
                            label="Descrição" name="descricao" fullWidth required autoFocus
                            value={formData.descricao} onChange={handleChange}
                            placeholder={tipo === 'despesa' ? "Ex: Aluguel, Equipamento" : "Ex: Venda de Produto"}
                        />

                        {tipo === 'despesa' && (
                            <TextField select label="Categoria" name="categoria" fullWidth required value={formData.categoria} onChange={handleChange}>
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
                            
                            {!isEditing && (
                                <TextField
                                    select label="Parcelas / Meses" name="qtd_parcelas"
                                    value={formData.qtd_parcelas} onChange={handleChange} sx={{ minWidth: 100 }}
                                    InputProps={{ startAdornment: <InputAdornment position="start"><CalendarMonth fontSize="small"/></InputAdornment> }}
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
                            <Switch checked={jaLiquidado} onChange={(e) => setJaLiquidado(e.target.checked)} color={tipo === 'receita' ? "success" : "error"} />
                        </Paper>

                        {jaLiquidado && (
                            <DatePicker
                                label="Data da Efetivação (Caixa)"
                                value={formData.data_pagamento}
                                onChange={(v) => setFormData(prev => ({ ...prev, data_pagamento: v }))}
                                slotProps={{ textField: { fullWidth: true } }}
                            />
                        )}
                    </Box>
                </Grid>

                <Grid item xs={12} md={5}>
                    <Paper elevation={3} sx={{ p: 3, height: '100%', bgcolor: '#fafafa', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="overline" color="text.secondary" fontWeight="bold" lineHeight={1.2} mb={1}>
                            {parcelas > 1 ? "VALOR UNITÁRIO (POR PARCELA)" : "VALOR DO LANÇAMENTO"}
                        </Typography>
                        
                        <TextField
                            name="valor" fullWidth required type="number"
                            value={formData.valor} onChange={handleChange}
                            InputProps={{
                                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                                style: { fontSize: '1.5rem', fontWeight: 'bold', color: tipo === 'receita' ? '#2e7d32' : '#c62828' }
                            }}
                            sx={{ mb: 2 }}
                        />

                        {/* --- NOVO RESUMO EXPLICATIVO (INTUITIVO) --- */}
                        {parcelas > 1 && baseValor > 0 && (
                            <Paper elevation={0} sx={{ mb: 2, p: 2, bgcolor: '#f0f4f8', borderRadius: 2, border: '1px dashed #cfd8dc' }}>
                                <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                                    <InfoOutlined color="primary" fontSize="small" />
                                    <Typography variant="caption" fontWeight="bold" color="primary" sx={{ textTransform: 'uppercase' }}>
                                        Resumo do Lançamento
                                    </Typography>
                                </Box>
                                
                                <Box display="flex" justifyContent="space-between" mb={0.5}>
                                    <Typography variant="body2" color="text.secondary">Quantidade:</Typography>
                                    <Typography variant="body2" fontWeight="bold">{parcelas} vezes</Typography>
                                </Box>
                                
                                <Box display="flex" justifyContent="space-between" mb={1.5}>
                                    <Typography variant="body2" color="text.secondary">Valor da Parcela:</Typography>
                                    <Typography variant="body2" fontWeight="bold">{formatMoney(baseValor)}</Typography>
                                </Box>
                                
                                <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
                                
                                <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                                    <Typography variant="body2" fontWeight="800" color={tipo === 'receita' ? "success.main" : "error.main"}>
                                        TOTAL A {tipo === 'receita' ? "RECEBER" : "PAGAR"}:
                                    </Typography>
                                    <Typography variant="h6" fontWeight="900" color={tipo === 'receita' ? "success.main" : "error.main"} sx={{ lineHeight: 1 }}>
                                        {formatMoney(totalCalculado)}
                                    </Typography>
                                </Box>
                            </Paper>
                        )}

                        <Divider sx={{ my: 1 }} />

                        <TextField
                            select label="Forma de Pagamento" name="forma_pagamento" fullWidth
                            value={formData.forma_pagamento} onChange={handleChange}
                        >
                            <MenuItem value="Dinheiro">Dinheiro</MenuItem>
                            <MenuItem value="PIX">PIX</MenuItem>
                            <MenuItem value="CartaoCredito">Cartão de Crédito</MenuItem>
                            <MenuItem value="CartaoDebito">Cartão de Débito</MenuItem>
                            <MenuItem value="Boleto">Boleto</MenuItem>
                            <MenuItem value="Transferencia">Transferência</MenuItem>
                        </TextField>

                        <Box sx={{ flexGrow: 1 }} />

                        <Button 
                            type="submit" variant="contained" size="large" fullWidth disabled={isSubmitting}
                            color={tipo === 'receita' ? "success" : "error"} 
                            sx={{ mt: 3, py: 1.5, fontWeight: 'bold' }}
                        >
                            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : (isEditing ? "SALVAR ALTERAÇÕES" : "CONFIRMAR")}
                        </Button>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}