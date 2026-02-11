// src/components/financeiro/ContasReceberView.jsx
import React, { useState, useCallback, useEffect } from 'react';
import {
    TextField, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Typography, Box, LinearProgress, Button, InputAdornment, Chip, IconButton, Tooltip
} from '@mui/material';
import { Search, Add, CheckCircle, Edit } from '@mui/icons-material';
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
    const [itemParaEdicao, setItemParaEdicao] = useState(null); // Estado para passar dados ao modal
    
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

    // BUSCA DE DADOS (Server-Side + Ordenação Front)
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
            const dadosBrutos = res.data || [];

            // ORDENAÇÃO DECRESCENTE (Data mais futura -> Data mais antiga)
            const dadosOrdenados = dadosBrutos.sort((a, b) => {
                const dataA = dayjs(a.data_vencimento);
                const dataB = dayjs(b.data_vencimento);
                return dataB.diff(dataA);
            });

            setLista(dadosOrdenados);
            
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
        // Clicar na linha abre o Drawer de detalhes (apenas leitura/histórico)
        setSelectedId(item.id);
        setDrawerOpen(true);
    };

    // Ação do Botão CHECK (Agora abre o modal para confirmar pagamento)
    const handleAbrirBaixa = (e, item) => {
        e.stopPropagation();
        // Prepara o item para o modal, forçando status de pago se confirmar
        setItemParaEdicao({
            ...item,
            pago: true, // Força o modal a abrir com a chave "Pago" ligada
            data_pagamento: dayjs() // Sugere hoje como data
        });
        setModalOpen(true);
    };

    // Ação do Botão EDITAR (Lápis)
    const handleAbrirEdicao = (e, item) => {
        e.stopPropagation();
        setItemParaEdicao({
            ...item,
            pago: item.status === 'Pago'
        });
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setItemParaEdicao(null); // Limpa seleção
        carregarDados();
    };

    const getStatusColor = (status, vencimento) => {
        if (status === 'Pago') return 'success';
        if (status === 'Cancelado') return 'default';
        if (status === 'Pendente' && dayjs(vencimento).isBefore(dayjs(), 'day')) return 'error';
        return 'warning';
    };

    return (
        <Box sx={{ height: 'calc(100vh - 155px)', display: 'flex', flexDirection: 'column' }}>
            
            {/* BARRA DE FERRAMENTAS */}
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

            {/* TABELA */}
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
                                            {/* BOTÃO CHECK: Abre modal para confirmar pagamento */}
                                            {row.status !== 'Pago' && (
                                                <Tooltip title="Confirmar Recebimento">
                                                    <IconButton 
                                                        size="small" color="success" 
                                                        onClick={(e) => handleAbrirBaixa(e, row)}
                                                        sx={{ mr: 1 }}
                                                    >
                                                        <CheckCircle fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            {/* BOTÃO EDITAR: Abre modal para editar dados */}
                                            <Tooltip title="Editar">
                                                <IconButton size="small" onClick={(e) => handleAbrirEdicao(e, row)}>
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

            {/* MODAL UNIFICADO (CRIAÇÃO, EDIÇÃO E BAIXA) */}
            {/* Passamos existingData para preencher o modal com os dados da linha clicada */}
            <LancamentoCaixaModal 
                open={modalOpen} 
                onClose={handleCloseModal}
                initialType="receita" 
                initialTab={0}
                existingData={itemParaEdicao} // <--- AQUI ESTÁ A MÁGICA
            />

            {/* DRAWER LATERAL (HISTÓRICO/DETALHES) */}
            <TransactionDrawer 
                open={drawerOpen} 
                onClose={() => setDrawerOpen(false)} 
                transactionId={selectedId} 
                onUpdate={carregarDados} 
            />
        </Box>
    );
}