// src/components/financeiro/ContasReceberView.jsx
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
    TextField, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Typography, Box, LinearProgress, Button, InputAdornment, Chip, IconButton, Tooltip, Drawer
} from '@mui/material';
import { Search, Add, ReceiptLong } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

import { faturamentoService } from '../../services/faturamentoService';
import LancamentoCaixaModal from './LancamentoCaixaModal';
import { PatientDrawerContent } from './PatientPaymentDrawer';

// Importa CSS Global
import './Financeiro.css';

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
    const [selectedItem, setSelectedItem] = useState(null);

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

            // Ordenação
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

    // CÁLCULO DE TOTAIS (Para o rodapé)
    const totais = useMemo(() => {
        const totalValor = lista.reduce((acc, item) => acc + parseFloat(item.valor || 0), 0);
        return { qtd: lista.length, valor: totalValor };
    }, [lista]);

    const handleRowClick = (item) => {
        setSelectedItem(item);
        setDrawerOpen(true);
    };

    const getStatusColor = (status, vencimento) => {
        if (status === 'Pago') return 'success';
        if (status === 'Cancelado') return 'default';
        if (status === 'Pendente' && dayjs(vencimento).isBefore(dayjs(), 'day')) return 'error';
        return 'warning';
    };

    return (
        <div className="fin-container" style={{ padding: '10px 20px' }}> {/* Container ajustado */}
            
            {/* BARRA DE FERRAMENTAS */}
            <div className="fin-toolbar" style={{ marginBottom: 10 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <DatePicker 
                        views={['month', 'year']}
                        value={filtroData}
                        onChange={(v) => { setFiltroData(v); setBusca(''); }}
                        slotProps={{ textField: { size: 'small', variant: 'standard', sx: { width: 120 } } }}
                        disabled={busca.length > 0}
                    />
                    <TextField
                        size="small"
                        placeholder="Buscar Paciente..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        variant="standard"
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
                            disableUnderline: true,
                            style: { fontSize: '0.9rem' }
                        }}
                        sx={{ width: 250, borderBottom: '1px solid #ddd' }}
                    />
                </Box>

                <Button 
                    variant="contained" color="success" size="small" startIcon={<Add />}
                    onClick={() => setModalOpen(true)}
                    sx={{ fontWeight: 'bold', textTransform: 'none', borderRadius: 6, px: 3 }}
                >
                    Nova Receita
                </Button>
            </div>

            {/* TABELA COMPACTA COM SCROLL */}
            <Paper variant="outlined" sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', width: '99%', margin: '0 auto', borderRadius: 2, border: '1px solid #eee' }}>
                {loading && <LinearProgress sx={{ height: 2 }} />}
                
                <TableContainer sx={{ flexGrow: 1 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f9fafb', color: '#666' }}>Vencimento</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f9fafb', color: '#666' }}>Paciente / Descrição</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: '#f9fafb', color: '#666' }}>Valor</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#f9fafb', color: '#666' }}>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {lista.map(row => {
                                const isAtrasado = row.status === 'Pendente' && dayjs(row.data_vencimento).isBefore(dayjs(), 'day');
                                
                                return (
                                    <TableRow 
                                        key={row.id} 
                                        hover 
                                        onClick={() => handleRowClick(row)}
                                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f0f7ff !important' } }}
                                    >
                                        <TableCell sx={{ fontSize: '0.8rem', color: '#444' }}>
                                            {dayjs(row.data_vencimento).format('DD/MM/YY')}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="600" fontSize="0.85rem">
                                                {row.paciente_nome || row.descricao}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary" fontSize="0.7rem">
                                                {row.descricao_visual || row.categoria_nome}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold', color: '#2e7d32', fontSize: '0.85rem' }}>
                                            {formatMoney(row.valor)}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip 
                                                label={isAtrasado ? 'Atrasado' : row.status} 
                                                size="small" 
                                                color={getStatusColor(row.status, row.data_vencimento)}
                                                variant={row.status === 'Pago' ? 'filled' : 'outlined'}
                                                sx={{ fontWeight: 'bold', height: 20, fontSize: '0.65rem' }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {!loading && lista.length === 0 && (
                                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: '#999' }}>Nenhum registro encontrado.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* RODAPÉ FIXO DE TOTAIS */}
                <Box sx={{ p: 1.5, borderTop: '1px solid #eee', bgcolor: '#f9fafb', display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                        QUANTIDADE: <b>{totais.qtd}</b>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        TOTAL NO PERÍODO: <b style={{ color: '#2e7d32', fontSize: '0.9rem' }}>{formatMoney(totais.valor)}</b>
                    </Typography>
                </Box>
            </Paper>

            {/* MODAIS E DRAWERS */}
            <LancamentoCaixaModal 
                open={modalOpen} 
                onClose={() => { setModalOpen(false); carregarDados(); }}
                initialType="receita" 
                initialTab={0}
            />

            <Drawer 
                anchor="right" 
                open={drawerOpen} 
                onClose={() => setDrawerOpen(false)}
                PaperProps={{ sx: { width: { xs: '100%', md: 450 }, p: 0 } }}
            >
                {selectedItem && (
                    <PatientDrawerContent 
                        item={selectedItem} 
                        onClose={() => setDrawerOpen(false)} 
                        onUpdate={carregarDados} 
                    />
                )}
            </Drawer>
        </div>
    );
}