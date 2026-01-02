import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Button, CircularProgress, TextField, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
    Typography, InputAdornment, Switch, FormControlLabel, Chip, Box, FormControl, Select, MenuItem
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

// Reusa o CSS padrão para manter a homogeneidade
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
    const [anoFiltro, setAnoFiltro] = useState("");

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
            // Traz tudo (sem filtrar status no backend) para calcularmos os totais corretamente
            const response = await faturamentoService.getPagamentos({});
            
            if (Array.isArray(response.data)) {
                // Ordenação padrão: Mais recentes primeiro
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

    // --- FILTRAGEM LOCAL (Data e Busca) ---
    const filteredList = useMemo(() => {
        let lista = listaPagamentos;

        // 1. Filtro de Mês/Ano (Baseado no Vencimento ou Pagamento)
        if (mesFiltro !== '') {
            lista = lista.filter(p => {
                const dataRef = p.data_pagamento || p.data_vencimento;
                if (!dataRef) return false;
                const dataObj = dayjs(dataRef);
                return dataObj.month() === mesFiltro && dataObj.year() === anoFiltro;
            });
        } else {
            // Se não filtrar mês, filtra só pelo ano para não misturar tudo
            lista = lista.filter(p => {
                const dataRef = p.data_pagamento || p.data_vencimento;
                if (!dataRef) return false;
                return dayjs(dataRef).year() === anoFiltro;
            });
        }

        // 2. Filtro de Busca
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

    // --- INTELIGÊNCIA FINANCEIRA (SÓCIOS E PROJEÇÃO) ---
    const dashboardData = useMemo(() => {
        // Usamos a lista completa (ou filtrada pelo ano) para métricas macro
        // Se quiser métricas só do mês, use 'filteredList'. Aqui vou usar 'filteredList' para refletir o que está na tela.
        const baseCalculo = filteredList; 

        let totalFaturamentoConsultas = 0;
        let qtdConsultas = 0;
        let totalInvestido = 0;
        let aporteDaniel = 0;
        let aporteAlejandro = 0;
        let outrosAportes = 0;

        baseCalculo.forEach(item => {
            const valor = parseFloat(item.valor) || 0;
            const desc = (item.descricao || '').toLowerCase();
            const visualDesc = (item.descricao_visual || '').toLowerCase();

            // Lógica: Se tem agendamento, é Faturamento de Consulta
            if (item.agendamento) {
                totalFaturamentoConsultas += valor;
                qtdConsultas++;
            } 
            // Se não tem agendamento, verificamos se é Aporte de Sócio
            else {
                if (desc.includes('daniel') || visualDesc.includes('daniel')) {
                    aporteDaniel += valor;
                    totalInvestido += valor;
                } else if (desc.includes('alejandro') || visualDesc.includes('alejandro')) {
                    aporteAlejandro += valor;
                    totalInvestido += valor;
                } else {
                    // Outras receitas avulsas (ex: aluguel, venda de produto)
                    // Se quiser somar no faturamento da clínica, descomente abaixo:
                    // totalFaturamentoConsultas += valor;
                    outrosAportes += valor; 
                }
            }
        });

        // Cálculo de Break-even (Ponto de Equilíbrio)
        const ticketMedio = qtdConsultas > 0 ? (totalFaturamentoConsultas / qtdConsultas) : 0;
        const saldoParaCobrir = totalInvestido - totalFaturamentoConsultas;
        const consultasNecessarias = ticketMedio > 0 ? Math.ceil(saldoParaCobrir / ticketMedio) : 0;

        return {
            faturamento: totalFaturamentoConsultas,
            investimento: totalInvestido,
            daniel: aporteDaniel,
            alejandro: aporteAlejandro,
            outros: outrosAportes,
            saldo: saldoParaCobrir,
            ticketMedio: ticketMedio,
            consultasNecessarias: consultasNecessarias,
            lucro: saldoParaCobrir < 0 // Se saldo para cobrir é negativo, já pagou e sobrou
        };
    }, [filteredList]);

    // Dados para o Gráfico
    const chartData = useMemo(() => {
        return [
            { name: 'Faturamento', value: dashboardData.faturamento, color: '#2e7d32' }, // Verde
            { name: 'Sócio Daniel', value: dashboardData.daniel, color: '#1565c0' }, // Azul
            { name: 'Sócio Alejandro', value: dashboardData.alejandro, color: '#0288d1' }, // Azul Claro
            // { name: 'Outros', value: dashboardData.outros, color: '#9e9e9e' }
        ].filter(d => d.value > 0); // Só mostra o que tem valor
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

    return (
        <div className="financeiro-view-container">
            
            {/* 1. SEÇÃO TOPO: KPIs e GRÁFICO (Padrão Despesas) */}
            <div className="financeiro-top-section">
                
                {/* ESQUERDA: KPIs Inteligentes */}
                <div className="kpi-group">
                    {/* Card 1: Faturamento Real (Consultas) */}
                    <div className="kpi-card">
                        <div className="kpi-header">
                            <span className="kpi-title">FATURAMENTO (CONSULTAS)</span>
                            <TrendingUp className="kpi-icon" sx={{ color: '#2e7d32' }} />
                        </div>
                        <span className="kpi-value" style={{ color: '#2e7d32' }}>
                            {formatMoney(dashboardData.faturamento)}
                        </span>
                    </div>

                    {/* Card 2: Investimento Sócios */}
                    <div className="kpi-card">
                        <div className="kpi-header">
                            <span className="kpi-title">TOTAL INVESTIDO (SÓCIOS)</span>
                            <Group className="kpi-icon" sx={{ color: '#1565c0' }} />
                        </div>
                        <span className="kpi-value" style={{ color: '#1565c0' }}>
                            {formatMoney(dashboardData.investimento)}
                        </span>
                    </div>

                    {/* Card 3: Break-even / Estimativa */}
                    <div className="kpi-card" style={{ backgroundColor: dashboardData.lucro ? '#e8f5e9' : '#fff' }}>
                        <div className="kpi-header">
                            <span className="kpi-title">
                                {dashboardData.lucro ? "LUCRO (ROI)" : "PARA COBRIR APORTES"}
                            </span>
                            <AccountBalance className="kpi-icon" sx={{ color: '#f57c00' }} />
                        </div>
                        
                        {dashboardData.lucro ? (
                            <span className="kpi-value" style={{ color: '#2e7d32' }}>
                                Superávit: {formatMoney(Math.abs(dashboardData.saldo))}
                            </span>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span className="kpi-value" style={{ color: '#d32f2f', fontSize: '1rem' }}>
                                    Faltam: {formatMoney(dashboardData.saldo)}
                                </span>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                    ~ {dashboardData.consultasNecessarias} consultas
                                </Typography>
                            </div>
                        )}
                    </div>
                </div>

                {/* DIREITA: Gráfico Comparativo */}
                <div className="chart-container-box">
                    <div className="chart-title">ORIGEM DA RECEITA (FATURAMENTO vs APORTES)</div>
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

            {/* 3. TABELA (CSS Padrão) */}
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

                                            {/* Delete apenas se não for agendamento (para integridade) ou se for admin */}
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

            {/* MODAIS */}
            <Dialog open={openEditModal} onClose={() => setOpenEditModal(false)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ fontWeight: 'bold', color: '#1a233b', fontSize: '0.9rem', borderBottom: '1px solid #f0f0f0', py: 1.5 }}>
                    Editar Lançamento
                </DialogTitle>
                <DialogContent sx={{ pt: 2, bgcolor: '#fcfcfc' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField 
                            label="Descrição" 
                            fullWidth 
                            size="small"
                            value={editFormData.descricao || ''} 
                            onChange={(e) => setEditFormData({...editFormData, descricao: e.target.value})}
                            InputLabelProps={{style: {fontSize: '0.8rem'}}}
                        />
                        <DatePicker 
                            label="Data de Vencimento"
                            value={editFormData.data_vencimento ? dayjs(editFormData.data_vencimento) : null}
                            onChange={(v) => setEditFormData({...editFormData, data_vencimento: v ? v.format('YYYY-MM-DD') : ''})}
                            slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                        />
                        
                        <FormControlLabel 
                            control={<Switch size="small" checked={editFormData.pago} onChange={(e) => setEditFormData({...editFormData, pago: e.target.checked})} color="success"/>} 
                            label={<Typography fontSize="0.8rem">Está Pago?</Typography>} 
                        />

                        {editFormData.pago && (
                            <DatePicker 
                                label="Data do Pagamento"
                                value={editFormData.data_pagamento ? dayjs(editFormData.data_pagamento) : dayjs()}
                                onChange={(v) => setEditFormData({...editFormData, data_pagamento: v ? v.format('YYYY-MM-DD') : ''})}
                                slotProps={{ textField: { fullWidth: true, size: 'small', color: 'success', focused: true } }}
                            />
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 1.5, bgcolor: '#fcfcfc', borderTop: '1px solid #f0f0f0' }}>
                    <Button onClick={() => setOpenEditModal(false)} size="small" sx={{color: '#666', fontSize: '0.75rem'}}>Cancelar</Button>
                    <Button variant="contained" onClick={handleSaveEdit} size="small" sx={{ bgcolor: '#1a233b', px: 3, fontSize: '0.75rem' }}>Salvar</Button>
                </DialogActions>
            </Dialog>

            {selectedPagamento && (
                <PagamentoModal 
                    open={openPagarModal}
                    onClose={() => setOpenPagarModal(false)}
                    onSave={() => { setOpenPagarModal(false); fetchPagamentos(); }}
                    pagamento={selectedPagamento}
                />
            )}

            <LancamentoCaixaModal 
                open={openNovoLancamentoModal}
                onClose={() => { setOpenNovoLancamentoModal(false); fetchPagamentos(); }}
            />
        </div>
    );
}