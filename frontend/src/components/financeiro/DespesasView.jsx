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
    CalendarMonth, MoneyOff, CheckCircle, Warning 
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';

// Estado inicial do formulário
const initialFormState = { 
    descricao: '', 
    valor: '', 
    categoria: '', 
    data_despesa: dayjs().format('YYYY-MM-DD'),
    data_vencimento: dayjs().format('YYYY-MM-DD'),
    parcelado: false,
    qtd_parcelas: 1,
    pago: false
};

export default function DespesasView() {
    const { showSnackbar } = useSnackbar();
    
    // Dados
    const [despesas, setDespesas] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [filteredDespesas, setFilteredDespesas] = useState([]);
    
    // Filtros e UI
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [mesFiltro, setMesFiltro] = useState(dayjs().month()); // 0-11
    const [anoFiltro, setAnoFiltro] = useState(dayjs().year());

    // Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState(initialFormState);
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

    useEffect(() => {
        fetchData();
    }, []);

    // --- FILTRAGEM ---
    useEffect(() => {
        let lista = despesas;

        // 1. Filtro de Mês/Ano (pela data de vencimento ou despesa)
        lista = lista.filter(d => {
            const dataRef = d.data_vencimento || d.data_despesa;
            const dataObj = dayjs(dataRef);
            return dataObj.month() === mesFiltro && dataObj.year() === anoFiltro;
        });

        // 2. Busca textual
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            lista = lista.filter(d => 
                d.descricao.toLowerCase().includes(term) || 
                (d.categoria_nome && d.categoria_nome.toLowerCase().includes(term))
            );
        }

        // Ordenar: Pendentes e Vencidos primeiro
        lista.sort((a, b) => {
            if (a.pago === b.pago) return new Date(a.data_vencimento) - new Date(b.data_vencimento);
            return a.pago ? 1 : -1;
        });

        setFilteredDespesas(lista);
    }, [despesas, mesFiltro, anoFiltro, searchTerm]);

    // --- CÁLCULO DE TOTAIS (KPIs) ---
    const financialSummary = useMemo(() => {
        return filteredDespesas.reduce((acc, item) => {
            const valor = parseFloat(item.valor) || 0;
            acc.total += valor;
            if (item.pago) { 
                acc.pagas += valor;
            } else {
                acc.aPagar += valor;
            }
            return acc;
        }, { pagas: 0, aPagar: 0, total: 0 });
    }, [filteredDespesas]);

    // --- HANDLERS DE MODAL ---
    const handleOpenCreate = () => {
        setIsEditing(false);
        setFormData(initialFormState);
        setModalOpen(true);
    };

    const handleOpenEdit = (item) => {
        setIsEditing(true);
        setFormData({
            ...item,
            // Garante formato correto para inputs
            categoria: item.categoria, 
            data_despesa: item.data_despesa,
            data_vencimento: item.data_vencimento || item.data_despesa,
            parcelado: false, // Não editamos parcelamento em massa na edição individual
            qtd_parcelas: 1
        });
        setModalOpen(true);
    };

    // --- AÇÕES CRUD ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (isEditing) {
                // UPDATE
                await faturamentoService.updateDespesa(formData.id, formData);
                showSnackbar('Despesa atualizada!', 'success');
            } else {
                // CREATE (Com lógica de parcelas)
                if (formData.parcelado && formData.qtd_parcelas > 1) {
                    const promises = [];
                    const valorParcela = parseFloat(formData.valor) / formData.qtd_parcelas;
                    let dataBaseVencimento = dayjs(formData.data_vencimento);
                    let dataBaseEmissao = dayjs(formData.data_despesa);

                    for (let i = 0; i < formData.qtd_parcelas; i++) {
                        const payload = {
                            ...formData,
                            descricao: `${formData.descricao} (${i + 1}/${formData.qtd_parcelas})`,
                            valor: valorParcela.toFixed(2),
                            data_despesa: dataBaseEmissao.add(i, 'month').format('YYYY-MM-DD'),
                            data_vencimento: dataBaseVencimento.add(i, 'month').format('YYYY-MM-DD')
                        };
                        promises.push(faturamentoService.createDespesa(payload));
                    }
                    await Promise.all(promises);
                    showSnackbar(`${formData.qtd_parcelas} parcelas geradas!`, 'success');
                } else {
                    await faturamentoService.createDespesa(formData);
                    showSnackbar('Despesa lançada!', 'success');
                }
            }
            setModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            showSnackbar('Erro ao salvar.', 'error');
        } finally {
            setIsSubmitting(false);
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

    const handleToggleStatus = async (despesa) => {
        const novoStatus = !despesa.pago;
        // Optimistic UI Update
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
                // Se marcou como pago agora, define data_pagamento hoje, senão null
                data_pagamento: novoStatus ? dayjs().format('YYYY-MM-DD') : null
            };
            await faturamentoService.updateDespesa(despesa.id, payload);
            showSnackbar(novoStatus ? 'Pago!' : 'Pendente.', 'success');
        } catch (error) {
            fetchData(); // Reverte em caso de erro
            showSnackbar('Erro ao atualizar.', 'error');
        }
    };

    const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const formatDate = (date) => date ? dayjs(date).format('DD/MM/YYYY') : '-';

    // Helper para cor do vencimento
    const getVencimentoColor = (dataVenc, pago) => {
        if (pago) return 'text.secondary';
        const hoje = dayjs();
        const venc = dayjs(dataVenc);
        if (venc.isBefore(hoje, 'day')) return 'error.main'; // Atrasado
        if (venc.isSame(hoje, 'day')) return 'warning.main'; // Vence hoje
        return 'text.primary';
    };

    // Componente de Card KPI
    const KpiCard = ({ title, value, color, icon: Icon, bgColor }) => (
        <Paper elevation={0} sx={{ 
            p: 2, flex: 1, border: '1px solid #e0e0e0', borderRadius: '12px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            bgcolor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
            <Box>
                <Typography variant="caption" fontWeight="bold" sx={{color: '#7f8c8d', textTransform: 'uppercase'}}>{title}</Typography>
                <Typography variant="h5" fontWeight="bold" sx={{color: color, mt: 0.5}}>{formatMoney(value)}</Typography>
            </Box>
            <Box sx={{ 
                bgcolor: bgColor, color: color, 
                width: 40, height: 40, borderRadius: '10px', 
                display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
                <Icon fontSize="medium" />
            </Box>
        </Paper>
    );

    return (
        <Box sx={{ p: 1 }}>
            
            {/* 1. TOPO: FILTROS E BOTÃO NOVO */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Mês</InputLabel>
                        <Select value={mesFiltro} label="Mês" onChange={(e) => setMesFiltro(e.target.value)}>
                            {Array.from({length: 12}, (_, i) => (
                                <MenuItem key={i} value={i}>{dayjs().month(i).format('MMMM')}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <InputLabel>Ano</InputLabel>
                        <Select value={anoFiltro} label="Ano" onChange={(e) => setAnoFiltro(e.target.value)}>
                            <MenuItem value={2024}>2024</MenuItem>
                            <MenuItem value={2025}>2025</MenuItem>
                            <MenuItem value={2026}>2026</MenuItem>
                        </Select>
                    </FormControl>
                </Box>

                <Button 
                    variant="contained" 
                    startIcon={<AddCircleOutline />}
                    onClick={handleOpenCreate}
                    sx={{ bgcolor: '#1a233b', '&:hover': { bgcolor: '#2c3a5b' }, borderRadius: '8px', px: 3 }}
                >
                    Nova Despesa
                </Button>
            </Box>

            {/* 2. KPIs */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                <KpiCard title="A Pagar (Este Mês)" value={financialSummary.aPagar} color="#dc3545" bgColor="#ffebee" icon={Warning} />
                <KpiCard title="Pago (Este Mês)" value={financialSummary.pagas} color="#28a745" bgColor="#e8f5e9" icon={CheckCircle} />
                <KpiCard title="Total Previsto" value={financialSummary.total} color="#1a233b" bgColor="#f4f7fa" icon={MoneyOff} />
            </Box>

            {/* 3. BARRA DE BUSCA */}
            <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid #f0f0f0', borderRadius: '12px' }}>
                <TextField 
                    fullWidth 
                    size="small" 
                    placeholder="Buscar por descrição ou categoria..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Search color="action" /></InputAdornment> }}
                    sx={{ bgcolor: '#f9f9f9', '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }}
                />
            </Paper>

            {/* 4. TABELA DE DADOS */}
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #f0f0f0', borderRadius: '12px', overflow: 'hidden' }}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                        <TableRow>
                            <TableCell sx={{fontWeight:'bold', color:'#555'}}>Vencimento</TableCell>
                            <TableCell sx={{fontWeight:'bold', color:'#555'}}>Descrição</TableCell>
                            <TableCell sx={{fontWeight:'bold', color:'#555'}}>Categoria</TableCell>
                            <TableCell align="right" sx={{fontWeight:'bold', color:'#555'}}>Valor</TableCell>
                            <TableCell align="center" sx={{fontWeight:'bold', color:'#555'}}>Status</TableCell>
                            <TableCell align="center" sx={{fontWeight:'bold', color:'#555'}}>Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredDespesas.length > 0 ? filteredDespesas.map((item) => (
                            <TableRow key={item.id} hover>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CalendarMonth fontSize="small" sx={{ color: 'action.active', opacity: 0.5 }} />
                                        <Typography variant="body2" fontWeight="bold" color={getVencimentoColor(item.data_vencimento, item.pago)}>
                                            {formatDate(item.data_vencimento)}
                                        </Typography>
                                    </Box>
                                </TableCell>
                                <TableCell>{item.descricao}</TableCell>
                                <TableCell><Chip label={item.categoria_nome} size="small" sx={{fontSize:'0.7rem', height: 24}} /></TableCell>
                                <TableCell align="right" sx={{fontWeight:'bold', color:'#1a233b'}}>
                                    {formatMoney(item.valor)}
                                </TableCell>
                                <TableCell align="center">
                                    <Tooltip title={item.pago ? "Marcar como pendente" : "Marcar como pago"}>
                                        <Switch 
                                            size="small" 
                                            checked={!!item.pago} 
                                            onChange={() => handleToggleStatus(item)}
                                            color="success"
                                        />
                                    </Tooltip>
                                </TableCell>
                                <TableCell align="center">
                                    <IconButton size="small" onClick={() => handleOpenEdit(item)}><Edit fontSize="small" /></IconButton>
                                    <IconButton size="small" onClick={() => handleDelete(item.id)} color="error"><Delete fontSize="small" /></IconButton>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{py:4, color:'#999'}}>Nenhuma despesa encontrada para este período.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* MODAL DE CRIAÇÃO/EDIÇÃO */}
            <Dialog open={modalOpen} onClose={() => setModalOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle sx={{ fontWeight: 'bold', color: '#1a233b' }}>
                    {isEditing ? 'Editar Despesa' : 'Nova Despesa'}
                </DialogTitle>
                <form onSubmit={handleSubmit}>
                    <DialogContent dividers>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField 
                                    label="Descrição" fullWidth required 
                                    value={formData.descricao} 
                                    onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                                    placeholder="Ex: Aluguel, Compra de Material"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField 
                                    select label="Categoria" fullWidth required 
                                    value={formData.categoria} 
                                    onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                                >
                                    {categorias.map(cat => <MenuItem key={cat.id} value={cat.id}>{cat.nome}</MenuItem>)}
                                </TextField>
                            </Grid>
                            <Grid item xs={6}>
                                <TextField 
                                    label="Valor (R$)" type="number" fullWidth required 
                                    value={formData.valor} 
                                    onChange={(e) => setFormData({...formData, valor: e.target.value})}
                                    InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <FormControlLabel
                                    control={<Switch checked={formData.pago} onChange={(e) => setFormData({...formData, pago: e.target.checked})} color="success"/>}
                                    label="Já Pago?"
                                    sx={{ mt: 1 }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <DatePicker 
                                    label="Data Emissão"
                                    value={dayjs(formData.data_despesa)}
                                    onChange={(v) => setFormData({...formData, data_despesa: v ? v.format('YYYY-MM-DD') : ''})}
                                    slotProps={{ textField: { fullWidth: true, size: 'medium' } }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <DatePicker 
                                    label="Data Vencimento"
                                    value={dayjs(formData.data_vencimento)}
                                    onChange={(v) => setFormData({...formData, data_vencimento: v ? v.format('YYYY-MM-DD') : ''})}
                                    slotProps={{ textField: { fullWidth: true, size: 'medium' } }}
                                />
                            </Grid>

                            {!isEditing && (
                                <Grid item xs={12}>
                                    <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2, border: '1px dashed #ccc' }}>
                                        <FormControlLabel
                                            control={<Checkbox checked={formData.parcelado} onChange={(e) => setFormData({...formData, parcelado: e.target.checked})} />}
                                            label="Repetir / Parcelar?"
                                        />
                                        {formData.parcelado && (
                                            <TextField 
                                                label="Quantas vezes (Meses)?" 
                                                type="number" 
                                                size="small" 
                                                sx={{ width: 150, ml: 2 }}
                                                value={formData.qtd_parcelas}
                                                onChange={(e) => setFormData({...formData, qtd_parcelas: e.target.value})}
                                            />
                                        )}
                                    </Box>
                                </Grid>
                            )}
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
                        <Button type="submit" variant="contained" disabled={isSubmitting} sx={{ bgcolor: '#1a233b', px: 4 }}>
                            {isSubmitting ? <CircularProgress size={24} /> : 'Salvar'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
}