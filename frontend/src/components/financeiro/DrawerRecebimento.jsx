import React, { useState, useEffect, useMemo } from 'react';
import { 
    Box, Typography, IconButton, Button, TextField, Tabs, Tab, 
    List, ListItem, ListItemText, Chip, Divider, Menu, MenuItem, ListItemIcon,
    Paper, InputAdornment, Grid, CircularProgress, Checkbox, TableContainer, Table, TableHead, TableRow, TableCell, TableBody
} from '@mui/material';
import { 
    Close, CheckCircle, MoreVert, Undo, Block, 
    CalendarMonth, History, Handshake, AttachMoney
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function DrawerRecebimento({ open, onClose, item, onUpdate }) {
    const [activeTab, setActiveTab] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const { showSnackbar } = useSnackbar();

    // -----------------------------------------------------
    // ESTADOS: ABA 0 - BAIXA RÁPIDA
    // -----------------------------------------------------
    const [desconto, setDesconto] = useState('');
    const [formaPgto, setFormaPgto] = useState('PIX');
    const [dataPgto, setDataPgto] = useState(dayjs());
    const [parcelasSimples, setParcelasSimples] = useState(1);

    // -----------------------------------------------------
    // ESTADOS: ABA 1 - RENEGOCIAÇÃO AVANÇADA
    // -----------------------------------------------------
    const [configReneg, setConfigReneg] = useState({
        acrescimo: '', desconto: '', qtdParcelas: 2, 
        primeiroVencimento: dayjs().add(1, 'month')
    });
    const [simulacaoReneg, setSimulacaoReneg] = useState([]);

    // -----------------------------------------------------
    // ESTADOS: ABA 2 - EXTRATO DO PACIENTE
    // -----------------------------------------------------
    const [historico, setHistorico] = useState([]);
    const [loadingHistorico, setLoadingHistorico] = useState(false);

    // Reset ao abrir o Drawer
    useEffect(() => {
        if (open && item) {
            setActiveTab(0);
            setDesconto('');
            setFormaPgto('PIX');
            setDataPgto(dayjs());
            setParcelasSimples(1);
            
            setConfigReneg({ acrescimo: '', desconto: '', qtdParcelas: 2, primeiroVencimento: dayjs().add(1, 'month') });
            
            if (item.paciente) carregarHistoricoPaciente(item.paciente);
        }
    }, [open, item]);

    const carregarHistoricoPaciente = async (pacienteId) => {
        setLoadingHistorico(true);
        try {
            const res = await faturamentoService.getPagamentos({ paciente: pacienteId });
            const lista = res.data || [];
            lista.sort((a, b) => dayjs(b.data_vencimento).diff(dayjs(a.data_vencimento)));
            setHistorico(lista);
        } catch (error) {
            console.error("Erro ao buscar histórico:", error);
        } finally {
            setLoadingHistorico(false);
        }
    };

    // -----------------------------------------------------
    // CÁLCULOS DINÂMICOS
    // -----------------------------------------------------
    const valorOriginal = useMemo(() => parseFloat(item?.valor || 0), [item]);
    
    // Calcula Matriz de Renegociação (Aba 1)
    useEffect(() => {
        if (!item || activeTab !== 1) return;
        
        const acrescimo = parseFloat(configReneg.acrescimo) || 0;
        const desc = parseFloat(configReneg.desconto) || 0;
        const final = Math.max(0, (valorOriginal + acrescimo) - desc);

        const qtd = Math.max(1, parseInt(configReneg.qtdParcelas) || 1);
        const valParc = Math.floor((final / qtd) * 100) / 100; // Trunca em 2 casas
        
        let acumulado = 0;
        const novas = [];
        
        for (let i = 0; i < qtd; i++) {
            const isLast = i === qtd - 1;
            const valorDesta = isLast ? Number((final - acumulado).toFixed(2)) : valParc;
            acumulado += valorDesta;

            novas.push({
                numero: i + 1,
                valor: valorDesta,
                vencimento: configReneg.primeiroVencimento.add(i, 'month').format('YYYY-MM-DD'),
                pago_agora: false,
                forma_pagamento: 'PIX'
            });
        }
        setSimulacaoReneg(novas);
    }, [configReneg, valorOriginal, activeTab, item]);

    const handleEditParcelaReneg = (index, field, value) => {
        const atualizadas = [...simulacaoReneg];
        atualizadas[index][field] = value;
        setSimulacaoReneg(atualizadas);
    };

    const resumoHistorico = useMemo(() => {
        return historico.reduce((acc, t) => {
            const val = parseFloat(t.valor || 0);
            if (t.status === 'Pago') acc.pago += val;
            else if (t.status === 'Pendente') {
                acc.aberto += val;
                if (dayjs(t.data_vencimento).isBefore(dayjs(), 'day')) acc.atrasado += val;
            }
            return acc;
        }, { pago: 0, aberto: 0, atrasado: 0 });
    }, [historico]);

    // -----------------------------------------------------
    // AÇÕES DE BACKEND
    // -----------------------------------------------------

    // Ação: ABA 0 (Baixa Direta)
    const handleConfirmarBaixaRapida = async () => {
        setSubmitting(true);
        try {
            const descTotal = parseFloat(desconto) || 0;
            const isGrouped = item.ids && item.ids.length > 1;

            if (isGrouped) {
                // Rateia o desconto entre os itens do lote (ex: 2 exames juntos)
                const descontoPorItem = descTotal / item.originais.length;
                await Promise.all(item.originais.map(orig => 
                    faturamentoService.realizarRecebimento(orig.id, {
                        forma_pagamento: formaPgto,
                        qtd_parcelas: formaPgto === 'CartaoCredito' ? parcelasSimples : 1,
                        data_pagamento: dataPgto.format('YYYY-MM-DD'),
                        desconto: descontoPorItem,
                        valor_entrada: 0 // Sem entrada parcial, quita o item integralmente
                    })
                ));
            } else {
                await faturamentoService.realizarRecebimento(item.id, {
                    forma_pagamento: formaPgto,
                    qtd_parcelas: formaPgto === 'CartaoCredito' ? parcelasSimples : 1,
                    data_pagamento: dataPgto.format('YYYY-MM-DD'),
                    desconto: descTotal,
                    valor_entrada: 0
                });
            }
            
            showSnackbar("Baixa realizada com sucesso!", 'success');
            onUpdate(); onClose();
        } catch (error) { 
            showSnackbar("Erro ao realizar baixa.", 'error'); 
        } finally { setSubmitting(false); }
    };

    // Ação: ABA 1 (Matriz de Renegociação Avançada)
    const handleConfirmarRenegociacao = async () => {
        setSubmitting(true);
        try {
            const idsOriginais = item.ids || [item.id];
            
            await faturamentoService.renegociarDivida({
                ids_originais: idsOriginais,
                paciente_id: item.paciente,
                novas_parcelas: simulacaoReneg
            });

            showSnackbar("Renegociação concluída com sucesso!", 'success');
            onUpdate(); onClose();
        } catch (error) { 
            showSnackbar("Erro ao processar renegociação.", 'error'); 
        } finally { setSubmitting(false); }
    };

    // Ação: Cancelamento ou Reversão
    const handleAlterarStatus = async (novoStatus) => {
        setAnchorEl(null);
        if (!window.confirm(`Confirma alteração de status para: ${novoStatus.toUpperCase()}?`)) return;
        
        try {
            const payload = { status: novoStatus };
            if (novoStatus === 'Pendente') payload.data_pagamento = null;
            
            const idsOriginais = item.ids || [item.id];
            await Promise.all(idsOriginais.map(id => faturamentoService.updatePagamento(id, payload)));
            
            showSnackbar(`Status alterado para ${novoStatus}!`, 'success');
            onUpdate(); onClose();
        } catch (error) { showSnackbar("Erro ao alterar status.", 'error'); }
    };

    if (!open || !item) return null;

    const valorComDesconto = Math.max(0, valorOriginal - (parseFloat(desconto) || 0));
    const isPago = item.status === 'Pago';
    const isCancelado = item.status === 'Cancelado';

    return (
        <Box sx={{ width: { xs: '100%', md: 500 }, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f8f9fa' }}>
            
            {/* CABEÇALHO COMPACTO TASY */}
            <Box sx={{ px: 2, py: 1.5, bgcolor: '#ffffff', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight="bold" fontSize="0.7rem">
                        CONTA A RECEBER {item.originais && item.originais.length > 1 && `(${item.originais.length} ITENS)`}
                    </Typography>
                    <Typography variant="subtitle1" fontWeight="800" color="#343a40" lineHeight={1.2}>
                        {item.paciente_nome || item.descricao}
                    </Typography>
                    <Chip 
                        label={item.status.toUpperCase()} 
                        size="small" 
                        color={isPago ? 'success' : isCancelado ? 'error' : item.status === 'Renegociado' ? 'secondary' : 'warning'}
                        sx={{ mt: 0.5, fontWeight: 'bold', borderRadius: 1, height: 20, fontSize: '0.65rem' }}
                    />
                </Box>
                <Box display="flex">
                    <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}><MoreVert fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
                </Box>
            </Box>

            {/* ABAS */}
            <Tabs 
                value={activeTab} 
                onChange={(e, v) => setActiveTab(v)} 
                variant="fullWidth" 
                sx={{ bgcolor: '#ffffff', borderBottom: '1px solid #dee2e6', minHeight: 36, '& .MuiTab-root': { minHeight: 36, fontSize: '0.75rem', py: 0, fontWeight: 'bold' } }}
            >
                <Tab icon={<AttachMoney fontSize="small"/>} iconPosition="start" label="Quitação Rápida" />
                <Tab icon={<Handshake fontSize="small"/>} iconPosition="start" label="Matriz de Parcelas" />
                <Tab icon={<History fontSize="small"/>} iconPosition="start" label="Extrato do Paciente" disabled={!item.paciente} />
            </Tabs>

            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
                
                {/* ---------------------------------------------------------------- */}
                {/* ABA 0: BAIXA RÁPIDA (À VISTA OU CARTÃO DIRETO)                   */}
                {/* ---------------------------------------------------------------- */}
                {activeTab === 0 && (
                    isPago ? (
                        <Box textAlign="center" py={4} bgcolor="#fff" borderRadius={2} border="1px solid #dee2e6">
                            <CheckCircle sx={{ fontSize: 50, color: 'success.main', mb: 1 }} />
                            <Typography variant="h6" fontWeight="bold">Pagamento Efetivado</Typography>
                            <Typography variant="body2" color="text.secondary" mb={2}>
                                Em: {dayjs(item.data_pagamento).format('DD/MM/YYYY')} • Via {item.forma_pagamento || 'N/I'}
                            </Typography>
                            <Button size="small" variant="outlined" color="warning" onClick={() => handleAlterarStatus('Pendente')}>
                                Estornar Baixa
                            </Button>
                        </Box>
                    ) : isCancelado ? (
                        <Box textAlign="center" py={4} bgcolor="#fff" borderRadius={2} border="1px solid #dee2e6">
                            <Block sx={{ fontSize: 50, color: 'error.main', mb: 1 }} />
                            <Typography variant="h6" fontWeight="bold" color="error">Conta Anulada</Typography>
                            <Button size="small" sx={{ mt: 2 }} variant="outlined" onClick={() => handleAlterarStatus('Pendente')}>
                                Reativar Cobrança
                            </Button>
                        </Box>
                    ) : (
                        <Box display="flex" flexDirection="column" gap={2}>
                            
                            {/* CARD DE VALORES */}
                            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#ffffff', borderColor: '#ced4da' }}>
                                <Grid container justifyContent="space-between" alignItems="center">
                                    <Grid item>
                                        <Typography variant="caption" color="text.secondary" fontWeight="bold">VALOR DOS SERVIÇOS</Typography>
                                        <Typography variant="h5" fontWeight="900" color="#343a40" lineHeight={1}>
                                            {formatMoney(valorOriginal)}
                                        </Typography>
                                    </Grid>
                                    {desconto > 0 && (
                                        <Grid item textAlign="right">
                                            <Typography variant="caption" color="success.main" fontWeight="bold">TOTAL COM DESCONTO</Typography>
                                            <Typography variant="h6" fontWeight="bold" color="success.main" lineHeight={1}>
                                                {formatMoney(valorComDesconto)}
                                            </Typography>
                                        </Grid>
                                    )}
                                </Grid>
                            </Paper>

                            <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ textTransform: 'uppercase', mt: 1 }}>
                                Configurar Baixa
                            </Typography>

                            <Grid container spacing={1.5}>
                                <Grid item xs={6}>
                                    <TextField 
                                        label="Aplicar Desconto" size="small" fullWidth type="number" 
                                        value={desconto} onChange={e => setDesconto(e.target.value)}
                                        InputProps={{ startAdornment: <InputAdornment position="start" sx={{mr:0}}>R$</InputAdornment> }}
                                        sx={{ bgcolor: '#ffffff' }}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <DatePicker 
                                        label="Data do Recebimento"
                                        value={dataPgto} onChange={setDataPgto}
                                        slotProps={{ textField: { size: 'small', fullWidth: true, sx: { bgcolor: '#ffffff' } } }}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        select label="Forma de Pagamento" fullWidth size="small"
                                        value={formaPgto} onChange={e => setFormaPgto(e.target.value)}
                                        sx={{ bgcolor: '#ffffff' }}
                                    >
                                        <MenuItem value="PIX">PIX</MenuItem>
                                        <MenuItem value="Dinheiro">Dinheiro</MenuItem>
                                        <MenuItem value="CartaoCredito">Cartão de Crédito</MenuItem>
                                        <MenuItem value="CartaoDebito">Cartão de Débito</MenuItem>
                                        <MenuItem value="Transferencia">Transferência Bancária</MenuItem>
                                    </TextField>
                                </Grid>
                                {formaPgto === 'CartaoCredito' && (
                                    <Grid item xs={12}>
                                        <TextField
                                            select label="Parcelamento na Maquininha" fullWidth size="small"
                                            value={parcelasSimples} onChange={e => setParcelasSimples(e.target.value)}
                                            sx={{ bgcolor: '#ffffff' }}
                                        >
                                            {[1,2,3,4,5,6,10,12].map(n => <MenuItem key={n} value={n}>{n}x</MenuItem>)}
                                        </TextField>
                                    </Grid>
                                )}
                            </Grid>

                            <Button 
                                variant="contained" color="success" fullWidth 
                                onClick={handleConfirmarBaixaRapida} disabled={submitting || valorComDesconto < 0}
                                sx={{ py: 1.5, mt: 2, fontWeight: 'bold', fontSize: '0.9rem' }}
                            >
                                {submitting ? <CircularProgress size={24} color="inherit" /> : "REGISTRAR RECEBIMENTO"}
                            </Button>
                        </Box>
                    )
                )}

                {/* ---------------------------------------------------------------- */}
                {/* ABA 1: MATRIZ DE RENEGOCIAÇÃO (MÚLTIPLOS MEIOS / ENTRADAS)      */}
                {/* ---------------------------------------------------------------- */}
                {activeTab === 1 && !isPago && !isCancelado && (
                    <Box>
                        <Grid container spacing={1.5} sx={{ mb: 2 }}>
                            <Grid item xs={12}>
                                <Typography variant="caption" fontWeight="bold" color="text.secondary">REGRAS DO PARCELAMENTO</Typography>
                            </Grid>
                            <Grid item xs={4}>
                                <TextField label="Acréscimo (+)" type="number" size="small" fullWidth sx={{bgcolor:'#fff'}} value={configReneg.acrescimo} onChange={e => setConfigReneg({...configReneg, acrescimo: e.target.value})} />
                            </Grid>
                            <Grid item xs={4}>
                                <TextField label="Desconto (-)" type="number" size="small" fullWidth sx={{bgcolor:'#fff'}} value={configReneg.desconto} onChange={e => setConfigReneg({...configReneg, desconto: e.target.value})} />
                            </Grid>
                            <Grid item xs={4}>
                                <TextField label="Nº Parcelas" type="number" size="small" fullWidth sx={{bgcolor:'#fff'}} value={configReneg.qtdParcelas} onChange={e => setConfigReneg({...configReneg, qtdParcelas: e.target.value})} />
                            </Grid>
                            <Grid item xs={12}>
                                <DatePicker 
                                    label="Vencimento da Primeira Parcela (Ou Entrada)" 
                                    value={configReneg.primeiroVencimento} 
                                    onChange={v => setConfigReneg({...configReneg, primeiroVencimento: v})}
                                    slotProps={{ textField: { size: 'small', fullWidth: true, sx:{bgcolor:'#fff'} } }} 
                                />
                            </Grid>
                        </Grid>

                        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, borderRadius: 1 }}>
                            <Table size="small">
                                <TableHead sx={{ bgcolor: '#e9ecef' }}>
                                    <TableRow>
                                        <TableCell sx={{fontWeight:'bold', fontSize:'0.7rem'}}>Nº</TableCell>
                                        <TableCell sx={{fontWeight:'bold', fontSize:'0.7rem'}}>Vencimento</TableCell>
                                        <TableCell sx={{fontWeight:'bold', fontSize:'0.7rem'}}>Valor</TableCell>
                                        <TableCell align="center" sx={{fontWeight:'bold', fontSize:'0.7rem'}}>Pagar Agora?</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {simulacaoReneg.map((p, i) => (
                                        <React.Fragment key={i}>
                                            <TableRow sx={{ bgcolor: p.pago_agora ? '#e8f5e9' : 'inherit' }}>
                                                <TableCell>{p.numero}</TableCell>
                                                <TableCell>{dayjs(p.vencimento).format('DD/MM/YY')}</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }}>{formatMoney(p.valor)}</TableCell>
                                                <TableCell align="center">
                                                    <Checkbox 
                                                        size="small" color="success" checked={p.pago_agora}
                                                        onChange={(e) => handleEditParcelaReneg(i, 'pago_agora', e.target.checked)}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                            {/* Sub-linha para escolher a forma de pagamento se marcar "Pagar Agora" */}
                                            {p.pago_agora && (
                                                <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                                                    <TableCell colSpan={4} sx={{ pt: 0, pb: 1, borderBottom: 'none' }}>
                                                        <TextField 
                                                            select size="small" fullWidth variant="standard" label="Receber a entrada via:"
                                                            value={p.forma_pagamento} onChange={(e) => handleEditParcelaReneg(i, 'forma_pagamento', e.target.value)}
                                                            sx={{ bgcolor: '#fff', px: 1, borderRadius: 1 }}
                                                        >
                                                            <MenuItem value="Dinheiro">Dinheiro</MenuItem>
                                                            <MenuItem value="PIX">PIX</MenuItem>
                                                            <MenuItem value="CartaoCredito">Crédito</MenuItem>
                                                            <MenuItem value="CartaoDebito">Débito</MenuItem>
                                                        </TextField>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <Button 
                            variant="contained" color="primary" fullWidth 
                            onClick={handleConfirmarRenegociacao} disabled={submitting}
                            sx={{ py: 1.5, fontWeight: 'bold' }}
                        >
                            {submitting ? <CircularProgress size={24} color="inherit" /> : "PROCESSAR RENEGOCIAÇÃO"}
                        </Button>
                    </Box>
                )}

                {/* ---------------------------------------------------------------- */}
                {/* ABA 2: EXTRATO DO PACIENTE                                       */}
                {/* ---------------------------------------------------------------- */}
                {activeTab === 2 && (
                    <Box>
                        {loadingHistorico ? (
                            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                        ) : (
                            <>
                                <Grid container spacing={1} sx={{ mb: 2 }}>
                                    <Grid item xs={4}>
                                        <Paper sx={{ p: 1, textAlign: 'center', bgcolor: '#e8f5e9', border: '1px solid #c8e6c9' }}>
                                            <Typography variant="caption" fontWeight="bold" color="success.main" sx={{fontSize:'0.65rem'}}>PAGO</Typography>
                                            <Typography variant="body2" fontWeight="bold" color="success.main">{formatMoney(resumoHistorico.pago)}</Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={4}>
                                        <Paper sx={{ p: 1, textAlign: 'center', bgcolor: '#fff3e0', border: '1px solid #ffe0b2' }}>
                                            <Typography variant="caption" fontWeight="bold" color="warning.main" sx={{fontSize:'0.65rem'}}>ABERTO</Typography>
                                            <Typography variant="body2" fontWeight="bold" color="warning.main">{formatMoney(resumoHistorico.aberto)}</Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={4}>
                                        <Paper sx={{ p: 1, textAlign: 'center', bgcolor: '#ffebee', border: '1px solid #ffcdd2' }}>
                                            <Typography variant="caption" fontWeight="bold" color="error.main" sx={{fontSize:'0.65rem'}}>ATRASADO</Typography>
                                            <Typography variant="body2" fontWeight="bold" color="error.main">{formatMoney(resumoHistorico.atrasado)}</Typography>
                                        </Paper>
                                    </Grid>
                                </Grid>

                                <List dense sx={{ p: 0, bgcolor: '#ffffff', border: '1px solid #dee2e6', borderRadius: 1 }}>
                                    {historico.length === 0 ? (
                                        <Typography variant="caption" align="center" display="block" sx={{ py: 3, color: 'text.secondary' }}>Sem histórico.</Typography>
                                    ) : historico.map((hist) => (
                                        <ListItem key={hist.id} sx={{ borderBottom: '1px solid #f0f0f0', px: 1.5, py: 1 }}>
                                            <ListItemIcon sx={{ minWidth: 32 }}>
                                                {hist.status === 'Pago' ? <CheckCircle color="success" sx={{ fontSize: 18 }}/> : <CalendarMonth color="warning" sx={{ fontSize: 18 }}/>}
                                            </ListItemIcon>
                                            <ListItemText 
                                                primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 600, color: '#343a40' }}
                                                secondaryTypographyProps={{ fontSize: '0.7rem' }}
                                                primary={hist.descricao || "Atendimento"}
                                                secondary={dayjs(hist.data_vencimento).format('DD/MM/YY')}
                                            />
                                            <Box textAlign="right">
                                                <Typography variant="body2" fontSize="0.8rem" fontWeight="bold">{formatMoney(hist.valor)}</Typography>
                                                <Typography variant="caption" fontSize="0.65rem" color="text.secondary">{hist.status}</Typography>
                                            </Box>
                                        </ListItem>
                                    ))}
                                </List>
                            </>
                        )}
                    </Box>
                )}
            </Box>

            {/* MENU DE OPÇÕES (Kebab Menu) */}
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                <MenuItem onClick={() => handleAlterarStatus('Pendente')} dense>
                    <ListItemIcon><Undo fontSize="small" /></ListItemIcon> 
                    <Typography variant="body2">Reverter para Pendente</Typography>
                </MenuItem>
                <MenuItem onClick={() => handleAlterarStatus('Cancelado')} dense>
                    <ListItemIcon><Block fontSize="small" color="error" /></ListItemIcon> 
                    <Typography variant="body2" color="error">Anular / Cancelar Cobrança</Typography>
                </MenuItem>
            </Menu>
        </Box>
    );
}