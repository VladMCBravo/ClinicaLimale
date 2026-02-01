// src/components/financeiro/ContasReceberView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    CircularProgress, TextField, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Typography, Chip, Box, Grid, Card, CardContent, Stack, Menu, MenuItem, ListItemIcon, ListItemText
} from '@mui/material';
import { 
    Edit, CheckCircle, Search, Warning, Block, EventAvailable 
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

        const rawId = statusTarget.agendamento;
        const agendamentoId = (rawId && typeof rawId === 'object') ? rawId.id : rawId;

        if (!agendamentoId) return;

        try {
            await agendamentoService.updateAgendamento(agendamentoId, { status: novoStatus });
            
            // Delay de segurança para sincronização do banco de dados
            setTimeout(async () => {
                await fetchData();
                console.log("[LOG-UI] Lista financeira recarregada após sincronia.");
            }, 1200);

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

            {/* 2. FILTROS (BOTÃO RECEBER REMOVIDO DAQUI) */}
            <Box sx={{ display: 'flex', mb: 2, gap: 1 }}>
                <DatePicker 
                    label="Referência"
                    views={['month', 'year']}
                    value={filtroData}
                    onChange={(newValue) => setFiltroData(newValue)}
                    slotProps={{ textField: { size: 'small', sx: { width: 140 } } }}
                />
                <TextField
                    placeholder="Buscar paciente ou descrição..."
                    size="small"
                    value={termoBusca}
                    onChange={(e) => setTermoBusca(e.target.value)}
                    InputProps={{ startAdornment: <Search sx={{ color: 'action.active', mr: 0.5, fontSize: '1rem' }} /> }}
                    sx={{ width: 280, '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
                />
            </Box>

            {/* 3. TABELA COM DESTAQUE PARA ATRASADOS */}
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 600, borderRadius: 2 }}>
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
                                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem', display: 'block' }}>{row.descricao_visual}</Typography>
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
        {/* CHECK: Recebimento Inteligente */}
        <IconButton 
            size="small" 
            title="Baixar Pagamento" 
            onClick={() => { 
                setSelectedPagamento(row); 
                setOpenCaixaModal(true); 
            }}
        >
            <CheckCircle fontSize="small" color="success" />
        </IconButton>

        {/* LÁPIS: Gestão de Status da Agenda */}
        <IconButton 
            size="small" 
            title="Status da Agenda" 
            onClick={(e) => { 
                setAnchorEl(e.currentTarget); 
                setStatusTarget(row); 
            }}
            disabled={!row.agendamento_id} // Só habilita se houver agendamento
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