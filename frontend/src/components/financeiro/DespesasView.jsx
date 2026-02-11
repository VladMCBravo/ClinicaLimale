// src/components/financeiro/DespesasView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    TextField, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableFooter,
    IconButton, Typography, Chip, Box, Stack, InputAdornment, Button, Dialog, DialogTitle, DialogContent, DialogActions, TablePagination
} from '@mui/material';
import { 
    Edit, Delete, CheckCircle, Domain, LocalCafe, Search, TrendingDown, Check, MoneyOff, Close, Settings 
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import TransactionDrawer from './TransactionDrawer'; 
import BaixaUnificadaModal from './BaixaUnificadaModal'; 
import EditarDespesaModal from './EditarDespesaModal'; 
import CategoriasTab from '../configuracoes/CategoriasTab';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// Helper para data segura (Vencimento > Competência > Hoje)
const getDisplayDate = (item) => {
    if (item.data_vencimento) return dayjs(item.data_vencimento);
    if (item.data_despesa) return dayjs(item.data_despesa);
    return dayjs();
};

const TabelaDespesas = ({ dados, titulo, icone, corTema, onEdit, onRowClick, onCheck, onDelete }) => {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);

    const handleChangePage = (event, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const dadosVisiveis = useMemo(() => {
        return dados.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [dados, page, rowsPerPage]);

    const totalTabela = useMemo(() => dados.reduce((acc, item) => acc + Number(item.valor), 0), [dados]);
    
    return (
        <Paper 
            variant="outlined" 
            sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 2, borderTop: `4px solid ${corTema}` }}
        >
            <Box sx={{ px: 1.5, py: 1, bgcolor: `${corTema}10`, display: 'flex', alignItems: 'center', gap: 1 }}>
                {React.cloneElement(icone, { sx: { fontSize: 18, color: corTema } })}
                <Typography variant="caption" sx={{ fontWeight: '800', color: corTema, flexGrow: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {titulo}
                </Typography>
                <Chip label={dados.length} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold', bgcolor: 'white' }} />
            </Box>

            <TableContainer sx={{ flexGrow: 1, overflowY: 'auto' }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#fff' }}>Vencimento</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#fff' }}>Descrição</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: '#fff' }}>Valor</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#fff' }}>Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {dadosVisiveis.length === 0 ? (
                            <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: '#999' }}>Sem lançamentos</TableCell></TableRow>
                        ) : dadosVisiveis.map((item) => {
                            // DATA FIX: Usa o helper para garantir que nunca venha nulo
                            const dataExibicao = getDisplayDate(item);
                            const isVencida = !item.pago && dataExibicao.isBefore(dayjs(), 'day');
                            
                            return (
                                <TableRow 
                                    key={item.id} 
                                    hover 
                                    sx={{ bgcolor: isVencida ? '#fff5f5' : 'inherit', cursor: 'pointer' }}
                                    onClick={() => onRowClick(item)}
                                >
                                    <TableCell sx={{ fontSize: '0.75rem', color: isVencida ? '#d32f2f' : 'inherit', fontWeight: isVencida ? 600 : 400 }}>
                                        {dataExibicao.format('DD/MM/YY')}
                                    </TableCell>
                                    <TableCell sx={{ py: 0.5 }}>
                                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#444' }}>{item.descricao}</Typography>
                                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.65rem' }}>{item.categoria_nome}</Typography>
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#555' }}>
                                        {formatMoney(item.valor)}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Stack direction="row" spacing={0} justifyContent="center">
                                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(item); }}>
                                                <Edit sx={{ fontSize: 16, color: 'text.secondary' }} />
                                            </IconButton>
                                            {!item.pago && (
                                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); onCheck(item); }} color="success">
                                                    <CheckCircle sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            )}
                                            <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}>
                                                <Delete sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                    {dados.length > 0 && (
                        <TableFooter sx={{ position: 'sticky', bottom: 0, bgcolor: '#fafafa', zIndex: 2, borderTop: '1px solid #eee' }}>
                            <TableRow>
                                <TableCell colSpan={2} sx={{ textAlign: 'right', fontSize: '0.7rem', fontWeight: 'bold', color: '#666' }}>
                                    TOTAL PARCIAL:
                                </TableCell>
                                <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: '800', color: corTema }}>
                                    {formatMoney(totalTabela)}
                                </TableCell>
                                <TableCell />
                            </TableRow>
                        </TableFooter>
                    )}
                </Table>
            </TableContainer>
            
            <TablePagination
                component="div"
                count={dados.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Itens:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
                sx={{ borderTop: '1px solid #eee', bgcolor: '#fff' }}
            />
        </Paper>
    );
};

