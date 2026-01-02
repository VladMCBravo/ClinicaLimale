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
    MoneyOff, CheckCircle, Warning, BarChart as BarChartIcon 
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell 
} from 'recharts'; // Importação do Gráfico
import dayjs from 'dayjs';

import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';

// Importamos o Modal Padronizado
import LancamentoCaixaModal from './LancamentoCaixaModal';

// Formatação compacta de moeda para o gráfico
const formatCurrencyCompact = (value) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value;
};

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatDataSimples = (dataISO) => {
    if (!dataISO) return '-';
    const partes = dataISO.split('T')[0].split('-'); 
    if(partes.length < 3) return '-';
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

export default function DespesasView() {
    const { showSnackbar } = useSnackbar();
    
    // Dados
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
    
    // Edição
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

        lista.sort((a, b) => new Date(b.data_vencimento) - new Date(a.data_vencimento));
        setFilteredDespesas(lista);
    }, [despesas, mesFiltro, anoFiltro, searchTerm]);

    // --- KPIs (Baseados no filtro atual) ---
    const financialSummary = useMemo(() => {
        return filteredDespesas.reduce((acc, item) => {
            const valor = parseFloat(item.valor) || 0;
            acc.total += valor;
            if (item.pago) acc.pagas += valor;
            else acc.aPagar += valor;
            return acc;
        }, { pagas: 0, aPagar: 0, total: 0 });
    }, [filteredDespesas]);

    // --- DADOS DO GRÁFICO (Baseado em TODO o período carregado, conforme solicitado) ---
    const chartData = useMemo(() => {
        const groups = {};
        // Usa 'despesas' (sem filtro) para mostrar todo o período, ou 'filteredDespesas' se quiser dinamico.
        // O pedido foi "todo o período da clínica", então usamos 'despesas'.
        despesas.forEach(d => {
            const cat = d.categoria_nome || 'Sem Categoria';
            groups[cat] = (groups[cat] || 0) + parseFloat(d.valor);
        });

        // Transforma em array e ordena (Top 5 categorias para caber no gráfico pequeno)
        return Object.keys(groups)
            .map(key => ({ name: key, value: groups[key] }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); 
    }, [despesas]);

    // --- AÇÕES ---
    const handleOpenCreate = () => setOpenNovoLancamentoModal(true);

    const handleOpenEdit = (item) => {
        setEditFormData({
            id: item.id,
            descricao: item.descricao,
            valor: item.valor,
            categoria: item.categoria,
            data_vencimento: item.data_vencimento,
            data_pagamento: item.data_pagamento || dayjs().format('YYYY-MM-DD'),
            pago: item.pago
        });
        setOpenEditModal(true);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                ...editFormData,
                data_despesa: editFormData.data_vencimento, // Sincronização background
                data_pagamento: editFormData.pago ? editFormData.data_pagamento : null
            };
            await faturamentoService.updateDespesa(editFormData.id, payload);
            showSnackbar('Despesa atualizada!', 'success');
            setOpenEditModal(false);
            fetchData();
        } catch (error) {
            showSnackbar('Erro ao atualizar.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (despesa) => {
        const novoStatus = !despesa.pago;
        setDespesas(prev => prev.map(d => d.id === despesa.id ? { ...d, pago: novoStatus } : d));
        try {
            const payload = {
                id: despesa.id,
                descricao: despesa.descricao,
                valor: despesa.valor,
                categoria: despesa.categoria,
                data_despesa: despesa.data_despesa,
                data_vencimento: despesa.data_vencimento,
                pago: novoStatus,
                data_pagamento: novoStatus ? dayjs().format('YYYY-MM-DD') : null
            };
            await faturamentoService.updateDespesa(despesa.id, payload);
            showSnackbar(novoStatus ? 'Pago!' : 'Pendente.', 'success');
        } catch (error) {
            fetchData();
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

    const getVencimentoColor = (dataVenc, pago) => {
        if (pago) return 'text.secondary';
        const hoje = dayjs();
        const venc = dayjs(dataVenc);
        if (venc.isBefore(hoje, 'day')) return 'error.main'; 
        if (venc.isSame(hoje, 'day')) return 'warning.main'; 
        return 'text.primary';
    };

    // Componente Card Compacto para KPIs
    const CompactKpi = ({ title, value, color, icon: Icon }) => (
        <Paper elevation={0} sx={{ 
            p: 1.5, flex: 1, border: '1px solid #e0e0e0', borderRadius: '8px', 
            display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%',
            bgcolor: '#fff'
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
                    {title}
                </Typography>
                <Icon sx={{ color: color, fontSize: '1rem', opacity: 0.6 }} />
            </Box>
            <Typography variant="h6" fontWeight="bold" sx={{ color: color, fontSize: '1.1rem' }}>
                {formatMoney(value)}
            </Typography>
        </Paper>
    );

    return (
        <Box sx={{ p: 1 }}>
            
            {/* 1. SEÇÃO TOPO: KPIs (Esquerda) + GRÁFICO (Direita) */}
            <Grid container spacing={1.5} sx={{ mb: 1.5, height: '140px' }}>
                
                {/* ESQUERDA: KPIs em linha */}
                <Grid item xs={12} md={7} sx={{ height: '100%' }}>
                    <Grid container spacing={1.5} sx={{ height: '100%' }}>
                        <Grid item xs={4} sx={{ height: '100%' }}>
                            <CompactKpi title="TOTAL GERAL" value={financialSummary.total} color="#1a233b" icon={MoneyOff} />
                        </Grid>
                        <Grid item xs={4} sx={{ height: '100%' }}>
                            <CompactKpi title="TOTAL PAGO" value={financialSummary.pagas} color="#2e7d32" icon={CheckCircle} />
                        </Grid>
                        <Grid item xs={4} sx={{ height: '100%' }}>
                            <CompactKpi title="A PAGAR" value={financialSummary.aPagar} color="#d32f2f" icon={Warning} />
                        </Grid>
                    </Grid>
                </Grid>

                {/* DIREITA: Gráfico Compacto */}
                <Grid item xs={12} md={5} sx={{ height: '100%' }}>
                    <Paper elevation={0} sx={{ 
                        p: 1, height: '100%', border: '1px solid #e0e0e0', borderRadius: '8px',
                        display: 'flex', flexDirection: 'column', bgcolor: '#fff'
                    }}>
                        <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ ml: 1, mb: 0.5, fontSize: '0.65rem' }}>
                            GASTOS POR CATEGORIA (TOP 5)
                        </Typography>
                        <Box sx={{ flexGrow: 1, width: '100%', minHeight: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                    <XAxis type="number" hide />
                                    <YAxis 
                                        type="category" 
                                        dataKey="name" 
                                        width={80} 
                                        tick={{fontSize: 10, fill: '#666'}} 
                                        interval={0}
                                    />
                                    <RechartsTooltip 
                                        formatter={(value) => formatMoney(value)}
                                        contentStyle={{ fontSize: '12px', borderRadius: '4px', border: 'none', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="value" fill="#1a233b" radius={[0, 4, 4, 0]} barSize={12}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#1a233b' : '#3949ab'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* 2. FILTROS E BOTÃO (Compacto) */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, gap: 1 }}>
                <Box sx={{ display: 'flex', gap: 1, flexGrow: 1 }}>
                    <FormControl size="small" sx={{ width: 120 }}>
                        <Select 
                            value={mesFiltro} 
                            displayEmpty 
                            onChange={(e) => setMesFiltro(e.target.value)} 
                            sx={{ fontSize: '0.75rem', bgcolor: '#fff', height: '32px' }}
                        >
                            <MenuItem value=""><em>Todos Meses</em></MenuItem>
                            {Array.from({length: 12}, (_, i) => (
                                <MenuItem key={i} value={i} sx={{fontSize: '0.75rem'}}>{dayjs().month(i).format('MMMM')}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ width: 80 }}>
                        <Select 
                            value={anoFiltro} 
                            onChange={(e) => setAnoFiltro(e.target.value)} 
                            sx={{ fontSize: '0.75rem', bgcolor: '#fff', height: '32px' }}
                        >
                            <MenuItem value={2024} sx={{fontSize: '0.75rem'}}>2024</MenuItem>
                            <MenuItem value={2025} sx={{fontSize: '0.75rem'}}>2025</MenuItem>
                            <MenuItem value={2026} sx={{fontSize: '0.75rem'}}>2026</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField 
                        size="small"
                        placeholder="Buscar despesa..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{ 
                            startAdornment: <InputAdornment position="start"><Search sx={{fontSize: 18, color: '#999'}} /></InputAdornment>,
                            style: { fontSize: '0.75rem', height: '32px' }
                        }}
                        sx={{ flexGrow: 1, bgcolor: 'white', maxWidth: '300px' }}
                    />
                </Box>

                <Button 
                    variant="contained" 
                    startIcon={<AddCircleOutline sx={{fontSize: 16}} />} 
                    onClick={handleOpenCreate} 
                    sx={{ 
                        bgcolor: '#1a233b', '&:hover': { bgcolor: '#2c3a5b' },
                        height: '32px', fontSize: '0.75rem', textTransform: 'none', px: 2 
                    }}
                >
                    Nova Despesa
                </Button>
            </Box>

            {/* 3. TABELA COMPACTA */}
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #f0f0f0', borderRadius: '8px' }}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                        <TableRow>
                            <TableCell sx={{fontWeight:'bold', color:'#666', fontSize:'0.7rem', py: 1, width: '90px'}}>Vencimento</TableCell>
                            <TableCell sx={{fontWeight:'bold', color:'#666', fontSize:'0.7rem', py: 1, width: '90px'}}>Pagamento</TableCell>
                            <TableCell sx={{fontWeight:'bold', color:'#666', fontSize:'0.7rem', py: 1}}>Descrição</TableCell>
                            <TableCell sx={{fontWeight:'bold', color:'#666', fontSize:'0.7rem', py: 1}}>Categoria</TableCell>
                            <TableCell align="right" sx={{fontWeight:'bold', color:'#666', fontSize:'0.7rem', py: 1}}>Valor</TableCell>
                            <TableCell align="center" sx={{fontWeight:'bold', color:'#666', fontSize:'0.7rem', py: 1}}>Status</TableCell>
                            <TableCell align="center" sx={{fontWeight:'bold', color:'#666', fontSize:'0.7rem', py: 1}}>Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredDespesas.length > 0 ? filteredDespesas.map((item) => (
                            <TableRow key={item.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}>
                                    <Typography variant="body2" fontWeight="500" color={getVencimentoColor(item.data_vencimento, item.pago)} sx={{ fontSize: '0.75rem' }}>
                                        {formatDataSimples(item.data_vencimento)}
                                    </Typography>
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}>
                                    {item.data_pagamento ? (
                                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#2e7d32', bgcolor: '#e8f5e9', px: 0.6, py: 0.2, borderRadius: 1, fontSize: '0.7rem' }}>
                                            {formatDataSimples(item.data_pagamento)}
                                        </Typography>
                                    ) : '-'}
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}>{item.descricao}</TableCell>
                                <TableCell sx={{ py: 0.5 }}><Chip label={item.categoria_nome} size="small" sx={{fontSize:'0.65rem', height: 18, bgcolor: '#f5f5f5', color: '#666'}} /></TableCell>
                                <TableCell align="right" sx={{fontWeight:'bold', color:'#1a233b', fontSize: '0.75rem', py: 0.5}}>{formatMoney(item.valor)}</TableCell>
                                <TableCell align="center" sx={{ py: 0.5 }}>
                                    <Chip 
                                        label={item.pago ? "Pago" : "Pendente"} 
                                        size="small" 
                                        color={item.pago ? 'success' : 'warning'} 
                                        variant={item.pago ? 'filled' : 'outlined'} 
                                        sx={{ fontSize: '0.65rem', height: 20 }}
                                    />
                                </TableCell>
                                <TableCell align="center" sx={{ py: 0.5 }}>
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
                            <TableRow><TableCell colSpan={7} align="center" sx={{py:3, color:'#999', fontSize: '0.75rem'}}>Nenhuma despesa encontrada.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Modal de Criação (Bonito) */}
            <LancamentoCaixaModal 
                open={openNovoLancamentoModal} 
                onClose={() => { setOpenNovoLancamentoModal(false); fetchData(); }} 
                initialTab={1} 
                initialType="despesa" 
            />

            {/* Modal de Edição (Simples) */}
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
        </Box>
    );
}