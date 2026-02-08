import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, 
    Tabs, Tab, Box, TextField, MenuItem, Typography, 
    Grid, Alert, Table, TableBody, TableCell, TableHead, TableRow, 
    Paper, CircularProgress
} from '@mui/material';
import { CheckCircle, Handshake } from '@mui/icons-material';
import dayjs from 'dayjs';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function BaixaUnificadaModal({ open, onClose, item, onConfirmBaixa, onConfirmRenegociacao }) {
    const [tab, setTab] = useState(0); // 0 = Baixar, 1 = Renegociar
    const [loading, setLoading] = useState(false);

    // ESTADOS: BAIXA SIMPLES
    const [baixaData, setBaixaData] = useState(dayjs().format('YYYY-MM-DD'));
    const [baixaMetodo, setBaixaMetodo] = useState('PIX');
    
    // ESTADOS: RENEGOCIAÇÃO
    const [configReneg, setConfigReneg] = useState({
        acrescimo: 0, desconto: 0, qtdParcelas: 1, 
        primeiroVencimento: dayjs().add(1, 'month').format('YYYY-MM-DD')
    });
    const [simulacaoReneg, setSimulacaoReneg] = useState([]);

    // Reset ao abrir
    useEffect(() => {
        if (open && item) {
            setTab(0);
            setBaixaData(dayjs().format('YYYY-MM-DD'));
            // Define padrão com base no tipo
            setBaixaMetodo(item.tipo === 'despesa' ? 'Dinheiro' : 'PIX');
        }
    }, [open, item]);

    // Lógica de Simulação de Renegociação
    useEffect(() => {
        if (!item || tab !== 1) return;
        const valorBase = Number(item.valor || 0);
        const acrescimo = Number(configReneg.acrescimo) || 0;
        const desconto = Number(configReneg.desconto) || 0;
        const final = Math.max(0, (valorBase + acrescimo) - desconto);

        const qtd = Math.max(1, Number(configReneg.qtdParcelas));
        const parcela = final / qtd;
        const parcelas = [];
        
        for (let i = 0; i < qtd; i++) {
            parcelas.push({
                numero: i + 1,
                valor: parcela,
                vencimento: dayjs(configReneg.primeiroVencimento).add(i, 'month').format('YYYY-MM-DD')
            });
        }
        setSimulacaoReneg(parcelas);
    }, [configReneg, item, tab]);

    const handleConfirmar = async () => {
        setLoading(true);
        try {
            if (tab === 0) {
                // BAIXA
                await onConfirmBaixa(item.id, {
                    status: 'Pago',
                    pago: true, // Para despesas
                    data_pagamento: baixaData,
                    forma_pagamento: baixaMetodo
                });
            } else {
                // RENEGOCIAÇÃO
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
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ p: 0 }}>
                <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="fullWidth" indicatorColor="primary">
                    <Tab icon={<CheckCircle />} iconPosition="start" label="Baixar / Pagar" />
                    <Tab icon={<Handshake />} iconPosition="start" label="Renegociar" />
                </Tabs>
            </DialogTitle>

            <DialogContent dividers>
                <Box sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="textSecondary">VALOR DO ITEM</Typography>
                    <Typography variant="h4" fontWeight="bold" color={item.tipo === 'despesa' || item.categoria ? 'error' : 'success.main'}>
                        {formatMoney(item.valor)}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>{item.descricao}</Typography>
                </Box>

                {tab === 0 && (
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Alert severity="info" sx={{ py: 0 }}>Confirmar liquidação.</Alert>
                        </Grid>
                        <Grid item xs={6}>
                            <TextField label="Data" type="date" fullWidth size="small" value={baixaData} onChange={e => setBaixaData(e.target.value)} InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField select label="Meio" fullWidth size="small" value={baixaMetodo} onChange={e => setBaixaMetodo(e.target.value)}>
                                <MenuItem value="Dinheiro">Dinheiro</MenuItem>
                                <MenuItem value="PIX">PIX</MenuItem>
                                <MenuItem value="CartaoCredito">Crédito</MenuItem>
                                <MenuItem value="CartaoDebito">Débito</MenuItem>
                                <MenuItem value="Boleto">Boleto</MenuItem>
                            </TextField>
                        </Grid>
                    </Grid>
                )}

                {tab === 1 && (
                    <Grid container spacing={2}>
                        <Grid item xs={4}><TextField label="Multa/Juros" type="number" size="small" fullWidth value={configReneg.acrescimo} onChange={e => setConfigReneg({...configReneg, acrescimo: e.target.value})} /></Grid>
                        <Grid item xs={4}><TextField label="Desconto" type="number" size="small" fullWidth value={configReneg.desconto} onChange={e => setConfigReneg({...configReneg, desconto: e.target.value})} /></Grid>
                        <Grid item xs={4}><TextField label="Parcelas" type="number" size="small" fullWidth value={configReneg.qtdParcelas} onChange={e => setConfigReneg({...configReneg, qtdParcelas: e.target.value})} /></Grid>
                        <Grid item xs={12}><TextField label="1º Vencimento" type="date" size="small" fullWidth value={configReneg.primeiroVencimento} onChange={e => setConfigReneg({...configReneg, primeiroVencimento: e.target.value})} InputLabelProps={{ shrink: true }} /></Grid>
                        <Grid item xs={12}>
                            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200, mt: 1 }}>
                                <Table size="small">
                                    <TableHead><TableRow><TableCell>Venc.</TableCell><TableCell align="right">Valor</TableCell></TableRow></TableHead>
                                    <TableBody>
                                        {simulacaoReneg.map((p, i) => (
                                            <TableRow key={i}><TableCell>{dayjs(p.vencimento).format('DD/MM/YY')}</TableCell><TableCell align="right">{formatMoney(p.valor)}</TableCell></TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Grid>
                    </Grid>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} disabled={loading}>Cancelar</Button>
                <Button variant="contained" color={tab === 1 ? "warning" : "success"} onClick={handleConfirmar} disabled={loading}>
                    {tab === 1 ? "Renegociar" : "Confirmar"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}