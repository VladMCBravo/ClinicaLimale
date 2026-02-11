// src/components/financeiro/ContasReceberView.jsx
import React, { useState, useCallback, useEffect } from 'react';
import {
    TextField, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Typography, Box, LinearProgress, Button, InputAdornment, Chip, IconButton, Tooltip,
    Menu, MenuItem, ListItemIcon, ListItemText
} from '@mui/material';
import { Search, Add, CheckCircle, Edit, Block, Undo, MonetizationOn } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

import { faturamentoService } from '../../services/faturamentoService';
import LancamentoCaixaModal from './LancamentoCaixaModal';
import TransactionDrawer from './TransactionDrawer';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function ContasReceberView() {
    // ESTADOS
    const [lista, setLista] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filtros
    const [filtroData, setFiltroData] = useState(dayjs());
    const [busca, setBusca] = useState('');
    
    // Modais e Drawers
    const [modalOpen, setModalOpen] = useState(false);
    const [itemParaEdicao, setItemParaEdicao] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

    // Menu do Lápis
    const [anchorEl, setAnchorEl] = useState(null);
    const [menuRow, setMenuRow] = useState(null);

    // BUSCA DE DADOS
    const carregarDados = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (busca.length > 2) {
                params.search = busca;
            } else {
                params.mes = filtroData.month() + 1;
                params.ano = filtroData.year();
            }

            const res = await faturamentoService.getPagamentos(params);
            const dados = res.data || [];

            // ORDENAÇÃO DECRESCENTE (Data mais futura no topo -> Data mais antiga embaixo)
            // Ex: 2026-03-01 vem antes de 2026-02-01
            dados.sort((a, b) => {
                const dataA = a.data_vencimento ? dayjs(a.data_vencimento) : dayjs(0);
                const dataB = b.data_vencimento ? dayjs(b.data_vencimento) : dayjs(0);
                return dataB.diff(dataA); 
            });

            setLista(dados);
            
        } catch (error) {
            console.error("Erro ao buscar contas a receber", error);
        } finally {
            setLoading(false);
        }
    }, [filtroData, busca]);

    useEffect(() => {
        const timeoutId = setTimeout(() => { carregarDados(); }, 500);
        return () => clearTimeout(timeoutId);
    }, [carregarDados]);

    // --- HANDLERS ---

    const handleRowClick = (item) => {
        setSelectedId(item.id);
        setDrawerOpen(true);
    };

    // BOTÃO CHECK: Abre o modal de edição (LancamentoAvulsoTab)
    // mas já seta o status como PAGO visualmente para o usuário apenas confirmar
    const handleAbrirBaixa = (e, item) => {
        e.stopPropagation();
        setItemParaEdicao({
            ...item,
            pago: true, // Força flag de pago ao abrir
            data_pagamento: dayjs().format('YYYY-MM-DD') // Sugere hoje
        });
        setModalOpen(true);
    };

    // MENU DO LÁPIS
    const handleOpenMenu = (event, row) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
        setMenuRow(row);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setMenuRow(null);
    };

    const handleMenuAction = async (action) => {
        if (!menuRow) return;
        const row = menuRow;
        handleCloseMenu();

        try {
            if (action === 'editar') {
                // Abre o modal de edição normal (mantém status original)
                setItemParaEdicao({ ...row, pago: row.status === 'Pago' });
                setModalOpen(true);
            } 
            else if (action === 'pago') {
                // Atalho rápido (sem modal)
                if(!window.confirm("Marcar como PAGO agora?")) return;
                await faturamentoService.updatePagamento(row.id, { status: 'Pago', data_pagamento: dayjs().format('YYYY-MM-DD') });
                carregarDados();
            } 
            else if (action === 'pendente') {
                if(!window.confirm("Reverter para PENDENTE?")) return;
                await faturamentoService.updatePagamento(row.id, { status: 'Pendente', data_pagamento: null });
                carregarDados();
            } 
            else if (action === 'cancelar') {
                if(!window.confirm("CANCELAR este recebimento?")) return;
                await faturamentoService.updatePagamento(row.id, { status: 'Cancelado' });
                carregarDados();
            }
        } catch (error) {
            alert("Erro ao atualizar status");
        }
    };

    const getStatusColor = (status, vencimento) => {
        if (status === 'Pago') return 'success';
        if (status === 'Cancelado') return 'default';
        if (status === 'Pendente' && dayjs(vencimento).isBefore(dayjs(), 'day')) return 'error';
        return 'warning';
    };

    return (
        <Box sx={{ height: 'calc(100vh - 155px)', display: 'flex', flexDirection: 'column' }}>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <DatePicker 
                        views={['month', 'year']}
                        value={filtroData}
                        onChange={(v) => { setFiltroData(v); setBusca(''); }}
                        slotProps={{ textField: { size: 'small', sx: { width: 140, bgcolor: 'white' } } }}
                        disabled={busca.length > 0}
                    />
                    <TextField
                        size="small"
                        placeholder="Buscar Paciente/Valor..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
                        sx={{ width: 300, bgcolor: 'white' }}
                    />
                </Box>

                <Button 
                    variant="contained" color="success" startIcon={<Add />}
                    onClick={() => { setItemParaEdicao(null); setModalOpen(true); }}
                    sx={{ fontWeight: 'bold' }}
                >
                    NOVA RECEITA
                </Button>
            </Box>

            <Paper variant="outlined" sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {loading && <LinearProgress />}
                
                <TableContainer sx={{ flexGrow: 1 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Vencimento</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Paciente / Descrição</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Valor</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {lista.map(row => {
                                const isAtrasado = row.status === 'Pendente' && dayjs(row.data_vencimento).isBefore(dayjs(), 'day');
                                const labelStatus = isAtrasado ? 'Atrasado' : row.status;
                                const colorStatus = getStatusColor(row.status, row.data_vencimento);

                                return (
                                    <TableRow 
                                        key={row.id} 
                                        hover 
                                        onClick={() => handleRowClick(row)}
                                        sx={{ cursor: 'pointer' }}
                                    >
                                        <TableCell>{dayjs(row.data_vencimento).format('DD/MM/YY')}</TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="bold">
                                                {row.paciente_nome || row.descricao}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                {row.descricao_visual || row.categoria_nome}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                                            {formatMoney(row.valor)}
                                        </TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={labelStatus} size="small" color={colorStatus}
                                                variant={row.status === 'Pago' ? 'filled' : 'outlined'}
                                                sx={{ fontWeight: 'bold', height: 24, fontSize: '0.75rem' }}
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            {/* CHECK: Abre Modal de Edição (LancamentoAvulsoTab) */}
                                            {row.status !== 'Pago' && (
                                                <Tooltip title="Realizar Recebimento">
                                                    <IconButton 
                                                        size="small" color="success" 
                                                        onClick={(e) => handleAbrirBaixa(e, row)}
                                                        sx={{ mr: 1 }}
                                                    >
                                                        <CheckCircle fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            {/* LÁPIS: Abre Menu */}
                                            <Tooltip title="Opções">
                                                <IconButton size="small" onClick={(e) => handleOpenMenu(e, row)}>
                                                    <Edit fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {!loading && lista.length === 0 && (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: '#999' }}>Nenhum registro encontrado.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* MENU DO LÁPIS */}
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu}>
                <MenuItem onClick={() => handleMenuAction('editar')}>
                    <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
                    <ListItemText>Editar Detalhes</ListItemText>
                </MenuItem>
                
                {menuRow?.status !== 'Pago' && (
                    <MenuItem onClick={() => handleMenuAction('pago')}>
                        <ListItemIcon><MonetizationOn fontSize="small" color="success" /></ListItemIcon>
                        <ListItemText>Marcar como Pago</ListItemText>
                    </MenuItem>
                )}

                {menuRow?.status === 'Pago' && (
                    <MenuItem onClick={() => handleMenuAction('pendente')}>
                        <ListItemIcon><Undo fontSize="small" color="warning" /></ListItemIcon>
                        <ListItemText>Reverter para Pendente</ListItemText>
                    </MenuItem>
                )}

                {menuRow?.status !== 'Cancelado' && (
                    <MenuItem onClick={() => handleMenuAction('cancelar')}>
                        <ListItemIcon><Block fontSize="small" color="error" /></ListItemIcon>
                        <ListItemText>Cancelar Cobrança</ListItemText>
                    </MenuItem>
                )}
            </Menu>

            <LancamentoCaixaModal 
                open={modalOpen} 
                onClose={() => { setModalOpen(false); carregarDados(); }}
                initialType="receita" 
                initialTab={0}
                existingData={itemParaEdicao} 
            />

            <TransactionDrawer 
                open={drawerOpen} 
                onClose={() => setDrawerOpen(false)} 
                transactionId={selectedId} 
                onUpdate={carregarDados} 
            />
        </Box>
    );
}