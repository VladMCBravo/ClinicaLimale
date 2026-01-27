// src/components/financeiro/ContasReceberView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    Button, CircularProgress, TextField, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Typography, Chip, Box, Grid, Card, CardContent
} from '@mui/material';
import { 
    Edit, AddCircleOutline, Search, Warning 
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
    
    // Estados do Modal
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
            {/* 1. KPI CARDS */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: '#e8f5e9', borderLeft: '5px solid #2e7d32' }}>
                        <CardContent sx={{ py: 2 }}>
                            <Typography variant="subtitle2" color="textSecondary">Recebido no Mês</Typography>
                            <Typography variant="h5" fontWeight="bold" color="#2e7d32">{formatMoney(kpis.totalRecebido)}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: '#fff3e0', borderLeft: '5px solid #ef6c00' }}>
                        <CardContent sx={{ py: 2 }}>
                            <Typography variant="subtitle2" color="textSecondary">A Receber (Pendente)</Typography>
                            <Typography variant="h5" fontWeight="bold" color="#ef6c00">{formatMoney(kpis.totalPendente)}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: '#ffebee', borderLeft: '5px solid #c62828' }}>
                        <CardContent sx={{ py: 2 }}>
                            <Typography variant="subtitle2" color="textSecondary">Pagamentos Atrasados</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Warning sx={{ color: '#c62828', mr: 1 }} />
                                <Typography variant="h5" fontWeight="bold" color="#c62828">{kpis.atrasados}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* 2. FILTROS E AÇÃO PRINCIPAL */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <DatePicker 
                        label="Mês de Referência"
                        views={['month', 'year']}
                        value={filtroData}
                        onChange={(newValue) => setFiltroData(newValue)}
                        slotProps={{ textField: { size: 'small', sx: { width: 180 } } }}
                    />
                    <TextField
                        placeholder="Buscar paciente ou descrição..."
                        size="small"
                        value={termoBusca}
                        onChange={(e) => setTermoBusca(e.target.value)}
                        InputProps={{ startAdornment: <Search sx={{ color: 'action.active', mr: 1 }} /> }}
                    />
                </Box>
                {/* O Botão agora chama o fluxo de Recebimento de Paciente por padrão */}
                <Button 
                    variant="contained" 
                    startIcon={<AddCircleOutline />} 
                    onClick={() => setOpenNovoLancamentoModal(true)}
                    sx={{ bgcolor: '#1a233b', '&:hover': { bgcolor: '#2c3a5b' } }}
                >
                    Receber de Paciente
                </Button>
            </Box>

            {/* 3. TABELA DE LANÇAMENTOS */}
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 600 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Vencimento</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Paciente / Descrição</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Origem</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Valor</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3 }}><CircularProgress size={24} /></TableCell></TableRow>
                        ) : filteredList.map((row) => (
                            <TableRow key={row.id} hover>
                                <TableCell sx={{ fontSize: '0.85rem' }}>{dayjs(row.data_vencimento).format('DD/MM/YYYY')}</TableCell>
                                <TableCell>
                                    <Typography variant="body2" fontWeight="bold">{row.paciente_nome || 'Lançamento Avulso'}</Typography>
                                    <Typography variant="caption" color="textSecondary">{row.descricao_visual || row.descricao}</Typography>
                                </TableCell>
                                <TableCell>
                                    {row.paciente_nome ? (
                                        <Chip label="Clínico" size="small" color="primary" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                                    ) : (
                                        <Chip label="Administrativo" size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                                    )}
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>{formatMoney(row.valor)}</TableCell>
                                <TableCell>
                                    <Chip 
                                        label={row.status} 
                                        size="small" 
                                        color={row.status === 'Pago' ? 'success' : row.status === 'Pendente' ? 'warning' : 'error'} 
                                        sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}
                                    />
                                </TableCell>
                                <TableCell align="right">
                                    <IconButton size="small" onClick={() => { setSelectedPagamento(row); setOpenPagarModal(true); }}>
                                        <Edit fontSize="small" color="action" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
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
            
            {/* Modal de Lançamento centralizado: Abre na aba 0 (Pacientes) */}
            <LancamentoCaixaModal 
                open={openNovoLancamentoModal} 
                initialTab={0}
                onClose={() => { setOpenNovoLancamentoModal(false); fetchData(); }} 
            />
        </div>
    );
}