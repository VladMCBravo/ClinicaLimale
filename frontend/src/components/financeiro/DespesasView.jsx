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
import CategoriasTab from '../configuracoes/CategoriasTab';

// --- IMPORTANDO OS NOSSOS NOVOS PILARES ---
import ModalLancamentoAvulso from './ModalLancamentoAvulso';
import DrawerDespesa from './DrawerDespesa';

import './Financeiro.css';

dayjs.locale('pt-br');

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// --- COMPONENTE DE NAVEGAÇÃO DE MÊS COMPACTO ---
const NavegadorMes = ({ filtroData, setFiltroData, disabled }) => {
    const irParaMesAnterior = () => setFiltroData(prev => prev.subtract(1, 'month'));
    const irParaProximoMes = () => setFiltroData(prev => prev.add(1, 'month'));
    const irParaMesAtual = () => setFiltroData(dayjs());

    const nomeMes = filtroData.format('MMM').toLowerCase();

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#e9ecef', borderRadius: 1, px: 0.5, py: 0.2, opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto', height: 32 }}>
            <IconButton size="small" onClick={irParaMesAnterior} sx={{ p: 0.5 }}>
                <ChevronLeft fontSize="small" sx={{ color: '#495057' }} />
            </IconButton>
            
            <Typography 
                variant="caption" 
                onClick={irParaMesAtual} 
                sx={{ cursor: 'pointer', fontWeight: 'bold', color: '#343a40', px: 1, minWidth: 35, textAlign: 'center', textTransform: 'uppercase', '&:hover': { color: 'primary.main' } }}
            >
                {nomeMes}
            </Typography>
            
            <IconButton size="small" onClick={irParaProximoMes} sx={{ p: 0.5 }}>
                <ChevronRight fontSize="small" sx={{ color: '#495057' }} />
            </IconButton>
        </Box>
    );
};

