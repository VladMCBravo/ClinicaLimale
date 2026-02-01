// src/components/financeiro/ContasReceberView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    Button, CircularProgress, TextField, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Typography, Chip, Box, Grid, Card, CardContent, Stack, Menu, MenuItem, ListItemIcon, ListItemText
} from '@mui/material';
import { 
    Edit, CheckCircle, Search, Warning, AddCircleOutline, Block, EventAvailable 
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

import { faturamentoService } from '../../services/faturamentoService';
import { agendamentoService } from '../../services/agendamentoService';
import LancamentoCaixaModal from './LancamentoCaixaModal';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function ContasReceberView() {
    const [lancamentos, setLancamentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroData, setFiltroData] = useState(dayjs());
    const [termoBusca, setTermoBusca] = useState('');
    
    // Modais
    const [openCaixaModal, setOpenCaixaModal] = useState(false);
    const [selectedPagamento, setSelectedPagamento] = useState(null);

    // Menu de Status (Lápis)
    const [anchorEl, setAnchorEl] = useState(null);
    const [statusTarget, setStatusTarget] = useState(null);

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

    useEffect(() => { fetchData(); }, [filtroData]);

    const handleUpdateStatus = async (novoStatus) => {
    if (!statusTarget) return;

    // Esta lógica limpa o ID: se for objeto, pega o .id, se for número, usa o número.
    const rawId = statusTarget.agendamento;
    const agendamentoId = (rawId && typeof rawId === 'object') ? rawId.id : rawId;

    if (!agendamentoId) {
        console.error("ERRO: O agendamentoId é inválido:", rawId);
        alert("Não foi possível localizar o ID do agendamento.");
        return;
    }

    try {
        // Agora a URL será montada corretamente com o número
        await agendamentoService.updateAgendamento(agendamentoId, { status: novoStatus });
        fetchData();
    } catch (error) {
        console.error("Erro na atualização:", error);
    }
    setAnchorEl(null);
};

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
        <Box sx={{ p: 0.5 }}>
            {/* 1. KPI CARDS COMPACTOS */}
            <Grid container spacing={1.5} sx={{ mb: 2 }}>
                <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: '#f0f9f1', borderLeft: '4px solid #2e7d32' }}>
                        <CardContent sx={{ py: 1.2, px: 2, '&:last-child': { pb: 1.2 } }}>
                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}>RECEBIDO NO MÊS</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2e7d32', lineHeight: 1.2 }}>{formatMoney(kpis.totalRecebido)}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: '#fff9f0', borderLeft: '4px solid #ef6c00' }}>
                        <CardContent sx={{ py: 1.2, px: 2, '&:last-child': { pb: 1.2 } }}>
                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}>A RECEBER (PENDENTE)</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#ef6c00', lineHeight: 1.2 }}>{formatMoney(kpis.totalPendente)}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: '#fff5f5', borderLeft: '4px solid #c62828' }}>
                        <CardContent sx={{ py: 1.2, px: 2, '&:last-child': { pb: 1.2 } }}>
                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}>ATRASADOS</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Warning sx={{ color: '#c62828', fontSize: '1rem' }} />
                                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#c62828', lineHeight: 1.2 }}>{kpis.atrasados}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* 2. FILTROS E AÇÃO ÚNICA */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <DatePicker 
                        label="Referência"
                        views={['month', 'year']}
                        value={filtroData}
                        onChange={(newValue) => setFiltroData(newValue)}
                        slotProps={{ textField: { size: 'small', sx: { width: 140 } } }}
                    />
                    <TextField
                        placeholder="Buscar..."
                        size="small"
                        value={termoBusca}
                        onChange={(e) => setTermoBusca(e.target.value)}
                        InputProps={{ startAdornment: <Search sx={{ color: 'action.active', mr: 0.5, fontSize: '1rem' }} /> }}
                        sx={{ width: 200, '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
                    />
                </Box>
                <Button 
                    variant="contained" 
                    size="small"
                    startIcon={<AddCircleOutline />} 
                    onClick={() => { setSelectedPagamento(null); setOpenCaixaModal(true); }}
                    sx={{ bgcolor: '#1a233b', px: 3, fontSize: '0.75rem', fontWeight: 'bold' }}
                >
                    Receber
                </Button>
            </Box>

            {/* 3. TABELA COM FONTES REDUZIDAS E DESTAQUE */}
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500, borderRadius: 2 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', py: 1.5 }}>Vencimento</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', py: 1.5 }}>Paciente / Descrição</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', py: 1.5 }}>Valor</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', py: 1.5 }}>Status</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.75rem', py: 1.5 }}>Ações</TableCell>
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
                                    sx={{ bgcolor: isAtrasado ? '#fffafa' : 'inherit' }}
                                >
                                    <TableCell sx={{ fontSize: '0.8rem' }}>{dayjs(row.data_vencimento).format('DD/MM/YY')}</TableCell>
                                    <TableCell sx={{ py: 1 }}>
                                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>{row.paciente_nome || 'Lançamento Avulso'}</Typography>
                                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem', display: 'block' }}>{row.descricao}</Typography>
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{formatMoney(row.valor)}</TableCell>
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
                                            {/* CHECK E LÁPIS ABREM O MESMO MODAL DE CAIXA */}
                                            <IconButton size="small" title="Baixar/Detalhar" onClick={() => { setSelectedPagamento(row); setOpenCaixaModal(true); }}>
                                                <CheckCircle fontSize="small" color="success" />
                                            </IconButton>
                                            <IconButton 
                                                size="small" 
                                                title="Alterar Status na Agenda" 
                                                onClick={(e) => { setAnchorEl(e.currentTarget); setStatusTarget(row); }}
                                                disabled={!row.agendamento}
                                            >
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

            {/* MENU DE STATUS (REFLETE NA AGENDA) */}
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                <MenuItem onClick={() => handleUpdateStatus('Não Compareceu')}>
                    <ListItemIcon><Block fontSize="small" color="error"/></ListItemIcon>
                    <ListItemText primaryTypographyProps={{fontSize: '0.85rem'}}>Não Compareceu (Anula Financeiro)</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleUpdateStatus('Agendado')}>
                    <ListItemIcon><EventAvailable fontSize="small" color="primary"/></ListItemIcon>
                    <ListItemText primaryTypographyProps={{fontSize: '0.85rem'}}>Reverter para Agendado</ListItemText>
                </MenuItem>
            </Menu>

            <LancamentoCaixaModal 
                open={openCaixaModal} 
                initialData={selectedPagamento} 
                onClose={() => { setOpenCaixaModal(false); fetchData(); }} 
            />
        </Box>
    );
}