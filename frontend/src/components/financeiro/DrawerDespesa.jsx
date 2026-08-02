import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, IconButton, Button, TextField, Tabs, Tab, 
    List, ListItem, ListItemText, Chip, Divider, Menu, MenuItem, ListItemIcon,
    Paper, InputAdornment, Grid, CircularProgress, Alert
} from '@mui/material';
import { 
    Close, CheckCircle, MoreVert, Undo, Block, 
    CalendarMonth, Save, AttachMoney, DeleteForever, Warning, Edit
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function DrawerDespesa({ open, onClose, item, onUpdate }) {
    const [activeTab, setActiveTab] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [loadingTimeline, setLoadingTimeline] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const { showSnackbar } = useSnackbar();

    const [categorias, setCategorias] = useState([]);
    const [timeline, setTimeline] = useState([]);

    // Estado do Formulário de Edição
    const [formData, setFormData] = useState({
        descricao: '',
        valor: '',
        categoria: '',
        data_vencimento: dayjs(),
        data_despesa: dayjs()
    });

    // Estado do Formulário de Pagamento
    const [paymentData, setPaymentData] = useState({
        data_pagamento: dayjs(),
        forma_pagamento: 'PIX'
    });

    // Detecção de Parcelamento / Recorrência
    const isParcelado = item && /\(\d+\/\d+\)/.test(item.descricao);

    useEffect(() => {
        if (open && item) {
            setActiveTab(0);
            setFormData({
                descricao: item.descricao || '',
                valor: item.valor || '',
                categoria: item.categoria || '', 
                data_vencimento: item.data_vencimento ? dayjs(item.data_vencimento) : dayjs(),
                data_despesa: item.data_despesa ? dayjs(item.data_despesa) : dayjs()
            });
            setPaymentData({
                data_pagamento: item.data_pagamento ? dayjs(item.data_pagamento) : dayjs(),
                forma_pagamento: item.forma_pagamento || 'PIX'
            });

            carregarDependencias(item.id);
        }
    }, [open, item]);

    const carregarDependencias = async (despesaId) => {
        setLoadingTimeline(true);
        try {
            // Carrega categorias (se ainda não tiver)
            if (categorias.length === 0) {
                const resCat = await faturamentoService.getCategoriasDespesa();
                setCategorias(resCat.data || []);
            }
            // Carrega as irmãs da série (Timeline)
            const resTime = await faturamentoService.getDespesaTimeline(despesaId);
            setTimeline(resTime.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingTimeline(false);
        }
    };

    // -----------------------------------------------------
    // AÇÕES DE BACKEND
    // -----------------------------------------------------

    const handleConfirmarPagamento = async () => {
        setSubmitting(true);
        try {
            await faturamentoService.updateDespesa(item.id, {
                pago: true,
                status: 'Pago',
                data_pagamento: paymentData.data_pagamento.format('YYYY-MM-DD'),
                forma_pagamento: paymentData.forma_pagamento
            });
            showSnackbar('Despesa baixada com sucesso!', 'success');
            onUpdate(); onClose();
        } catch (error) { showSnackbar('Erro ao baixar despesa.', 'error'); }
        finally { setSubmitting(false); }
    };

    const handleSalvarEdicao = async () => {
        setSubmitting(true);
        try {
            await faturamentoService.updateDespesa(item.id, {
                descricao: formData.descricao,
                valor: parseFloat(formData.valor),
                categoria: formData.categoria,
                data_vencimento: formData.data_vencimento.format('YYYY-MM-DD'),
                data_despesa: formData.data_despesa.format('YYYY-MM-DD')
            });
            showSnackbar('Despesa atualizada.', 'success');
            onUpdate(); onClose();
        } catch (error) { showSnackbar('Erro ao salvar.', 'error'); }
        finally { setSubmitting(false); }
    };

    const handleAlterarStatus = async (novoStatus) => {
        setAnchorEl(null);
        if (!window.confirm(`Confirma reverter esta despesa para PENDENTE?`)) return;
        try {
            await faturamentoService.updateDespesa(item.id, { pago: false, data_pagamento: null });
            showSnackbar('Despesa revertida para pendente.', 'success');
            onUpdate(); onClose();
        } catch (error) { showSnackbar('Erro ao alterar status.', 'error'); }
    };

    const handleDeleteUnico = async () => {
        setAnchorEl(null);
        if(!window.confirm("Excluir definitivamente esta despesa?")) return;
        try {
            await faturamentoService.deleteDespesa(item.id);
            showSnackbar('Despesa excluída.', 'success');
            onUpdate(); onClose();
        } catch(e) { showSnackbar('Erro ao excluir.', 'error'); }
    };

    // Ações de Série (Lote)
    const handleEditarSerie = async () => {
        if (!window.confirm(`ATENÇÃO: Isso alterará o VALOR e a CATEGORIA de TODAS as parcelas desta série para os valores que estão preenchidos na aba "Edição". Continuar?`)) return;
        setSubmitting(true);
        try {
            await faturamentoService.editarSerieDespesas(item.id, {
                valor: formData.valor,
                categoria: formData.categoria
            });
            showSnackbar('Série atualizada com sucesso!', 'success');
            onUpdate(); onClose();
        } catch (error) { showSnackbar('Erro ao atualizar série.', 'error'); }
        finally { setSubmitting(false); }
    };

    const handleExcluirSerie = async () => {
        setAnchorEl(null);
        if(!window.confirm("PERIGO: Isso apagará TODAS as parcelas desta série (passadas e futuras).\n\nTem certeza absoluta?")) return;
        try {
            await faturamentoService.excluirSerieDespesas(item.id);
            showSnackbar('Série completa excluída.', 'success');
            onUpdate(); onClose();
        } catch (error) { showSnackbar('Erro ao excluir série.', 'error'); }
    };

    if (!open || !item) return null;

    return (
        <Box sx={{ width: { xs: '100%', md: 450 }, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f8f9fa' }}>
            
            {/* CABEÇALHO COMPACTO TASY */}
            <Box sx={{ px: 2, py: 1.5, bgcolor: '#ffffff', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight="bold" fontSize="0.7rem">
                        CONTA A PAGAR {isParcelado && "(PARCELADA)"}
                    </Typography>
                    <Typography variant="subtitle1" fontWeight="800" color="#343a40" lineHeight={1.2}>
                        {item.descricao}
                    </Typography>
                    <Chip 
                        label={item.pago ? "PAGO / LIQUIDADO" : "PENDENTE"} 
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
                sx={{ bgcolor: '#ffffff', borderBottom: '1px solid #dee2e6', minHeight: 36, '& .MuiTab-root': { minHeight: 36, fontSize: '0.75rem', py: 0, fontWeight: 'bold' } }}
            >
                <Tab icon={<AttachMoney fontSize="small"/>} iconPosition="start" label="Quitar / Pagar" />
                <Tab icon={<Edit fontSize="small"/>} iconPosition="start" label="Detalhes / Edição" />
                {/* Só mostra aba de série se for parcelado ou tiver histórico detectado */}
                {(isParcelado || timeline.length > 1) && (
                    <Tab icon={<Warning fontSize="small"/>} iconPosition="start" label="Gerenciar Série" sx={{ color: 'warning.dark' }} />
                )}
            </Tabs>

            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
                
                {/* ---------------------------------------------------------------- */}
                {/* ABA 0: QUITAÇÃO (PAGAMENTO)                                      */}
                {/* ---------------------------------------------------------------- */}
                {activeTab === 0 && (
                    item.pago ? (
                        <Box textAlign="center" py={4} bgcolor="#fff" borderRadius={2} border="1px solid #dee2e6">
                            <CheckCircle sx={{ fontSize: 50, color: 'success.main', mb: 1 }} />
                            <Typography variant="h6" fontWeight="bold">Despesa Paga</Typography>
                            <Typography variant="body2" color="text.secondary" mb={2}>
                                Valor: <b>{formatMoney(item.valor)}</b><br/>
                                Em: {dayjs(item.data_pagamento).format('DD/MM/YYYY')} • Via {item.forma_pagamento}
                            </Typography>
                            <Button size="small" variant="outlined" color="warning" onClick={() => handleAlterarStatus('Pendente')}>
                                Estornar Pagamento
                            </Button>
                        </Box>
                    ) : (
                        <Box display="flex" flexDirection="column" gap={2}>
                            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#ffffff', borderColor: '#ced4da' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold">VALOR DO COMPROMISSO</Typography>
                                <Typography variant="h4" fontWeight="900" color="error.main" lineHeight={1.2}>
                                    {formatMoney(item.valor)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Vencimento: {dayjs(item.data_vencimento).format('DD/MM/YYYY')}
                                </Typography>
                            </Paper>

                            <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ textTransform: 'uppercase', mt: 1 }}>
                                Efetivar Pagamento (Caixa)
                            </Typography>

                            <Grid container spacing={1.5}>
                                <Grid item xs={6}>
                                    <DatePicker 
                                        label="Data do Pagamento"
                                        value={paymentData.data_pagamento} 
                                        onChange={v => setPaymentData({...paymentData, data_pagamento: v})}
                                        slotProps={{ textField: { size: 'small', fullWidth: true, sx: { bgcolor: '#ffffff' } } }}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField 
                                        select label="Origem do Recurso" fullWidth size="small" sx={{ bgcolor: '#ffffff' }}
                                        value={paymentData.forma_pagamento} 
                                        onChange={e => setPaymentData({...paymentData, forma_pagamento: e.target.value})}
                                    >
                                        <MenuItem value="PIX">PIX</MenuItem>
                                        <MenuItem value="Dinheiro">Dinheiro</MenuItem>
                                        <MenuItem value="Transferencia">Transferência Conta</MenuItem>
                                        <MenuItem value="CartaoCredito">Cartão de Crédito</MenuItem>
                                        <MenuItem value="Boleto">Boleto</MenuItem>
                                    </TextField>
                                </Grid>
                            </Grid>

                            <Button 
                                variant="contained" color="error" fullWidth 
                                onClick={handleConfirmarPagamento} disabled={submitting}
                                sx={{ py: 1.5, mt: 2, fontWeight: 'bold', fontSize: '0.9rem' }}
                            >
                                {submitting ? <CircularProgress size={24} color="inherit" /> : "CONFIRMAR PAGAMENTO"}
                            </Button>
                        </Box>
                    )
                )}

                {/* ---------------------------------------------------------------- */}
                {/* ABA 1: EDIÇÃO SIMPLES                                            */}
                {/* ---------------------------------------------------------------- */}
                {activeTab === 1 && (
                    <Box display="flex" flexDirection="column" gap={1.5}>
                        <Paper variant="outlined" sx={{ p: 2, bgcolor: '#ffffff' }}>
                            <Typography variant="caption" fontWeight="bold" color="text.secondary" mb={1} display="block">
                                EDITAR INFORMAÇÕES
                            </Typography>
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
                                    <TextField 
                                        select label="Categoria" fullWidth size="small"
                                        value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})}
                                    >
                                        {categorias.map(cat => (
                                            <MenuItem key={cat.id} value={cat.id}>{cat.nome}</MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                                <Grid item xs={6}>
                                    <DatePicker 
                                        label="Data de Competência"
                                        value={formData.data_despesa} onChange={v => setFormData({...formData, data_despesa: v})}
                                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <DatePicker 
                                        label="Vencimento Original"
                                        value={formData.data_vencimento} onChange={v => setFormData({...formData, data_vencimento: v})}
                                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Button 
                                        fullWidth variant="outlined" size="small" startIcon={<Save />}
                                        onClick={handleSalvarEdicao} disabled={submitting} sx={{ mt: 1 }}
                                    >
                                        Salvar Alterações
                                    </Button>
                                </Grid>
                            </Grid>
                        </Paper>
                        
                        {isParcelado && (
                            <Alert severity="info" sx={{ fontSize: '0.75rem', p: 1 }}>
                                Alterar dados aqui modifica <b>apenas esta parcela</b>. Para alterar todas de uma vez, use a aba "Gerenciar Série".
                            </Alert>
                        )}
                    </Box>
                )}

                {/* ---------------------------------------------------------------- */}
                {/* ABA 2: GERENCIAMENTO DE SÉRIE (LOTE)                             */}
                {/* ---------------------------------------------------------------- */}
                {activeTab === 2 && (
                    <Box>
                        <Alert severity="warning" icon={<Warning />} sx={{ mb: 2, '& .MuiAlert-message': { fontSize: '0.8rem' } }}>
                            <b>Zona de Perigo:</b> O sistema detectou que este lançamento faz parte de um parcelamento ou recorrência. As ações abaixo afetam a série inteira.
                        </Alert>
                        
                        <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#fff3e0', borderColor: '#ffe0b2' }}>
                            <Typography variant="subtitle2" fontWeight="bold" color="warning.dark" gutterBottom>
                                Atualização em Lote
                            </Typography>
                            <Typography variant="body2" color="text.secondary" mb={2}>
                                Se você renegociou este serviço, defina o <b>Novo Valor</b> e a <b>Nova Categoria</b> na aba "Edição" e clique no botão abaixo para replicar para todas as parcelas futuras e passadas.
                            </Typography>
                            <Button 
                                variant="contained" color="warning" fullWidth 
                                onClick={handleEditarSerie} disabled={submitting}
                                sx={{ fontWeight: 'bold' }}
                            >
                                Aplicar novo valor à todas as parcelas
                            </Button>
                        </Paper>

                        <Typography variant="caption" fontWeight="bold" color="text.secondary" gutterBottom display="block">
                            TIMELINE DA SÉRIE
                        </Typography>
                        
                        <List dense sx={{ p: 0, bgcolor: '#ffffff', border: '1px solid #dee2e6', borderRadius: 1 }}>
                            {loadingTimeline ? (
                                <Box display="flex" justifyContent="center" py={2}><CircularProgress size={24}/></Box>
                            ) : timeline.map((hist) => (
                                <ListItem key={hist.id} sx={{ borderBottom: '1px solid #f0f0f0', px: 1.5, py: 1, bgcolor: hist.id === item.id ? '#e8f5e9' : 'transparent' }}>
                                    <ListItemIcon sx={{ minWidth: 32 }}>
                                        {hist.pago ? <CheckCircle color="success" sx={{ fontSize: 18 }}/> : <CalendarMonth color="error" sx={{ fontSize: 18 }}/>}
                                    </ListItemIcon>
                                    <ListItemText 
                                        primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 600, color: '#343a40' }}
                                        secondaryTypographyProps={{ fontSize: '0.7rem' }}
                                        primary={hist.descricao}
                                        secondary={`${dayjs(hist.data_vencimento).format('DD/MM/YY')} • ${hist.categoria_nome || 'Sem Categoria'}`}
                                    />
                                    <Box textAlign="right">
                                        <Typography variant="body2" fontSize="0.8rem" fontWeight="bold">{formatMoney(hist.valor)}</Typography>
                                        <Typography variant="caption" fontSize="0.65rem" color={hist.pago ? 'success.main' : 'error.main'}>
                                            {hist.pago ? 'PAGO' : 'ABERTO'}
                                        </Typography>
                                    </Box>
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                )}
            </Box>

            {/* MENU DE OPÇÕES (Kebab Menu) */}
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                <MenuItem onClick={handleDeleteUnico} dense>
                    <ListItemIcon><Block fontSize="small" color="error" /></ListItemIcon> 
                    <Typography variant="body2" color="error">Excluir APENAS ESTA despesa</Typography>
                </MenuItem>
                
                {/* Proteção para excluir a série inteira (visível apenas se for parcelado) */}
                {(isParcelado || timeline.length > 1) && [
                    <Divider key="div" />,
                    <MenuItem key="del" onClick={handleExcluirSerie} dense sx={{ bgcolor: '#fff5f5' }}>
                        <ListItemIcon><DeleteForever fontSize="small" color="error" /></ListItemIcon> 
                        <Typography variant="body2" color="error" fontWeight="bold">Excluir a SÉRIE COMPLETA</Typography>
                    </MenuItem>
                ]}
            </Menu>
        </Box>
    );
}