// --- SUBCONPONENTE DE TABELA COMPACTA (TASY STYLE) ---
const DespesaTable = ({ data, title, icon, color, onRowClick }) => {
    const [ordem, setOrdem] = useState({ coluna: 'vencimento', direcao: 'asc' });

    const handleSort = (coluna) => {
        const isAsc = ordem.coluna === coluna && ordem.direcao === 'asc';
        setOrdem({ coluna, direcao: isAsc ? 'desc' : 'asc' });
    };

    const listaOrdenada = useMemo(() => {
        let sortableItems = [...data];
        sortableItems.sort((a, b) => {
            if (ordem.coluna === 'vencimento') {
                const dataA = (a.data_vencimento || a.data_despesa) ? dayjs(a.data_vencimento || a.data_despesa).valueOf() : 0;
                const dataB = (b.data_vencimento || b.data_despesa) ? dayjs(b.data_vencimento || b.data_despesa).valueOf() : 0;
                return ordem.direcao === 'asc' ? dataA - dataB : dataB - dataA;
            }
            if (ordem.coluna === 'descricao') {
                const descA = (a.descricao || '').toLowerCase();
                const descB = (b.descricao || '').toLowerCase();
                return ordem.direcao === 'asc' ? descA.localeCompare(descB) : descB.localeCompare(descA);
            }
            if (ordem.coluna === 'valor') {
                const valorA = parseFloat(a.valor || 0);
                const valorB = parseFloat(b.valor || 0);
                return ordem.direcao === 'asc' ? valorA - valorB : valorB - valorA;
            }
            if (ordem.coluna === 'status') {
                const statusA = a.pago ? 1 : 0;
                const statusB = b.pago ? 1 : 0;
                return ordem.direcao === 'asc' ? statusA - statusB : statusB - statusA;
            }
            return 0;
        });
        return sortableItems;
    }, [data, ordem]);

    const totais = useMemo(() => {
        return data.reduce((acc, item) => {
            const valor = parseFloat(item.valor) || 0;
            acc.total += valor;
            
            if (item.pago) {
                acc.pago += valor;
            } else {
                const dataDisplay = item.data_vencimento ? dayjs(item.data_vencimento) : dayjs(item.data_despesa);
                if (dataDisplay.isBefore(dayjs(), 'day')) {
                    acc.atrasado += valor;
                }
            }
            return acc;
        }, { total: 0, pago: 0, atrasado: 0 });
    }, [data]);

    return (
        <Paper className="tasy-flat-panel" sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderTop: `3px solid ${color}` }}>
            
            {/* CABEÇALHO DA TABELA */}
            <div className="tasy-section-header" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#ffffff', borderBottom: '1px solid #e9ecef', padding: '10px 12px' }}>
                {React.cloneElement(icon, { sx: { fontSize: 18, color: color } })}
                <Typography variant="caption" sx={{ fontWeight: '800', color: color, flexGrow: 1, textTransform: 'uppercase' }}>
                    {title}
                </Typography>
                <Chip label={data.length} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold', bgcolor: '#f8f9fa', color: '#495057', border: '1px solid #dee2e6' }} />
            </div>

            <TableContainer sx={{ flexGrow: 1, bgcolor: '#ffffff' }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057', py: 1 }}>
                                <TableSortLabel active={ordem.coluna === 'vencimento'} direction={ordem.direcao} onClick={() => handleSort('vencimento')}>
                                    Vencimento
                                </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057', py: 1 }}>
                                <TableSortLabel active={ordem.coluna === 'descricao'} direction={ordem.direcao} onClick={() => handleSort('descricao')}>
                                    Descrição
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057', py: 1 }}>
                                <TableSortLabel active={ordem.coluna === 'valor'} direction={ordem.direcao} onClick={() => handleSort('valor')}>
                                    Valor (R$)
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057', py: 1 }}>Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {listaOrdenada.length === 0 ? (
                            <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6, color: '#868e96' }}>Sem despesas neste período.</TableCell></TableRow>
                        ) : listaOrdenada.map((item) => {
                            const dataDisplay = item.data_vencimento ? dayjs(item.data_vencimento) : dayjs(item.data_despesa);
                            const isVencida = !item.pago && dataDisplay.isBefore(dayjs(), 'day');
                            
                            return (
                                <TableRow key={item.id} hover onClick={() => onRowClick(item)} sx={{ cursor: 'pointer' }}>
                                    <TableCell sx={{ color: isVencida ? '#d32f2f' : '#495057', py: 1.5 }}>
                                        <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: isVencida ? 600 : 500 }}>
                                            {dataDisplay.format('DD/MM/YYYY')}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#343a40' }}>{item.descricao}</Typography>
                                        <Typography variant="caption" sx={{ color: '#868e96', fontSize: '0.75rem' }}>{item.categoria_nome}</Typography>
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#495057', fontSize: '0.90rem' }}>
                                        {formatMoney(item.valor)}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip 
                                            label={item.pago ? "Pago" : (isVencida ? "Atrasado" : "Pendente")} 
                                            size="small" 
                                            color={item.pago ? "success" : (isVencida ? "error" : "warning")}
                                            variant={item.pago ? "filled" : "outlined"}
                                            sx={{ height: 22, fontSize: '0.70rem', fontWeight: 'bold', borderRadius: 1 }}
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* RODAPÉ ESTATÍSTICO TASY */}
            <Box sx={{ p: 1.5, borderTop: '1px solid #e9ecef', bgcolor: '#f8f9fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', gap: 3 }}>
                    <Typography variant="caption" sx={{ color: '#6c757d', fontSize: '0.75rem' }}>
                        PAGOS: <b style={{ color: '#2e7d32' }}>{formatMoney(totais.pago)}</b>
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6c757d', fontSize: '0.75rem' }}>
                        ATRASADOS: <b style={{ color: '#d32f2f' }}>{formatMoney(totais.atrasado)}</b>
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" fontSize="0.75rem">TOTAL GERAL:</Typography>
                    <Typography variant="body2" fontWeight="900" color={color} sx={{ fontSize: '0.95rem' }}>
                        {formatMoney(totais.total)}
                    </Typography>
                </Box>
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
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 1, backgroundColor: '#f1f3f5' }}>
            
            {/* TOOLBAR ESTILO TASY */}
            <Paper className="tasy-flat-panel" sx={{ p: 1.5, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <DatePicker 
                        views={['month', 'year']} 
                        value={filtroData} 
                        onChange={(v) => { setFiltroData(v); setBusca(''); }} 
                        className="tasy-compact-input"
                        slotProps={{ textField: { size: 'small', sx: { width: 130 } } }}
                        disabled={busca.length > 0}
                    />
                    
                    <NavegadorMes filtroData={filtroData} setFiltroData={setFiltroData} disabled={busca.length > 0} />

                    <TextField 
                        size="small" 
                        className="tasy-compact-input"
                        placeholder="Buscar Despesa..." 
                        value={busca} 
                        onChange={(e) => setBusca(e.target.value)} 
                        InputProps={{ 
                            startAdornment: (<InputAdornment position="start"><Search fontSize="small"/></InputAdornment>),
                        }}
                        sx={{ width: 250, ml: 1 }} 
                    />
                </Box>

                <Box display="flex" gap={1.5}>
                    <Button 
                        size="small" variant="outlined" color="inherit"
                        onClick={() => setOpenCategorias(true)} startIcon={<Settings fontSize="small"/>} 
                        sx={{ color: '#495057', borderColor: '#ced4da', textTransform: 'none', borderRadius: 1 }}
                    >
                        Categorias
                    </Button>
                    <Button 
                        variant="contained" color="error" size="small" startIcon={<Add />}
                        onClick={() => setModalOpen(true)}
                        sx={{ fontWeight: 'bold', textTransform: 'none', borderRadius: 1 }}
                    >
                        Nova Despesa
                    </Button>
                </Box>
            </Paper>

            {/* ÁREA DOS GRIDS DE DESPESA (LADO A LADO) */}
            <Box sx={{ flexGrow: 1, display: 'flex', gap: 1, flexDirection: { xs: 'column', md: 'row' }, overflow: 'hidden', position: 'relative' }}>
                {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }} />}

                <DespesaTable data={fixas} title="Despesas Fixas" icon={<Domain />} color="#1565c0" onRowClick={handleRowClick} />
                <DespesaTable data={variaveis} title="Despesas Variáveis" icon={<LocalCafe />} color="#e65100" onRowClick={handleRowClick} />
            </Box>

            {/* --- PILAR 1: MODAL DE CRIAÇÃO --- */}
            <ModalLancamentoAvulso 
                open={modalOpen} 
                onClose={() => setModalOpen(false)}
                onSuccess={carregarDados}
                initialType="despesa"
            />

            {/* --- PILAR 3: DRAWER DE EDIÇÃO E QUITAÇÃO --- */}
            <Drawer 
                anchor="right" 
                open={drawerOpen} 
                onClose={() => setDrawerOpen(false)}
                PaperProps={{ sx: { width: { xs: '100%', md: 450 }, p: 0 } }}
            >
                {selectedItem && (
                    <DrawerDespesa 
                        item={selectedItem} 
                        onClose={() => setDrawerOpen(false)} 
                        onUpdate={carregarDados} 
                    />
                )}
            </Drawer>

            {/* DRAWER DE CATEGORIAS (MANTIDO) */}
            <Drawer anchor="right" open={openCategorias} onClose={() => { setOpenCategorias(false); carregarDados(); }}>
                <Box sx={{ width: 400, p: 2 }}>
                    <CategoriasTab />
                </Box>
            </Drawer>
        </Box>
    );
}