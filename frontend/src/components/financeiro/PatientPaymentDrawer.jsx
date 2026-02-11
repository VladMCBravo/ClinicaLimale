// src/components/financeiro/PatientPaymentDrawer.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Box, Typography, IconButton, Button, TextField, Grid, Tabs, Tab, 
    List, ListItem, ListItemText, Chip, Divider, Menu, MenuItem, ListItemIcon,
    Paper, InputAdornment
} from '@mui/material';
import { 
    Close, CheckCircle, MoreVert, Undo, Block, 
    CalendarMonth, AttachMoney, ReceiptLong, CreditCard
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { faturamentoService } from '../../services/faturamentoService';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export function PatientDrawerContent({ item, onClose, onUpdate }) {
    const [activeTab, setActiveTab] = useState(0);
    const [history, setHistory] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    
    // Estado do Menu
    const [anchorEl, setAnchorEl] = useState(null);

    // Form
    const [desconto, setDesconto] = useState('');
    const [entrada, setEntrada] = useState('');
    const [parcelas, setParcelas] = useState(1);
    const [forma, setForma] = useState('PIX');
    const [dataPgto, setDataPgto] = useState(dayjs());

    // Cálculos
    const resumo = useMemo(() => {
        const vOriginal = parseFloat(item?.valor || 0);
        const vDesconto = parseFloat(desconto || 0);
        const vEntrada = parseFloat(entrada || 0);
        
        const vComDesconto = Math.max(0, vOriginal - vDesconto);
        const vEntradaFinal = Math.min(vEntrada, vComDesconto);
        const vSaldoDevedor = Math.max(0, vComDesconto - vEntradaFinal);
        
        const qtdParcelas = parseInt(parcelas) || 1;
        const vParcela = qtdParcelas > 0 ? vSaldoDevedor / qtdParcelas : 0;
        
        const dataEntrada = dataPgto;
        const dataPrimeiraParcela = dataPgto.add(1, 'month'); 

        return {
            original: vOriginal,
            desconto: vDesconto,
            final: vComDesconto,
            entrada: vEntradaFinal,
            saldo: vSaldoDevedor,
            valorParcela: vParcela,
            dataEntrada,
            dataPrimeiraParcela
        };
    }, [item, desconto, entrada, parcelas, dataPgto]);

    // Load History
    useEffect(() => {
        if (item?.paciente) {
            faturamentoService.getPagamentos({ paciente: item.paciente })
                .then(res => {
                    const lista = res.data || [];
                    lista.sort((a, b) => dayjs(b.data_vencimento).diff(dayjs(a.data_vencimento)));
                    setHistory(lista);
                })
                .catch(console.error);
        }
    }, [item]);

    // Actions
    const handleConfirmarRecebimento = async () => {
        if (resumo.final <= 0) return alert("Valor inválido.");
        setSubmitting(true);
        try {
            await faturamentoService.realizarRecebimento(item.id, {
                forma_pagamento: forma,
                qtd_parcelas: parcelas,
                data_pagamento: dataPgto.format('YYYY-MM-DD'),
                desconto: resumo.desconto,
                valor_entrada: resumo.entrada
            });
            onUpdate(); onClose();
        } catch (error) { alert("Erro ao processar."); } 
        finally { setSubmitting(false); }
    };

    const handleAlterarStatus = async (novoStatus) => {
        if (!window.confirm(`Mudar para: ${novoStatus.toUpperCase()}?`)) return;
        try {
            const payload = { status: novoStatus };
            if (novoStatus === 'Pendente') payload.data_pagamento = null;
            await faturamentoService.updatePagamento(item.id, payload);
            onUpdate(); onClose();
        } catch (error) { alert("Erro ao alterar status."); }
    };

    return (
        <Box sx={{ width: { xs: '100%', md: 400 }, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f8f9fa' }}>
            
            {/* HEADER COMPACTO */}
            <Box sx={{ px: 2, py: 1.5, bgcolor: '#fff', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight="bold" fontSize="0.7rem">CONTA A RECEBER</Typography>
                    <Typography variant="subtitle1" fontWeight="800" color="#1a233b" lineHeight={1.2}>
                        {item.paciente_nome || item.descricao}
                    </Typography>
                    <Chip 
                        label={item.status.toUpperCase()} 
                        size="small" 
                        color={item.status === 'Pago' ? 'success' : item.status === 'Cancelado' ? 'error' : 'warning'}
                        sx={{ mt: 0.5, fontWeight: 'bold', borderRadius: 1, height: 20, fontSize: '0.65rem' }}
                    />
                </Box>
                <Box display="flex">
                    <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}><MoreVert fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
                </Box>
            </Box>

            {/* ABAS COMPACTAS */}
            <Tabs 
                value={activeTab} 
                onChange={(e, v) => setActiveTab(v)} 
                variant="fullWidth" 
                sx={{ bgcolor: 'white', borderBottom: '1px solid #ddd', minHeight: 36, '& .MuiTab-root': { minHeight: 36, fontSize: '0.75rem', py: 0 } }}
            >
                <Tab label="Negociação" />
                <Tab label="Histórico" />
            </Tabs>

            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1.5 }}>
                
                {/* ABA NEGOCIAÇÃO */}
                {activeTab === 0 && (
                    item.status === 'Pago' ? (
                        <Box textAlign="center" py={3}>
                            <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                            <Typography variant="h6" fontWeight="bold">Conta Liquidada</Typography>
                            <Typography variant="body2" color="text.secondary" mb={2}>
                                {dayjs(item.data_pagamento).format('DD/MM/YYYY')} • {item.forma_pagamento}
                            </Typography>
                            <Button size="small" variant="outlined" color="warning" onClick={() => handleAlterarStatus('Pendente')}>
                                Estornar
                            </Button>
                        </Box>
                    ) : item.status === 'Cancelado' ? (
                        <Box textAlign="center" py={3}>
                            <Block sx={{ fontSize: 48, color: 'error.main', mb: 1 }} />
                            <Typography variant="h6" fontWeight="bold" color="error">Cancelada</Typography>
                            <Button size="small" sx={{ mt: 2 }} variant="outlined" onClick={() => handleAlterarStatus('Pendente')}>
                                Reativar
                            </Button>
                        </Box>
                    ) : (
                        <Box display="flex" flexDirection="column" gap={1.5}>
                            
                            {/* CARD VALORES COMPACTO */}
                            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#fff' }}>
                                <Grid container justifyContent="space-between" alignItems="center">
                                    <Grid item>
                                        <Typography variant="caption" color="text.secondary" fontWeight="bold">ORIGINAL</Typography>
                                        <Typography variant="h6" fontWeight="bold" color="#1a233b" lineHeight={1}>
                                            {formatMoney(resumo.original)}
                                        </Typography>
                                    </Grid>
                                    {resumo.desconto > 0 && (
                                        <Grid item textAlign="right">
                                            <Typography variant="caption" color="success.main" fontWeight="bold">DESCONTO</Typography>
                                            <Typography variant="body2" fontWeight="bold" color="success.main">
                                                - {formatMoney(resumo.desconto)}
                                            </Typography>
                                        </Grid>
                                    )}
                                </Grid>
                            </Paper>

                            <Typography variant="caption" fontWeight="bold" color="text.secondary">CONFIGURAR PAGAMENTO</Typography>

                            <Grid container spacing={1}>
                                <Grid item xs={6}>
                                    <TextField 
                                        label="Desconto" size="small" fullWidth type="number" 
                                        value={desconto} onChange={e => setDesconto(e.target.value)}
                                        InputProps={{ startAdornment: <InputAdornment position="start" sx={{mr:0}}>-</InputAdornment> }}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField 
                                        label="Entrada" size="small" fullWidth type="number" 
                                        value={entrada} onChange={e => setEntrada(e.target.value)}
                                        InputProps={{ startAdornment: <InputAdornment position="start" sx={{mr:0}}>R$</InputAdornment> }}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        select label="Forma Pagto (Entrada)" fullWidth size="small"
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
                                        label="Data"
                                        value={dataPgto} onChange={setDataPgto}
                                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        select label="Restante em:" fullWidth size="small"
                                        value={parcelas} onChange={e => setParcelas(e.target.value)}
                                        disabled={resumo.saldo <= 0.01}
                                    >
                                        <MenuItem value={1}>À Vista</MenuItem>
                                        {[2,3,4,5,6,10,12].map(n => <MenuItem key={n} value={n}>{n}x</MenuItem>)}
                                    </TextField>
                                </Grid>
                            </Grid>

                            {/* RESUMO DINÂMICO COMPACTO */}
                            <Paper elevation={0} sx={{ mt: 0.5, p: 1.5, bgcolor: '#e3f2fd', border: '1px solid #90caf9' }}>
                                <Typography variant="caption" fontWeight="bold" color="primary.main" gutterBottom display="block">
                                    RESUMO
                                </Typography>
                                
                                <Box display="flex" justifyContent="space-between" mb={0.5}>
                                    <Typography variant="body2" fontSize="0.8rem">A Pagar Agora:</Typography>
                                    <Typography variant="body2" fontWeight="bold">
                                        {formatMoney(resumo.entrada || resumo.final)}
                                    </Typography>
                                </Box>
                                <Typography variant="caption" color="text.secondary" display="block" mb={1} lineHeight={1}>
                                    {resumo.dataEntrada.format('DD/MM/YY')} via {forma}
                                </Typography>

                                {resumo.saldo > 0.01 && (
                                    <>
                                        <Divider sx={{ my: 0.5, opacity: 0.5 }} />
                                        <Box display="flex" justifyContent="space-between" mt={0.5}>
                                            <Typography variant="body2" fontSize="0.8rem">Fica Pendente:</Typography>
                                            <Typography variant="body2" fontWeight="bold" color="warning.dark">
                                                {formatMoney(resumo.saldo)}
                                            </Typography>
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" display="block" lineHeight={1}>
                                            {parcelas}x de {formatMoney(resumo.valorParcela)} (1ª em {resumo.dataPrimeiraParcela.format('DD/MM')})
                                        </Typography>
                                    </>
                                )}
                            </Paper>

                            <Button 
                                variant="contained" color="success" fullWidth 
                                onClick={handleConfirmarRecebimento} disabled={submitting}
                                sx={{ py: 1, fontWeight: 'bold', boxShadow: 'none' }}
                            >
                                {submitting ? "Processando..." : "CONFIRMAR RECEBIMENTO"}
                            </Button>
                        </Box>
                    )
                )}

                {/* ABA HISTÓRICO */}
                {activeTab === 1 && (
                    <List dense sx={{ p: 0 }}>
                        {history.length === 0 ? (
                            <Typography variant="caption" align="center" display="block" sx={{ py: 3, color: 'text.secondary' }}>
                                Sem histórico.
                            </Typography>
                        ) : history.map((hist) => (
                            <ListItem key={hist.id} sx={{ borderBottom: '1px solid #f0f0f0', px: 0, py: 0.5 }}>
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                    {hist.status === 'Pago' 
                                        ? <CheckCircle color="success" sx={{ fontSize: 18 }}/> 
                                        : <CalendarMonth color="warning" sx={{ fontSize: 18 }}/>}
                                </ListItemIcon>
                                <ListItemText 
                                    primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 600 }}
                                    secondaryTypographyProps={{ fontSize: '0.7rem' }}
                                    primary={hist.descricao || "Atendimento"}
                                    secondary={dayjs(hist.data_vencimento).format('DD/MM/YY')}
                                />
                                <Box textAlign="right">
                                    <Typography variant="body2" fontSize="0.8rem" fontWeight="bold">{formatMoney(hist.valor)}</Typography>
                                    <Typography variant="caption" fontSize="0.65rem" color="text.secondary">
                                        {hist.status}
                                    </Typography>
                                </Box>
                            </ListItem>
                        ))}
                    </List>
                )}
            </Box>

            {/* MENU OPÇÕES */}
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                <MenuItem onClick={() => { handleAlterarStatus('Pendente'); setAnchorEl(null); }} dense>
                    <ListItemIcon><Undo fontSize="small" /></ListItemIcon> <Typography variant="body2">Reverter Pendente</Typography>
                </MenuItem>
                <MenuItem onClick={() => { handleAlterarStatus('Cancelado'); setAnchorEl(null); }} dense>
                    <ListItemIcon><Block fontSize="small" color="error" /></ListItemIcon> <Typography variant="body2">Cancelar</Typography>
                </MenuItem>
            </Menu>
        </Box>
    );
}