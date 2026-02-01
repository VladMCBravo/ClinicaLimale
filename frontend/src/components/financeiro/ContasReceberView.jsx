// src/components/financeiro/ContasReceberView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    Button, CircularProgress, TextField, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Typography, Chip, Box, Grid, Card, CardContent, Stack
} from '@mui/material';
import { 
    Edit, CheckCircle, Search, Warning, AddCircleOutline 
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

import { faturamentoService } from '../../services/faturamentoService';
import PagamentoModal from './PagamentoModal';
import LancamentoCaixaModal from './LancamentoCaixaModal';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function ContasReceberView() {
    const [lancamentos, setLancamentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroData, setFiltroData] = useState(dayjs());
    const [termoBusca, setTermoBusca] = useState('');
    
    const [openPagarModal, setOpenPagarModal] = useState(false);
    const [openNovoLancamentoModal, setOpenNovoLancamentoModal] = useState(false);
    const [selectedPagamento, setSelectedPagamento] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await faturamentoService.getPagamentos({
                data_inicio: filtroData.startOf('month').format('YYYY-MM-DD'),
                data_fim: filtroData.endOf('month').format('YYYY-MM-DD')
            });
            setLancamentos(response.data || []);
        } catch (error) {
            console.error("Erro ao buscar financeiro", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filtroData]);

    const kpis = useMemo(() => {
        const totalRecebido = lancamentos.filter(l => l.status === 'Pago').reduce((acc, l) => acc + Number(l.valor), 0);
        const totalPendente = lancamentos.filter(l => l.status === 'Pendente').reduce((acc, l) => acc + Number(l.valor), 0);
        const atrasados = lancamentos.filter(l => l.status === 'Pendente' && dayjs(l.data_vencimento).isBefore(dayjs(), 'day')).length;
        return { totalRecebido, totalPendente, atrasados };
    }, [lancamentos]);

    const filteredList = lancamentos.filter(l => 
        l.paciente_nome?.toLowerCase().includes(termoBusca.toLowerCase()) ||
        l.descricao?.toLowerCase().includes(termoBusca.toLowerCase())
    );

    return (
        <div>
            {/* 1. KPI CARDS COMPACTOS */}
            <Grid container spacing={1} sx={{ mb: 2 }}>
                <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: '#e8f5e9', borderLeft: '4px solid #2e7d32' }}>
                        <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}>RECEBIDO NO MÊS</Typography>
                            <Typography variant="h6" fontWeight="bold" color="#2e7d32">{formatMoney(kpis.totalRecebido)}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: '#fff3e0', borderLeft: '4px solid #ef6c00' }}>
                        <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}>A RECEBER (PENDENTE)</Typography>
                            <Typography variant="h6" fontWeight="bold" color="#ef6c00">{formatMoney(kpis.totalPendente)}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: '#ffebee', borderLeft: '4px solid #c62828' }}>
                        <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}>ATRASADOS</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Warning sx={{ color: '#c62828', fontSize: '1.2rem' }} />
                                <Typography variant="h6" fontWeight="bold" color="#c62828">{kpis.atrasados}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* 2. FILTROS E AÇÃO ÚNICA */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <DatePicker 
                        label="Referência"
                        views={['month', 'year']}
                        value={filtroData}
                        onChange={(newValue) => setFiltroData(newValue)}
                        slotProps={{ textField: { size: 'small', sx: { width: 150 } } }}
                    />
                    <TextField
                        placeholder="Buscar..."
                        size="small"
                        value={termoBusca}
                        onChange={(e) => setTermoBusca(e.target.value)}
                        InputProps={{ startAdornment: <Search sx={{ color: 'action.active', mr: 0.5, fontSize: '1.1rem' }} /> }}
                        sx={{ width: 220 }}
                    />
                </Box>
                <Button 
                    variant="contained" 
                    size="small"
                    startIcon={<AddCircleOutline />} 
                    onClick={() => setOpenNovoLancamentoModal(true)}
                    sx={{ bgcolor: '#1a233b', px: 3, fontSize: '0.75rem' }}
                >
                    Receber
                </Button>
            </Box>

            {/* 3. TABELA COM DESTAQUE DE ATRASADOS */}
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 550 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Vencimento</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Paciente / Descrição</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Valor</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Status</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}><CircularProgress size={20} /></TableCell></TableRow>
                        ) : filteredList.map((row) => {
                            const isAtrasado = row.status === 'Pendente' && dayjs(row.data_vencimento).isBefore(dayjs(), 'day');
                            return (
                                <TableRow 
                                    key={row.id} 
                                    hover 
                                    sx={{ 
                                        bgcolor: isAtrasado ? '#fff5f5' : 'inherit',
                                        '& .MuiTableCell-root': { py: 0.8, fontSize: '0.8rem' } 
                                    }}
                                >
                                    <TableCell>{dayjs(row.data_vencimento).format('DD/MM/YY')}</TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{row.paciente_nome || 'Avulso'}</Typography>
                                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>{row.descricao_visual || row.descricao}</Typography>
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>{formatMoney(row.valor)}</TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={row.status} 
                                            size="small" 
                                            color={row.status === 'Pago' ? 'success' : row.status === 'Pendente' ? 'warning' : 'error'} 
                                            sx={{ fontSize: '0.65rem', height: 18, fontWeight: 'bold' }}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                            <IconButton size="small" title="Baixar Pagamento" onClick={() => { setSelectedPagamento(row); setOpenPagarModal(true); }}>
                                                <CheckCircle fontSize="small" color="success" />
                                            </IconButton>
                                            <IconButton size="small" title="Editar / Cancelar" onClick={() => { setSelectedPagamento(row); setOpenPagarModal(true); }}>
                                                <Edit fontSize="small" color="action" />
                                            </IconButton>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            {selectedPagamento && (
                <PagamentoModal 
                    open={openPagarModal} 
                    onClose={() => setOpenPagarModal(false)} 
                    onSave={() => { setOpenPagarModal(false); fetchData(); }} 
                    pagamento={selectedPagamento} 
                />
            )}
            
            <LancamentoCaixaModal 
                open={openNovoLancamentoModal} 
                onClose={() => { setOpenNovoLancamentoModal(false); fetchData(); }} 
            />
        </div>
    );
}