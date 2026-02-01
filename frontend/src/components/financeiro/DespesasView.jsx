// src/components/financeiro/DespesasView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    CircularProgress, TextField, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Typography, Grid, Chip, Box,
    Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, Button, Stack
} from '@mui/material';
import { 
    Edit, Delete, Search, CheckCircle, Domain, LocalCafe, Warning 
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const TabelaDespesas = ({ dados, titulo, icone, corTema, onEdit, onToggleStatus, onDelete }) => (
    <Paper elevation={0} sx={{ border: `1px solid ${corTema}40`, borderRadius: 2, overflow: 'hidden', flex: 1 }}>
        <Box sx={{ px: 1.5, py: 0.8, bgcolor: `${corTema}10`, display: 'flex', alignItems: 'center', gap: 1 }}>
            {React.cloneElement(icone, { sx: { fontSize: 16, color: corTema } })}
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: corTema, flexGrow: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {titulo}
            </Typography>
            <Chip label={dados.length} size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 'bold' }} />
        </Box>
        <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ fontSize: '0.65rem', fontWeight: 'bold', py: 1 }}>Data</TableCell>
                        <TableCell sx={{ fontSize: '0.65rem', fontWeight: 'bold', py: 1 }}>Descrição</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.65rem', fontWeight: 'bold', py: 1 }}>Valor</TableCell>
                        <TableCell align="center" sx={{ fontSize: '0.65rem', fontWeight: 'bold', py: 1 }}>Ações</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {dados.map((item) => {
                        // Sinalização de conta vencida e não paga
                        const isVencida = !item.pago && dayjs(item.data_vencimento || item.data_despesa).isBefore(dayjs(), 'day');
                        
                        return (
                            <TableRow key={item.id} hover sx={{ bgcolor: isVencida ? '#fff5f5' : 'inherit' }}>
                                <TableCell sx={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                                    {dayjs(item.data_despesa).format('DD/MM/YY')}
                                </TableCell>
                                <TableCell sx={{ py: 0.5 }}>
                                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.2 }}>{item.descricao}</Typography>
                                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.6rem' }}>{item.categoria_nome}</Typography>
                                </TableCell>
                                <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
                                    {formatMoney(item.valor)}
                                </TableCell>
                                <TableCell align="center">
                                    <Stack direction="row" spacing={0} justifyContent="center">
                                        <IconButton size="small" onClick={() => onEdit(item)} sx={{ p: 0.5 }}>
                                            <Edit sx={{ fontSize: 14 }} />
                                        </IconButton>
                                        {!item.pago && (
                                            <IconButton size="small" color="success" onClick={() => onToggleStatus(item)} sx={{ p: 0.5 }}>
                                                <CheckCircle sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        )}
                                        <IconButton size="small" color="error" onClick={() => onDelete(item.id)} sx={{ p: 0.5 }}>
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
    const [openEditModal, setOpenEditModal] = useState(false);
    const [editFormData, setEditFormData] = useState({});

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [resD] = await Promise.all([faturamentoService.getDespesas()]);
            setDespesas(resD.data || []);
        } finally { setIsLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

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

    const handleToggleStatus = async (item) => {
        try {
            await faturamentoService.updateDespesa(item.id, { ...item, pago: !item.pago });
            showSnackbar('Status atualizado', 'success');
            fetchData();
        } catch (e) { showSnackbar('Erro ao atualizar', 'error'); }
    };

    const onDelete = async (id) => {
        if (!window.confirm("Deseja excluir?")) return;
        await faturamentoService.deleteDespesa(id);
        fetchData();
    };

    if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress size={24} /></Box>;

    return (
        <Box>
            {/* KPIs COMPACTOS */}
            <Grid container spacing={1.5} sx={{ mb: 2 }}>
                <Grid item xs={4}>
                    <Paper variant="outlined" sx={{ p: 1.2, borderLeft: '4px solid #1a233b', bgcolor: '#f8f9fa' }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.6rem', color: 'text.secondary' }}>TOTAL DESPESAS</Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1 }}>{formatMoney(resumoGeral.total)}</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={4}>
                    <Paper variant="outlined" sx={{ p: 1.2, borderLeft: '4px solid #2e7d32', bgcolor: '#f0f9f1' }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.6rem', color: '#2e7d32' }}>PAGAS NO MÊS</Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1, color: '#2e7d32' }}>{formatMoney(resumoGeral.pagas)}</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={4}>
                    <Paper variant="outlined" sx={{ p: 1.2, borderLeft: '4px solid #d32f2f', bgcolor: '#fff5f5' }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.6rem', color: '#d32f2f' }}>A PAGAR / VENCIDAS</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {resumoGeral.atrasadasCount > 0 && <Warning sx={{ fontSize: 14, color: '#d32f2f' }} />}
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1, color: '#d32f2f' }}>{formatMoney(resumoGeral.aPagar)}</Typography>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* BARRA DE FERRAMENTAS REDUZIDA */}
            <Box sx={{ mb: 1.5, display: 'flex', gap: 1 }}>
                <TextField 
                    size="small" placeholder="Filtrar descrição..." 
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{ 
                        startAdornment: <Search sx={{ mr: 0.5, color: 'gray', fontSize: 18 }} />,
                        sx: { fontSize: '0.8rem' }
                    }}
                    sx={{ width: 220 }}
                />
                <Select size="small" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} sx={{ fontSize: '0.8rem', width: 130 }}>
                    {Array.from({ length: 12 }, (_, i) => (
                        <MenuItem key={i} value={i} sx={{ fontSize: '0.8rem' }}>{dayjs().month(i).format('MMMM')}</MenuItem>
                    ))}
                </Select>
            </Box>

            {/* TABELAS LADO A LADO COM FONTES MENORES */}
            <Box sx={{ display: 'flex', gap: 1.5, flexDirection: { xs: 'column', md: 'row' } }}>
                <TabelaDespesas dados={fixas} titulo="FIXAS" icone={<Domain />} corTema="#1565c0" onEdit={(i) => {setEditFormData(i); setOpenEditModal(true);}} onToggleStatus={handleToggleStatus} onDelete={onDelete} />
                <TabelaDespesas dados={variaveis} titulo="VARIÁVEIS" icone={<LocalCafe />} corTema="#e65100" onEdit={(i) => {setEditFormData(i); setOpenEditModal(true);}} onToggleStatus={handleToggleStatus} onDelete={onDelete} />
            </Box>

            {/* MODAL DE EDIÇÃO */}
            <Dialog open={openEditModal} onClose={() => setOpenEditModal(false)} size="small">
                <DialogTitle sx={{ fontSize: '1rem', fontWeight: 'bold' }}>Editar Despesa</DialogTitle>
                <DialogContent>
                    <TextField fullWidth margin="dense" size="small" label="Descrição" value={editFormData.descricao || ''} onChange={(e) => setEditFormData({...editFormData, descricao: e.target.value})} />
                    <TextField fullWidth margin="dense" size="small" label="Valor" type="number" value={editFormData.valor || ''} onChange={(e) => setEditFormData({...editFormData, valor: e.target.value})} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEditModal(false)} sx={{ fontSize: '0.75rem' }}>Cancelar</Button>
                    <Button variant="contained" size="small" onClick={async () => {
                        await faturamentoService.updateDespesa(editFormData.id, editFormData);
                        setOpenEditModal(false);
                        fetchData();
                    }}>Salvar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}