import React, { useState, useEffect, useMemo } from 'react';
import {
    Button, CircularProgress, TextField, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Select, MenuItem, FormControl, IconButton,
    FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions,
    Typography, Grid, Switch, InputAdornment, Chip, Box, Divider
} from '@mui/material';
import { 
    Edit, Delete, AddCircleOutline, Search, 
    MoneyOff, CheckCircle, Warning, Domain, LocalCafe 
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell 
} from 'recharts';
import dayjs from 'dayjs';

import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import LancamentoCaixaModal from './LancamentoCaixaModal';

import './FinanceiroCommon.css';

// --- CONFIGURAÇÃO MANUAL DAS FIXAS (Sem mexer no backend) ---
// Adicione aqui exatamente como está escrito o nome das suas categorias fixas
const NOMES_CATEGORIAS_FIXAS = [
    'Aluguel', 'Condomínio', 'Internet', 'Energia', 'Água', 
    'Salários', 'Folha', 'Sistema', 'Contador', 'Impostos Fixos'
];

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatDataSimples = (dataISO) => {
    if (!dataISO) return '-';
    const partes = dataISO.split('T')[0].split('-'); 
    if(partes.length < 3) return '-';
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

// --- COMPONENTE DE TABELA REUTILIZÁVEL (VERSÃO COMPACTA) ---
const TabelaDespesas = ({ dados, titulo, icone, corTema, onEdit, onToggleStatus, onDelete }) => (
    <Paper elevation={0} sx={{ border: `1px solid ${corTema}40`, borderRadius: 2, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Cabeçalho do Card (Mais fino) */}
        <Box sx={{ px: 1.5, py: 1, bgcolor: `${corTema}10`, display: 'flex', alignItems: 'center', gap: 1, borderBottom: `1px solid ${corTema}20` }}>
            {React.cloneElement(icone, { sx: { fontSize: 18, color: corTema } })}
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: corTema, flexGrow: 1, fontSize: '0.8rem' }}>
                {titulo}
            </Typography>
            <Chip 
                label={`${dados.length}`} 
                size="small" 
                sx={{ bgcolor: 'white', color: corTema, fontWeight: 'bold', fontSize: '0.65rem', height: 20 }} 
            />
        </Box>

        <TableContainer sx={{ flexGrow: 1, maxHeight: '400px' }}>
            <Table size="small" stickyHeader padding="none"> {/* padding="none" remove espaços extras */}
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ pl: 1, py: 0.5, fontWeight: 'bold', color: '#666', fontSize: '0.7rem', width: '70px' }}>Data</TableCell>
                        <TableCell sx={{ px: 0.5, py: 0.5, fontWeight: 'bold', color: '#666', fontSize: '0.7rem' }}>Descrição</TableCell>
                        <TableCell align="right" sx={{ px: 0.5, py: 0.5, fontWeight: 'bold', color: '#666', fontSize: '0.7rem', width: '80px' }}>Valor</TableCell>
                        <TableCell align="center" sx={{ pr: 1, py: 0.5, fontWeight: 'bold', color: '#666', fontSize: '0.7rem', width: '70px' }}>Ações</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {dados.length > 0 ? dados.map((item) => (
                        <TableRow key={item.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                            {/* Coluna DATA */}
                            <TableCell sx={{ pl: 1, py: 0.5, fontSize: '0.7rem', color: '#444', borderBottom: '1px solid #f0f0f0' }}>
                                <div style={{display: 'flex', flexDirection: 'column', lineHeight: 1.1}}>
                                    <span>{formatDataSimples(item.data_vencimento)}</span>
                                    {item.pago && <span style={{fontSize: '0.6rem', color: '#2e7d32', fontWeight: 600}}>PAGO</span>}
                                </div>
                            </TableCell>

                            {/* Coluna DESCRIÇÃO (Com limite de largura e cortes) */}
                            <TableCell sx={{ px: 0.5, py: 0.5, fontSize: '0.7rem', borderBottom: '1px solid #f0f0f0', maxWidth: '140px' }}>
                                <div style={{ fontWeight: 600, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.descricao}>
                                    {item.descricao}
                                </div>
                                <div style={{ fontSize: '0.65rem', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {item.categoria_nome}
                                </div>
                            </TableCell>

                            {/* Coluna VALOR */}
                            <TableCell align="right" sx={{ px: 0.5, py: 0.5, fontSize: '0.7rem', fontWeight: 'bold', color: '#1a233b', borderBottom: '1px solid #f0f0f0' }}>
                                {formatMoney(item.valor)}
                            </TableCell>

                            {/* Coluna AÇÕES */}
                            <TableCell align="center" sx={{ pr: 1, py: 0.5, borderBottom: '1px solid #f0f0f0' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                                    <IconButton size="small" onClick={() => onEdit(item)} sx={{ p: 0.2 }}>
                                        <Edit sx={{ fontSize: 13, color: '#1976d2' }} />
                                    </IconButton>
                                    {!item.pago && (
                                        <IconButton size="small" onClick={() => onToggleStatus(item)} sx={{ p: 0.2 }}>
                                            <CheckCircle sx={{ fontSize: 13, color: '#2e7d32' }} />
                                        </IconButton>
                                    )}
                                    <IconButton size="small" onClick={() => onDelete(item.id)} sx={{ p: 0.2 }}>
                                        <Delete sx={{ fontSize: 13, color: '#d32f2f' }} />
                                    </IconButton>
                                </Box>
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={4} align="center" sx={{ py: 3, fontSize: '0.7rem', color: '#999' }}>
                                Vazio.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
        
        {/* Rodapé Compacto */}
        <Box sx={{ px: 1.5, py: 1, bgcolor: '#fafafa', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{fontSize: '0.7rem'}}>Total:</Typography>
            <Typography variant="subtitle2" color={corTema} fontWeight="bold" sx={{fontSize: '0.8rem'}}>
                {formatMoney(dados.reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0))}
            </Typography>
        </Box>
    </Paper>
);

export default function DespesasView() {
    const { showSnackbar } = useSnackbar();
    
    // Estados
    const [despesas, setDespesas] = useState([]);
    const [categorias, setCategorias] = useState([]);
    
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

    // --- LÓGICA DE FILTRO E SEPARAÇÃO ---
    const { fixas, variaveis, resumoGeral, chartData } = useMemo(() => {
        let lista = despesas;

        // 1. Filtros de Data e Busca (Igual ao anterior)
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

        lista.sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));

        // 2. Separação AUTOMÁTICA baseada no Backend
        const listaFixas = [];
        const listaVariaveis = [];

        lista.forEach(item => {
            // O backend agora manda 'Fixa' ou 'Variavel' dentro de categoria_tipo
            if (item.categoria_tipo === 'Fixa') {
                listaFixas.push(item);
            } else {
                listaVariaveis.push(item);
            }
        });

        // 3. Resumos (Igual ao anterior)
        const resumo = lista.reduce((acc, item) => {
            const valor = parseFloat(item.valor) || 0;
            acc.total += valor;
            if (item.pago) acc.pagas += valor;
            else acc.aPagar += valor;
            return acc;
        }, { pagas: 0, aPagar: 0, total: 0 });

        // 4. Chart Data (Igual ao anterior)
        const groups = {};
        lista.forEach(d => {
            const cat = d.categoria_nome || 'Outros';
            groups[cat] = (groups[cat] || 0) + parseFloat(d.valor);
        });
        const chart = Object.keys(groups)
            .map(key => ({ name: key, value: groups[key] }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);

        return { fixas: listaFixas, variaveis: listaVariaveis, resumoGeral: resumo, chartData: chart };

    }, [despesas, mesFiltro, anoFiltro, searchTerm]);

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

    return (
        <div className="financeiro-view-container">
            
            {/* 1. SEÇÃO TOPO */}
            <div className="financeiro-top-section">
                <div className="kpi-group">
                    <div className="kpi-card">
                        <div className="kpi-header">
                            <span className="kpi-title">TOTAL GERAL</span>
                            <MoneyOff className="kpi-icon" sx={{ color: '#1a233b' }} />
                        </div>
                        <span className="kpi-value" style={{ color: '#1a233b' }}>{formatMoney(resumoGeral.total)}</span>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-header">
                            <span className="kpi-title">PAGO</span>
                            <CheckCircle className="kpi-icon" sx={{ color: '#2e7d32' }} />
                        </div>
                        <span className="kpi-value" style={{ color: '#2e7d32' }}>{formatMoney(resumoGeral.pagas)}</span>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-header">
                            <span className="kpi-title">A PAGAR</span>
                            <Warning className="kpi-icon" sx={{ color: '#d32f2f' }} />
                        </div>
                        <span className="kpi-value" style={{ color: '#d32f2f' }}>{formatMoney(resumoGeral.aPagar)}</span>
                    </div>
                </div>

                <div className="chart-container-box">
                    <div className="chart-title">GASTOS POR CATEGORIA</div>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={{fontSize: 10, fill: '#666'}} tickLine={false} axisLine={false} tickFormatter={(v) => v.length > 10 ? `${v.substring(0, 10)}.` : v}/>
                                <YAxis tick={{fontSize: 10, fill: '#ccc'}} tickLine={false} axisLine={false} tickFormatter={(val) => `k`} />
                                <RechartsTooltip cursor={{fill: '#f5f5f5'}} formatter={(value) => [formatMoney(value), 'Total']} contentStyle={{ fontSize: '12px', borderRadius: '8px' }}/>
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
            <div className="toolbar-container" style={{ marginBottom: '16px' }}>
                <div className="toolbar-left">
                    <FormControl size="small" sx={{ width: 120 }}>
                        <Select value={mesFiltro} displayEmpty onChange={(e) => setMesFiltro(e.target.value)} sx={{ fontSize: '0.8rem', bgcolor: '#fff', height: '36px' }}>
                            <MenuItem value=""><em>Todos Meses</em></MenuItem>
                            {Array.from({length: 12}, (_, i) => (<MenuItem key={i} value={i} sx={{fontSize: '0.8rem'}}>{dayjs().month(i).format('MMMM')}</MenuItem>))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ width: 80 }}>
                        <Select value={anoFiltro} onChange={(e) => setAnoFiltro(e.target.value)} sx={{ fontSize: '0.8rem', bgcolor: '#fff', height: '36px' }}>
                            <MenuItem value={2024} sx={{fontSize: '0.8rem'}}>2024</MenuItem>
                            <MenuItem value={2025} sx={{fontSize: '0.8rem'}}>2025</MenuItem>
                            <MenuItem value={2026} sx={{fontSize: '0.8rem'}}>2026</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField size="small" placeholder="Buscar despesa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{fontSize: 18, color: '#999'}} /></InputAdornment>, style: { fontSize: '0.8rem', height: '36px' }}} sx={{ bgcolor: 'white', width: '300px' }}/>
                </div>
                <Button variant="contained" startIcon={<AddCircleOutline sx={{fontSize: 18}} />} onClick={handleOpenCreate} sx={{ bgcolor: '#1a233b', '&:hover': { bgcolor: '#2c3a5b' }, height: '36px', fontSize: '0.8rem', textTransform: 'none', px: 3, fontWeight: 600 }}>
                    NOVA DESPESA
                </Button>
            </div>

            {/* 3. GRID DE TABELAS SEPARADAS */}
            <Grid container spacing={2}>
                {/* LADO ESQUERDO: FIXAS */}
                <Grid item xs={12} md={6}>
                    <TabelaDespesas 
                        dados={fixas}
                        titulo="DESPESAS FIXAS (Estrutura)"
                        icone={<Domain sx={{ color: '#1565c0' }} />}
                        corTema="#1565c0"
                        onEdit={handleOpenEdit}
                        onToggleStatus={handleToggleStatus}
                        onDelete={handleDelete}
                    />
                </Grid>

                {/* LADO DIREITO: VARIÁVEIS */}
                <Grid item xs={12} md={6}>
                    <TabelaDespesas 
                        dados={variaveis}
                        titulo="DESPESAS VARIÁVEIS (Consumo)"
                        icone={<LocalCafe sx={{ color: '#e65100' }} />}
                        corTema="#e65100"
                        onEdit={handleOpenEdit}
                        onToggleStatus={handleToggleStatus}
                        onDelete={handleDelete}
                    />
                </Grid>
            </Grid>

            {/* --- MODAIS (Edit e Create) PERMANECEM IGUAIS --- */}
            <LancamentoCaixaModal open={openNovoLancamentoModal} onClose={() => { setOpenNovoLancamentoModal(false); fetchData(); }} initialTab={1} initialType="despesa" />
            <Dialog open={openEditModal} onClose={() => setOpenEditModal(false)} fullWidth maxWidth="sm">
    <DialogTitle sx={{ fontWeight: 'bold', color: '#1a233b', fontSize: '0.9rem', borderBottom: '1px solid #f0f0f0', py: 1.5 }}>
        {editFormData.id ? 'Editar Despesa' : 'Nova Despesa'}
    </DialogTitle>
    <form onSubmit={handleSaveEdit}>
        <DialogContent sx={{ pt: 2, bgcolor: '#fcfcfc' }}>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <Paper elevation={0} variant="outlined" sx={{ p: 2, bgcolor: '#fff' }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField 
                                    label="Descrição" 
                                    fullWidth 
                                    required 
                                    size="small" 
                                    value={editFormData.descricao || ''} 
                                    onChange={(e) => setEditFormData({...editFormData, descricao: e.target.value})} 
                                    InputLabelProps={{style: {fontSize: '0.8rem'}}} 
                                />
                            </Grid>
                            
                            {/* SELEÇÃO DE CATEGORIA MELHORADA */}
                            <Grid item xs={12}>
                                <TextField 
                                    select 
                                    label="Categoria" 
                                    fullWidth 
                                    required 
                                    size="small" 
                                    value={editFormData.categoria || ''} 
                                    onChange={(e) => {
                                        // Encontra a categoria completa para saber se é fixa ou variável na hora
                                        const catObj = categorias.find(c => c.id === e.target.value);
                                        // Atualiza o form e também salva o nome/tipo temporariamente para feedback visual
                                        setEditFormData({
                                            ...editFormData, 
                                            categoria: e.target.value,
                                            categoria_nome: catObj ? catObj.nome : '',
                                            categoria_tipo: catObj ? catObj.tipo : ''
                                        });
                                    }} 
                                    SelectProps={{style: {fontSize: '0.8rem'}}} 
                                    InputLabelProps={{style: {fontSize: '0.8rem'}}}
                                >
                                    {categorias.map(cat => (
                                        <MenuItem key={cat.id} value={cat.id} sx={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>{cat.nome}</span>
                                            {/* Mostra visualmente o tipo no dropdown */}
                                            <span style={{ 
                                                fontSize: '0.65rem', 
                                                color: cat.tipo === 'Fixa' ? '#1565c0' : '#e65100',
                                                fontWeight: 'bold',
                                                backgroundColor: cat.tipo === 'Fixa' ? '#e3f2fd' : '#fff3e0',
                                                padding: '2px 6px',
                                                borderRadius: '4px'
                                            }}>
                                                {cat.tipo === 'Fixa' ? 'FIXA' : 'VARIÁVEL'}
                                            </span>
                                        </MenuItem>
                                    ))}
                                </TextField>
                                
                                {/* FEEDBACK VISUAL ABAIXO DO CAMPO */}
                                {editFormData.categoria && (
                                    <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Tipo identificado:
                                        </Typography>
                                        <Chip 
                                            label={
                                                // Verifica na lista de categorias baseado no ID selecionado
                                                (categorias.find(c => c.id === editFormData.categoria)?.tipo === 'Fixa') 
                                                ? "DESPESA FIXA (Estrutural)" 
                                                : "DESPESA VARIÁVEL (Consumo)"
                                            }
                                            size="small"
                                            sx={{ 
                                                height: 20, 
                                                fontSize: '0.65rem', 
                                                fontWeight: 'bold',
                                                bgcolor: (categorias.find(c => c.id === editFormData.categoria)?.tipo === 'Fixa') ? '#e3f2fd' : '#fff3e0',
                                                color: (categorias.find(c => c.id === editFormData.categoria)?.tipo === 'Fixa') ? '#1565c0' : '#e65100'
                                            }}
                                        />
                                    </Box>
                                )}
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