// src/components/financeiro/PatientPaymentDrawer.jsx
import React, { useState, useEffect } from 'react';
import { 
    Drawer, Box, Typography, IconButton, Divider, Button, 
    TextField, Grid, Tabs, Tab, List, ListItem, ListItemText, 
    Chip, Alert, InputAdornment, MenuItem, Paper // <--- PAPER ADICIONADO AQUI
} from '@mui/material';
import { 
    Close, CheckCircle, History, AttachMoney, 
    CalendarMonth, LocalOffer, ReceiptLong 
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { faturamentoService } from '../../services/faturamentoService';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export function PatientDrawerContent({ item, onClose, onUpdate }) {
    const [activeTab, setActiveTab] = useState(0);
    const [history, setHistory] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    // Form
    const [desconto, setDesconto] = useState('');
    const [entrada, setEntrada] = useState('');
    const [parcelas, setParcelas] = useState(1);
    const [forma, setForma] = useState('PIX');
    const [dataPgto, setDataPgto] = useState(dayjs());

    // Cálculos em tempo real
    const valorOriginal = parseFloat(item.valor || 0);
    const valDesconto = parseFloat(desconto || 0);
    const valEntrada = parseFloat(entrada || 0);
    
    const valorComDesconto = Math.max(0, valorOriginal - valDesconto);
    const saldoDevedor = Math.max(0, valorComDesconto - valEntrada);
    const valorParcela = parcelas > 0 ? saldoDevedor / parcelas : 0;

    useEffect(() => {
        if (item?.paciente) {
            // Carrega histórico do paciente
            faturamentoService.getPagamentos({ paciente: item.paciente })
                .then(res => setHistory(res.data || []))
                .catch(console.error);
        }
    }, [item]);

    const handleConfirmar = async () => {
        if (saldoDevedor < 0) return alert("A entrada não pode ser maior que o valor total.");
        setSubmitting(true);
        try {
            await faturamentoService.realizarRecebimento(item.id, {
                forma_pagamento: forma,
                qtd_parcelas: parcelas,
                data_pagamento: dataPgto.format('YYYY-MM-DD'),
                desconto: valDesconto,
                valor_entrada: valEntrada
            });
            onUpdate(); // Atualiza tabela pai
            onClose();  // Fecha drawer
        } catch (error) {
            alert("Erro ao processar.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleReverter = async () => {
        if(!window.confirm("Cancelar pagamento e voltar para pendente?")) return;
        try {
            await faturamentoService.updatePagamento(item.id, { status: 'Pendente' });
            onUpdate(); onClose();
        } catch(e) { alert("Erro"); }
    };

    return (
        <Box sx={{ width: { xs: '100%', md: 450 }, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f8f9fa' }}>
            
            {/* HEADER */}
            <Box sx={{ p: 2, bgcolor: '#fff', borderBottom: '1px solid #e0e0e0' }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold">PACIENTE</Typography>
                        <Typography variant="h6" color="#1a233b" fontWeight="700" lineHeight={1.1}>
                            {item.paciente_nome}
                        </Typography>
                        <Chip 
                            label={item.status} 
                            size="small" 
                            color={item.status === 'Pago' ? 'success' : 'warning'} 
                            sx={{ mt: 1, fontWeight: 'bold', borderRadius: 1 }} 
                        />
                    </Box>
                    <IconButton onClick={onClose}><Close /></IconButton>
                </Box>
            </Box>

            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="fullWidth" sx={{ bgcolor: 'white', borderBottom: '1px solid #ddd' }}>
                <Tab label="Ação / Pagamento" />
                <Tab label="Histórico Financeiro" />
            </Tabs>

            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
                
                {/* TAB 0: AÇÕES (NEGOCIAÇÃO) */}
                {activeTab === 0 && (
                    item.status === 'Pago' ? (
                        <Box textAlign="center" py={4}>
                            <CheckCircle sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                            <Typography variant="h6">Conta Liquidada!</Typography>
                            <Typography color="text.secondary" mb={3}>
                                Pago em {dayjs(item.data_pagamento).format('DD/MM/YYYY')} via {item.forma_pagamento}
                            </Typography>
                            <Button variant="outlined" color="warning" onClick={handleReverter}>
                                Desfazer Pagamento
                            </Button>
                        </Box>
                    ) : (
                        <Box display="flex" flexDirection="column" gap={2}>
                            
                            {/* Card Resumo Valores */}
                            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fff' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold">VALOR ORIGINAL</Typography>
                                <Typography variant="h5" fontWeight="bold" color="#1a233b">{formatMoney(valorOriginal)}</Typography>
                                
                                {valDesconto > 0 && (
                                    <Typography variant="body2" color="success.main" fontWeight="bold">
                                        - {formatMoney(valDesconto)} (Desconto)
                                    </Typography>
                                )}
                                <Divider sx={{ my: 1 }} />
                                <Typography variant="subtitle1" fontWeight="bold">
                                    Total a Pagar: {formatMoney(valorComDesconto)}
                                </Typography>
                            </Paper>

                            <Typography variant="subtitle2" fontWeight="bold" sx={{ mt: 1 }}>Configurar Pagamento</Typography>

                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <TextField 
                                        label="Desconto (R$)" size="small" fullWidth 
                                        type="number" value={desconto} onChange={e => setDesconto(e.target.value)}
                                        InputProps={{ startAdornment: <InputAdornment position="start">-R$</InputAdornment> }}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField 
                                        label="Entrada (R$)" size="small" fullWidth 
                                        type="number" value={entrada} onChange={e => setEntrada(e.target.value)}
                                        InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        select label="Forma de Pagamento" fullWidth size="small"
                                        value={forma} onChange={e => setForma(e.target.value)}
                                    >
                                        <MenuItem value="PIX">PIX</MenuItem>
                                        <MenuItem value="Dinheiro">Dinheiro</MenuItem>
                                        <MenuItem value="CartaoCredito">Cartão de Crédito</MenuItem>
                                        <MenuItem value="CartaoDebito">Cartão de Débito</MenuItem>
                                    </TextField>
                                </Grid>
                                <Grid item xs={6}>
                                    <DatePicker 
                                        label="Data Pagto"
                                        value={dataPgto} onChange={setDataPgto}
                                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        select label="Restante em:" fullWidth size="small"
                                        value={parcelas} onChange={e => setParcelas(e.target.value)}
                                        disabled={saldoDevedor <= 0.01}
                                    >
                                        <MenuItem value={1}>À Vista (Restante)</MenuItem>
                                        <MenuItem value={2}>2x</MenuItem>
                                        <MenuItem value={3}>3x</MenuItem>
                                        <MenuItem value={4}>4x</MenuItem>
                                    </TextField>
                                </Grid>
                            </Grid>

                            {/* Resumo da Negociação */}
                            <Alert severity="info" sx={{ mt: 1 }}>
                                {saldoDevedor <= 0.01 ? (
                                    "Pagamento total agora."
                                ) : (
                                    <>
                                        <b>Entrada:</b> {formatMoney(valEntrada)} (Hoje)<br/>
                                        <b>Futuro:</b> {parcelas}x de {formatMoney(valorParcela)}
                                    </>
                                )}
                            </Alert>

                            <Button 
                                variant="contained" color="success" size="large" 
                                fullWidth onClick={handleConfirmar} disabled={submitting}
                                sx={{ mt: 2, py: 1.5, fontWeight: 'bold' }}
                            >
                                {submitting ? "Processando..." : "CONFIRMAR RECEBIMENTO"}
                            </Button>
                        </Box>
                    )
                )}

                {/* TAB 1: HISTÓRICO */}
                {activeTab === 1 && (
                    <List dense>
                        {history.map((hist) => (
                            <ListItem key={hist.id} sx={{ borderBottom: '1px solid #eee' }}>
                                <ListItemText 
                                    primary={hist.descricao || "Atendimento"}
                                    secondary={dayjs(hist.data_vencimento).format('DD/MM/YYYY')}
                                />
                                <Box textAlign="right">
                                    <Typography variant="body2" fontWeight="bold">{formatMoney(hist.valor)}</Typography>
                                    <Typography variant="caption" color={hist.status === 'Pago' ? 'success.main' : 'text.secondary'}>
                                        {hist.status}
                                    </Typography>
                                </Box>
                            </ListItem>
                        ))}
                        {history.length === 0 && <Typography variant="caption" align="center" display="block" mt={2}>Sem histórico.</Typography>}
                    </List>
                )}
            </Box>
        </Box>
    );
}