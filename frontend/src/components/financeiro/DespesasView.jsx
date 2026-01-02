import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Button, CircularProgress, TextField, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Select, MenuItem, InputLabel, FormControl, IconButton, Checkbox,
    FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions,
    Typography, Grid, Switch, Tooltip, InputAdornment, Chip
} from '@mui/material';
import { 
    Edit, Delete, AddCircleOutline, Search, 
    MoneyOff, CheckCircle, Warning 
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';

// Importamos o Modal "Bonito" (Padronizado)
import LancamentoCaixaModal from './LancamentoCaixaModal';

const formatDataSimples = (dataISO) => {
    if (!dataISO) return '-';
    const partes = dataISO.split('T')[0].split('-'); 
    if(partes.length < 3) return '-';
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

export default function DespesasView() {
    const { showSnackbar } = useSnackbar();
    
    // Estados de Dados
    const [despesas, setDespesas] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [filteredDespesas, setFilteredDespesas] = useState([]);
    
    // UI e Filtros
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [mesFiltro, setMesFiltro] = useState(''); 
    const [anoFiltro, setAnoFiltro] = useState(dayjs().year());

    // Estados dos Modais
    const [openNovoLancamentoModal, setOpenNovoLancamentoModal] = useState(false); // Modal Padrão (Criação)
    const [openEditModal, setOpenEditModal] = useState(false); // Modal Interno (Apenas Edição)
    
    // Estado do Formulário de Edição
    const [editFormData, setEditFormData] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- CARGA DE DADOS ---
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [despesasRes, categoriasRes] = await Promise.all([
                faturamentoService.getDespesas(),
                faturamentoService.getCategoriasDespesa()
            ]);
            setDespesas(despesasRes.data);
            setCategorias(categoriasRes.data);
        } catch (error) {
            console.error(error);
            showSnackbar('Erro ao carregar despesas.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // --- FILTRAGEM ---
    useEffect(() => {
        let lista = despesas;

        if (mesFiltro !== '') {
            lista = lista.filter(d => {
                const dataRef = d.data_vencimento || d.data_despesa;
                const dataObj = dayjs(dataRef);
                return dataObj.month() === mesFiltro && dataObj.year() === anoFiltro;
            });
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            lista = lista.filter(d => 
                d.descricao.toLowerCase().includes(term) || 
                (d.categoria_nome && d.categoria_nome.toLowerCase().includes(term))
            );
        }

        // Ordenação Timeline (Mais recentes no topo)
        lista.sort((a, b) => new Date(b.data_vencimento) - new Date(a.data_vencimento));
        setFilteredDespesas(lista);
    }, [despesas, mesFiltro, anoFiltro, searchTerm]);

    // --- KPIs ---
    const financialSummary = useMemo(() => {
        return filteredDespesas.reduce((acc, item) => {
            const valor = parseFloat(item.valor) || 0;
            acc.total += valor;
            if (item.pago) acc.pagas += valor;
            else acc.aPagar += valor;
            return acc;
        }, { pagas: 0, aPagar: 0, total: 0 });
    }, [filteredDespesas]);

    // --- AÇÕES ---
    
    // Abre o Modal Padrão (Bonito) para criar nova despesa
    const handleOpenCreate = () => {
        setOpenNovoLancamentoModal(true);
    };

    // Abre o Modal Interno apenas para EDITAR
    const handleOpenEdit = (item) => {
        setEditFormData({
            id: item.id,
            descricao: item.descricao,
            valor: item.valor,
            categoria: item.categoria,
            data_vencimento: item.data_vencimento,
            // Lógica de preservação de data: Se não tem pagto, sugere hoje ao marcar pago
            data_pagamento: item.data_pagamento || dayjs().format('YYYY-MM-DD'),
            pago: item.pago
        });
        setOpenEditModal(true);
    };

    // Salvar Edição
    const handleSaveEdit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Payload de atualização
            const payload = {
                ...editFormData,
                // Mantém data_despesa sincronizada com vencimento nos bastidores
                data_despesa: editFormData.data_vencimento,
                data_pagamento: editFormData.pago ? editFormData.data_pagamento : null
            };
            
            await faturamentoService.updateDespesa(editFormData.id, payload);
            showSnackbar('Despesa atualizada!', 'success');
            setOpenEditModal(false);
            fetchData();
        } catch (error) {
            console.error(error);
            showSnackbar('Erro ao atualizar.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Toggle Rápido de Status (Pago/Pendente)
    const handleToggleStatus = async (despesa) => {
        const novoStatus = !despesa.pago;
        // Atualização Otimista na UI
        setDespesas(prev => prev.map(d => d.id === despesa.id ? { ...d, pago: novoStatus } : d));

        try {
            const payload = {
                id: despesa.id,
                descricao: despesa.descricao,
                valor: despesa.valor,
                categoria: despesa.categoria,
                data_despesa: despesa.data_despesa, // Mantém original
                data_vencimento: despesa.data_vencimento,
                pago: novoStatus,
                data_pagamento: novoStatus ? dayjs().format('YYYY-MM-DD') : null
            };
            await faturamentoService.updateDespesa(despesa.id, payload);
            showSnackbar(novoStatus ? 'Pago!' : 'Pendente.', 'success');
        } catch (error) {
            fetchData(); // Reverte se der erro
            showSnackbar('Erro ao atualizar.', 'error');
        }
    };

    const handleDelete = async (id) => {
        if(!window.confirm("Excluir esta despesa?")) return;
        try {
            await faturamentoService.deleteDespesa(id);
            showSnackbar('Despesa removida.', 'success');
            fetchData();
        } catch (error) {
            showSnackbar('Erro ao excluir.', 'error');
        }
    };

    const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const getVencimentoColor = (dataVenc, pago) => {
        if (pago) return 'text.secondary';
        const hoje = dayjs();
        const venc = dayjs(dataVenc);
        if (venc.isBefore(hoje, 'day')) return 'error.main'; 
        if (venc.isSame(hoje, 'day')) return 'warning.main'; 
        return 'text.primary';
    };

    return (
        <Box sx={{ p: 1 }}>
            
            {/* 1. KPIs */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', bgcolor: '#fff' }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold">TOTAL GERAL</Typography>
                            <Typography variant="h5" fontWeight="bold" color="#1a233b">{formatMoney(financialSummary.total)}</Typography>
                        </Box>
                        <MoneyOff sx={{ color: '#1a233b', opacity: 0.2 }} />
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', bgcolor: '#fff' }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold">TOTAL PAGO</Typography>
                            <Typography variant="h5" fontWeight="bold" color="#2e7d32">{formatMoney(financialSummary.pagas)}</Typography>
                        </Box>
                        <CheckCircle sx={{ color: '#2e7d32', opacity: 0.2 }} />
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', bgcolor: '#fff' }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold">A PAGAR</Typography>
                            <Typography variant="h5" fontWeight="bold" color="#d32f2f">{formatMoney(financialSummary.aPagar)}</Typography>
                        </Box>
                        <Warning sx={{ color: '#d32f2f', opacity: 0.2 }} />
                    </Paper>
                </Grid>
            </Grid>

            {/* 2. BARRA DE AÇÕES */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, flexGrow: 1 }}>
                    {/* Filtros */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FormControl size="small" sx={{ minWidth: 110 }}>
                            <Select value={mesFiltro} displayEmpty onChange={(e) => setMesFiltro(e.target.value)} sx={{ fontSize: '0.8rem', bgcolor: '#fff', height: '40px' }}>
                                <MenuItem value=""><em>Todos Meses</em></MenuItem>
                                {Array.from({length: 12}, (_, i) => (
                                    <MenuItem key={i} value={i} sx={{fontSize: '0.8rem'}}>{dayjs().month(i).format('MMMM')}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 80 }}>
                            <Select value={anoFiltro} onChange={(e) => setAnoFiltro(e.target.value)} sx={{ fontSize: '0.8rem', bgcolor: '#fff', height: '40px' }}>
                                <MenuItem value={2024}>2024</MenuItem>
                                <MenuItem value={2025}>2025</MenuItem>
                                <MenuItem value={2026}>2026</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    {/* Busca */}
                    <TextField 
                        size="small"
                        placeholder="Buscar despesa..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
                        sx={{ flexGrow: 1, bgcolor: 'white', maxWidth: '400px' }}
                    />
                </Box>

                {/* BOTÃO PADRONIZADO - ABRE O MODAL BONITO */}
                <Button variant="contained" startIcon={<AddCircleOutline />} onClick={handleOpenCreate} sx={{ bgcolor: '#1a233b', '&:hover': { bgcolor: '#2c3a5b' } }}>
                    Nova Despesa
                </Button>
            </Box>

            {/* 3. TABELA */}
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #f0f0f0', borderRadius: '8px' }}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                        <TableRow>
                            <TableCell sx={{fontWeight:'bold', color:'#666', fontSize:'0.75rem', width: '100px'}}>Vencimento</TableCell>
                            <TableCell sx={{fontWeight:'bold', color:'#666', fontSize:'0.75rem', width: '100px'}}>Pagamento</TableCell>
                            <TableCell sx={{fontWeight:'bold', color:'#666', fontSize:'0.75rem'}}>Descrição</TableCell>
                            <TableCell sx={{fontWeight:'bold', color:'#666', fontSize:'0.75rem'}}>Categoria</TableCell>
                            <TableCell align="right" sx={{fontWeight:'bold', color:'#666', fontSize:'0.75rem'}}>Valor</TableCell>
                            <TableCell align="center" sx={{fontWeight:'bold', color:'#666', fontSize:'0.75rem'}}>Status</TableCell>
                            <TableCell align="center" sx={{fontWeight:'bold', color:'#666', fontSize:'0.75rem'}}>Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredDespesas.length > 0 ? filteredDespesas.map((item) => (
                            <TableRow key={item.id} hover>
                                <TableCell sx={{ fontSize: '0.8rem' }}>
                                    <Typography variant="body2" fontWeight="500" color={getVencimentoColor(item.data_vencimento, item.pago)} sx={{ fontSize: '0.8rem' }}>
                                        {formatDataSimples(item.data_vencimento)}
                                    </Typography>
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.8rem' }}>
                                    {item.data_pagamento ? (
                                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#2e7d32', bgcolor: '#e8f5e9', px: 0.8, py: 0.3, borderRadius: 1 }}>
                                            {formatDataSimples(item.data_pagamento)}
                                        </Typography>
                                    ) : '-'}
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.85rem' }}>{item.descricao}</TableCell>
                                <TableCell><Chip label={item.categoria_nome} size="small" sx={{fontSize:'0.65rem', height: 20, bgcolor: '#f5f5f5', color: '#555'}} /></TableCell>
                                <TableCell align="right" sx={{fontWeight:'bold', color:'#1a233b', fontSize: '0.85rem'}}>{formatMoney(item.valor)}</TableCell>
                                <TableCell align="center">
                                    <Chip 
                                        label={item.pago ? "Pago" : "Pendente"} 
                                        size="small" 
                                        color={item.pago ? 'success' : 'warning'} 
                                        variant={item.pago ? 'filled' : 'outlined'} 
                                        sx={{ fontSize: '0.7rem' }}
                                    />
                                </TableCell>
                                <TableCell align="center">
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <IconButton size="small" onClick={() => handleOpenEdit(item)}>
                                            <Edit sx={{ fontSize: 18, color: '#1976d2' }} />
                                        </IconButton>
                                        {!item.pago && (
                                            <IconButton size="small" onClick={() => handleToggleStatus(item)} title="Marcar como Pago">
                                                <CheckCircle sx={{ fontSize: 18, color: '#2e7d32' }} />
                                            </IconButton>
                                        )}
                                        <IconButton size="small" onClick={() => handleDelete(item.id)} color="error">
                                            <Delete sx={{ fontSize: 18 }} />
                                        </IconButton>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={7} align="center" sx={{py:4, color:'#999', fontSize: '0.85rem'}}>Nenhuma despesa encontrada.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* MODAL PADRÃO (BONITO) PARA CRIAÇÃO */}
            <LancamentoCaixaModal 
                open={openNovoLancamentoModal} 
                onClose={() => { setOpenNovoLancamentoModal(false); fetchData(); }} 
                initialTab={1} // Aba de "Avulso"
                initialType="despesa" // Já seleciona Despesa
            />

            {/* MODAL INTERNO (SIMPLES) APENAS PARA EDIÇÃO */}
            <Dialog open={openEditModal} onClose={() => setOpenEditModal(false)} fullWidth maxWidth="sm">
                <DialogTitle sx={{ fontWeight: 'bold', color: '#1a233b', fontSize: '1rem', borderBottom: '1px solid #f0f0f0', pb: 1 }}>
                    Editar Despesa
                </DialogTitle>
                <form onSubmit={handleSaveEdit}>
                    <DialogContent sx={{ pt: 2, bgcolor: '#fcfcfc' }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <Paper elevation={0} variant="outlined" sx={{ p: 2, bgcolor: '#fff' }}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12}>
                                            <TextField label="Descrição" fullWidth required size="medium" value={editFormData.descricao || ''} onChange={(e) => setEditFormData({...editFormData, descricao: e.target.value})} />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField select label="Categoria" fullWidth required size="medium" value={editFormData.categoria || ''} onChange={(e) => setEditFormData({...editFormData, categoria: e.target.value})}>
                                                {categorias.map(cat => <MenuItem key={cat.id} value={cat.id}>{cat.nome}</MenuItem>)}
                                            </TextField>
                                        </Grid>
                                    </Grid>
                                </Paper>
                            </Grid>

                            <Grid item xs={12}>
                                <Paper elevation={0} variant="outlined" sx={{ p: 2, bgcolor: '#fff' }}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={6}>
                                            <TextField label="Valor (R$)" type="number" fullWidth required size="medium" value={editFormData.valor || ''} onChange={(e) => setEditFormData({...editFormData, valor: e.target.value})} InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}/>
                                        </Grid>
                                        <Grid item xs={6} display="flex" alignItems="center">
                                            <FormControlLabel control={<Switch checked={!!editFormData.pago} onChange={(e) => setEditFormData({...editFormData, pago: e.target.checked})} color="success"/>} label={<Typography fontSize="0.9rem">Já Pago?</Typography>} />
                                        </Grid>
                                        
                                        <Grid item xs={12}>
                                            <DatePicker label="Vencimento" value={editFormData.data_vencimento ? dayjs(editFormData.data_vencimento) : null} onChange={(v) => setEditFormData({...editFormData, data_vencimento: v ? v.format('YYYY-MM-DD') : ''})} slotProps={{ textField: { fullWidth: true, size: 'medium' } }}/>
                                        </Grid>

                                        {editFormData.pago && (
                                            <Grid item xs={12}>
                                                <DatePicker 
                                                    label="Data Pagamento" 
                                                    value={editFormData.data_pagamento ? dayjs(editFormData.data_pagamento) : null} 
                                                    onChange={(v) => setEditFormData({...editFormData, data_pagamento: v ? v.format('YYYY-MM-DD') : ''})} 
                                                    slotProps={{ textField: { fullWidth: true, size: 'medium', color: 'success', focused: true } }}
                                                />
                                            </Grid>
                                        )}
                                    </Grid>
                                </Paper>
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: 2, bgcolor: '#fcfcfc', borderTop: '1px solid #f0f0f0' }}>
                        <Button onClick={() => setOpenEditModal(false)} size="small" sx={{color: '#666'}}>Cancelar</Button>
                        <Button type="submit" variant="contained" disabled={isSubmitting} size="small" sx={{ bgcolor: '#1a233b', px: 3 }}>
                            {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Salvar Alterações'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
}