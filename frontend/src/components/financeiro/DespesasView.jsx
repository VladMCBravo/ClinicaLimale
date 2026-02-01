// src/components/financeiro/DespesasView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    CircularProgress, TextField, Paper, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, IconButton, Typography, 
    Grid, Chip, Box, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions,
    MenuItem, Select
} from '@mui/material';
import { Edit, Delete, CheckCircle, Domain, LocalCafe, Warning, Search } from '@mui/icons-material';
import dayjs from 'dayjs';
import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import LancamentoCaixaModal from './LancamentoCaixaModal'; 

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// Componente de Tabela Interno Único e Reutilizável
const TabelaDespesas = ({ dados, titulo, icone, corTema, onEdit, onCheck, onDelete }) => (
    <Paper elevation={0} sx={{ border: `1px solid ${corTema}40`, borderRadius: 2, overflow: 'hidden', flex: 1 }}>
        <Box sx={{ px: 1.5, py: 0.8, bgcolor: `${corTema}10`, display: 'flex', alignItems: 'center', gap: 1 }}>
            {React.cloneElement(icone, { sx: { fontSize: 16, color: corTema } })}
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: corTema, flexGrow: 1, textTransform: 'uppercase' }}>
                {titulo}
            </Typography>
            <Chip label={dados.length} size="small" sx={{ height: 18, fontSize: '0.6rem' }} />
        </Box>
        <TableContainer sx={{ maxHeight: 350 }}>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ fontSize: '0.65rem', fontWeight: 'bold' }}>Vencimento</TableCell>
                        <TableCell sx={{ fontSize: '0.65rem', fontWeight: 'bold' }}>Descrição</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.65rem', fontWeight: 'bold' }}>Valor</TableCell>
                        <TableCell align="center" sx={{ fontSize: '0.65rem', fontWeight: 'bold' }}>Ações</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {dados.map((item) => {
                        // Sinalização visual de atraso
                        const isVencida = !item.pago && dayjs(item.data_vencimento).isBefore(dayjs(), 'day');
                        return (
                            <TableRow key={item.id} hover sx={{ bgcolor: isVencida ? '#fff5f5' : 'inherit' }}>
                                <TableCell sx={{ fontSize: '0.7rem' }}>
    {/* Tenta ler vencimento, se não tiver, tenta a data da despesa, se não, mostra vazio */}
    {(item.data_vencimento || item.data_despesa) 
        ? dayjs(item.data_vencimento || item.data_despesa).format('DD/MM/YY') 
        : '--/--/--'}
</TableCell>

<TableCell sx={{ py: 0.5 }}>
    <Typography sx={{ fontSize: '0.75rem', fontWeight: 500 }}>{item.descricao}</Typography>
    {item.pago && (
        <Typography variant="caption" color="success.main" sx={{fontSize: '0.6rem', display: 'block'}}>
            {/* CORREÇÃO: Pago em DD/MM */}
            Pago em {item.data_pagamento ? dayjs(item.data_pagamento).format('DD/MM/YY') : 'Data não registrada'}
        </Typography>
    )}
</TableCell>
                                <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{formatMoney(item.valor)}</TableCell>
                                <TableCell align="center">
                                    <Stack direction="row" spacing={0} justifyContent="center">
                                        {/* Lápis: Abre Modal Unificado para Editar/Reverter status de Pago */}
                                        <IconButton size="small" onClick={() => onEdit(item)} color="primary">
                                            <Edit sx={{ fontSize: 14 }} />
                                        </IconButton>
                                        {/* Check: Abre confirmação rápida de baixa */}
                                        {!item.pago && (
                                            <IconButton size="small" onClick={() => onCheck(item)} color="success">
                                                <CheckCircle sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        )}
                                        <IconButton size="small" color="error" onClick={() => onDelete(item.id)}>
                                            <Delete sx={{ fontSize: 14 }} />
                                        </IconButton>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    </Paper>
);

export default function DespesasView() {
    const { showSnackbar } = useSnackbar();
    const [despesas, setDespesas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [mesFiltro, setMesFiltro] = useState(dayjs().month()); 
    const [anoFiltro, setAnoFiltro] = useState(dayjs().year());
    
    const [openMestreModal, setOpenMestreModal] = useState(false);
    const [openConfirmBaixa, setOpenConfirmBaixa] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await faturamentoService.getDespesas();
            setDespesas(res.data || []);
        } finally { setIsLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    // Motor de filtragem consolidado
    const processedData = useMemo(() => {
        const filtered = despesas.filter(d => {
            const dataRef = dayjs(d.data_despesa || d.data_vencimento);
            return dataRef.month() === mesFiltro && dataRef.year() === anoFiltro &&
                   d.descricao.toLowerCase().includes(searchTerm.toLowerCase());
        });
        const fixas = filtered.filter(d => d.categoria_tipo === 'Fixa');
        const variaveis = filtered.filter(d => d.categoria_tipo !== 'Fixa');
        const resumoGeral = filtered.reduce((acc, curr) => {
            const val = parseFloat(curr.valor || 0);
            acc.total += val;
            curr.pago ? (acc.pagas += val) : (acc.aPagar += val);
            if (!curr.pago && dayjs(curr.data_vencimento).isBefore(dayjs(), 'day')) acc.atrasadasCount++;
            return acc;
        }, { pagas: 0, aPagar: 0, total: 0, atrasadasCount: 0 });

        return { fixas, variaveis, resumoGeral };
    }, [despesas, mesFiltro, anoFiltro, searchTerm]);

    const { fixas, variaveis, resumoGeral } = processedData;

    const handleConfirmarBaixaRapida = async () => {
        try {
            // Usa o endpoint otimizado do views.py para baixa rápida
            await faturamentoService.alternarPagamento(selectedItem.id, { pago: true });
            showSnackbar('Baixa realizada!', 'success');
            setOpenConfirmBaixa(false);
            fetchData();
        } catch (e) { showSnackbar('Erro ao processar.', 'error'); }
    };

    const onDelete = async (id) => {
        if (!window.confirm("Deseja realmente excluir esta despesa?")) return;
        await faturamentoService.deleteDespesa(id);
        fetchData();
    };

    if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress size={24} /></Box>;

    return (
        <Box>
            {/* KPIs COMPACTOS */}
            <Grid container spacing={1} sx={{ mb: 2 }}>
                <Grid item xs={4}>
                    <Paper variant="outlined" sx={{ p: 1, borderLeft: '4px solid #1a233b', bgcolor: '#f8f9fa' }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.6rem' }}>TOTAL NO MÊS</Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{formatMoney(resumoGeral.total)}</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={4}>
                    <Paper variant="outlined" sx={{ p: 1, borderLeft: '4px solid #2e7d32', bgcolor: '#f0f9f1' }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.6rem', color: '#2e7d32' }}>PAGAS</Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>{formatMoney(resumoGeral.pagas)}</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={4}>
                    <Paper variant="outlined" sx={{ p: 1, borderLeft: '4px solid #d32f2f', bgcolor: '#fff5f5' }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.6rem', color: '#d32f2f' }}>A PAGAR / VENCIDAS</Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#d32f2f' }}>{formatMoney(resumoGeral.aPagar)}</Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* BARRA DE FERRAMENTAS */}
            <Box sx={{ mb: 1.5, display: 'flex', gap: 1 }}>
                <TextField 
                    size="small" placeholder="Filtrar..." 
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{ startAdornment: <Search sx={{ mr: 0.5, color: 'gray', fontSize: 16 }} /> }}
                    sx={{ width: 180, "& .MuiInputBase-input": { fontSize: '0.75rem' } }}
                />
                <Select size="small" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} sx={{ fontSize: '0.75rem', height: 32 }}>
                    {Array.from({ length: 12 }, (_, i) => (
                        <MenuItem key={i} value={i} sx={{fontSize: '0.75rem'}}>{dayjs().month(i).format('MMMM')}</MenuItem>
                    ))}
                </Select>
            </Box>

            {/* TABELAS LADO A LADO */}
            <Box sx={{ display: 'flex', gap: 1.5, flexDirection: { xs: 'column', md: 'row' } }}>
                <TabelaDespesas 
                    dados={fixas} titulo="FIXAS" icone={<Domain />} corTema="#1565c0" 
                    onEdit={(item) => { setSelectedItem(item); setOpenMestreModal(true); }} 
                    onCheck={(item) => { setSelectedItem(item); setOpenConfirmBaixa(true); }}
                    onDelete={onDelete} 
                />
                <TabelaDespesas 
                    dados={variaveis} titulo="VARIÁVEIS" icone={<LocalCafe />} corTema="#e65100" 
                    onEdit={(item) => { setSelectedItem(item); setOpenMestreModal(true); }} 
                    onCheck={(item) => { setSelectedItem(item); setOpenConfirmBaixa(true); }}
                    onDelete={onDelete} 
                />
            </Box>

            {/* MODAIS DE SUPORTE */}
            <LancamentoCaixaModal 
                open={openMestreModal} 
                initialData={selectedItem} 
                onClose={() => { setOpenMestreModal(false); fetchData(); }} 
            />

            <Dialog open={openConfirmBaixa} onClose={() => setOpenConfirmBaixa(false)}>
                <DialogTitle sx={{ fontWeight: 'bold', fontSize: '1rem' }}>Confirmar Baixa</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">Deseja liquidar <strong>{selectedItem?.descricao}</strong>?</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenConfirmBaixa(false)} size="small">Cancelar</Button>
                    <Button onClick={handleConfirmarBaixaRapida} variant="contained" color="success" size="small">Confirmar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}