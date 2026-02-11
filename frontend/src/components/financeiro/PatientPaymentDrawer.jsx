// src/components/financeiro/PatientPaymentDrawer.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Box, Typography, IconButton, Button, TextField, Grid, Tabs, Tab, 
    List, ListItem, ListItemText, Chip, Divider, Menu, MenuItem, ListItemIcon, 
    Paper, InputAdornment, Alert // <--- IMPORTS ADICIONADOS AQUI
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
    
    // Estado do Menu de Opções (Três pontinhos)
    const [anchorEl, setAnchorEl] = useState(null);

    // Formulário de Negociação
    const [desconto, setDesconto] = useState('');
    const [entrada, setEntrada] = useState('');
    const [parcelas, setParcelas] = useState(1);
    const [forma, setForma] = useState('PIX');
    const [dataPgto, setDataPgto] = useState(dayjs());

    // --- CÁLCULOS EM TEMPO REAL (RESUMO) ---
    const resumo = useMemo(() => {
        const vOriginal = parseFloat(item?.valor || 0);
        const vDesconto = parseFloat(desconto || 0);
        const vEntrada = parseFloat(entrada || 0);
        
        const vComDesconto = Math.max(0, vOriginal - vDesconto);
        // Se entrada for maior que total, limita
        const vEntradaFinal = Math.min(vEntrada, vComDesconto);
        const vSaldoDevedor = Math.max(0, vComDesconto - vEntradaFinal);
        
        // Parcela
        const qtdParcelas = parseInt(parcelas) || 1;
        const vParcela = qtdParcelas > 0 ? vSaldoDevedor / qtdParcelas : 0;
        
        // Datas
        const dataEntrada = dataPgto;
        const dataPrimeiraParcela = dataPgto.add(1, 'month'); // Simula +30 dias

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

    // Carrega histórico ao abrir
    useEffect(() => {
        if (item?.paciente) {
            faturamentoService.getPagamentos({ paciente: item.paciente })
                .then(res => {
                    // Ordena histórico: Mais recente primeiro
                    const lista = res.data || [];
                    lista.sort((a, b) => dayjs(b.data_vencimento).diff(dayjs(a.data_vencimento)));
                    setHistory(lista);
                })
                .catch(console.error);
        }
    }, [item]);

    // --- AÇÕES ---

    const handleConfirmarRecebimento = async () => {
        if (resumo.final <= 0) return alert("Valor final inválido.");
        
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
        } catch (error) {
            alert("Erro ao processar recebimento.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleAlterarStatus = async (novoStatus) => {
        if (!window.confirm(`Confirmar alteração para: ${novoStatus.toUpperCase()}?`)) return;
        try {
            const payload = { status: novoStatus };
            if (novoStatus === 'Pendente') payload.data_pagamento = null; // Limpa data se voltar
            
            await faturamentoService.updatePagamento(item.id, payload);
            onUpdate(); onClose();
        } catch (error) {
            alert("Erro ao alterar status.");
        }
    };

    return (
        <Box sx={{ width: { xs: '100%', md: 500 }, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f8f9fa' }}>
            
            {/* CABEÇALHO */}
            <Box sx={{ p: 2, bgcolor: '#fff', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight="bold">CONTA A RECEBER</Typography>
                    <Typography variant="h6" fontWeight="800" color="#1a233b" lineHeight={1.1}>
                        {item.paciente_nome || item.descricao}
                    </Typography>
                    <Chip 
                        label={item.status.toUpperCase()} 
                        size="small" 
                        color={item.status === 'Pago' ? 'success' : item.status === 'Cancelado' ? 'error' : 'warning'}
                        sx={{ mt: 1, fontWeight: 'bold', borderRadius: 1 }}
                    />
                </Box>
                <Box>
                    <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}><MoreVert /></IconButton>
                    <IconButton onClick={onClose}><Close /></IconButton>
                </Box>
            </Box>

            {/* ABAS */}
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="fullWidth" sx={{ bgcolor: 'white', borderBottom: '1px solid #ddd' }}>
                <Tab label="Negociação / Pagamento" />
                <Tab label="Histórico Completo" />
            </Tabs>

            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
                
                {/* --- ABA 0: NEGOCIAÇÃO --- */}
                {activeTab === 0 && (
                    item.status === 'Pago' ? (
                        <Box textAlign="center" py={5} px={2}>
                            <CheckCircle sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                            <Typography variant="h5" fontWeight="bold" gutterBottom>Conta Liquidada</Typography>
                            <Typography color="text.secondary" mb={3}>
                                Valor: <b>{formatMoney(item.valor)}</b><br/>
                                Data: {dayjs(item.data_pagamento).format('DD/MM/YYYY')} • Via {item.forma_pagamento}
                            </Typography>
                            <Button 
                                variant="outlined" color="warning" startIcon={<Undo />}
                                onClick={() => handleAlterarStatus('Pendente')}
                            >
                                Estornar (Voltar Pendente)
                            </Button>
                        </Box>
                    ) : item.status === 'Cancelado' ? (
                        <Box textAlign="center" py={5}>
                            <Block sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
                            <Typography variant="h5" fontWeight="bold" color="error">Cobrança Cancelada</Typography>
                            <Button sx={{ mt: 3 }} variant="outlined" onClick={() => handleAlterarStatus('Pendente')}>
                                Reativar Cobrança
                            </Button>
                        </Box>
                    ) : (
                        <Box display="flex" flexDirection="column" gap={2}>
                            
                            {/* FORMULÁRIO */}
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <TextField 
                                        label="Desconto (R$)" size="small" fullWidth type="number" 
                                        value={desconto} onChange={e => setDesconto(e.target.value)}
                                        InputProps={{ startAdornment: <InputAdornment position="start">-</InputAdornment> }}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField 
                                        label="Valor da Entrada" size="small" fullWidth type="number" 
                                        value={entrada} onChange={e => setEntrada(e.target.value)}
                                        InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        select label="Forma de Pagamento (Entrada)" fullWidth size="small"
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
                                        label="Data da Entrada"
                                        value={dataPgto} onChange={setDataPgto}
                                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        select label="Parcelar Restante em:" fullWidth size="small"
                                        value={parcelas} onChange={e => setParcelas(e.target.value)}
                                        disabled={resumo.saldo <= 0.01}
                                    >
                                        <MenuItem value={1}>À Vista (Restante)</MenuItem>
                                        {[2,3,4,5,6,10,12].map(n => <MenuItem key={n} value={n}>{n}x</MenuItem>)}
                                    </TextField>
                                </Grid>
                            </Grid>

                            {/* --- RESUMO DINÂMICO (CAMPO AZUL) --- */}
                            <Box sx={{ mt: 1, p: 2, bgcolor: '#e3f2fd', borderRadius: 2, border: '1px solid #90caf9' }}>
                                <Typography variant="subtitle2" fontWeight="bold" color="primary.main" gutterBottom>
                                    RESUMO DA NEGOCIAÇÃO
                                </Typography>
                                
                                <Grid container spacing={1}>
                                    {/* 1. VALORES TOTAIS */}
                                    <Grid item xs={12} display="flex" justifyContent="space-between">
                                        <Typography variant="body2" color="text.secondary">Valor Original:</Typography>
                                        <Typography variant="body2" fontWeight="bold">{formatMoney(resumo.original)}</Typography>
                                    </Grid>
                                    
                                    {resumo.desconto > 0 && (
                                        <Grid item xs={12} display="flex" justifyContent="space-between">
                                            <Typography variant="body2" color="success.main">Desconto Aplicado:</Typography>
                                            <Typography variant="body2" fontWeight="bold" color="success.main">- {formatMoney(resumo.desconto)}</Typography>
                                        </Grid>
                                    )}

                                    <Grid item xs={12}><Divider sx={{ my: 0.5, borderColor: 'rgba(0,0,0,0.1)' }} /></Grid>

                                    {/* 2. O QUE SERÁ PAGO AGORA (ENTRADA) */}
                                    <Grid item xs={12}>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <CheckCircle fontSize="small" color="success" />
                                            <Typography variant="body2" fontWeight="bold">
                                                PAGO AGORA: {formatMoney(resumo.entrada || resumo.final)}
                                            </Typography>
                                        </Box>
                                        <Typography variant="caption" sx={{ ml: 3.5, display: 'block', color: 'text.secondary' }}>
                                            {resumo.dataEntrada.format('DD/MM/YYYY')} via {forma}
                                        </Typography>
                                    </Grid>

                                    {/* 3. O QUE FICARÁ PENDENTE (PARCELAS) */}
                                    {resumo.saldo > 0.01 && (
                                        <Grid item xs={12} sx={{ mt: 1 }}>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <CalendarMonth fontSize="small" color="warning" />
                                                <Typography variant="body2" fontWeight="bold">
                                                    PENDENTE FUTURO: {formatMoney(resumo.saldo)}
                                                </Typography>
                                            </Box>
                                            <Typography variant="caption" sx={{ ml: 3.5, display: 'block', color: 'text.secondary' }}>
                                                {parcelas}x de {formatMoney(resumo.valorParcela)} (1ª parc: {resumo.dataPrimeiraParcela.format('DD/MM/YYYY')})
                                            </Typography>
                                        </Grid>
                                    )}
                                </Grid>
                            </Box>

                            <Button 
                                variant="contained" color="success" size="large" fullWidth 
                                onClick={handleConfirmarRecebimento} disabled={submitting}
                                sx={{ py: 1.5, mt: 1, fontWeight: 'bold', boxShadow: 'none' }}
                            >
                                {submitting ? "Processando..." : "CONFIRMAR RECEBIMENTO"}
                            </Button>
                        </Box>
                    )
                )}

                {/* --- ABA 1: HISTÓRICO --- */}
                {activeTab === 1 && (
                    <List dense sx={{ p: 0 }}>
                        {history.length === 0 ? (
                            <Typography variant="body2" align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                Nenhum histórico encontrado.
                            </Typography>
                        ) : history.map((hist) => (
                            <ListItem key={hist.id} sx={{ borderBottom: '1px solid #f0f0f0', py: 1 }}>
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                    {hist.status === 'Pago' 
                                        ? <CheckCircle color="success" fontSize="small"/> 
                                        : <CalendarMonth color="warning" fontSize="small"/>}
                                </ListItemIcon>
                                <ListItemText 
                                    primary={
                                        <Box display="flex" justifyContent="space-between">
                                            <Typography variant="body2" fontWeight="600">{hist.descricao}</Typography>
                                            <Typography variant="body2" fontWeight="700">{formatMoney(hist.valor)}</Typography>
                                        </Box>
                                    }
                                    secondary={`${dayjs(hist.data_vencimento).format('DD/MM/YY')} • ${hist.status}`}
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </Box>

            {/* MENU DE OPÇÕES EXTRAS */}
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                <MenuItem onClick={() => { handleAlterarStatus('Pendente'); setAnchorEl(null); }}>
                    <ListItemIcon><Undo fontSize="small" /></ListItemIcon> Reverter para Pendente
                </MenuItem>
                <MenuItem onClick={() => { handleAlterarStatus('Cancelado'); setAnchorEl(null); }}>
                    <ListItemIcon><Block fontSize="small" color="error" /></ListItemIcon> Cancelar Cobrança
                </MenuItem>
            </Menu>
        </Box>
    );
}