export default function DespesasView({ dadosIniciais = [], onReload }) {
    const { showSnackbar } = useSnackbar();
    
    // Agora usamos dadosIniciais como fonte de verdade! Sem fetch duplicado.
    const [localDespesas, setLocalDespesas] = useState(dadosIniciais);
    
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerId, setDrawerId] = useState(null); 
    const [openEditModal, setOpenEditModal] = useState(false); 
    const [selectedItem, setSelectedItem] = useState(null); 

    const [searchTerm, setSearchTerm] = useState('');
    const [filtroData, setFiltroData] = useState(dayjs());
    
    const [openBaixaModal, setOpenBaixaModal] = useState(false);
    const [openCategorias, setOpenCategorias] = useState(false); 

    // Sincroniza se a tela principal atualizar
    useEffect(() => {
        setLocalDespesas(dadosIniciais);
    }, [dadosIniciais]);

    // Filtragem Local Instantânea (Client-Side)
    // Resolve a lentidão de buscar no servidor a cada letra digitada
    const processedData = useMemo(() => {
        // 1. Filtrar
        let filtrados = localDespesas;

        // Filtro de Mês (Só aplica se não tiver busca global)
        if (!searchTerm) {
            filtrados = filtrados.filter(d => {
                // Tenta Vencimento, se não, Competência
                const dataRef = d.data_vencimento ? dayjs(d.data_vencimento) : dayjs(d.data_despesa);
                return dataRef.month() === filtroData.month() && dataRef.year() === filtroData.year();
            });
        }

        // Filtro de Busca (Texto)
        if (searchTerm) {
            const lowerBusca = searchTerm.toLowerCase();
            filtrados = filtrados.filter(d => 
                (d.descricao && d.descricao.toLowerCase().includes(lowerBusca)) ||
                (d.categoria_nome && d.categoria_nome.toLowerCase().includes(lowerBusca))
            );
        }

        // 2. Separar e Calcular
        const fixas = filtrados.filter(d => d.categoria_tipo === 'Fixa');
        const variaveis = filtrados.filter(d => d.categoria_tipo !== 'Fixa');

        const resumoGeral = filtrados.reduce((acc, curr) => {
            const val = parseFloat(curr.valor || 0);
            acc.total += val;
            curr.pago ? (acc.pagas += val) : (acc.aPagar += val);
            return acc;
        }, { pagas: 0, aPagar: 0, total: 0 });

        return { fixas, variaveis, resumoGeral };
    }, [localDespesas, searchTerm, filtroData]);

    const { fixas, variaveis, resumoGeral } = processedData;

    // --- AÇÕES ---

    const handleReload = () => {
        if (onReload) onReload(); // Chama o recarregamento "pesado" do pai
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Confirmar exclusão?")) return;
        
        // Optimistic Update: Remove da tela antes do servidor responder
        setLocalDespesas(prev => prev.filter(d => d.id !== id));

        try {
            await faturamentoService.deleteDespesa(id);
            // Sucesso silencioso, já atualizamos a tela
            if(onReload) onReload(); // Sincroniza totais do dashboard em background
        } catch (e) { 
            showSnackbar('Erro ao excluir', 'error');
            setLocalDespesas(dadosIniciais); // Reverte em caso de erro
        }
    };

    return (
        <Box sx={{ p: 1, height: 'calc(100vh - 155px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* KPI + FILTROS */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, gap: 2 }}>
                <Stack direction="row" spacing={1.5}>
                    <CompactKPI title="TOTAL" value={resumoGeral.total} icon={<TrendingDown fontSize="inherit" />} color="#455a64" bgcolor="#eceff1"/>
                    <CompactKPI title="PAGAS" value={resumoGeral.pagas} icon={<Check fontSize="inherit" />} color="#2e7d32" bgcolor="#e8f5e9"/>
                    <CompactKPI title="A PAGAR" value={resumoGeral.aPagar} icon={<MoneyOff fontSize="inherit" />} color="#d32f2f" bgcolor="#ffebee"/>
                </Stack>

                <Box sx={{ display: 'flex', gap: 1 }}>
                    <DatePicker 
                        views={['month', 'year']} 
                        value={filtroData} 
                        onChange={(v) => setFiltroData(v)} 
                        slotProps={{ textField: { size: 'small', sx: { width: 140, bgcolor: 'white' } } }}
                        disabled={!!searchTerm}
                    />
                    <Button variant="outlined" size="small" onClick={() => setOpenCategorias(true)} startIcon={<Settings />} sx={{ height: 40, bgcolor: 'white', borderColor: '#ccc', color: '#666' }}>Categorias</Button>
                    <TextField 
                        size="small" placeholder="Busca Global (Descrição)..." 
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
                        InputProps={{ 
                            startAdornment: (<InputAdornment position="start"><Search /></InputAdornment>),
                            endAdornment: searchTerm && (
                                <IconButton size="small" onClick={() => setSearchTerm('')}><Close fontSize="small" /></IconButton>
                            )
                        }}
                        sx={{ width: 250, bgcolor: searchTerm ? '#e3f2fd' : 'white' }} 
                    />
                </Box>
            </Box>

            {/* TABELAS (Carregam Instantaneamente agora) */}
            <Box sx={{ flexGrow: 1, display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, overflow: 'hidden' }}>
                <TabelaDespesas 
                    dados={fixas} titulo={searchTerm ? "RESULTADO (FIXAS)" : "FIXAS"} icone={<Domain />} corTema="#1565c0" 
                    onRowClick={(item) => { setDrawerId(item.id); setDrawerOpen(true); }}
                    onEdit={(item) => { setSelectedItem(item); setOpenEditModal(true); }} 
                    onCheck={(item) => { setSelectedItem(item); setOpenBaixaModal(true); }} 
                    onDelete={handleDelete} 
                />
                <TabelaDespesas 
                    dados={variaveis} titulo={searchTerm ? "RESULTADO (VARIÁVEIS)" : "VARIÁVEIS"} icone={<LocalCafe />} corTema="#e65100" 
                    onRowClick={(item) => { setDrawerId(item.id); setDrawerOpen(true); }}
                    onEdit={(item) => { setSelectedItem(item); setOpenEditModal(true); }} 
                    onCheck={(item) => { setSelectedItem(item); setOpenBaixaModal(true); }} 
                    onDelete={handleDelete} 
                />
            </Box>

            {/* MODAIS */}
            <EditarDespesaModal open={openEditModal} despesa={selectedItem} onClose={() => setOpenEditModal(false)} onSave={handleReload} showSnackbar={showSnackbar} />
            <TransactionDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} transactionId={drawerId} onUpdate={handleReload} />
            <BaixaUnificadaModal open={openBaixaModal} onClose={() => setOpenBaixaModal(false)} item={selectedItem} onConfirmBaixa={async (id, dados) => {
                    setLocalDespesas(prev => prev.map(d => d.id === id ? { ...d, pago: true } : d));
                    try { await faturamentoService.updateDespesa(id, { pago: true, ...dados }); handleReload(); } catch(e) { handleReload(); }
            }} />
            <Dialog open={openCategorias} onClose={() => { setOpenCategorias(false); handleReload(); }} maxWidth="md" fullWidth>
                <DialogTitle sx={{ pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Gerenciar Categorias Financeiras
                    <IconButton onClick={() => setOpenCategorias(false)} size="small"><Close /></IconButton>
                </DialogTitle>
                <DialogContent dividers><CategoriasTab /></DialogContent>
                <DialogActions><Button onClick={() => setOpenCategorias(false)}>Fechar</Button></DialogActions>
            </Dialog>
        </Box>
    );
}

const CompactKPI = ({ title, value, icon, color, bgcolor }) => (
    <Paper elevation={0} sx={{ p: 0.5, px: 1.5, borderRadius: 2, bgcolor: bgcolor, display: 'flex', alignItems: 'center', gap: 1, border: `1px solid ${color}30`, minWidth: 130, height: 40 }}>
        <Box sx={{ bgcolor: 'white', p: 0.3, borderRadius: '50%', display: 'flex', color: color }}>{icon}</Box>
        <Box sx={{ lineHeight: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: color, opacity: 0.9, fontSize: '0.65rem', display: 'block' }}>{title}</Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: color, fontSize: '0.85rem' }}>{formatMoney(value)}</Typography>
        </Box>
    </Paper>
);