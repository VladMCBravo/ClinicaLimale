import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Button, CircularProgress, TextField, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Typography, Chip, Box, FormControl, Select, MenuItem,
    InputAdornment
} from '@mui/material';
import { 
    AttachMoney, CheckCircle, Search, AddCircleOutline, 
    Edit, TrendingUp, AccountBalance, Group 
} from '@mui/icons-material';
import DeleteIcon from '@mui/icons-material/Delete'; 
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell 
} from 'recharts';
import dayjs from 'dayjs';

import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';

import PagamentoModal from './PagamentoModal';
import LancamentoCaixaModal from './LancamentoCaixaModal';

import './FinanceiroCommon.css';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatDataSimples = (dataISO) => {
    if (!dataISO) return '-';
    const partes = dataISO.split('T')[0].split('-'); 
    if(partes.length < 3) return '-';
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

export default function ContasReceberView() {
    const { showSnackbar } = useSnackbar();
    
    // Estados
    const [listaPagamentos, setListaPagamentos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Filtros de Data
    const [mesFiltro, setMesFiltro] = useState('');
    const [anoFiltro, setAnoFiltro] = useState(''); // Começa vazio para pegar tudo

    // Modais
    const [openPagarModal, setOpenPagarModal] = useState(false);
    const [openNovoLancamentoModal, setOpenNovoLancamentoModal] = useState(false);
    const [openEditModal, setOpenEditModal] = useState(false);
    
    const [selectedPagamento, setSelectedPagamento] = useState(null);
    const [editFormData, setEditFormData] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- CARGA DE DADOS ---
    const fetchPagamentos = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await faturamentoService.getPagamentos({});
            
            if (Array.isArray(response.data)) {
                const sorted = response.data.sort((a, b) => {
                    const dataA = a.data_pagamento || a.data_vencimento;
                    const dataB = b.data_pagamento || b.data_vencimento;
                    return new Date(dataB) - new Date(dataA);
                });
                setListaPagamentos(sorted);
            } else {
                setListaPagamentos(response.data.results || []);
            }
        } catch (error) {
            console.error("Erro ao buscar:", error);
            showSnackbar("Erro ao carregar dados.", 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => {
        fetchPagamentos();
    }, [fetchPagamentos]);

    // --- FILTRAGEM LOCAL ---
    const filteredList = useMemo(() => {
        let lista = listaPagamentos;

        if (mesFiltro !== '' || anoFiltro !== '') {
            lista = lista.filter(p => {
                const dataRef = p.data_pagamento || p.data_vencimento;
                if (!dataRef) return false;
                const dataObj = dayjs(dataRef);
                
                const matchAno = anoFiltro === '' ? true : dataObj.year() === anoFiltro;
                const matchMes = mesFiltro === '' ? true : dataObj.month() === mesFiltro;
                
                return matchAno && matchMes;
            });
        }

        if (searchTerm) {
            const termo = searchTerm.toLowerCase();
            lista = lista.filter(p => {
                const nome = p.paciente_nome ? p.paciente_nome.toLowerCase() : '';
                const desc = p.descricao_visual ? p.descricao_visual.toLowerCase() : (p.descricao || '');
                return nome.includes(termo) || desc.includes(termo);
            });
        }

        return lista;
    }, [listaPagamentos, mesFiltro, anoFiltro, searchTerm]);

    // --- INTELIGÊNCIA FINANCEIRA ---
    const dashboardData = useMemo(() => {
        const baseCalculo = filteredList; 

        let totalFaturamentoRealizado = 0;
        let qtdConsultasRealizadas = 0;
        let totalInvestido = 0;
        let aporteDaniel = 0;
        let aporteAlejandro = 0;
        let outrosAportes = 0;

        baseCalculo.forEach(item => {
            const valor = parseFloat(item.valor) || 0;
            const desc = (item.descricao || '').toLowerCase();
            const visualDesc = (item.descricao_visual || '').toLowerCase();
            const estaPago = item.status === 'Pago';

            if (item.agendamento) {
                if (estaPago) {
                    totalFaturamentoRealizado += valor;
                    qtdConsultasRealizadas++;
                }
            } else {
                if (desc.includes('daniel') || visualDesc.includes('daniel')) {
                    aporteDaniel += valor;
                    totalInvestido += valor;
                } else if (desc.includes('alejandro') || visualDesc.includes('alejandro')) {
                    aporteAlejandro += valor;
                    totalInvestido += valor;
                } else {
                    outrosAportes += valor; 
                }
            }
        });

        const ticketMedio = qtdConsultasRealizadas > 0 ? (totalFaturamentoRealizado / qtdConsultasRealizadas) : 0;
        const saldoParaCobrir = totalInvestido - totalFaturamentoRealizado;
        const consultasNecessarias = ticketMedio > 0 ? Math.ceil(saldoParaCobrir / ticketMedio) : 0;

        return {
            faturamento: totalFaturamentoRealizado,
            investimento: totalInvestido,
            daniel: aporteDaniel,
            alejandro: aporteAlejandro,
            outros: outrosAportes,
            saldo: saldoParaCobrir,
            ticketMedio: ticketMedio,
            consultasNecessarias: consultasNecessarias,
            lucro: saldoParaCobrir <= 0
        };
    }, [filteredList]);

    const chartData = useMemo(() => {
        return [
            { name: 'Faturamento (Pago)', value: dashboardData.faturamento, color: '#2e7d32' },
            { name: 'Sócio Daniel', value: dashboardData.daniel, color: '#1565c0' },
            { name: 'Sócio Alejandro', value: dashboardData.alejandro, color: '#0288d1' },
        ].filter(d => d.value > 0);
    }, [dashboardData]);

    // --- AÇÕES ---
    const handleOpenPagar = (pagamento) => {
        setSelectedPagamento(pagamento);
        setOpenPagarModal(true);
    };

    const handleOpenEdit = (pagamento) => {
        setEditFormData({
            id: pagamento.id,
            descricao: pagamento.descricao || '',
            data_vencimento: pagamento.data_vencimento,
            data_pagamento: pagamento.data_pagamento,
            status: pagamento.status,
            pago: pagamento.status === 'Pago'
        });
        setOpenEditModal(true);
    };

    const handleSaveEdit = async () => {
        try {
            const payload = {
                descricao: editFormData.descricao,
                data_vencimento: editFormData.data_vencimento,
                data_pagamento: editFormData.pago ? (editFormData.data_pagamento || dayjs().format('YYYY-MM-DD')) : null,
                status: editFormData.pago ? 'Pago' : 'Pendente'
            };

            await faturamentoService.updatePagamento(editFormData.id, payload);
            showSnackbar('Atualizado com sucesso!', 'success');
            setOpenEditModal(false);
            fetchPagamentos();
        } catch (error) {
            console.error(error);
            showSnackbar('Erro ao atualizar.', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Tem certeza que deseja excluir?")) {
            try {
                await faturamentoService.deletePagamento(id); 
                showSnackbar('Excluído com sucesso', 'success');
                fetchPagamentos();
            } catch (error) {
                showSnackbar('Erro ao excluir.', 'error');
            }
        }
    };

    // --- FUNÇÕES QUE FALTAVAM (CORREÇÃO DO ERRO DE DEPLOY) ---
    const handleSuccessPagamento = () => {
        setOpenPagarModal(false);
        fetchPagamentos();
    };

    const handleCloseNovoLancamento = () => {
        setOpenNovoLancamentoModal(false);
        fetchPagamentos();
    };

    return (
        <div className="financeiro-view-container">
            
            {/* 1. SEÇÃO TOPO */}
            <div className="financeiro-top-section">
                
                {/* ESQUERDA: KPIs */}
                <div className="kpi-group">
                    <div className="kpi-card">
                        <div className="kpi-header">
                            <span className="kpi-title">FATURAMENTO REAL (PAGO)</span>
                            <TrendingUp className="kpi-icon" sx={{ color: '#2e7d32' }} />
                        </div>
                        <span className="kpi-value" style={{ color: '#2e7d32' }}>
                            {formatMoney(dashboardData.faturamento)}
                        </span>
                    </div>

                    <div className="kpi-card">
                        <div className="kpi-header">
                            <span className="kpi-title">TOTAL APORTES (SÓCIOS)</span>
                            <Group className="kpi-icon" sx={{ color: '#1565c0' }} />
                        </div>
                        <span className="kpi-value" style={{ color: '#1565c0' }}>
                            {formatMoney(dashboardData.investimento)}
                        </span>
                    </div>

                    <div className="kpi-card" style={{ backgroundColor: dashboardData.lucro ? '#e8f5e9' : '#fff' }}>
                        <div className="kpi-header">
                            <span className="kpi-title">
                                {dashboardData.lucro ? "SUPERÁVIT (LUCRO)" : "PARA COBRIR APORTE"}
                            </span>
                            <AccountBalance className="kpi-icon" sx={{ color: '#f57c00' }} />
                        </div>
                        
                        {dashboardData.lucro ? (
                            <span className="kpi-value" style={{ color: '#2e7d32' }}>
                                + {formatMoney(Math.abs(dashboardData.saldo))}
                            </span>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span className="kpi-value" style={{ color: '#d32f2f', fontSize: '1rem' }}>
                                    Faltam: {formatMoney(dashboardData.saldo)}
                                </span>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ fontSize: '0.65rem' }}>
                                    ~ {dashboardData.consultasNecessarias} consultas
                                </Typography>
                            </div>
                        )}
                    </div>
                </div>

                {/* DIREITA: Gráfico */}
                <div className="chart-container-box">
                    <div className="chart-title">ORIGEM RECEITA (FATURAMENTO PAGO vs APORTES)</div>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis 
                                    dataKey="name" 
                                    tick={{fontSize: 9, fill: '#666'}} 
                                    interval={0}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => value.length > 10 ? `${value.substring(0, 10)}...` : value}
                                />
                                <YAxis 
                                    tick={{fontSize: 10, fill: '#ccc'}} 
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `R$${val/1000}k`}
                                />
                                <RechartsTooltip 
                                    cursor={{fill: '#f5f5f5'}}
                                    formatter={(value) => [formatMoney(value), 'Valor']}
                                    contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
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
                    <FormControl size="small" sx={{ width: 110 }}>
                        <Select 
                            value={anoFiltro} 
                            displayEmpty
                            onChange={(e) => setAnoFiltro(e.target.value)} 
                            sx={{ fontSize: '0.8rem', bgcolor: '#fff', height: '36px' }}
                        >
                            <MenuItem value=""><em>Todo Período</em></MenuItem>
                            <MenuItem value={2024} sx={{fontSize: '0.8rem'}}>2024</MenuItem>
                            <MenuItem value={2025} sx={{fontSize: '0.8rem'}}>2025</MenuItem>
                            <MenuItem value={2026} sx={{fontSize: '0.8rem'}}>2026</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField 
                        size="small"
                        placeholder="Buscar paciente ou descrição..."
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
                    onClick={() => setOpenNovoLancamentoModal(true)} 
                    sx={{ 
                        bgcolor: '#1a233b', '&:hover': { bgcolor: '#2c3a5b' },
                        height: '36px', fontSize: '0.8rem', textTransform: 'none', px: 3, fontWeight: 600
                    }}
                >
                    NOVA RECEITA
                </Button>
            </div>

            {/* 3. TABELA */}
            <TableContainer component={Paper} elevation={0} className="financeiro-table-container">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell className="table-header-cell" style={{width: '90px'}}>Vencimento</TableCell>
                            <TableCell className="table-header-cell" style={{width: '90px'}}>Pagamento</TableCell>
                            <TableCell className="table-header-cell">Paciente / Cliente</TableCell>
                            <TableCell className="table-header-cell">Descrição</TableCell>
                            <TableCell align="right" className="table-header-cell">Valor</TableCell>
                            <TableCell align="center" className="table-header-cell">Status</TableCell>
                            <TableCell align="center" className="table-header-cell">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={7} align="center"><CircularProgress size={24} sx={{ mt: 2 }} /></TableCell></TableRow>
                        ) : filteredList.length > 0 ? (
                            filteredList.map((pag) => (
                                <TableRow key={pag.id} hover>
                                    <TableCell className="table-body-cell" sx={{color: '#555'}}>
                                        {formatDataSimples(pag.data_vencimento)}
                                    </TableCell>
                                    <TableCell className="table-body-cell">
                                        {pag.data_pagamento ? (
                                            <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#2e7d32', bgcolor: '#e8f5e9', px: 0.6, py: 0.2, borderRadius: 1, fontSize: '0.75rem' }}>
                                                {formatDataSimples(pag.data_pagamento)}
                                            </Typography>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell className="table-body-cell" sx={{ fontWeight: 500 }}>
                                        {pag.paciente_nome || "Cliente Avulso"}
                                    </TableCell>
                                    <TableCell className="table-body-cell" sx={{ color: 'text.secondary' }}>
                                        {pag.descricao_visual || pag.descricao || "Sem descrição"}
                                    </TableCell>
                                    <TableCell align="right" className="table-body-cell" sx={{ fontWeight: 'bold', color: '#1a233b' }}>
                                        {formatMoney(pag.valor)}
                                    </TableCell>
                                    <TableCell align="center" className="table-body-cell">
                                        <Chip 
                                            label={pag.status} 
                                            size="small" 
                                            color={pag.status === 'Pago' ? 'success' : 'warning'}
                                            variant={pag.status === 'Pago' ? 'filled' : 'outlined'}
                                            sx={{ fontSize: '0.7rem', height: 22 }}
                                        />
                                    </TableCell>
                                    <TableCell align="center" className="table-body-cell">
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <IconButton size="small" onClick={() => handleOpenEdit(pag)} sx={{p: 0.5}}>
                                                <Edit sx={{ fontSize: 16, color: '#1976d2' }} />
                                            </IconButton>
                                            
                                            {pag.status === 'Pendente' && (
                                                <IconButton size="small" onClick={() => handleOpenPagar(pag)} title="Receber agora" sx={{p: 0.5}}>
                                                    <CheckCircle sx={{ fontSize: 16, color: '#2e7d32' }} />
                                                </IconButton>
                                            )}

                                            <IconButton size="small" onClick={() => handleDelete(pag.id)} color="error" sx={{p: 0.5}}>
                                                <DeleteIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary', fontSize: '0.8rem' }}>
                                    Nenhum registro encontrado.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {selectedPagamento && (
                <PagamentoModal 
                    open={openPagarModal}
                    onClose={() => setOpenPagarModal(false)}
                    onSave={handleSuccessPagamento}
                    pagamento={selectedPagamento}
                />
            )}

            <LancamentoCaixaModal 
                open={openNovoLancamentoModal}
                onClose={handleCloseNovoLancamento}
            />
        </div>
    );
}