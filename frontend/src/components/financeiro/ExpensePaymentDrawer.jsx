// src/components/financeiro/ExpensePaymentDrawer.jsx
import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, IconButton, Button, TextField, Tabs, Tab, 
    List, ListItem, ListItemText, Chip, Divider, Menu, MenuItem, ListItemIcon,
    Paper, InputAdornment, Grid, CircularProgress
} from '@mui/material';
import { 
    Close, CheckCircle, MoreVert, Undo, Block, 
    CalendarMonth, Description, Category, Save, AttachMoney // <--- ADICIONADO AQUI
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { faturamentoService } from '../../services/faturamentoService';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export function ExpenseDrawerContent({ item, onClose, onUpdate }) {
    const [activeTab, setActiveTab] = useState(0);
    const [timeline, setTimeline] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [categorias, setCategorias] = useState([]);
    const [anchorEl, setAnchorEl] = useState(null);

    // Estado do Formulário (Edição + Pagamento)
    const [formData, setFormData] = useState({
        descricao: '',
        valor: '',
        categoria: '',
        data_vencimento: dayjs(),
        // Campos de Pagamento
        forma_pagamento: 'PIX',
        data_pagamento: dayjs()
    });

    // Carregar dados iniciais e categorias
    useEffect(() => {
        if (item) {
            setFormData({
                descricao: item.descricao || '',
                valor: item.valor || '',
                categoria: item.categoria || '', // ID da categoria
                data_vencimento: item.data_vencimento ? dayjs(item.data_vencimento) : dayjs(),
                forma_pagamento: item.forma_pagamento || 'PIX',
                data_pagamento: item.data_pagamento ? dayjs(item.data_pagamento) : dayjs()
            });
            loadTimeline();
        }
        faturamentoService.getCategoriasDespesa().then(res => setCategorias(res.data || []));
    }, [item]);

    const loadTimeline = async () => {
        setLoadingHistory(true);
        try {
            const res = await faturamentoService.getDespesaTimeline(item.id);
            setTimeline(res.data || []);
        } catch (error) { console.error(error); } 
        finally { setLoadingHistory(false); }
    };

    // --- AÇÕES ---

    const handleSalvarEdicao = async () => {
        setSubmitting(true);
        try {
            await faturamentoService.updateDespesa(item.id, {
                descricao: formData.descricao,
                valor: parseFloat(formData.valor),
                categoria: formData.categoria,
                data_vencimento: formData.data_vencimento.format('YYYY-MM-DD'),
                data_despesa: formData.data_vencimento.format('YYYY-MM-DD') // Mantém sincronizado
            });
            onUpdate(); onClose();
        } catch (error) { alert("Erro ao salvar."); }
        finally { setSubmitting(false); }
    };

    const handleConfirmarPagamento = async () => {
        if(!window.confirm(`Confirmar pagamento de ${formatMoney(formData.valor)}?`)) return;
        
        setSubmitting(true);
        try {
            await faturamentoService.updateDespesa(item.id, {
                pago: true,
                status: 'Pago',
                data_pagamento: formData.data_pagamento.format('YYYY-MM-DD'),
                forma_pagamento: formData.forma_pagamento
            });
            onUpdate(); onClose();
        } catch (error) { alert("Erro ao baixar despesa."); }
        finally { setSubmitting(false); }
    };

    const handleAlterarStatus = async (novoStatus) => {
        if (!window.confirm(`Confirmar alteração para: ${novoStatus}?`)) return;
        try {
            // Se for pendente, remove data pagamento
            const payload = { pago: novoStatus === 'Pago' };
            if (novoStatus === 'Pendente') payload.data_pagamento = null;
            
            await faturamentoService.updateDespesa(item.id, payload);
            onUpdate(); onClose();
        } catch (error) { alert("Erro ao alterar status."); }
    };

    const handleDelete = async () => {
        if(!window.confirm("Excluir definitivamente esta despesa?")) return;
        try {
            await faturamentoService.deleteDespesa(item.id);
            onUpdate(); onClose();
        } catch(e) { alert("Erro ao excluir."); }
    };

    return (
        <Box sx={{ width: { xs: '100%', md: 450 }, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f8f9fa' }}>
            
            {/* HEADER */}
            <Box sx={{ px: 2, py: 1.5, bgcolor: '#fff', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight="bold" fontSize="0.7rem">CONTA A PAGAR</Typography>
                    <Typography variant="subtitle1" fontWeight="800" color="#1a233b" lineHeight={1.2}>
                        {item.descricao}
                    </Typography>
                    <Chip 
                        label={item.pago ? "PAGO" : "PENDENTE"} 
                        size="small" 
                        color={item.pago ? 'success' : 'error'}
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
                sx={{ bgcolor: 'white', borderBottom: '1px solid #ddd', minHeight: 36, '& .MuiTab-root': { minHeight: 36, fontSize: '0.75rem', py: 0 } }}
            >
                <Tab label="Detalhes / Pagamento" />
                <Tab label="Série / Histórico" />
            </Tabs>

            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1.5 }}>
                
                {/* --- ABA 0: DETALHES & AÇÃO --- */}
                {activeTab === 0 && (
                    <Box display="flex" flexDirection="column" gap={2}>
                        
                        {/* Se estiver PAGO, mostra resumo fixo. Se PENDENTE, mostra form de edição */}
                        {item.pago ? (
                            <Box textAlign="center" py={4} bgcolor="#fff" borderRadius={2} border="1px solid #eee">
                                <CheckCircle sx={{ fontSize: 50, color: 'success.main', mb: 1 }} />
                                <Typography variant="h6" fontWeight="bold">Despesa Paga</Typography>
                                <Typography variant="body2" color="text.secondary" mb={2}>
                                    Valor: <b>{formatMoney(item.valor)}</b><br/>
                                    Em: {dayjs(item.data_pagamento).format('DD/MM/YYYY')} • Via {item.forma_pagamento}
                                </Typography>
                                <Button size="small" variant="outlined" color="warning" onClick={() => handleAlterarStatus('Pendente')}>
                                    Reverter para Pendente
                                </Button>
                            </Box>
                        ) : (
                            <>
                                {/* FORM DE EDIÇÃO RÁPIDA */}
                                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fff' }}>
                                    <Typography variant="caption" fontWeight="bold" color="text.secondary" mb={1} display="block">DADOS DA DESPESA</Typography>
                                    <Grid container spacing={1.5}>
                                        <Grid item xs={12}>
                                            <TextField 
                                                label="Descrição" fullWidth size="small" 
                                                value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})}
                                            />
                                        </Grid>
                                        <Grid item xs={6}>
                                            <TextField 
                                                label="Valor" fullWidth size="small" type="number"
                                                value={formData.valor} onChange={e => setFormData({...formData, valor: e.target.value})}
                                                InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
                                            />
                                        </Grid>
                                        <Grid item xs={6}>
                                            <DatePicker 
                                                label="Vencimento"
                                                value={formData.data_vencimento} onChange={v => setFormData({...formData, data_vencimento: v})}
                                                slotProps={{ textField: { size: 'small', fullWidth: true } }}
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField 
                                                select label="Categoria" fullWidth size="small"
                                                value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})}
                                            >
                                                {categorias.map(cat => (
                                                    <MenuItem key={cat.id} value={cat.id}>{cat.nome}</MenuItem>
                                                ))}
                                            </TextField>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Button 
                                                fullWidth variant="outlined" size="small" startIcon={<Save />}
                                                onClick={handleSalvarEdicao} disabled={submitting}
                                            >
                                                Salvar Alterações
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </Paper>

                                {/* ÁREA DE PAGAMENTO */}
                                <Paper elevation={0} sx={{ p: 2, bgcolor: '#ffebee', border: '1px solid #ffcdd2' }}>
                                    <Typography variant="subtitle2" fontWeight="bold" color="error.main" mb={1} display="flex" alignItems="center" gap={1}>
                                        <AttachMoney fontSize="small"/> REALIZAR PAGAMENTO
                                    </Typography>
                                    <Grid container spacing={1.5}>
                                        <Grid item xs={6}>
                                            <DatePicker 
                                                label="Data Pagto"
                                                value={formData.data_pagamento} onChange={v => setFormData({...formData, data_pagamento: v})}
                                                slotProps={{ textField: { size: 'small', fullWidth: true, bgcolor: 'white' } }}
                                            />
                                        </Grid>
                                        <Grid item xs={6}>
                                            <TextField 
                                                select label="Forma" fullWidth size="small" sx={{ bgcolor: 'white' }}
                                                value={formData.forma_pagamento} onChange={e => setFormData({...formData, forma_pagamento: e.target.value})}
                                            >
                                                <MenuItem value="PIX">PIX</MenuItem>
                                                <MenuItem value="Dinheiro">Dinheiro</MenuItem>
                                                <MenuItem value="Transferencia">Transferência</MenuItem>
                                                <MenuItem value="Boleto">Boleto</MenuItem>
                                                <MenuItem value="CartaoCredito">Cartão Crédito</MenuItem>
                                            </TextField>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Button 
                                                fullWidth variant="contained" color="error" 
                                                onClick={handleConfirmarPagamento} disabled={submitting}
                                                sx={{ fontWeight: 'bold' }}
                                            >
                                                {submitting ? "Processando..." : "CONFIRMAR PAGAMENTO"}
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </Paper>
                            </>
                        )}
                    </Box>
                )}

                {/* --- ABA 1: HISTÓRICO --- */}
                {activeTab === 1 && (
                    <Box>
                        {loadingHistory && <CircularProgress size={20} sx={{ display: 'block', mx: 'auto', mt: 2 }} />}
                        <List dense sx={{ p: 0 }}>
                            {timeline.map((hist) => (
                                <ListItem key={hist.id} sx={{ borderBottom: '1px solid #f0f0f0', px: 0, py: 0.5, bgcolor: hist.id === item.id ? '#fff8e1' : 'transparent' }}>
                                    <ListItemIcon sx={{ minWidth: 32 }}>
                                        {hist.pago 
                                            ? <CheckCircle color="success" sx={{ fontSize: 18 }}/> 
                                            : <CalendarMonth color="error" sx={{ fontSize: 18 }}/>}
                                    </ListItemIcon>
                                    <ListItemText 
                                        primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 600 }}
                                        secondaryTypographyProps={{ fontSize: '0.7rem' }}
                                        primary={hist.descricao}
                                        secondary={`${dayjs(hist.data_vencimento).format('DD/MM/YYYY')} • ${hist.pago ? 'Pago' : 'Aberto'}`}
                                    />
                                    <Box textAlign="right">
                                        <Typography variant="body2" fontSize="0.8rem" fontWeight="bold">{formatMoney(hist.valor)}</Typography>
                                    </Box>
                                </ListItem>
                            ))}
                        </List>
                        {timeline.length === 0 && !loadingHistory && (
                            <Typography variant="caption" align="center" display="block" sx={{ py: 3, color: 'text.secondary' }}>
                                Sem histórico.
                            </Typography>
                        )}
                    </Box>
                )}
            </Box>

            {/* MENU OPÇÕES */}
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                <MenuItem onClick={() => { handleDelete(); setAnchorEl(null); }} dense>
                    <ListItemIcon><Block fontSize="small" color="error" /></ListItemIcon> <Typography variant="body2" color="error">Excluir Despesa</Typography>
                </MenuItem>
            </Menu>
        </Box>
    );
}