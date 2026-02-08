// src/components/financeiro/ContasReceberView.jsx
import React, { useState, useMemo } from 'react';
import {
    TextField, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Typography, Chip, Box, Grid, Card, CardContent, Stack, Menu, MenuItem, ListItemIcon, ListItemText,
    Checkbox, Button, Tooltip
} from '@mui/material';
import { 
    Edit, CheckCircle, Search, Warning, Block, EventAvailable, History, Handshake // Handshake icon para renegociação
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

import { useSnackbar } from '../../contexts/SnackbarContext';
import { faturamentoService } from '../../services/faturamentoService';
import { agendamentoService } from '../../services/agendamentoService';
import LancamentoCaixaModal from './LancamentoCaixaModal';
import RenegociacaoModal from './RenegociacaoModal'; // <--- IMPORT NOVO

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// RECEBE dadosIniciais (Lista pronta) e onReload (Função para avisar o pai)
export default function ContasReceberView({ dadosIniciais = [], onReload }) {
    const { showSnackbar } = useSnackbar();
    
    // Filtros Locais
    const [filtroData, setFiltroData] = useState(dayjs());
    const [termoBusca, setTermoBusca] = useState('');

    // Seleção Múltipla
    const [selectedIds, setSelectedIds] = useState([]);

    // Modais e Menus
    const [openCaixaModal, setOpenCaixaModal] = useState(false);
    const [openRenegociacaoModal, setOpenRenegociacaoModal] = useState(false);
    const [selectedPagamento, setSelectedPagamento] = useState(null);
    const [anchorEl, setAnchorEl] = useState(null);
    const [statusTarget, setStatusTarget] = useState(null);

    // 1. LÓGICA DE FILTRAGEM (Rodada em memória, instantânea)
    const filteredList = useMemo(() => {
        return dadosIniciais.filter(row => {
            // Filtro de Data (Mês/Ano)
            const rowDate = dayjs(row.data_vencimento);
            const matchDate = rowDate.month() === filtroData.month() && rowDate.year() === filtroData.year();
            
            // Filtro de Texto
            const matchText = (row.paciente_nome || '').toLowerCase().includes(termoBusca.toLowerCase()) ||
                              (row.descricao || '').toLowerCase().includes(termoBusca.toLowerCase());

            return matchDate && matchText;
        });
    }, [dadosIniciais, filtroData, termoBusca]);

    // 2. CÁLCULO DE KPIS (Baseado na lista filtrada ou geral, conforme preferência)
    const kpis = useMemo(() => {
        // Calculamos com base no mês selecionado (filteredList)
        const totalRecebido = filteredList.filter(l => l.status === 'Pago').reduce((acc, l) => acc + Number(l.valor), 0);
        const totalPendente = filteredList.filter(l => l.status === 'Pendente').reduce((acc, l) => acc + Number(l.valor), 0);
        const atrasados = filteredList.filter(l => l.status === 'Pendente' && dayjs(l.data_vencimento).isBefore(dayjs(), 'day')).length;
        return { totalRecebido, totalPendente, atrasados };
    }, [filteredList]);


    // 3. LÓGICA DE SELEÇÃO
    const handleSelectAll = (event) => {
        if (event.target.checked) {
            // Seleciona apenas os pendentes/atrasados visíveis
            const newSelecteds = filteredList
                .filter(n => n.status !== 'Pago' && n.status !== 'Cancelado')
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
            newSelected = newSelected.concat(
                selectedIds.slice(0, selectedIndex),
                selectedIds.slice(selectedIndex + 1),
            );
        }
        setSelectedIds(newSelected);
    };

    // AÇÕES
    const handleConfirmarRenegociacao = async (novasParcelas, totalNovo) => {
        try {
            // Pega o ID do paciente do primeiro item selecionado (assumindo que renegociação é por paciente)
            const itemReferencia = dadosIniciais.find(i => i.id === selectedIds[0]);
            
            await faturamentoService.renegociarDivida({
                ids_originais: selectedIds,
                novas_parcelas: novasParcelas,
                paciente_id: itemReferencia?.paciente // ID do paciente
            });

            showSnackbar('Renegociação realizada com sucesso!', 'success');
            setOpenRenegociacaoModal(false);
            setSelectedIds([]); // Limpa seleção
            onReload(); // Atualiza tabela
        } catch (error) {
            console.error(error);
            showSnackbar('Erro ao processar renegociação.', 'error');
        }
    };

    const handleReverterPagamento = async () => {
        if (!statusTarget) return;
        try {
            await faturamentoService.updatePagamento(statusTarget.id, { 
                status: 'Pendente', pago: false, data_pagamento: null 
            });
            showSnackbar('Pagamento revertido.', 'info');
            setAnchorEl(null);
            onReload(); // <--- AVISA O PAI PARA RECARREGAR
        } catch (error) {
            console.error("Erro reverter:", error);
            showSnackbar('Erro ao reverter.', 'error');
        }
    };

    const handleUpdateStatus = async (novoStatus) => {
        if (!statusTarget) return;
        const rawId = statusTarget.agendamento_id || statusTarget.agendamento;
        const agendamentoId = (rawId && typeof rawId === 'object') ? rawId.id : rawId;

        if (!agendamentoId) return;

        try {
            await agendamentoService.updateAgendamento(agendamentoId, { status: novoStatus });
            setAnchorEl(null);
            onReload(); // <--- AVISA O PAI PARA RECARREGAR
        } catch (error) {
            console.error("Erro update agendamento:", error);
        }
    };

    // Prepara dados para o modal de renegociação
    const itensParaRenegociar = dadosIniciais.filter(i => selectedIds.includes(i.id));

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

            {/* MENUS E MODAIS */}
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                <MenuItem onClick={() => handleUpdateStatus('Não Compareceu')}>
                    <ListItemIcon><Block fontSize="small" color="error"/></ListItemIcon>
                    <ListItemText>Não Compareceu</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleUpdateStatus('Agendado')}>
                    <ListItemIcon><EventAvailable fontSize="small" color="primary"/></ListItemIcon>
                    <ListItemText>Reverter para Agendado</ListItemText>
                </MenuItem>
                {statusTarget?.status === 'Pago' && (
                    <MenuItem onClick={handleReverterPagamento}>
                        <ListItemIcon><History fontSize="small" color="warning"/></ListItemIcon>
                        <ListItemText sx={{ color: '#ed6c02' }}>Reverter Pagamento</ListItemText>
                    </MenuItem>
                )}
            </Menu>

            {/* MODAL DE BAIXA SIMPLES */}
            <LancamentoCaixaModal 
                open={openCaixaModal} 
                initialData={selectedPagamento} 
                onClose={() => { setOpenCaixaModal(false); onReload(); }} 
            />

            {/* MODAL DE RENEGOCIAÇÃO (NOVO) */}
            <RenegociacaoModal 
                open={openRenegociacaoModal}
                onClose={() => setOpenRenegociacaoModal(false)}
                itensSelecionados={itensParaRenegociar}
                onConfirm={handleConfirmarRenegociacao}
            />
        </Box>
    );
}