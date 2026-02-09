// src/components/financeiro/BaixaUnificadaModal.jsx
import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, 
    Tabs, Tab, Box, TextField, MenuItem, Typography, 
    Grid, Alert, Table, TableBody, TableCell, TableHead, TableRow, 
    Paper, CircularProgress, Checkbox, Select, FormControl, InputLabel, TableContainer
} from '@mui/material';
import { CheckCircle, Handshake, AttachMoney } from '@mui/icons-material';
import dayjs from 'dayjs';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function BaixaUnificadaModal({ open, onClose, item, onConfirmBaixa, onConfirmRenegociacao }) {
    const [tab, setTab] = useState(0); // 0 = Baixar, 1 = Renegociar
    const [loading, setLoading] = useState(false);

    // --- ABA 1: BAIXA SIMPLES ---
    const [baixaData, setBaixaData] = useState(dayjs().format('YYYY-MM-DD'));
    const [baixaMetodo, setBaixaMetodo] = useState('PIX');
    
    // --- ABA 2: RENEGOCIAÇÃO AVANÇADA ---
    const [configReneg, setConfigReneg] = useState({
        acrescimo: 0, desconto: 0, qtdParcelas: 1, 
        primeiroVencimento: dayjs().add(1, 'month').format('YYYY-MM-DD')
    });
    
    // Lista de novas parcelas (agora editável)
    const [simulacaoReneg, setSimulacaoReneg] = useState([]);

    // Reset ao abrir
    useEffect(() => {
        if (open && item) {
            setTab(0);
            setBaixaData(dayjs().format('YYYY-MM-DD'));
            setBaixaMetodo('PIX');
            
            // Reset config renegociação
            setConfigReneg({
                acrescimo: 0, desconto: 0, qtdParcelas: 1, 
                primeiroVencimento: dayjs().add(1, 'month').format('YYYY-MM-DD')
            });
        }
    }, [open, item]);

    // Recalcula parcelas quando a configuração muda (mas preserva edições manuais se possível futuramente)
    useEffect(() => {
        if (!item || tab !== 1) return;
        
        const valorBase = Number(item.valor || 0);
        const acrescimo = Number(configReneg.acrescimo) || 0;
        const desconto = Number(configReneg.desconto) || 0;
        const final = Math.max(0, (valorBase + acrescimo) - desconto);

        const qtd = Math.max(1, Number(configReneg.qtdParcelas));
        const valorParcela = final / qtd;
        
        const novas = [];
        for (let i = 0; i < qtd; i++) {
            novas.push({
                numero: i + 1,
                valor: valorParcela,
                vencimento: dayjs(configReneg.primeiroVencimento).add(i, 'month').format('YYYY-MM-DD'),
                // Novos campos para pagamento imediato
                pago_agora: false,
                forma_pagamento: 'PIX'
            });
        }
        setSimulacaoReneg(novas);
    }, [configReneg, item, tab]);

    // Função para editar uma parcela específica na tabela
    const handleEditParcela = (index, field, value) => {
        const atualizadas = [...simulacaoReneg];
        atualizadas[index][field] = value;
        setSimulacaoReneg(atualizadas);
    };

    const handleConfirmar = async () => {
        setLoading(true);
        try {
            if (tab === 0) {
                // BAIXA TOTAL DIRETA
                await onConfirmBaixa(item.id, {
                    status: 'Pago',
                    pago: true,
                    data_pagamento: baixaData,
                    forma_pagamento: baixaMetodo
                });
            } else {
                // RENEGOCIAÇÃO (COM POSSÍVEIS BAIXAS PARCIAIS)
                await onConfirmRenegociacao([item.id], simulacaoReneg, item.paciente);
            }
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!item) return null;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle sx={{ p: 0 }}>
                <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="fullWidth" indicatorColor="primary">
                    <Tab icon={<CheckCircle />} iconPosition="start" label="Pagar Tudo Agora" />
                    <Tab icon={<Handshake />} iconPosition="start" label="Renegociar / Parcelar" />
                </Tabs>
            </DialogTitle>

            <DialogContent dividers>
                {/* Resumo do Item */}
                <Box sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="caption" color="textSecondary">ITEM SELECIONADO</Typography>
                        <Typography variant="body1" fontWeight="bold">{item.descricao}</Typography>
                    </Box>
                    <Box textAlign="right">
                        <Typography variant="caption" color="textSecondary">VALOR ORIGINAL</Typography>
                        <Typography variant="h5" fontWeight="bold" color={item.tipo === 'despesa' ? 'error' : 'success.main'}>
                            {formatMoney(item.valor)}
                        </Typography>
                    </Box>
                </Box>

                {/* ABA 0: BAIXA SIMPLES (MANTIDA IGUAL) */}
                {tab === 0 && (
                    <Grid container spacing={2}>
                        <Grid item xs={12}><Alert severity="info">Baixa total imediata do valor original.</Alert></Grid>
                        <Grid item xs={6}>
                            <TextField label="Data Pagamento" type="date" fullWidth size="small" value={baixaData} onChange={e => setBaixaData(e.target.value)} InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField select label="Forma Pagamento" fullWidth size="small" value={baixaMetodo} onChange={e => setBaixaMetodo(e.target.value)}>
                                <MenuItem value="Dinheiro">Dinheiro</MenuItem><MenuItem value="PIX">PIX</MenuItem>
                                <MenuItem value="CartaoCredito">Crédito</MenuItem><MenuItem value="CartaoDebito">Débito</MenuItem>
                            </TextField>
                        </Grid>
                    </Grid>
                )}

                {/* ABA 1: RENEGOCIAÇÃO INTELIGENTE */}
                {tab === 1 && (
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" gutterBottom>Configuração do Novo Parcelamento</Typography>
                        </Grid>
                        
                        {/* Linha de Configuração */}
                        <Grid item xs={3}><TextField label="Juros/Multa (+)" type="number" size="small" fullWidth value={configReneg.acrescimo} onChange={e => setConfigReneg({...configReneg, acrescimo: e.target.value})} /></Grid>
                        <Grid item xs={3}><TextField label="Desconto (-)" type="number" size="small" fullWidth value={configReneg.desconto} onChange={e => setConfigReneg({...configReneg, desconto: e.target.value})} /></Grid>
                        <Grid item xs={3}><TextField label="Qtd. Parcelas" type="number" size="small" fullWidth value={configReneg.qtdParcelas} onChange={e => setConfigReneg({...configReneg, qtdParcelas: e.target.value})} /></Grid>
                        <Grid item xs={3}><TextField label="1º Vencimento" type="date" size="small" fullWidth value={configReneg.primeiroVencimento} onChange={e => setConfigReneg({...configReneg, primeiroVencimento: e.target.value})} InputLabelProps={{ shrink: true }} /></Grid>

                        {/* Tabela de Parcelas Editável */}
                        <Grid item xs={12}>
                            <TableContainer component={Paper} variant="outlined" sx={{ mt: 2, maxHeight: 300 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#eee' }}>
                                            <TableCell>#</TableCell>
                                            <TableCell>Vencimento</TableCell>
                                            <TableCell>Valor</TableCell>
                                            <TableCell align="center">Pagar Agora?</TableCell>
                                            <TableCell>Forma Pagto.</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {simulacaoReneg.map((p, i) => (
                                            <TableRow key={i} sx={{ bgcolor: p.pago_agora ? '#e8f5e9' : 'inherit' }}>
                                                <TableCell>{p.numero}</TableCell>
                                                <TableCell>{dayjs(p.vencimento).format('DD/MM/YY')}</TableCell>
                                                <TableCell fontWeight="bold">{formatMoney(p.valor)}</TableCell>
                                                
                                                {/* CHECKBOX DE PAGAMENTO IMEDIATO */}
                                                <TableCell align="center">
                                                    <Checkbox 
                                                        size="small" color="success"
                                                        checked={p.pago_agora}
                                                        onChange={(e) => handleEditParcela(i, 'pago_agora', e.target.checked)}
                                                    />
                                                </TableCell>
                                                
                                                {/* SELEÇÃO DE MÉTODO (Só aparece se pagar agora) */}
                                                <TableCell>
                                                    {p.pago_agora ? (
                                                        <Select 
                                                            size="small" variant="standard" fullWidth
                                                            value={p.forma_pagamento}
                                                            onChange={(e) => handleEditParcela(i, 'forma_pagamento', e.target.value)}
                                                            sx={{ fontSize: '0.8rem' }}
                                                        >
                                                            <MenuItem value="Dinheiro">Dinheiro</MenuItem>
                                                            <MenuItem value="PIX">PIX</MenuItem>
                                                            <MenuItem value="CartaoCredito">Crédito</MenuItem>
                                                            <MenuItem value="CartaoDebito">Débito</MenuItem>
                                                        </Select>
                                                    ) : (
                                                        <Typography variant="caption" color="textSecondary">-</Typography>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                                <AttachMoney color="success" fontSize="small" />
                                <Typography variant="caption" color="textSecondary">
                                    Marque "Pagar Agora" para quitar a entrada ou parcelas específicas imediatamente.
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} disabled={loading}>Cancelar</Button>
                <Button 
                    variant="contained" 
                    color={tab === 1 ? "primary" : "success"} 
                    onClick={handleConfirmar} 
                    disabled={loading}
                    sx={{ px: 4, fontWeight: 'bold' }}
                >
                    {tab === 1 ? "Confirmar Renegociação" : "Confirmar Pagamento"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}