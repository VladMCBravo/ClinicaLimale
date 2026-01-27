// src/components/financeiro/DespesasView.jsx
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
    MoneyOff, CheckCircle, Warning, Domain, LocalCafe 
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell 
} from 'recharts';
import dayjs from 'dayjs';

import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import LancamentoCaixaModal from './LancamentoCaixaModal'; // Importando o modal centralizado

import './FinanceiroCommon.css';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatDataSimples = (dataString) => {
    if (!dataString) return '-';
    const dataLimpa = dataString.split('T')[0]; 
    const partes = dataLimpa.split('-'); 
    if(partes.length < 3) return '-';
    return `${partes[2]}/${partes[1]}/${partes[0]}`; 
};

// --- COMPONENTE DE TABELA ---
const TabelaDespesas = ({ dados, titulo, icone, corTema, onEdit, onToggleStatus, onDelete }) => (
    <Paper elevation={0} sx={{ border: `1px solid ${corTema}40`, borderRadius: 2, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ px: 2, py: 1.5, bgcolor: `${corTema}10`, display: 'flex', alignItems: 'center', gap: 1, borderBottom: `1px solid ${corTema}20` }}>
            {React.cloneElement(icone, { sx: { fontSize: 20, color: corTema } })}
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: corTema, flexGrow: 1, fontSize: '0.85rem' }}>
                {titulo}
            </Typography>
            <Chip label={`${dados.length}`} size="small" sx={{ bgcolor: 'white', color: corTema, fontWeight: 'bold', fontSize: '0.7rem', height: 20 }} />
        </Box>

        <TableContainer sx={{ flexGrow: 1, maxHeight: '500px' }}>
            <Table size="small" stickyHeader padding="none">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ pl: 2, py: 1, fontWeight: 'bold', color: '#666', fontSize: '0.7rem', width: '90px' }}>Datas</TableCell>
                        <TableCell sx={{ px: 1, py: 1, fontWeight: 'bold', color: '#666', fontSize: '0.7rem' }}>Descrição</TableCell>
                        <TableCell align="right" sx={{ px: 1, py: 1, fontWeight: 'bold', color: '#666', fontSize: '0.7rem', width: '90px' }}>Valor</TableCell>
                        <TableCell align="center" sx={{ pr: 2, py: 1, fontWeight: 'bold', color: '#666', fontSize: '0.7rem', width: '80px' }}>Ações</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {dados.length > 0 ? dados.map((item) => (
                        <TableRow key={item.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                            <TableCell sx={{ pl: 2, py: 0.5, fontSize: '0.7rem', color: '#444', borderBottom: '1px solid #f0f0f0', verticalAlign: 'middle' }}>
                                <div style={{display: 'flex', flexDirection: 'column', lineHeight: 1.2}}>
                                    <span style={{fontWeight: 600, color: '#555'}}>{formatDataSimples(item.data_despesa)}</span>
                                    {item.pago && (
                                        <span style={{fontSize: '0.65rem', color: '#2e7d32', marginTop: '2px'}}>
                                            Pg: {formatDataSimples(item.data_pagamento || item.data_vencimento)}
                                        </span>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell sx={{ px: 1, py: 0.5, fontSize: '0.75rem', borderBottom: '1px solid #f0f0f0', verticalAlign: 'middle' }}>
                                <div style={{ fontWeight: 600, color: '#333', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                                    {item.descricao}
                                </div>
                                <div style={{ fontSize: '0.65rem', color: '#888' }}>{item.categoria_nome}</div>
                            </TableCell>
                            <TableCell align="right" sx={{ px: 1, py: 0.5, fontSize: '0.75rem', fontWeight: 'bold', color: '#1a233b', borderBottom: '1px solid #f0f0f0', verticalAlign: 'middle' }}>
                                {formatMoney(item.valor)}
                            </TableCell>
                            <TableCell align="center" sx={{ pr: 2, py: 0.5, borderBottom: '1px solid #f0f0f0', verticalAlign: 'middle' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                                    <IconButton size="small" onClick={() => onEdit(item)} sx={{ p: 0.5 }}><Edit sx={{ fontSize: 15, color: '#1976d2' }} /></IconButton>
                                    {!item.pago && (
                                        <IconButton size="small" onClick={() => onToggleStatus(item)} sx={{ p: 0.5 }} title="Pagar"><CheckCircle sx={{ fontSize: 15, color: '#2e7d32' }} /></IconButton>
                                    )}
                                    <IconButton size="small" onClick={() => onDelete(item.id)} sx={{ p: 0.5 }}><Delete sx={{ fontSize: 15, color: '#d32f2f' }} /></IconButton>
                                </Box>
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, fontSize: '0.75rem', color: '#999' }}>Vazio.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    </Paper>
);

export default function DespesasView() {
    const { showSnackbar } = useSnackbar();
    
    // Estados
    const [despesas, setDespesas] = useState([]);
    const [categorias, setCategorias] = useState([]);
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
            showSnackbar('Erro ao carregar despesas.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const { fixas, variaveis, resumoGeral, chartData } = useMemo(() => {
        let lista = despesas;
        if (mesFiltro !== '') {
            lista = lista.filter(d => {
                const dataRef = d.data_despesa || d.data_vencimento;
                return dayjs(dataRef).month() === mesFiltro && dayjs(dataRef).year() === anoFiltro;
            });
        }
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            lista = lista.filter(d => d.descricao.toLowerCase().includes(term));
        }
        
        const listaFixas = lista.filter(item => item.categoria_tipo === 'Fixa');
        const listaVariaveis = lista.filter(item => item.categoria_tipo !== 'Fixa');

        const resumo = lista.reduce((acc, item) => {
            const valor = parseFloat(item.valor) || 0;
            acc.total += valor;
            item.pago ? (acc.pagas += valor) : (acc.aPagar += valor);
            return acc;
        }, { pagas: 0, aPagar: 0, total: 0 });

        const groups = {};
        lista.forEach(d => {
            const cat = d.categoria_nome || 'Outros';
            groups[cat] = (groups[cat] || 0) + parseFloat(d.valor);
        });
        const chart = Object.keys(groups).map(key => ({ name: key, value: groups[key] }));

        return { fixas: listaFixas, variaveis: listaVariaveis, resumoGeral: resumo, chartData: chart };
    }, [despesas, mesFiltro, anoFiltro, searchTerm]);

    const handleOpenEdit = (item) => {
        setEditFormData({ ...item });
        setOpenEditModal(true);
    };

    const handleToggleStatus = async (despesa) => {
        const novoStatus = !despesa.pago;
        try {
            await faturamentoService.updateDespesa(despesa.id, { ...despesa, pago: novoStatus });
            fetchData();
        } catch (error) { showSnackbar('Erro.', 'error'); }
    };

    const handleDelete = async (id) => {
        if(window.confirm("Excluir?")) {
            await faturamentoService.deleteDespesa(id);
            fetchData();
        }
    };

    return (
        <div className="financeiro-view-container">
            {/* KPI E GRÁFICO */}
            <div className="financeiro-top-section">
                <div className="kpi-group">
                    <div className="kpi-card"><div className="kpi-header"><span className="kpi-title">TOTAL GERAL</span><MoneyOff className="kpi-icon" /></div><span className="kpi-value">{formatMoney(resumoGeral.total)}</span></div>
                    <div className="kpi-card"><div className="kpi-header"><span className="kpi-title">PAGO</span><CheckCircle className="kpi-icon" sx={{ color: '#2e7d32' }} /></div><span className="kpi-value" style={{ color: '#2e7d32' }}>{formatMoney(resumoGeral.pagas)}</span></div>
                    <div className="kpi-card"><div className="kpi-header"><span className="kpi-title">A PAGAR</span><Warning className="kpi-icon" sx={{ color: '#d32f2f' }} /></div><span className="kpi-value" style={{ color: '#d32f2f' }}>{formatMoney(resumoGeral.aPagar)}</span></div>
                </div>
            </div>

            {/* TOOLBAR */}
            <div className="toolbar-container" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField size="small" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </Box>
                {/* Integração com Modal Centralizado */}
                <Button 
                    variant="contained" 
                    startIcon={<AddCircleOutline />} 
                    onClick={() => setOpenNovoLancamentoModal(true)}
                    sx={{ bgcolor: '#1a233b' }}
                >
                    NOVA DESPESA
                </Button>
            </div>

            {/* TABELAS LADO A LADO */}
            <Box sx={{ display: 'flex', gap: 2 }}>
                <TabelaDespesas dados={fixas} titulo="FIXAS" icone={<Domain />} corTema="#1565c0" onEdit={handleOpenEdit} onToggleStatus={handleToggleStatus} onDelete={handleDelete} />
                <TabelaDespesas dados={variaveis} titulo="VARIÁVEIS" icone={<LocalCafe />} corTema="#e65100" onEdit={handleOpenEdit} onToggleStatus={handleToggleStatus} onDelete={handleDelete} />
            </Box>

            {/* MODAL DE NOVO LANÇAMENTO (TIPO DESPESA) */}
            <LancamentoCaixaModal 
                open={openNovoLancamentoModal} 
                onClose={() => { setOpenNovoLancamentoModal(false); fetchData(); }} 
                initialTab={1} 
                initialType="despesa" 
            />

            {/* DIALOG DE EDIÇÃO RÁPIDA */}
            <Dialog open={openEditModal} onClose={() => setOpenEditModal(false)} fullWidth maxWidth="sm">
                <DialogTitle>Editar Registro</DialogTitle>
                <DialogContent>
                    {/* Campos de formulário simplificados aqui */}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEditModal(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={() => {/* save logic */}}>Salvar</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}