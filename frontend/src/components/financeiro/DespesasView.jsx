// src/components/financeiro/DespesasView.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    TextField, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Typography, Chip, Box, InputAdornment, Button, Drawer, LinearProgress, TableSortLabel, IconButton
} from '@mui/material';
import { Search, Add, Settings, Domain, LocalCafe, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

import { faturamentoService } from '../../services/faturamentoService';
import LancamentoCaixaModal from './LancamentoCaixaModal';
import { ExpenseDrawerContent } from './ExpensePaymentDrawer';
import CategoriasTab from '../configuracoes/CategoriasTab';

import './Financeiro.css';

// Configura o Dayjs para português para podermos mostrar o nome do mês na UI
dayjs.locale('pt-br');

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// --- COMPONENTE DE NAVEGAÇÃO DE MÊS COMPACTO ---
const NavegadorMes = ({ filtroData, setFiltroData, disabled }) => {
    const irParaMesAnterior = () => setFiltroData(prev => prev.subtract(1, 'month'));
    const irParaProximoMes = () => setFiltroData(prev => prev.add(1, 'month'));
    const irParaMesAtual = () => setFiltroData(dayjs());

    // Mostra as 3 primeiras letras do mês atual (ex: "jun")
    const nomeMes = filtroData.format('MMM').toLowerCase();

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#f5f5f5', borderRadius: 4, px: 0.5, py: 0.2, ml: 1, opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
            <IconButton size="small" onClick={irParaMesAnterior} sx={{ p: 0.5 }}>
                <ChevronLeft fontSize="small" sx={{ color: '#666' }} />
            </IconButton>
            
            <Typography 
                variant="caption" 
                onClick={irParaMesAtual} 
                sx={{ cursor: 'pointer', fontWeight: 'bold', color: '#444', px: 1, minWidth: 35, textAlign: 'center', '&:hover': { color: 'primary.main' } }}
            >
                {nomeMes}
            </Typography>
            
            <IconButton size="small" onClick={irParaProximoMes} sx={{ p: 0.5 }}>
                <ChevronRight fontSize="small" sx={{ color: '#666' }} />
            </IconButton>
        </Box>
    );
};

