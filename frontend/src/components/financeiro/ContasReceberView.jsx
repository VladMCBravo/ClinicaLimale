// src/components/financeiro/ContasReceberView.jsx
import React, { useState, useMemo } from 'react';
import {
    TextField, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Typography, Chip, Box, Grid, Card, CardContent, Stack, Menu, MenuItem, ListItemIcon, ListItemText,
    Checkbox, Button
} from '@mui/material';
import { 
    Edit, CheckCircle, Search, Warning, History, Handshake // Handshake icon para renegociação
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

import { useSnackbar } from '../../contexts/SnackbarContext';
import { faturamentoService } from '../../services/faturamentoService';
import { agendamentoService } from '../../services/agendamentoService';
import BaixaUnificadaModal from './BaixaUnificadaModal'; // <--- NOVO MODAL

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// RECEBE dadosIniciais (Lista pronta) e onReload (Função para avisar o pai)
export default function ContasReceberView({ dadosIniciais = [], onReload }) {
    const { showSnackbar } = useSnackbar();
    
    // Filtros Locais
    const [filtroData, setFiltroData] = useState(dayjs());
    const [termoBusca, setTermoBusca] = useState('');

    // Estados de Seleção e Modal (DECLARADOS AQUI PARA EVITAR ERRO 'NOT DEFINED')
    const [selectedIds, setSelectedIds] = useState([]);
    const [modalUnificadoOpen, setModalUnificadoOpen] = useState(false);
    const [itemSelecionado, setItemSelecionado] = useState(null);

    // Menus
    const [anchorEl, setAnchorEl] = useState(null);
    const [statusTarget, setStatusTarget] = useState(null);

    // Filtragem
    const filteredList = useMemo(() => {
        return dadosIniciais.filter(row => {
            const rowDate = dayjs(row.data_vencimento);
            const matchDate = rowDate.month() === filtroData.month() && rowDate.year() === filtroData.year();
            const matchText = (row.paciente_nome || '').toLowerCase().includes(termoBusca.toLowerCase()) ||
                              (row.descricao || '').toLowerCase().includes(termoBusca.toLowerCase());
            return matchDate && matchText;
        });
    }, [dadosIniciais, filtroData, termoBusca]);

    // KPIs
    const kpis = useMemo(() => {
        const totalRecebido = filteredList.filter(l => l.status === 'Pago').reduce((acc, l) => acc + Number(l.valor), 0);
        const totalPendente = filteredList.filter(l => l.status === 'Pendente').reduce((acc, l) => acc + Number(l.valor), 0);
        const atrasados = filteredList.filter(l => l.status === 'Pendente' && dayjs(l.data_vencimento).isBefore(dayjs(), 'day')).length;
        return { totalRecebido, totalPendente, atrasados };
    }, [filteredList]);

    // Lógica de Seleção
    const handleSelectAll = (event) => {
        if (event.target.checked) {
            const newSelecteds = filteredList
                .filter(n => n.status !== 'Pago' && n.status !== 'Cancelado' && n.status !== 'Renegociado')
                .map(n => n.id);
            setSelectedIds(newSelecteds);
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (event, id) => {
        const selectedIndex = selectedIds.indexOf(id);
        let newSelected = [];
        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selectedIds, id);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selectedIds.slice(1));
        } else if (selectedIndex === selectedIds.length - 1) {
            newSelected = newSelected.concat(selectedIds.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(selectedIds.slice(0, selectedIndex), selectedIds.slice(selectedIndex + 1));
        }
        setSelectedIds(newSelected);
    };

    // Ações do Modal Unificado
    const handleConfirmBaixa = async (id, dadosBaixa) => {
        try {
            await faturamentoService.updatePagamento(id, dadosBaixa);
            showSnackbar('Baixa realizada!', 'success');
            if(onReload) onReload();
        } catch(e) {
            showSnackbar('Erro na baixa.', 'error');
        }
    };

    const handleConfirmRenegociacao = async (ids, parcelas, pacienteId) => {
        try {
            await faturamentoService.renegociarDivida({
                ids_originais: ids,
                novas_parcelas: parcelas,
                paciente_id: pacienteId
            });
            showSnackbar('Renegociação realizada!', 'success');
            if(onReload) onReload();
        } catch(e) {
            showSnackbar('Erro na renegociação.', 'error');
        }
    };

    // Ações do Menu (Lápis)
    const handleReverterStatus = async (novoStatus) => {
        if (!statusTarget) return;
        try {
            await faturamentoService.updatePagamento(statusTarget.id, { 
                status: novoStatus, 
                pago: false, 
                data_pagamento: null 
            });
            showSnackbar(`Status alterado para ${novoStatus}.`, 'info');
            setAnchorEl(null);
            if(onReload) onReload();
        } catch (error) {
            showSnackbar('Erro ao alterar status.', 'error');
        }
    };

    const handleUpdateStatusAgenda = async (novoStatus) => {
        if (!statusTarget) return;
        const rawId = statusTarget.agendamento_id || statusTarget.agendamento;
        const agendamentoId = (rawId && typeof rawId === 'object') ? rawId.id : rawId;
        if (!agendamentoId) return;

        try {
            await agendamentoService.updateAgendamento(agendamentoId, { status: novoStatus });
            showSnackbar(`Agenda atualizada para ${novoStatus}`, 'success');
            setAnchorEl(null);
            if(onReload) onReload();
        } catch (error) {
            console.error("Erro update agendamento:", error);
        }
    };

    // Para renegociação em lote
    const handleRenegociarLote = () => {
        // Pega o primeiro item como referência
        const itemReferencia = dadosIniciais.find(i => i.id === selectedIds[0]);
        setItemSelecionado({
            ...itemReferencia,
            // Soma o valor total
            valor: dadosIniciais.filter(i => selectedIds.includes(i.id)).reduce((acc, curr) => acc + Number(curr.valor), 0),
            descricao: `Renegociação de ${selectedIds.length} itens`
        });
        setModalUnificadoOpen(true);
    };

    return (
        <Box sx={{ p: 0.5 }}>
            {/* KPI CARDS */}
            <Grid container spacing={1.5} sx={{ mb: 2 }}>
                <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: '#f0f9f1', borderLeft: '4px solid #2e7d32' }}>
                        <CardContent sx={{ py: 1.2, px: 2, '&:last-child': { pb: 1.2 } }}>
                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}>RECEBIDO (FILTRADO)</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>{formatMoney(kpis.totalRecebido)}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: '#fff9f0', borderLeft: '4px solid #ef6c00' }}>
                        <CardContent sx={{ py: 1.2, px: 2, '&:last-child': { pb: 1.2 } }}>
                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}>PENDENTE (FILTRADO)</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#ef6c00' }}>{formatMoney(kpis.totalPendente)}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: '#fff5f5', borderLeft: '4px solid #c62828' }}>
                        <CardContent sx={{ py: 1.2, px: 2, '&:last-child': { pb: 1.2 } }}>
                            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}>ATRASADOS</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Warning sx={{ color: '#c62828', fontSize: '1rem' }} />
                                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#c62828' }}>{kpis.atrasados}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* FILTROS E BOTÕES */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, gap: 1, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <DatePicker 
                        label="Referência" views={['month', 'year']}
                        value={filtroData} onChange={(newValue) => setFiltroData(newValue)}
                        slotProps={{ textField: { size: 'small', sx: { width: 140 } } }}
                    />
                    <TextField
                        placeholder="Buscar..." size="small"
                        value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)}
                        InputProps={{ startAdornment: <Search sx={{ color: 'action.active', mr: 0.5, fontSize: '1rem' }} /> }}
                        sx={{ width: 250 }}
                    />
                </Box>
                
                {/* BOTÃO DE RENEGOCIAÇÃO (Só aparece se tiver seleção) */}
                {selectedIds.length > 0 && (
                    <Button 
                        variant="contained" 
                        color="secondary" 
                        startIcon={<Handshake />}
                        onClick={() => setOpenRenegociacaoModal(true)}
                        sx={{ fontWeight: 'bold' }}
                    >
                        Renegociar ({selectedIds.length})
                    </Button>
                )}
            </Box>

            {/* TABELA */}
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 600, borderRadius: 2 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    color="primary"
                                    indeterminate={selectedIds.length > 0 && selectedIds.length < filteredList.length}
                                    checked={filteredList.length > 0 && selectedIds.length === filteredList.length}
                                    onChange={handleSelectAll}
                                />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Vencimento</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Paciente / Descrição</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Valor</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredList.length === 0 ? (
                            <TableRow><TableCell colSpan={6} align="center">Nenhum registro encontrado.</TableCell></TableRow>
                        ) : filteredList.map((row) => {
                            const isSelected = selectedIds.indexOf(row.id) !== -1;
                            const isAtrasado = row.status === 'Pendente' && dayjs(row.data_vencimento).isBefore(dayjs(), 'day');
                            const isPago = row.status === 'Pago';
                            
                            return (
                                <TableRow 
                                    key={row.id} hover 
                                    sx={{ bgcolor: isAtrasado ? '#fffafa' : 'inherit' }}
                                    selected={isSelected}
                                >
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            color="primary"
                                            checked={isSelected}
                                            onChange={(event) => handleSelectOne(event, row.id)}
                                            disabled={isPago} // Não seleciona se já pagou
                                        />
                                    </TableCell>
                                    <TableCell>{dayjs(row.data_vencimento).format('DD/MM/YY')}</TableCell>
                                    <TableCell>
                                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>{row.paciente_nome || 'Avulso'}</Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {row.descricao || row.descricao_visual} 
                                            {/* Badge de Renegociado */}
                                            {row.status === 'Renegociado' && <Chip label="Renegociado" size="small" sx={{ml:1, height:16, fontSize:'0.6rem'}} />}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ color: isAtrasado ? 'error.main' : 'inherit', fontWeight: isAtrasado ? 'bold' : 'normal' }}>
                                        {formatMoney(row.valor)}
                                    </TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={row.status} size="small" 
                                            color={row.status === 'Pago' ? 'success' : row.status === 'Pendente' ? 'warning' : 'default'} 
                                            sx={{ height: 20, fontWeight: 'bold' }}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                            {/* Botão Baixar (Check) */}
                                            <IconButton size="small" title="Baixar" disabled={isPago} onClick={() => { setSelectedPagamento(row); setOpenCaixaModal(true); }}>
                                                <CheckCircle fontSize="small" color={isPago ? "disabled" : "success"} />
                                            </IconButton>
                                            {/* Botão Opções (Lápis) */}
                                            <IconButton size="small" title="Opções" onClick={(e) => { setAnchorEl(e.currentTarget); setStatusTarget(row); }}>
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

            {/* MENUS */}
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                <MenuItem onClick={() => handleReverterStatus('Pendente')}>
                    <ListItemIcon><History fontSize="small" /></ListItemIcon>
                    <ListItemText>Reverter para Pendente</ListItemText>
                </MenuItem>
                {/* Opção extra para corrigir erros de renegociação */}
                {statusTarget?.status === 'Renegociado' && (
                    <MenuItem onClick={() => handleReverterStatus('Pendente')} sx={{ color: 'warning.main' }}>
                        <ListItemIcon><Warning fontSize="small" color="warning" /></ListItemIcon>
                        <ListItemText>Desfazer Renegociação (Reativar)</ListItemText>
                    </MenuItem>
                )}
            </Menu>

            {/* SUPER MODAL (UNIFICADO) */}
            <BaixaUnificadaModal 
                open={modalUnificadoOpen}
                onClose={() => setModalUnificadoOpen(false)}
                item={itemSelecionado}
                onConfirmBaixa={handleConfirmBaixa}
                onConfirmRenegociacao={handleConfirmRenegociacao}
            />
        </Box>
    );
}