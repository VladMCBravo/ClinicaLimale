import React, { useState, useEffect, useMemo } from 'react';
import {
    Button, CircularProgress, TextField, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Select, MenuItem, FormControl, IconButton,
    FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions,
    Typography, Grid, Switch, InputAdornment, Chip, Box
} from '@mui/material';
import { 
    Edit, Delete, AddCircleOutline, Search, 
    MoneyOff, CheckCircle, Warning 
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell 
} from 'recharts';
import dayjs from 'dayjs';

import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import LancamentoCaixaModal from './LancamentoCaixaModal';

// IMPORTAÇÃO DO CSS PADRÃO
import './FinanceiroCommon.css';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatDataSimples = (dataISO) => {
    if (!dataISO) return '-';
    const partes = dataISO.split('T')[0].split('-'); 
    if(partes.length < 3) return '-';
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

export default function DespesasView() {
    const { showSnackbar } = useSnackbar();
    
    // Estados
    const [despesas, setDespesas] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [filteredDespesas, setFilteredDespesas] = useState([]);
    
    // UI
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [mesFiltro, setMesFiltro] = useState(''); 
    const [anoFiltro, setAnoFiltro] = useState(dayjs().year());

    // Modais
    const [openNovoLancamentoModal, setOpenNovoLancamentoModal] = useState(false);
    const [openEditModal, setOpenEditModal] = useState(false);
    const [editFormData, setEditFormData] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

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
        lista.sort((a, b) => new Date(b.data_vencimento) - new Date(a.data_vencimento));
        setFilteredDespesas(lista);
    }, [despesas, mesFiltro, anoFiltro, searchTerm]);

    const financialSummary = useMemo(() => {
        return filteredDespesas.reduce((acc, item) => {
            const valor = parseFloat(item.valor) || 0;
            acc.total += valor;
            if (item.pago) acc.pagas += valor;
            else acc.aPagar += valor;
            return acc;
        }, { pagas: 0, aPagar: 0, total: 0 });
    }, [filteredDespesas]);

    // DADOS DO GRÁFICO (Top 5 categorias)
    const chartData = useMemo(() => {
        const groups = {};
        despesas.forEach(d => {
            const cat = d.categoria_nome || 'Outros';
            groups[cat] = (groups[cat] || 0) + parseFloat(d.valor);
        });
        return Object.keys(groups)
            .map(key => ({ name: key, value: groups[key] }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6); 
    }, [despesas]);

    // --- HANDLERS ---
    const handleOpenCreate = () => setOpenNovoLancamentoModal(true);
    
    const handleOpenEdit = (item) => {
        setEditFormData({ ...item, data_pagamento: item.data_pagamento || dayjs().format('YYYY-MM-DD') });
        setOpenEditModal(true);
    };
    
    const handleSaveEdit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = { ...editFormData, data_despesa: editFormData.data_vencimento, data_pagamento: editFormData.pago ? editFormData.data_pagamento : null };
            await faturamentoService.updateDespesa(editFormData.id, payload);
            showSnackbar('Atualizado!', 'success');
            setOpenEditModal(false);
            fetchData();
        } catch (error) { showSnackbar('Erro ao atualizar.', 'error'); } finally { setIsSubmitting(false); }
    };
    
    const handleToggleStatus = async (despesa) => {
        const novoStatus = !despesa.pago;
        setDespesas(prev => prev.map(d => d.id === despesa.id ? { ...d, pago: novoStatus } : d));
        try {
            await faturamentoService.updateDespesa(despesa.id, { ...despesa, pago: novoStatus, data_pagamento: novoStatus ? dayjs().format('YYYY-MM-DD') : null });
            showSnackbar(novoStatus ? 'Pago!' : 'Pendente.', 'success');
        } catch (error) { fetchData(); showSnackbar('Erro.', 'error'); }
    };
    
    const handleDelete = async (id) => {
        if(window.confirm("Excluir?")) {
            await faturamentoService.deleteDespesa(id);
            fetchData();
            showSnackbar('Excluído.', 'success');
        }
    };
    
    const getVencimentoColor = (dataVenc, pago) => {
        if (pago) return 'text.secondary';
        const hoje = dayjs();
        const venc = dayjs(dataVenc);
        if (venc.isBefore(hoje, 'day')) return 'error.main'; 
        if (venc.isSame(hoje, 'day')) return 'warning.main'; 
        return 'text.primary';
    };

    return (
        <div className="financeiro-view-container">
            
            {/* 1. SEÇÃO TOPO: KPIs e GRÁFICO */}
            <div className="financeiro-top-section">
                
                {/* ESQUERDA: KPIs */}
                <div className="kpi-group">
                    <div className="kpi-card">
                        <div className="kpi-header">
                            <span className="kpi-title">TOTAL GERAL</span>
                            <MoneyOff className="kpi-icon" sx={{ color: '#1a233b' }} />
                        </div>
                        <span className="kpi-value" style={{ color: '#1a233b' }}>
                            {formatMoney(financialSummary.total)}
                        </span>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-header">
                            <span className="kpi-title">TOTAL PAGO</span>
                            <CheckCircle className="kpi-icon" sx={{ color: '#2e7d32' }} />
                        </div>
                        <span className="kpi-value" style={{ color: '#2e7d32' }}>
                            {formatMoney(financialSummary.pagas)}
                        </span>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-header">
                            <span className="kpi-title">A PAGAR</span>
                            <Warning className="kpi-icon" sx={{ color: '#d32f2f' }} />
                        </div>
                        <span className="kpi-value" style={{ color: '#d32f2f' }}>
                            {formatMoney(financialSummary.aPagar)}
                        </span>
                    </div>
                </div>

                {/* DIREITA: Gráfico Horizontal */}
                <div className="chart-container-box">
                    <div className="chart-title">GASTOS POR CATEGORIA</div>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis 
                                    dataKey="name" 
                                    tick={{fontSize: 10, fill: '#666'}} 
                                    interval={0}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => value.length > 12 ? `${value.substring(0, 12)}...` : value}
                                />
                                <YAxis 
                                    tick={{fontSize: 10, fill: '#ccc'}} 
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `R$${val/1000}k`}
                                />
                                <RechartsTooltip 
                                    cursor={{fill: '#f5f5f5'}}
                                    formatter={(value) => [formatMoney(value), 'Total']}
                                    contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={30}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#1a233b' : '#3949ab'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* 2. BARRA DE FERRAMENTAS */}
            <div className="toolbar-container">
                <div className="toolbar-left">
                    <FormControl size="small" sx={{ width: 120 }}>
                        <Select 
                            value={mesFiltro} 
                            displayEmpty 
                            onChange={(e) => setMesFiltro(e.target.value)} 
                            sx={{ fontSize: '0.8rem', bgcolor: '#fff', height: '36px' }}
                        >
                            <MenuItem value=""><em>Todos Meses</em></MenuItem>
                            {Array.from({length: 12}, (_, i) => (
                                <MenuItem key={i} value={i} sx={{fontSize: '0.8rem'}}>{dayjs().month(i).format('MMMM')}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ width: 80 }}>
                        <Select 
                            value={anoFiltro} 
                            onChange={(e) => setAnoFiltro(e.target.value)} 
                            sx={{ fontSize: '0.8rem', bgcolor: '#fff', height: '36px' }}
                        >
                            <MenuItem value={2024} sx={{fontSize: '0.8rem'}}>2024</MenuItem>
                            <MenuItem value={2025} sx={{fontSize: '0.8rem'}}>2025</MenuItem>
                            <MenuItem value={2026} sx={{fontSize: '0.8rem'}}>2026</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField 
                        size="small"
                        placeholder="Buscar despesa..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{ 
                            startAdornment: <InputAdornment position="start"><Search sx={{fontSize: 18, color: '#999'}} /></InputAdornment>,
                            style: { fontSize: '0.8rem', height: '36px' }
                        }}
                        sx={{ bgcolor: 'white', width: '300px' }}
                    />
                </div>

                <Button 
                    variant="contained" 
                    startIcon={<AddCircleOutline sx={{fontSize: 18}} />} 
                    onClick={handleOpenCreate} 
                    sx={{ 
                        bgcolor: '#1a233b', '&:hover': { bgcolor: '#2c3a5b' },
                        height: '36px', fontSize: '0.8rem', textTransform: 'none', px: 3, fontWeight: 600
                    }}
                >
                    NOVA DESPESA
                </Button>
            </div>

            {/* 3. TABELA (CSS Padrão) */}
            <TableContainer component={Paper} elevation={0} className="financeiro-table-container">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell className="table-header-cell" style={{width: '90px'}}>Vencimento</TableCell>
                            <TableCell className="table-header-cell" style={{width: '90px'}}>Pagamento</TableCell>
                            <TableCell className="table-header-cell">Descrição</TableCell>
                            <TableCell className="table-header-cell">Categoria</TableCell>
                            <TableCell align="right" className="table-header-cell">Valor</TableCell>
                            <TableCell align="center" className="table-header-cell">Status</TableCell>
                            <TableCell align="center" className="table-header-cell">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredDespesas.length > 0 ? filteredDespesas.map((item) => (
                            <TableRow key={item.id} hover>
                                <TableCell className="table-body-cell">
                                    <Typography variant="body2" fontWeight="500" color={getVencimentoColor(item.data_vencimento, item.pago)} sx={{ fontSize: '0.8rem' }}>
                                        {formatDataSimples(item.data_vencimento)}
                                    </Typography>
                                </TableCell>
                                <TableCell className="table-body-cell">
                                    {item.data_pagamento ? (
                                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#2e7d32', bgcolor: '#e8f5e9', px: 0.6, py: 0.2, borderRadius: 1, fontSize: '0.75rem' }}>
                                            {formatDataSimples(item.data_pagamento)}
                                        </Typography>
                                    ) : '-'}
                                </TableCell>
                                <TableCell className="table-body-cell">{item.descricao}</TableCell>
                                <TableCell className="table-body-cell">
                                    <Chip label={item.categoria_nome} size="small" sx={{fontSize:'0.7rem', height: 20, bgcolor: '#f5f5f5', color: '#666'}} />
                                </TableCell>
                                <TableCell align="right" className="table-body-cell" sx={{fontWeight:'bold', color:'#1a233b'}}>
                                    {formatMoney(item.valor)}
                                </TableCell>
                                <TableCell align="center" className="table-body-cell">
                                    <Chip 
                                        label={item.pago ? "Pago" : "Pendente"} 
                                        size="small" 
                                        color={item.pago ? 'success' : 'warning'} 
                                        variant={item.pago ? 'filled' : 'outlined'} 
                                        sx={{ fontSize: '0.7rem', height: 22 }}
                                    />
                                </TableCell>
                                <TableCell align="center" className="table-body-cell">
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <IconButton size="small" onClick={() => handleOpenEdit(item)} sx={{p: 0.5}}>
                                            <Edit sx={{ fontSize: 16, color: '#1976d2' }} />
                                        </IconButton>
                                        {!item.pago && (
                                            <IconButton size="small" onClick={() => handleToggleStatus(item)} title="Marcar como Pago" sx={{p: 0.5}}>
                                                <CheckCircle sx={{ fontSize: 16, color: '#2e7d32' }} />
                                            </IconButton>
                                        )}
                                        <IconButton size="small" onClick={() => handleDelete(item.id)} color="error" sx={{p: 0.5}}>
                                            <Delete sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={7} align="center" sx={{py:3, color:'#999', fontSize: '0.8rem'}}>Nenhuma despesa encontrada.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* MODAIS */}
            <LancamentoCaixaModal 
                open={openNovoLancamentoModal} 
                onClose={() => { setOpenNovoLancamentoModal(false); fetchData(); }} 
                initialTab={1} 
                initialType="despesa" 
            />

            <Dialog open={openEditModal} onClose={() => setOpenEditModal(false)} fullWidth maxWidth="sm">
                <DialogTitle sx={{ fontWeight: 'bold', color: '#1a233b', fontSize: '0.9rem', borderBottom: '1px solid #f0f0f0', py: 1.5 }}>
                    Editar Despesa
                </DialogTitle>
                <form onSubmit={handleSaveEdit}>
                    <DialogContent sx={{ pt: 2, bgcolor: '#fcfcfc' }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <Paper elevation={0} variant="outlined" sx={{ p: 2, bgcolor: '#fff' }}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12}>
                                            <TextField label="Descrição" fullWidth required size="small" value={editFormData.descricao || ''} onChange={(e) => setEditFormData({...editFormData, descricao: e.target.value})} InputLabelProps={{style: {fontSize: '0.8rem'}}} />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField select label="Categoria" fullWidth required size="small" value={editFormData.categoria || ''} onChange={(e) => setEditFormData({...editFormData, categoria: e.target.value})} SelectProps={{style: {fontSize: '0.8rem'}}} InputLabelProps={{style: {fontSize: '0.8rem'}}}>
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
                                            <TextField label="Valor (R$)" type="number" fullWidth required size="small" value={editFormData.valor || ''} onChange={(e) => setEditFormData({...editFormData, valor: e.target.value})} InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment>, style: {fontSize: '0.8rem'} }} InputLabelProps={{style: {fontSize: '0.8rem'}}} />
                                        </Grid>
                                        <Grid item xs={6} display="flex" alignItems="center">
                                            <FormControlLabel control={<Switch size="small" checked={!!editFormData.pago} onChange={(e) => setEditFormData({...editFormData, pago: e.target.checked})} color="success"/>} label={<Typography fontSize="0.8rem">Já Pago?</Typography>} />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <DatePicker label="Vencimento" value={editFormData.data_vencimento ? dayjs(editFormData.data_vencimento) : null} onChange={(v) => setEditFormData({...editFormData, data_vencimento: v ? v.format('YYYY-MM-DD') : ''})} slotProps={{ textField: { fullWidth: true, size: 'small' } }} />
                                        </Grid>
                                        {editFormData.pago && (
                                            <Grid item xs={12}>
                                                <DatePicker label="Data Pagamento" value={editFormData.data_pagamento ? dayjs(editFormData.data_pagamento) : null} onChange={(v) => setEditFormData({...editFormData, data_pagamento: v ? v.format('YYYY-MM-DD') : ''})} slotProps={{ textField: { fullWidth: true, size: 'small', color: 'success', focused: true } }} />
                                            </Grid>
                                        )}
                                    </Grid>
                                </Paper>
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: 1.5, bgcolor: '#fcfcfc', borderTop: '1px solid #f0f0f0' }}>
                        <Button onClick={() => setOpenEditModal(false)} size="small" sx={{color: '#666', fontSize: '0.75rem'}}>Cancelar</Button>
                        <Button type="submit" variant="contained" disabled={isSubmitting} size="small" sx={{ bgcolor: '#1a233b', px: 3, fontSize: '0.75rem' }}>
                            {isSubmitting ? <CircularProgress size={16} color="inherit" /> : 'Salvar Alterações'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </div>
    );
}