// --- SUBCONPONENTE DE TABELA COMPACTA (COM ORDENAÇÃO) ---
const DespesaTable = ({ data, title, icon, color, onRowClick }) => {
    // Estado de ordenação isolado para cada tabela
    const [ordem, setOrdem] = useState({ coluna: 'vencimento', direcao: 'asc' });

    const handleSort = (coluna) => {
        const isAsc = ordem.coluna === coluna && ordem.direcao === 'asc';
        setOrdem({ coluna, direcao: isAsc ? 'desc' : 'asc' });
    };

    const listaOrdenada = useMemo(() => {
        let sortableItems = [...data];
        sortableItems.sort((a, b) => {
            if (ordem.coluna === 'vencimento') {
                // Se não tem vencimento, usa a data da despesa
                const dataA = (a.data_vencimento || a.data_despesa) ? dayjs(a.data_vencimento || a.data_despesa).valueOf() : 0;
                const dataB = (b.data_vencimento || b.data_despesa) ? dayjs(b.data_vencimento || b.data_despesa).valueOf() : 0;
                return ordem.direcao === 'asc' ? dataA - dataB : dataB - dataA;
            }
            if (ordem.coluna === 'descricao') {
                const descA = (a.descricao || '').toLowerCase();
                const descB = (b.descricao || '').toLowerCase();
                if (descA < descB) return ordem.direcao === 'asc' ? -1 : 1;
                if (descA > descB) return ordem.direcao === 'asc' ? 1 : -1;
                return 0;
            }
            if (ordem.coluna === 'valor') {
                const valorA = parseFloat(a.valor || 0);
                const valorB = parseFloat(b.valor || 0);
                return ordem.direcao === 'asc' ? valorA - valorB : valorB - valorA;
            }
            if (ordem.coluna === 'status') {
                // Lógica simples de ordenação de status (Pago vs Aberto)
                const statusA = a.pago ? 1 : 0;
                const statusB = b.pago ? 1 : 0;
                return ordem.direcao === 'asc' ? statusA - statusB : statusB - statusA;
            }
            return 0;
        });
        return sortableItems;
    }, [data, ordem]);

    const total = useMemo(() => data.reduce((acc, i) => acc + parseFloat(i.valor), 0), [data]);

    return (
        <Paper variant="outlined" sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 2, borderTop: `3px solid ${color}` }}>
            <Box sx={{ px: 1.5, py: 1, bgcolor: `${color}10`, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #eee' }}>
                {React.cloneElement(icon, { sx: { fontSize: 16, color: color } })}
                <Typography variant="caption" sx={{ fontWeight: '800', color: color, flexGrow: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {title}
                </Typography>
                <Chip label={data.length} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 'bold', bgcolor: 'white' }} />
            </Box>

            <TableContainer sx={{ flexGrow: 1 }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#fff', color: '#666', fontSize: '0.75rem' }}>
                                <TableSortLabel
                                    active={ordem.coluna === 'vencimento'}
                                    direction={ordem.coluna === 'vencimento' ? ordem.direcao : 'asc'}
                                    onClick={() => handleSort('vencimento')}
                                >
                                    Vencimento
                                </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#fff', color: '#666', fontSize: '0.75rem' }}>
                                <TableSortLabel
                                    active={ordem.coluna === 'descricao'}
                                    direction={ordem.coluna === 'descricao' ? ordem.direcao : 'asc'}
                                    onClick={() => handleSort('descricao')}
                                >
                                    Descrição
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: '#fff', color: '#666', fontSize: '0.75rem' }}>
                                <TableSortLabel
                                    active={ordem.coluna === 'valor'}
                                    direction={ordem.coluna === 'valor' ? ordem.direcao : 'asc'}
                                    onClick={() => handleSort('valor')}
                                >
                                    Valor
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#fff', color: '#666', fontSize: '0.75rem' }}>
                                <TableSortLabel
                                    active={ordem.coluna === 'status'}
                                    direction={ordem.coluna === 'status' ? ordem.direcao : 'asc'}
                                    onClick={() => handleSort('status')}
                                >
                                    Status
                                </TableSortLabel>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {listaOrdenada.length === 0 ? (
                            <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: '#999', fontSize: '0.8rem' }}>Sem despesas</TableCell></TableRow>
                        ) : listaOrdenada.map((item) => {
                            const dataDisplay = item.data_vencimento ? dayjs(item.data_vencimento) : dayjs(item.data_despesa);
                            const isVencida = !item.pago && dataDisplay.isBefore(dayjs(), 'day');
                            
                            return (
                                <TableRow 
                                    key={item.id} 
                                    hover 
                                    onClick={() => onRowClick(item)}
                                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5 !important' } }}
                                >
                                    <TableCell sx={{ fontSize: '0.75rem', color: isVencida ? '#d32f2f' : '#444', fontWeight: isVencida ? 600 : 400 }}>
                                        {dataDisplay.format('DD/MM/YY')}
                                    </TableCell>
                                    <TableCell sx={{ py: 0.5 }}>
                                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#333' }}>{item.descricao}</Typography>
                                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.65rem' }}>{item.categoria_nome}</Typography>
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#555' }}>
                                        {formatMoney(item.valor)}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip 
                                            label={item.pago ? "Pago" : (isVencida ? "Atrasado" : "Aberto")} 
                                            size="small" 
                                            color={item.pago ? "success" : (isVencida ? "error" : "default")}
                                            variant={item.pago ? "filled" : "outlined"}
                                            sx={{ height: 18, fontSize: '0.6rem', fontWeight: 'bold' }}
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box sx={{ p: 1, borderTop: '1px solid #eee', bgcolor: '#f9fafb', display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Typography variant="caption" color="text.secondary" fontSize="0.7rem">TOTAL:</Typography>
                <Typography variant="caption" fontWeight="800" color={color} fontSize="0.8rem">
                    {formatMoney(total)}
                </Typography>
            </Box>
        </Paper>
    );
};

export default function DespesasView() {
    const [lista, setLista] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filtroData, setFiltroData] = useState(dayjs());
    const [busca, setBusca] = useState('');
    
    const [modalOpen, setModalOpen] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [openCategorias, setOpenCategorias] = useState(false);

    const carregarDados = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (busca.length > 2) {
                params.search = busca;
            } else {
                params.mes = filtroData.month() + 1;
                params.ano = filtroData.year();
            }
            const res = await faturamentoService.getDespesas(params);
            setLista(res.data || []);
        } catch (error) { console.error(error); } 
        finally { setLoading(false); }
    }, [filtroData, busca]);

    useEffect(() => {
        const timeoutId = setTimeout(() => { carregarDados(); }, 500);
        return () => clearTimeout(timeoutId);
    }, [carregarDados]);

    const { fixas, variaveis } = useMemo(() => {
        return {
            fixas: lista.filter(d => d.categoria_tipo === 'Fixa'),
            variaveis: lista.filter(d => d.categoria_tipo !== 'Fixa')
        };
    }, [lista]);

    const handleRowClick = (item) => {
        setSelectedItem(item);
        setDrawerOpen(true);
    };

    return (
        <div className="fin-container" style={{ padding: '10px 20px' }}>
            
            <div className="fin-toolbar" style={{ marginBottom: 10 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <DatePicker 
                        views={['month', 'year']} 
                        value={filtroData} 
                        onChange={(v) => { setFiltroData(v); setBusca(''); }} 
                        slotProps={{ textField: { size: 'small', variant: 'standard', sx: { width: 100 } } }}
                        disabled={busca.length > 0}
                    />
                    
                    {/* --- O NOVO COMPONENTE DE NAVEGAÇÃO --- */}
                    <NavegadorMes 
                        filtroData={filtroData} 
                        setFiltroData={setFiltroData} 
                        disabled={busca.length > 0} 
                    />

                    <TextField 
                        size="small" 
                        placeholder="Buscar Despesa..." 
                        value={busca} 
                        onChange={(e) => setBusca(e.target.value)} 
                        variant="standard"
                        InputProps={{ 
                            startAdornment: (<InputAdornment position="start"><Search fontSize="small"/></InputAdornment>),
                            disableUnderline: true,
                            style: { fontSize: '0.9rem' }
                        }}
                        sx={{ width: 200, borderBottom: '1px solid #ddd', ml: 2 }} 
                    />
                </Box>

                <Box display="flex" gap={1}>
                    <Button 
                        size="small" onClick={() => setOpenCategorias(true)} startIcon={<Settings fontSize="small"/>} 
                        sx={{ color: '#666', textTransform: 'none' }}
                    >
                        Categorias
                    </Button>
                    <Button 
                        variant="contained" color="error" size="small" startIcon={<Add />}
                        onClick={() => setModalOpen(true)}
                        sx={{ fontWeight: 'bold', textTransform: 'none', borderRadius: 6, px: 3 }}
                    >
                        Nova Despesa
                    </Button>
                </Box>
            </div>

            <Box sx={{ flexGrow: 1, display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, overflow: 'hidden', position: 'relative' }}>
                {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }} />}

                <DespesaTable 
                    data={fixas} 
                    title="DESPESAS FIXAS" 
                    icon={<Domain />} 
                    color="#1565c0" 
                    onRowClick={handleRowClick}
                />
                
                <DespesaTable 
                    data={variaveis} 
                    title="DESPESAS VARIÁVEIS" 
                    icon={<LocalCafe />} 
                    color="#e65100" 
                    onRowClick={handleRowClick}
                />
            </Box>

            <LancamentoCaixaModal 
                open={modalOpen} 
                onClose={() => { setModalOpen(false); carregarDados(); }}
                initialType="despesa"
                initialTab={0}
            />

            <Drawer 
                anchor="right" 
                open={drawerOpen} 
                onClose={() => setDrawerOpen(false)}
                PaperProps={{ sx: { width: { xs: '100%', md: 450 }, p: 0 } }}
            >
                {selectedItem && (
                    <ExpenseDrawerContent 
                        item={selectedItem} 
                        onClose={() => setDrawerOpen(false)} 
                        onUpdate={carregarDados} 
                    />
                )}
            </Drawer>

            <Drawer anchor="right" open={openCategorias} onClose={() => { setOpenCategorias(false); carregarDados(); }}>
                <Box sx={{ width: 400, p: 2 }}>
                    <CategoriasTab />
                </Box>
            </Drawer>
        </div>
    );
}