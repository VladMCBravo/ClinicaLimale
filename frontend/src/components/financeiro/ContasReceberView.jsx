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
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

    // BUSCA DE DADOS (Server-Side)
    const carregarDados = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            
            // Lógica Inteligente: Busca Global vs Filtro Mês
            if (busca.length > 2) {
                params.search = busca;
            } else {
                params.mes = filtroData.month() + 1;
                params.ano = filtroData.year();
            }

            const res = await faturamentoService.getPagamentos(params);
            setLista(res.data || []);
            
        } catch (error) {
            console.error("Erro ao buscar contas a receber", error);
        } finally {
            setLoading(false);
        }
    }, [filtroData, busca]);

    // Debounce da busca
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            carregarDados();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [carregarDados]);

    // --- HANDLERS ---

    const handleRowClick = (item) => {
        setSelectedId(item.id);
        setDrawerOpen(true);
    };

    const handleBaixarRapido = async (e, item) => {
        e.stopPropagation(); // Evita abrir o drawer ao clicar no check
        if(!window.confirm(`Confirmar recebimento de ${formatMoney(item.valor)}?`)) return;
        
        // Optimistic Update (Atualiza visualmente antes do servidor)
        setLista(prev => prev.map(p => p.id === item.id ? { ...p, status: 'Pago' } : p));

        try {
            await faturamentoService.updatePagamento(item.id, { 
                status: 'Pago', 
                data_pagamento: dayjs().format('YYYY-MM-DD') 
            });
            carregarDados(); 
        } catch (error) {
            alert('Erro ao baixar');
            carregarDados(); // Reverte em caso de erro
        }
    };

    const getStatusColor = (status, vencimento) => {
        if (status === 'Pago') return 'success';
        if (status === 'Cancelado') return 'default';
        
        // Verifica atraso
        if (status === 'Pendente' && dayjs(vencimento).isBefore(dayjs(), 'day')) {
            return 'error'; // Vermelho para atrasado
        }
        return 'warning'; // Laranja para pendente no prazo
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
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><Search /></InputAdornment>
                        }}
                        sx={{ width: 300, bgcolor: 'white' }}
                    />
                </Box>

                <Button 
                    variant="contained" 
                    color="success" 
                    startIcon={<Add />}
                    onClick={() => setModalOpen(true)}
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
                                        
                                        {/* COLUNA STATUS (AGORA VISÍVEL) */}
                                        <TableCell>
                                            <Chip 
                                                label={labelStatus} 
                                                size="small" 
                                                color={colorStatus}
                                                variant={row.status === 'Pago' ? 'filled' : 'outlined'}
                                                sx={{ fontWeight: 'bold', height: 24, fontSize: '0.75rem' }}
                                            />
                                        </TableCell>

                                        {/* COLUNA AÇÕES (AGORA VISÍVEL) */}
                                        <TableCell align="right">
                                            {row.status !== 'Pago' && (
                                                <Tooltip title="Confirmar Recebimento">
                                                    <IconButton 
                                                        size="small" 
                                                        color="success" 
                                                        onClick={(e) => handleBaixarRapido(e, row)}
                                                        sx={{ mr: 1 }}
                                                    >
                                                        <CheckCircle fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            <Tooltip title="Editar / Ver Detalhes">
                                                <IconButton size="small" onClick={() => handleRowClick(row)}>
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

            {/* MODAL CONFIGURADO APENAS PARA RECEITA */}
            <LancamentoCaixaModal 
                open={modalOpen} 
                onClose={() => { setModalOpen(false); carregarDados(); }}
                initialType="receita" 
                initialTab={0}
            />

            {/* DRAWER LATERAL (O MESMO DE DESPESAS, MAS FUNCIONA PARA RECEITA TAMBÉM SE O ID FOR DE PAGAMENTO) */}
            {/* Nota: O Backend precisará suportar getDespesaTimeline ou você cria um getPagamentoTimeline similar */}
            <TransactionDrawer 
                open={drawerOpen} 
                onClose={() => setDrawerOpen(false)} 
                transactionId={selectedId} 
                onUpdate={carregarDados} 
            />
        </Box>
    );
}