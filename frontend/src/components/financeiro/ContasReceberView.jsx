// src/components/financeiro/ContasReceberView.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box, Button, CircularProgress, Typography, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Grid, IconButton, TextField, InputAdornment, Chip, Tabs, Tab
} from '@mui/material';
import { 
    AttachMoney, CheckCircle, Search, AddCircleOutline
} from '@mui/icons-material';
import DeleteIcon from '@mui/icons-material/Delete'; 

import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';

import PagamentoModal from './PagamentoModal';
import LancamentoCaixaModal from './LancamentoCaixaModal';

// Função auxiliar única e externa
const formatDataSimples = (dataISO) => {
    if (!dataISO) return '-';
    // Garante que a data YYYY-MM-DD não volte um dia por causa do fuso
    const partes = dataISO.split('T')[0].split('-'); // [YYYY, MM, DD]
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

export default function ContasReceberView() {
    const { showSnackbar } = useSnackbar();
    
    const [listaPagamentos, setListaPagamentos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [tabValue, setTabValue] = useState(0); 

    const [openPagarModal, setOpenPagarModal] = useState(false);
    const [openNovoLancamentoModal, setOpenNovoLancamentoModal] = useState(false);
    const [selectedPagamento, setSelectedPagamento] = useState(null);

    const fetchPagamentos = useCallback(async () => {
        setIsLoading(true);
        try {
            let statusFiltro = 'Pendente'; 
            if (tabValue === 1) statusFiltro = 'Pago';
            if (tabValue === 2) statusFiltro = ''; 

            const response = await faturamentoService.getPagamentos({ status: statusFiltro });
            
            if (Array.isArray(response.data)) {
                setListaPagamentos(response.data);
            } else {
                setListaPagamentos(response.data.results || []);
            }

        } catch (error) {
            console.error("Erro ao buscar pagamentos:", error);
            showSnackbar("Erro ao carregar dados financeiros.", 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showSnackbar, tabValue]);

    useEffect(() => {
        fetchPagamentos();
    }, [fetchPagamentos]);

    const financialSummary = useMemo(() => {
        return listaPagamentos.reduce((acc, item) => {
            const valor = parseFloat(item.valor) || 0;
            acc.total += valor;
            acc.qtd += 1;
            return acc;
        }, { total: 0, qtd: 0 });
    }, [listaPagamentos]);

    const handleTabChange = (event, newValue) => setTabValue(newValue);
    
    const handleOpenPagar = (pagamento) => {
        setSelectedPagamento(pagamento);
        setOpenPagarModal(true);
    };

    const handleSuccessPagamento = () => {
        setOpenPagarModal(false);
        setSelectedPagamento(null);
        fetchPagamentos();
    };

    const handleCloseNovoLancamento = () => {
        setOpenNovoLancamentoModal(false);
        fetchPagamentos();
    };

    const handleDelete = async (id) => {
        if (window.confirm("Tem certeza que deseja excluir este lançamento?")) {
            try {
                await faturamentoService.deletePagamento(id); 
                showSnackbar('Lançamento excluído com sucesso', 'success');
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
        <Box>
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#fff' }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                {tabValue === 1 ? 'TOTAL RECEBIDO' : 'TOTAL A RECEBER'}
                            </Typography>
                            <Typography variant="h5" fontWeight="bold" color="#1a233b">
                                {formatMoney(financialSummary.total)}
                            </Typography>
                        </Box>
                        <Box sx={{ bgcolor: 'rgba(26, 35, 59, 0.1)', p: 1, borderRadius: '50%' }}>
                            <AttachMoney sx={{ color: '#1a233b' }} />
                        </Box>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#fff' }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold">QTD ITENS</Typography>
                            <Typography variant="h5" fontWeight="bold" color="#c0a46f">
                                {financialSummary.qtd}
                            </Typography>
                        </Box>
                        <Box sx={{ bgcolor: 'rgba(192, 164, 111, 0.1)', p: 1, borderRadius: '50%' }}>
                            <CheckCircle sx={{ color: '#c0a46f' }} />
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            <Paper elevation={0} sx={{ mb: 2, borderBottom: '1px solid #e0e0e0' }}>
                <Tabs value={tabValue} onChange={handleTabChange} indicatorColor="primary" textColor="primary">
                    <Tab label="A Receber (Pendentes)" />
                    <Tab label="Recebidos (Histórico)" />
                    <Tab label="Todos" />
                </Tabs>
            </Paper>

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

            <TableContainer component={Paper} elevation={1}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f9fafb' }}>
                            {/* --- COLUNAS SEPARADAS CONFORME SOLICITADO --- */}
                            <TableCell sx={{ fontWeight: 'bold', width: '110px' }}>Vencimento</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', width: '110px' }}>Pagamento</TableCell>
                            
                            <TableCell sx={{ fontWeight: 'bold' }}>Paciente / Cliente</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Descrição</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Status</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Valor</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Ação</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={7} align="center"><CircularProgress size={24} sx={{ mt: 2 }} /></TableCell></TableRow>
                        ) : filteredList.length > 0 ? (
                            filteredList.map((pag) => (
                                <TableRow key={pag.id} hover>
                                    
                                    {/* DATA VENCIMENTO */}
                                    <TableCell sx={{ fontSize: '0.85rem', color: '#555' }}>
                                        {formatDataSimples(pag.data_vencimento)}
                                    </TableCell>
                                    
                                    {/* DATA PAGAMENTO (VERDE SE EXISTIR) */}
                                    <TableCell sx={{ fontSize: '0.85rem' }}>
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
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                            {pag.status === 'Pendente' && (
                                                <Button variant="outlined" size="small" color="success" onClick={() => handleOpenPagar(pag)} sx={{ fontSize: '0.7rem', py: 0.5 }}>Receber</Button>
                                            )}
                                            {!pag.agendamento && (
                                                <IconButton onClick={() => handleDelete(pag.id)} size="small" color="error"><DeleteIcon fontSize="small" /></IconButton>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    Nenhum registro encontrado.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {selectedPagamento && (
                <PagamentoModal 
                    open={openPagarModal}
                    onClose={() => setOpenPagarModal(false)}
                    onSave={handleSuccessPagamento}
                    pagamento={selectedPagamento}
                />
            )}

            <LancamentoCaixaModal 
                open={openNovoLancamentoModal}
                onClose={handleCloseNovoLancamento}
            />
        </Box>
    );
}