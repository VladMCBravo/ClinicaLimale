// src/components/financeiro/ResumoPacienteModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, 
    Box, Typography, Grid, Chip, Divider, CircularProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import { History } from '@mui/icons-material';
import dayjs from 'dayjs';
import { faturamentoService } from '../../services/faturamentoService';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val) || 0);

export default function ResumoPacienteModal({ open, onClose, pacienteId, nomePaciente }) {
    const [transacoes, setTransacoes] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && pacienteId) {
            setLoading(true);
            // Busca dados. Se você tiver endpoint unificado, usa ele.
            // Aqui buscamos a rota unificada que criamos.
            faturamentoService.getTransacoes({ paciente: pacienteId })
                .then(res => {
                    // Filtra apenas o que tem valor ou data válida para evitar lixo visual
                    const dadosValidos = (res.data || []).filter(t => t.valor > 0 || t.status === 'Renegociado');
                    // Ordena do mais recente para o mais antigo
                    dadosValidos.sort((a, b) => dayjs(b.data_vencimento).diff(dayjs(a.data_vencimento)));
                    setTransacoes(dadosValidos);
                })
                .catch(err => console.error("Erro ao buscar resumo:", err))
                .finally(() => setLoading(false));
        }
    }, [open, pacienteId]);

    const resumo = useMemo(() => {
        return transacoes.reduce((acc, t) => {
            const valor = Number(t.valor || 0);
            
            // Lógica de Soma
            if (t.status === 'Pago') {
                acc.pago += valor;
            } else if (t.status === 'Pendente') {
                acc.aberto += valor;
                // Verifica atraso
                if (t.data_vencimento && dayjs(t.data_vencimento).isBefore(dayjs(), 'day')) {
                    acc.atrasado += valor;
                }
            }
            return acc;
        }, { pago: 0, aberto: 0, atrasado: 0 });
    }, [transacoes]);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle sx={{ bgcolor: '#1a233b', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
                <History /> Extrato Financeiro: {nomePaciente}
            </DialogTitle>
            
            <DialogContent sx={{ p: 3 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
                ) : (
                    <>
                        {/* CARDS DE TOTALIZADORES */}
                        <Grid container spacing={2} sx={{ mb: 3, mt: 0 }}>
                            <Grid item xs={4}>
                                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f5e9', border: '1px solid #c8e6c9' }}>
                                    <Typography variant="caption" fontWeight="bold" color="success.main">TOTAL PAGO</Typography>
                                    <Typography variant="h6" fontWeight="bold" color="success.main">{formatMoney(resumo.pago)}</Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={4}>
                                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff3e0', border: '1px solid #ffe0b2' }}>
                                    <Typography variant="caption" fontWeight="bold" color="warning.main">EM ABERTO</Typography>
                                    <Typography variant="h6" fontWeight="bold" color="warning.main">{formatMoney(resumo.aberto)}</Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={4}>
                                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#ffebee', border: '1px solid #ffcdd2' }}>
                                    <Typography variant="caption" fontWeight="bold" color="error.main">VENCIDO/ATRASADO</Typography>
                                    <Typography variant="h6" fontWeight="bold" color="error.main">{formatMoney(resumo.atrasado)}</Typography>
                                </Paper>
                            </Grid>
                        </Grid>

                        <Divider sx={{ mb: 2 }} />

                        {/* LISTA DETALHADA */}
                        <Typography variant="subtitle2" gutterBottom>Histórico de Lançamentos</Typography>
                        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Vencimento</TableCell>
                                        <TableCell>Descrição</TableCell>
                                        <TableCell>Valor</TableCell>
                                        <TableCell>Pagamento</TableCell>
                                        <TableCell>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {transacoes.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} align="center">Nenhum registro encontrado.</TableCell></TableRow>
                                    ) : transacoes.map((row) => (
                                        <TableRow key={row.id} hover>
                                            <TableCell>
                                                {/* CORREÇÃO DO INVALID DATE */}
                                                {row.data_vencimento ? dayjs(row.data_vencimento).format('DD/MM/YY') : '--'}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">{row.descricao}</Typography>
                                                {row.transacao_pai && (
                                                    <Typography variant="caption" color="primary" sx={{ fontSize: '0.7rem' }}>
                                                        (Parcelamento/Renegociação)
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>
                                                {formatMoney(row.valor)}
                                            </TableCell>
                                            <TableCell>
                                                {/* CORREÇÃO DA DATA DE PAGAMENTO */}
                                                {row.status === 'Pago' && row.data_pagamento
                                                    ? `${dayjs(row.data_pagamento).format('DD/MM/YY')} (${row.forma_pagamento || 'PIX'})` 
                                                    : '-'
                                                }
                                            </TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={row.status} size="small" 
                                                    color={row.status === 'Pago' ? 'success' : row.status === 'Renegociado' ? 'default' : row.status === 'Pendente' ? 'warning' : 'error'} 
                                                    variant={row.status === 'Renegociado' ? 'outlined' : 'filled'}
                                                    sx={{ height: 24, fontSize: '0.7rem' }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="contained">Fechar</Button>
            </DialogActions>
        </Dialog>
    );
}