// src/components/financeiro/ContasReceberView.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box, Button, CircularProgress, Typography, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Grid, IconButton, TextField, InputAdornment, Chip, Tabs, Tab
} from '@mui/material';
import { 
    AttachMoney, CheckCircle, Search, AddCircleOutline, FilterList
} from '@mui/icons-material';
import DeleteIcon from '@mui/icons-material/Delete'; 

import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';

// Importação dos Modais
import PagamentoModal from './PagamentoModal';
import LancamentoCaixaModal from './LancamentoCaixaModal';

export default function ContasReceberView() {
    const { showSnackbar } = useSnackbar();
    
    // --- ESTADOS ---
    const [listaPagamentos, setListaPagamentos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Estado para controlar a aba: 0 = A Receber (Pendente), 1 = Recebidos (Pago), 2 = Todos
    const [tabValue, setTabValue] = useState(0); 

    const [openPagarModal, setOpenPagarModal] = useState(false);
    const [openNovoLancamentoModal, setOpenNovoLancamentoModal] = useState(false);
    const [selectedPagamento, setSelectedPagamento] = useState(null);

    // --- FUNÇÃO DE BUSCA COM DEBUG ---
    const fetchPagamentos = useCallback(async () => {
        setIsLoading(true);
        try {
            // Define o status baseado na aba selecionada
            let statusFiltro = 'Pendente'; 
            if (tabValue === 1) statusFiltro = 'Pago';
            if (tabValue === 2) statusFiltro = ''; // Traz tudo

            console.log("🔄 Buscando pagamentos com status:", statusFiltro || 'TODOS');

            // CHAMA O SERVICE (Certifique-se que seu service aceita o objeto de filtros)
            // Se seu service for antigo, talvez precise ajustar para: faturamentoService.getPagamentos({ status: statusFiltro })
            const response = await faturamentoService.getPagamentos({ status: statusFiltro });
            
            console.log("✅ Dados brutos recebidos do Backend:", response.data);
            
            // Verifica se veio array
            if (Array.isArray(response.data)) {
                setListaPagamentos(response.data);
                console.log(`📊 Total de registros carregados: ${response.data.length}`);
                
                // Debug específico para Avulsos
                const avulsos = response.data.filter(i => !i.agendamento);
                if (avulsos.length > 0) {
                    console.log("💡 Encontrei lançamentos avulsos:", avulsos);
                } else {
                    console.warn("⚠️ Nenhum lançamento avulso encontrado nesta lista.");
                }

            } else {
                // Caso a API retorne paginado (results)
                setListaPagamentos(response.data.results || []);
            }

        } catch (error) {
            console.error("❌ Erro ao buscar pagamentos:", error);
            showSnackbar("Erro ao carregar dados financeiros.", 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showSnackbar, tabValue]); // Recarrega quando muda a aba

    useEffect(() => {
        fetchPagamentos();
    }, [fetchPagamentos]);

    // --- CÁLCULOS ---
    const financialSummary = useMemo(() => {
        return listaPagamentos.reduce((acc, item) => {
            const valor = parseFloat(item.valor) || 0;
            acc.total += valor;
            acc.qtd += 1;
            return acc;
        }, { total: 0, qtd: 0 });
    }, [listaPagamentos]);

    // --- HANDLERS ---
    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const handleOpenPagar = (pagamento) => {
        setSelectedPagamento(pagamento);
        setOpenPagarModal(true);
    };

    const handleSuccessPagamento = () => {
        setOpenPagarModal(false);
        setSelectedPagamento(null);
        fetchPagamentos(); // Recarrega a lista
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
                console.error("Erro delete:", error);
                const msgErro = error.response?.data?.error || 'Erro desconhecido.';
                showSnackbar(`Erro: ${msgErro}`, 'error');
            }
        }
    };

    // --- FORMATADORES ---
    const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    
    const formatDate = (pagamento) => {
        // Lógica inteligente: Se está PAGO, mostra data pagamento. Se não, mostra vencimento.
        const dataRelevante = pagamento.status === 'Pago' 
            ? pagamento.data_pagamento 
            : pagamento.data_vencimento;

        if (!dataRelevante) return 'S/D';
        
        // Converter string ISO para Date
        const dateObj = new Date(dataRelevante);
        return dateObj.toLocaleDateString('pt-BR');
    };

    // --- FILTRAGEM LOCAL (BUSCA) ---
    const filteredList = listaPagamentos.filter(p => {
        const termo = searchTerm.toLowerCase();
        // Usa descricao_visual (backend) ou paciente_nome ou descricao simples
        const nome = p.paciente_nome ? p.paciente_nome.toLowerCase() : '';
        const desc = p.descricao_visual ? p.descricao_visual.toLowerCase() : (p.descricao || '');
        return nome.includes(termo) || desc.includes(termo);
    });

    // NOVO FORMATADOR PARA DUAS DATAS
    const formatDateSimple = (dataStr) => {
        if (!dataStr) return '-';
        return new Date(dataStr).toLocaleDateString('pt-BR');
    };

    return (
        <Box>
            {/* --- 1. CARDS DE KPI (Mudam conforme a aba) --- */}
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

            {/* --- 2. ABAS DE NAVEGAÇÃO --- */}
            <Paper elevation={0} sx={{ mb: 2, borderBottom: '1px solid #e0e0e0' }}>
                <Tabs 
                    value={tabValue} 
                    onChange={handleTabChange} 
                    indicatorColor="primary" 
                    textColor="primary"
                >
                    <Tab label="A Receber (Pendentes)" />
                    <Tab label="Recebidos (Histórico)" />
                    <Tab label="Todos" />
                </Tabs>
            </Paper>

            {/* --- 3. BARRA DE AÇÕES --- */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <TextField 
                    size="small"
                    placeholder="Buscar paciente ou descrição..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
                    }}
                    sx={{ flexGrow: 1, bgcolor: 'white' }}
                />
                
                <Button 
                    variant="contained" 
                    startIcon={<AddCircleOutline />}
                    onClick={() => setOpenNovoLancamentoModal(true)}
                    sx={{ bgcolor: '#1a233b', '&:hover': { bgcolor: '#2c3a5b' }, whiteSpace: 'nowrap' }}
                >
                    Novo Lançamento
                </Button>
            </Box>

            {/* --- 4. TABELA DE DADOS --- */}
            <TableContainer component={Paper} elevation={1}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f9fafb' }}>
                            {/* SEPARAMOS AS COLUNAS */}
                            <TableCell sx={{ fontWeight: 'bold' }}>Vencimento</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Pagamento</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Paciente / Cliente</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Descrição</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Status</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Valor</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Ação</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={6} align="center"><CircularProgress size={24} sx={{ mt: 2 }} /></TableCell></TableRow>
                        ) : filteredList.length > 0 ? (
                            filteredList.map((pag) => (
                                <TableRow key={pag.id} hover>
                                    <TableCell sx={{ fontSize: '0.85rem' }}>
                                        {formatDate(pag)}
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                        {pag.paciente_nome || "Cliente Avulso"}
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                                        {/* AQUI ESTÁ O TRUQUE: Usa o campo calculado do Backend */}
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
                                            {/* Botão RECEBER só aparece se estiver pendente */}
                                            {pag.status === 'Pendente' && (
                                                <Button 
                                                    variant="outlined" 
                                                    size="small"
                                                    color="success"
                                                    onClick={() => handleOpenPagar(pag)}
                                                    sx={{ fontSize: '0.7rem', py: 0.5 }}
                                                >
                                                    Receber
                                                </Button>
                                            )}
                                            
                                            {/* Botão EXCLUIR só aparece se não for agendamento (Avulso) */}
                                            {!pag.agendamento && (
                                                <IconButton 
                                                    onClick={() => handleDelete(pag.id)}
                                                    sx={{ color: '#bdbdbd', '&:hover': { color: '#d32f2f' } }}
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
                                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    Nenhum registro encontrado para este filtro.
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