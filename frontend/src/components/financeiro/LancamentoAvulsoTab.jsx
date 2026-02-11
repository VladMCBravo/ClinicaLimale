// src/components/financeiro/LancamentoAvulsoTab.jsx
import React, { useState, useEffect } from 'react';
import {
    Box, Grid, TextField, Button, CircularProgress, 
    ToggleButton, ToggleButtonGroup, Typography, Paper, InputAdornment, MenuItem,
    FormControlLabel, Switch, Divider, Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AttachMoney, MoneyOff, CalendarMonth } from '@mui/icons-material';
import dayjs from 'dayjs';

import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';

export default function LancamentoAvulsoTab({ onClose, initialType = 'despesa', existingData = null }) {
    const isEditing = !!existingData?.id;
    const [tipo, setTipo] = useState(existingData ? (existingData.tipo || initialType) : initialType);
    
    // Estado para controlar se está pago (liquidado) ou pendente
    const [jaLiquidado, setJaLiquidado] = useState(existingData ? existingData.pago : true);
    
    const [categorias, setCategorias] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showSnackbar } = useSnackbar();

    // --- REVISADO: ID REINSERIDO EXPLICITAMENTE PARA SEGURANÇA ---
    const [formData, setFormData] = useState({
        id: existingData?.id || null, 
        descricao: existingData?.descricao || '',
        valor: existingData?.valor || '',
        // Tenta pegar o ID se for objeto, ou usa o valor direto
        categoria: existingData?.categoria?.id || existingData?.categoria || '', 
        forma_pagamento: existingData?.forma_pagamento || 'PIX',
        data_vencimento: existingData?.data_vencimento ? dayjs(existingData.data_vencimento) : dayjs(),
        data_pagamento: existingData?.data_pagamento ? dayjs(existingData.data_pagamento) : dayjs(),
        qtd_parcelas: 1
    });

    // Sincroniza dados se existingData mudar (ex: ao abrir modal de edição)
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
            setJaLiquidado(existingData.pago);
            
            if (!existingData.tipo) {
                setTipo(existingData.data_despesa ? 'despesa' : 'receita');
            }
        }
    }, [existingData]);

    // Carrega categorias ao montar
    useEffect(() => {
        carregarCategorias();
    }, []);

    const carregarCategorias = async () => {
        try {
            const res = await faturamentoService.getCategoriasDespesa();
            setCategorias(res.data || []);
        } catch (error) {
            console.error("Erro ao carregar categorias", error);
        }
    };

    const handleTipoChange = (event, newTipo) => {
        if (newTipo !== null) {
            setTipo(newTipo);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validação básica
        if (!formData.descricao || !formData.valor) {
            showSnackbar('Preencha descrição e valor.', 'warning');
            return;
        }
        if (tipo === 'despesa' && !formData.categoria) {
            showSnackbar('Selecione uma categoria para a despesa.', 'warning');
            return;
        }

        setIsSubmitting(true);

        try {
            // 1. DEFINIÇÃO DA BASE PAYLOAD (Aqui estava o erro antes, verifique se esta linha existe)
            const basePayload = {
                descricao: formData.descricao,
                valor: parseFloat(formData.valor),
                forma_pagamento: formData.forma_pagamento,
                data_vencimento: dayjs(formData.data_vencimento).format('YYYY-MM-DD'),
                pago: jaLiquidado,
                data_pagamento: jaLiquidado ? dayjs(formData.data_pagamento).format('YYYY-MM-DD') : null,
            };

            if (isEditing) {
                // --- EDIÇÃO ---
                if (tipo === 'despesa') {
                    // Update Despesa
                    await faturamentoService.updateDespesa(formData.id, {
                        ...basePayload,
                        categoria: formData.categoria, // Nome exato "categoria"
                        data_despesa: basePayload.data_vencimento // Mantém data_despesa sincronizada
                    });
                } else {
                    // Update Receita
                    await faturamentoService.updatePagamento(formData.id, basePayload);
                }
                showSnackbar('Atualizado com sucesso!', 'success');
            } else {
                // --- CRIAÇÃO ---
                if (tipo === 'despesa') {
                    // Payload para Despesa
                    const despesaPayload = {
                        ...basePayload,
                        categoria: formData.categoria, // ID da categoria
                        data_despesa: basePayload.data_vencimento, // Campo obrigatório
                        qtd_parcelas: parseInt(formData.qtd_parcelas),
                        // AQUI ESTÁ A SOLUÇÃO ELEGANTE:
                        // Enviamos uma flag dizendo: "Ei backend, isso é conta fixa, repete o valor pra mim"
                        repetir_valor: true 
                    };
                    await faturamentoService.createDespesa(despesaPayload);
                } else {
                    // Payload para Receita
                    const receitaPayload = {
                        ...basePayload,
                        qtd_parcelas: parseInt(formData.qtd_parcelas),
                        paciente: null 
                    };
                    await faturamentoService.createLancamentoAvulso(receitaPayload);
                }
                showSnackbar(`${tipo === 'despesa' ? 'Despesa' : 'Receita'} lançada com sucesso!`, 'success');
            }
            
            if (onClose) onClose();

        } catch (error) {
            console.error(error);
            const msg = error.response?.data 
                ? JSON.stringify(error.response.data) 
                : 'Erro ao salvar lançamento.';
            showSnackbar(msg, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            
            {/* SELETOR DE TIPO (Só mostra se for novo lançamento) */}
            {!isEditing && (
                <Paper elevation={0} sx={{ p: 1, mb: 3, bgcolor: '#f5f5f5', display: 'flex', justifyContent: 'center' }}>
                    <ToggleButtonGroup 
                        value={tipo} 
                        exclusive 
                        onChange={handleTipoChange} 
                        size="small"
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
                {/* LADO ESQUERDO: DADOS DO LANÇAMENTO */}
                <Grid item xs={12} md={7}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        
                        <TextField 
                            label="Descrição" 
                            name="descricao" 
                            fullWidth 
                            required 
                            autoFocus
                            value={formData.descricao} 
                            onChange={handleChange}
                            placeholder={tipo === 'despesa' ? "Ex: Aluguel, Luz, Fornecedor X" : "Ex: Venda de Produto, Reembolso"}
                        />

                        {/* CAMPO DE CATEGORIA (ESSENCIAL PARA DESPESAS) */}
                        {tipo === 'despesa' && (
                            <TextField
                                select
                                label="Categoria"
                                name="categoria"
                                fullWidth
                                required
                                value={formData.categoria}
                                onChange={handleChange}
                                helperText="Define se é Fixa ou Variável"
                            >
                                {categorias.map((cat) => (
                                    <MenuItem key={cat.id} value={cat.id}>
                                        {cat.nome} ({cat.tipo === 'Fixa' ? 'Fixa' : 'Variável'})
                                    </MenuItem>
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
                            
                            {/* SELETOR DE PARCELAS (SÓ PARA NOVOS) */}
                            {!isEditing && (
                                <TextField
                                    select
                                    label="Parcelas"
                                    name="qtd_parcelas"
                                    value={formData.qtd_parcelas}
                                    onChange={handleChange}
                                    sx={{ minWidth: 100 }}
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start"><CalendarMonth fontSize="small"/></InputAdornment>
                                    }}
                                >
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 24, 36, 48, 60, 64].map((num) => (
                                        <MenuItem key={num} value={num}>
                                            {num}x
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                        </Box>

                        {/* STATUS DO PAGAMENTO */}
                        <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: jaLiquidado ? '#e8f5e9' : '#fff3e0' }}>
                            <Box>
                                <Typography variant="subtitle2" fontWeight="bold" color={jaLiquidado ? "success.main" : "warning.dark"}>
                                    STATUS: {jaLiquidado ? "PAGO / RECEBIDO" : "PENDENTE / A RECEBER"}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {jaLiquidado ? "O valor já entrou/saiu do caixa." : "Será agendado para o futuro."}
                                </Typography>
                            </Box>
                            <Switch 
                                checked={jaLiquidado} 
                                onChange={(e) => setJaLiquidado(e.target.checked)} 
                                color={tipo === 'receita' ? "success" : "error"}
                            />
                        </Paper>

                        {/* DATA DO PAGAMENTO (SÓ SE ESTIVER PAGO) */}
                        {jaLiquidado && (
                            <DatePicker
                                label={tipo === 'receita' ? "Data do Recebimento" : "Data do Pagamento"}
                                value={formData.data_pagamento}
                                onChange={(v) => setFormData(prev => ({ ...prev, data_pagamento: v }))}
                                slotProps={{ textField: { fullWidth: true, helperText: "Data efetiva que impacta o caixa" } }}
                            />
                        )}

                    </Box>
                </Grid>

                {/* LADO DIREITO: VALORES */}
                <Grid item xs={12} md={5}>
                    <Paper elevation={3} sx={{ p: 3, height: '100%', bgcolor: '#fafafa', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="overline" color="text.secondary" fontWeight="bold">
                            VALOR {formData.qtd_parcelas > 1 ? "TOTAL" : ""}
                        </Typography>
                        
                        <TextField
                            name="valor"
                            fullWidth
                            required
                            type="number"
                            value={formData.valor}
                            onChange={handleChange}
                            InputProps={{
                                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                                style: { fontSize: '1.5rem', fontWeight: 'bold', color: tipo === 'receita' ? '#2e7d32' : '#c62828' }
                            }}
                            sx={{ mb: 2 }}
                        />

                        {formData.qtd_parcelas > 1 && formData.valor > 0 && (
                            <Alert severity="info" sx={{ mb: 2 }}>
                                {tipo === 'despesa' ? (
                                    // Mensagem correta agora
                                    <>
                                        <b>Recorrência (Backend):</b> Serão criadas {formData.qtd_parcelas} despesas de <b>R$ {parseFloat(formData.valor).toFixed(2)}</b> cada.
                                    </>
                                ) : (
                                    <>
                                        <b>Parcelamento:</b> {formData.qtd_parcelas}x de <b>R$ {(formData.valor / formData.qtd_parcelas).toFixed(2)}</b>.
                                    </>
                                )}
                            </Alert>
                        )}

                        <Divider sx={{ my: 2 }} />

                        <TextField
                            select
                            label="Forma de Pagamento"
                            name="forma_pagamento"
                            fullWidth
                            value={formData.forma_pagamento}
                            onChange={handleChange}
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
                            type="submit" 
                            variant="contained" 
                            size="large" 
                            fullWidth 
                            disabled={isSubmitting}
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