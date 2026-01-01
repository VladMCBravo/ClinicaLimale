import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box, Button, CircularProgress, Typography, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Grid, IconButton, TextField, InputAdornment, Chip, Dialog, DialogTitle, 
    DialogContent, DialogActions, FormControlLabel, Switch
} from '@mui/material';
import { 
    AttachMoney, CheckCircle, Search, AddCircleOutline, Edit
} from '@mui/icons-material';
import DeleteIcon from '@mui/icons-material/Delete'; 
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';

import PagamentoModal from './PagamentoModal'; // Modal de "Receber" (Baixa)
import LancamentoCaixaModal from './LancamentoCaixaModal'; // Modal de "Novo"

// Função auxiliar de formatação
const formatDataSimples = (dataISO) => {
    if (!dataISO) return '-';
    const partes = dataISO.split('T')[0].split('-'); 
    if(partes.length < 3) return dataISO;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

export default function ContasReceberView() {
    const { showSnackbar } = useSnackbar();
    
    // Estados de Dados
    const [listaPagamentos, setListaPagamentos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Estados de Modais
    const [openPagarModal, setOpenPagarModal] = useState(false); // Modal de Baixa Rápida
    const [openNovoLancamentoModal, setOpenNovoLancamentoModal] = useState(false); // Modal Criar
    const [openEditModal, setOpenEditModal] = useState(false); // NOVO: Modal Editar
    
    const [selectedPagamento, setSelectedPagamento] = useState(null);
    const [editFormData, setEditFormData] = useState({}); // Dados para edição

    // --- CARGA DE DADOS (SEM FILTRO DE STATUS = TRAZ TUDO) ---
    const fetchPagamentos = useCallback(async () => {
        setIsLoading(true);
        try {
            // Removemos o filtro de status para trazer TODOS
            const response = await faturamentoService.getPagamentos({});
            
            if (Array.isArray(response.data)) {
                // Ordenação padrão: Mais recentes primeiro (seja pagamento ou vencimento)
                const sorted = response.data.sort((a, b) => {
                    const dataA = a.data_pagamento || a.data_vencimento;
                    const dataB = b.data_pagamento || b.data_vencimento;
                    return new Date(dataB) - new Date(dataA);
                });
                setListaPagamentos(sorted);
            } else {
                setListaPagamentos(response.data.results || []);
            }
        } catch (error) {
            console.error("Erro ao buscar:", error);
            showSnackbar("Erro ao carregar dados.", 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => {
        fetchPagamentos();
    }, [fetchPagamentos]);

    // --- KPIs ---
    const financialSummary = useMemo(() => {
        return listaPagamentos.reduce((acc, item) => {
            const valor = parseFloat(item.valor) || 0;
            if (item.status === 'Pago') {
                acc.recebidos += valor;
            } else {
                acc.aReceber += valor;
            }
            acc.total += valor;
            return acc;
        }, { recebidos: 0, aReceber: 0, total: 0 });
    }, [listaPagamentos]);

    // --- AÇÕES ---
    const handleOpenPagar = (pagamento) => {
        setSelectedPagamento(pagamento);
        setOpenPagarModal(true);
    };

    // NOVO: Abrir modal de edição
    const handleOpenEdit = (pagamento) => {
        setEditFormData({
            id: pagamento.id,
            descricao: pagamento.descricao || '',
            // Se for avulso ou consulta, permite editar a data
            data_vencimento: pagamento.data_vencimento,
            data_pagamento: pagamento.data_pagamento,
            status: pagamento.status,
            pago: pagamento.status === 'Pago'
        });
        setOpenEditModal(true);
    };

    // NOVO: Salvar Edição
    const handleSaveEdit = async () => {
        try {
            const payload = {
                descricao: editFormData.descricao,
                data_vencimento: editFormData.data_vencimento,
                data_pagamento: editFormData.pago ? (editFormData.data_pagamento || dayjs().format('YYYY-MM-DD')) : null,
                status: editFormData.pago ? 'Pago' : 'Pendente'
            };

            await faturamentoService.updatePagamento(editFormData.id, payload);
            showSnackbar('Atualizado com sucesso!', 'success');
            setOpenEditModal(false);
            fetchPagamentos();
        } catch (error) {
            console.error(error);
            showSnackbar('Erro ao atualizar.', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Tem certeza que deseja excluir?")) {
            try {
                await faturamentoService.deletePagamento(id); 
                showSnackbar('Excluído com sucesso', 'success');
                fetchPagamentos();
            } catch (error) {
                showSnackbar('Erro ao excluir.', 'error');
            }
        }
    };

    const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const filteredList = listaPagamentos.filter(p => {
        const termo = searchTerm.toLowerCase();
        const nome = p.paciente_nome ? p.paciente_nome.toLowerCase() : '';
        const desc = p.descricao_visual ? p.descricao_visual.toLowerCase() : (p.descricao || '');
        return nome.includes(termo) || desc.includes(termo);
    });

    return (
        <Box sx={{ p: 1 }}>
            {/* 1. KPIs UNIFICADOS */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', bgcolor: '#fff' }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold">RECEBIDO</Typography>
                            <Typography variant="h5" fontWeight="bold" color="#2e7d32">{formatMoney(financialSummary.recebidos)}</Typography>
                        </Box>
                        <CheckCircle sx={{ color: '#2e7d32', opacity: 0.2 }} />
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', bgcolor: '#fff' }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold">A RECEBER</Typography>
                            <Typography variant="h5" fontWeight="bold" color="#f57c00">{formatMoney(financialSummary.aReceber)}</Typography>
                        </Box>
                        <AttachMoney sx={{ color: '#f57c00', opacity: 0.2 }} />
                    </Paper>
                </Grid>
            </Grid>

            {/* 2. BARRA DE AÇÕES (Sem Abas) */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <TextField 
                    size="small"
                    placeholder="Buscar paciente ou descrição..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
                    sx={{ flexGrow: 1, bgcolor: 'white' }}
                />
                <Button variant="contained" startIcon={<AddCircleOutline />} onClick={() => setOpenNovoLancamentoModal(true)} sx={{ bgcolor: '#1a233b', '&:hover': { bgcolor: '#2c3a5b' } }}>
                    Novo Lançamento
                </Button>
            </Box>

            {/* 3. TABELA PADRONIZADA */}
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #f0f0f0', borderRadius: '8px' }}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', width: '100px' }}>Vencimento</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', width: '100px' }}>Pagamento</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Paciente / Cliente</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Descrição</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Status</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Valor</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={7} align="center"><CircularProgress size={24} sx={{ mt: 2 }} /></TableCell></TableRow>
                        ) : filteredList.length > 0 ? (
                            filteredList.map((pag) => (
                                <TableRow key={pag.id} hover>
                                    <TableCell sx={{ fontSize: '0.8rem', color: '#555' }}>
                                        {formatDataSimples(pag.data_vencimento)}
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.8rem' }}>
                                        {pag.data_pagamento ? (
                                            <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#2e7d32', bgcolor: '#e8f5e9', px: 0.8, py: 0.3, borderRadius: 1 }}>
                                                {formatDataSimples(pag.data_pagamento)}
                                            </Typography>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                        {pag.paciente_nome || "Cliente Avulso"}
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                                        {pag.descricao_visual || pag.descricao || "Sem descrição"}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip 
                                            label={pag.status} 
                                            size="small" 
                                            color={pag.status === 'Pago' ? 'success' : 'warning'} 
                                            variant={pag.status === 'Pago' ? 'filled' : 'outlined'} 
                                            sx={{ fontSize: '0.7rem' }}
                                        />
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1a233b' }}>
                                        {formatMoney(pag.valor)}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {/* Edição para TODOS */}
                                            <IconButton size="small" onClick={() => handleOpenEdit(pag)}>
                                                <Edit sx={{ fontSize: 18, color: '#1976d2' }} />
                                            </IconButton>
                                            
                                            {/* Recebimento Rápido (Se pendente) */}
                                            {pag.status === 'Pendente' && (
                                                <IconButton size="small" onClick={() => handleOpenPagar(pag)} title="Receber agora">
                                                    <CheckCircle sx={{ fontSize: 18, color: '#2e7d32' }} />
                                                </IconButton>
                                            )}

                                            {/* Delete (Só se não for agendamento ou se for admin) */}
                                            <IconButton size="small" onClick={() => handleDelete(pag.id)} color="error">
                                                <DeleteIcon sx={{ fontSize: 18 }} />
                                            </IconButton>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: '#999' }}>Nenhum registro encontrado.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* MODAL DE EDIÇÃO SIMPLIFICADO */}
            <Dialog open={openEditModal} onClose={() => setOpenEditModal(false)} fullWidth maxWidth="xs">
                <DialogTitle>Editar Lançamento</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField 
                            label="Descrição" 
                            fullWidth 
                            value={editFormData.descricao || ''} 
                            onChange={(e) => setEditFormData({...editFormData, descricao: e.target.value})}
                        />
                        <DatePicker 
                            label="Data de Vencimento"
                            value={editFormData.data_vencimento ? dayjs(editFormData.data_vencimento) : null}
                            onChange={(v) => setEditFormData({...editFormData, data_vencimento: v ? v.format('YYYY-MM-DD') : ''})}
                            slotProps={{ textField: { fullWidth: true } }}
                        />
                        
                        <FormControlLabel 
                            control={<Switch checked={editFormData.pago} onChange={(e) => setEditFormData({...editFormData, pago: e.target.checked})} />} 
                            label="Está Pago?" 
                        />

                        {editFormData.pago && (
                            <DatePicker 
                                label="Data do Pagamento"
                                value={editFormData.data_pagamento ? dayjs(editFormData.data_pagamento) : dayjs()}
                                onChange={(v) => setEditFormData({...editFormData, data_pagamento: v ? v.format('YYYY-MM-DD') : ''})}
                                slotProps={{ textField: { fullWidth: true, color: 'success', focused: true } }}
                            />
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEditModal(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={handleSaveEdit}>Salvar</Button>
                </DialogActions>
            </Dialog>

            {selectedPagamento && (
                <PagamentoModal 
                    open={openPagarModal}
                    onClose={() => setOpenPagarModal(false)}
                    onSave={() => { setOpenPagarModal(false); fetchPagamentos(); }}
                    pagamento={selectedPagamento}
                />
            )}

            <LancamentoCaixaModal 
                open={openNovoLancamentoModal}
                onClose={() => { setOpenNovoLancamentoModal(false); fetchPagamentos(); }}
            />
        </Box>
    );
}