// src/components/financeiro/ContasReceberView.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box, Button, CircularProgress, Typography, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Grid, IconButton, TextField, InputAdornment, Chip
} from '@mui/material';
import { 
    AttachMoney, CheckCircle, Search, AddCircleOutline 
} from '@mui/icons-material';
import DeleteIcon from '@mui/icons-material/Delete'; 

import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';

// Importação dos Modais
import PagamentoModal from './PagamentoModal';
import LancamentoCaixaModal from './LancamentoCaixaModal';

export default function ContasReceberView() {
    const { showSnackbar } = useSnackbar();
    
    const [pagamentosPendentes, setPagamentosPendentes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [openPagarModal, setOpenPagarModal] = useState(false);
    const [openNovoLancamentoModal, setOpenNovoLancamentoModal] = useState(false);
    const [selectedPagamento, setSelectedPagamento] = useState(null);

    const fetchPendentes = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await faturamentoService.getPagamentosPendentes();
            setPagamentosPendentes(response.data);
        } catch (error) {
            console.error("Erro ao buscar pendentes:", error);
            showSnackbar("Erro ao carregar contas a receber.", 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => {
        fetchPendentes();
    }, [fetchPendentes]);

    const financialSummary = useMemo(() => {
        return pagamentosPendentes.reduce((acc, item) => {
            const valor = parseFloat(item.valor) || 0;
            acc.total += valor;
            acc.qtd += 1;
            return acc;
        }, { total: 0, qtd: 0 });
    }, [pagamentosPendentes]);

    const handleOpenPagar = (pagamento) => {
        setSelectedPagamento(pagamento);
        setOpenPagarModal(true);
    };

    const handleSuccessPagamento = () => {
        setOpenPagarModal(false);
        setSelectedPagamento(null);
        fetchPendentes();
    };

    const handleCloseNovoLancamento = () => {
        setOpenNovoLancamentoModal(false);
        fetchPendentes();
    };

    // --- FUNÇÃO DE DELETE CORRIGIDA ---
    const handleDelete = async (id) => {
        if (window.confirm("Tem certeza que deseja excluir este lançamento avulso permanentemente?")) {
            try {
                // Correção: Usa o faturamentoService em vez de 'api'
                await faturamentoService.deletePagamento(id); 
                showSnackbar('Lançamento excluído com sucesso', 'success');
                fetchPendentes(); // Recarrega a lista após deletar
            } catch (error) {
                const msgErro = error.response?.data?.error || 'Erro desconhecido ao excluir.';
                showSnackbar(`Erro: ${msgErro}`, 'error');
            }
        }
    };

    const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    
    const formatDate = (pagamento) => {
        if (pagamento.agendamento) {
            return new Date(pagamento.agendamento.data_hora_inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        }
        return <Chip label="Avulso" size="small" variant="outlined" sx={{fontSize: '0.7rem'}} />;
    };

    const filteredList = pagamentosPendentes.filter(p => {
        const termo = searchTerm.toLowerCase();
        const nome = p.paciente_nome ? p.paciente_nome.toLowerCase() : '';
        const desc = p.descricao ? p.descricao.toLowerCase() : '';
        return nome.includes(termo) || desc.includes(termo);
    });

    return (
        <Box>
            {/* --- 1. CARDS DE RESUMO (KPIs) --- */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#fff' }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold">TOTAL A RECEBER</Typography>
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
                            <Typography variant="caption" color="text.secondary" fontWeight="bold">ITENS PENDENTES</Typography>
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

            {/* --- 2. BARRA DE AÇÕES --- */}
            <Paper elevation={0} sx={{ p: 1.5, mb: 2, border: '1px solid #e0e0e0', display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
                <TextField 
                    size="small"
                    placeholder="Buscar paciente ou descrição..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
                    }}
                    sx={{ width: { xs: '100%', md: '300px' } }}
                />
                
                <Button 
                    variant="contained" 
                    startIcon={<AddCircleOutline />}
                    onClick={() => setOpenNovoLancamentoModal(true)}
                    sx={{ bgcolor: '#1a233b', '&:hover': { bgcolor: '#2c3a5b' } }}
                >
                    Novo Lançamento
                </Button>
            </Paper>

            {/* --- 3. TABELA DE DADOS --- */}
            <TableContainer component={Paper} elevation={1}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f9fafb' }}>
                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Data / Ref</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Paciente / Origem</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Descrição</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Valor</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.8rem', width: '140px' }}>Ação</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={5} align="center"><CircularProgress size={24} sx={{ mt: 2 }} /></TableCell></TableRow>
                        ) : filteredList.length > 0 ? (
                            filteredList.map((pag) => (
                                <TableRow key={pag.id} hover>
                                    <TableCell sx={{ fontSize: '0.8rem' }}>
                                        {formatDate(pag)}
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                        {pag.paciente_nome}
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                                        {pag.descricao || (pag.agendamento ? pag.agendamento.tipo_consulta : 'Sem descrição')}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1a233b' }}>
                                        {formatMoney(pag.valor)}
                                    </TableCell>
                                    
                                    {/* --- COLUNA DE AÇÃO CORRIGIDA --- */}
                                    <TableCell align="center">
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                            <Button 
                                                variant="outlined" 
                                                size="small"
                                                color="success"
                                                onClick={() => handleOpenPagar(pag)}
                                                sx={{ fontSize: '0.7rem', py: 0.5, minWidth: '70px' }}
                                            >
                                                Receber
                                            </Button>
                                            
                                            {/* Renderização Condicional: Só aparece se NÃO for agendamento */}
                                            {!pag.agendamento && (
                                                <IconButton 
                                                    onClick={() => handleDelete(pag.id)}
                                                    sx={{ 
                                                        color: '#bdbdbd', 
                                                        '&:hover': { color: '#d32f2f', bgcolor: 'rgba(211, 47, 47, 0.08)' } 
                                                    }}
                                                    title="Excluir Lançamento Avulso"
                                                    size="small"
                                                >
                                                    <DeleteIcon fontSize="small" /> 
                                                </IconButton>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    Nenhuma conta pendente encontrada.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* --- MODAIS --- */}
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