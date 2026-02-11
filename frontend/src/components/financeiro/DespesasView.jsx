// src/components/financeiro/DespesasView.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    TextField, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableFooter,
    IconButton, Typography, Chip, Box, Stack, InputAdornment, Button, Dialog, DialogTitle, DialogContent, DialogActions 
} from '@mui/material';
import { 
    Edit, Delete, CheckCircle, Domain, LocalCafe, Search, TrendingDown, Check, MoneyOff, Close, Settings 
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { debounce } from '@mui/material/utils';

import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import LancamentoCaixaModal from './LancamentoCaixaModal';
import TransactionDrawer from './TransactionDrawer'; 
import BaixaUnificadaModal from './BaixaUnificadaModal'; 
import EditarDespesaModal from './EditarDespesaModal'; 
import CategoriasTab from '../configuracoes/CategoriasTab';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// --- COMPONENTE VISUAL DA TABELA (AJUSTADO PARA DUPLO MODO) ---
// Adicionamos a prop "onRowClick" separada do "onEdit"
const TabelaDespesas = ({ dados, titulo, icone, corTema, onEdit, onRowClick, onCheck, onDelete }) => {
    
    const totalTabela = useMemo(() => dados.reduce((acc, item) => acc + Number(item.valor), 0), [dados]);

    return (
        <Paper 
            variant="outlined" 
            sx={{ 
                flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', 
                borderRadius: 2, borderTop: `4px solid ${corTema}`
            }}
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
                        {dados.length === 0 ? (
                            <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: '#999' }}>Sem lançamentos</TableCell></TableRow>
                        ) : dados.map((item) => {
                            const isVencida = !item.pago && dayjs(item.data_vencimento).isBefore(dayjs(), 'day');
                            return (
                                <TableRow 
                                    key={item.id} 
                                    hover 
                                    sx={{ bgcolor: isVencida ? '#fff5f5' : 'inherit', cursor: 'pointer' }}
                                    // 1. CLIQUE NA LINHA -> Abre a Gaveta (Drawer)
                                    onClick={() => onRowClick(item)}
                                >
                                    <TableCell sx={{ fontSize: '0.75rem', color: isVencida ? '#d32f2f' : 'inherit', fontWeight: isVencida ? 600 : 400 }}>
                                        {dayjs(item.data_vencimento || item.data_despesa).format('DD/MM/YY')}
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
                                            {/* 2. CLIQUE NO LÁPIS -> Abre o Modal Antigo (Backup) */}
                                            <IconButton size="small" onClick={(e) => { 
                                                e.stopPropagation(); // Impede que o clique no lápis abra a gaveta também
                                                onEdit(item); 
                                            }}>
                                                <Edit sx={{ fontSize: 16, color: 'text.secondary' }} />
                                            </IconButton>
                                            
                                            {!item.pago && (
                                                <IconButton size="small" onClick={(e) => {
                                                    e.stopPropagation();
                                                    onCheck(item);
                                                }} color="success">
                                                    <CheckCircle sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            )}
                                            
                                            <IconButton size="small" color="error" onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete(item.id);
                                            }}>
                                                <Delete sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                    <TableFooter sx={{ position: 'sticky', bottom: 0, bgcolor: '#fafafa', zIndex: 2, borderTop: '1px solid #eee' }}>
                         <TableRow>
                            <TableCell colSpan={2} sx={{ textAlign: 'right', fontSize: '0.7rem', fontWeight: 'bold', color: '#666' }}>TOTAL:</TableCell>
                            <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: '800', color: corTema }}>{formatMoney(totalTabela)}</TableCell>
                            <TableCell />
                         </TableRow>
                    </TableFooter>
                </Table>
            </TableContainer>
        </Paper>
    );
};

// --- COMPONENTE PRINCIPAL ---
export default function DespesasView({ onReload }) {
    const { showSnackbar } = useSnackbar();
    
    // Estados Globais
    const [despesas, setDespesas] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Estados para os DOIS modos de edição
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerId, setDrawerId] = useState(null); // ID para a Gaveta
    const [openEditModal, setOpenEditModal] = useState(false); // Modal Antigo
    const [selectedItem, setSelectedItem] = useState(null); // Objeto para o Modal Antigo

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [filtroData, setFiltroData] = useState(dayjs());
    
    // Outros Modais
    const [openBaixaModal, setOpenBaixaModal] = useState(false);
    const [openMestreModal, setOpenMestreModal] = useState(false); 
    const [openCategorias, setOpenCategorias] = useState(false); 

    const fetchDespesas = useCallback(async (busca = '') => {
        setLoading(true);
        try {
            let params = {};
            if (busca) {
                params = { search: busca };
            } else {
                params = { 
                    mes: filtroData.month() + 1,
                    ano: filtroData.year()
                };
            }
            const response = await faturamentoService.getDespesas(params);
            setDespesas(response.data); 
        } catch (error) {
            console.error(error);
            showSnackbar('Erro ao carregar despesas', 'error');
        } finally {
            setLoading(false);
        }
    }, [filtroData, showSnackbar]);

    const debouncedSearch = useMemo(() => 
        debounce((termo) => {
            fetchDespesas(termo);
        }, 800),
    [fetchDespesas]);

    useEffect(() => {
        if (!searchTerm) {
            fetchDespesas();
        }
    }, [filtroData, fetchDespesas, searchTerm]);

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchTerm(val);
        debouncedSearch(val);
    };

    const processedData = useMemo(() => {
        const fixas = despesas.filter(d => d.categoria_tipo === 'Fixa');
        const variaveis = despesas.filter(d => d.categoria_tipo !== 'Fixa');

        const resumoGeral = despesas.reduce((acc, curr) => {
            const val = parseFloat(curr.valor || 0);
            acc.total += val;
            curr.pago ? (acc.pagas += val) : (acc.aPagar += val);
            return acc;
        }, { pagas: 0, aPagar: 0, total: 0 });

        return { fixas, variaveis, resumoGeral };
    }, [despesas]);

    const { fixas, variaveis, resumoGeral } = processedData;

    const handleDelete = async (id) => {
        if (!window.confirm("Confirmar exclusão?")) return;
        try {
            await faturamentoService.deleteDespesa(id);
            fetchDespesas(searchTerm);
            if(onReload) onReload();
        } catch (e) { showSnackbar('Erro ao excluir', 'error'); }
    };

    return (
        <Box sx={{ p: 1, height: 'calc(100vh - 155px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
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
                        onChange={(v) => { setFiltroData(v); setSearchTerm(''); }} 
                        slotProps={{ textField: { size: 'small', sx: { width: 140, bgcolor: 'white' } } }}
                        disabled={!!searchTerm}
                    />
                    <Button 
                        variant="outlined" size="small" 
                        onClick={() => setOpenCategorias(true)}
                        startIcon={<Settings />}
                        sx={{ height: 40, bgcolor: 'white', borderColor: '#ccc', color: '#666' }}
                    >
                        Categorias
                    </Button>
                    <TextField 
                        size="small" placeholder="Busca Global (Descrição)..." 
                        value={searchTerm} onChange={handleSearchChange} 
                        InputProps={{ 
                            startAdornment: (<InputAdornment position="start"><Search /></InputAdornment>),
                            endAdornment: searchTerm && (
                                <IconButton size="small" onClick={() => { setSearchTerm(''); fetchDespesas(''); }}>
                                    <Close fontSize="small" />
                                </IconButton>
                            )
                        }}
                        sx={{ width: 250, bgcolor: searchTerm ? '#e3f2fd' : 'white' }} 
                    />
                </Box>
            </Box>

            {/* TABELAS - COM DUPLA AÇÃO */}
            {loading ? (
                <Typography sx={{p:4, textAlign: 'center'}}>Carregando...</Typography>
            ) : (
                <Box sx={{ flexGrow: 1, display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, overflow: 'hidden' }}>
                    <TabelaDespesas 
                        dados={fixas} 
                        titulo={searchTerm ? "RESULTADO (FIXAS)" : "FIXAS"} 
                        icone={<Domain />} corTema="#1565c0" 
                        
                        // MODO GAVETA (NOVO): Clique na Linha
                        onRowClick={(item) => { 
                            setDrawerId(item.id); 
                            setDrawerOpen(true); 
                        }}
                        
                        // MODO MODAL (ANTIGO): Clique no Lápis
                        onEdit={(item) => { 
                            setSelectedItem(item); 
                            setOpenEditModal(true); 
                        }} 
                        
                        onCheck={(item) => { setSelectedItem(item); setOpenBaixaModal(true); }} 
                        onDelete={handleDelete} 
                    />
                    <TabelaDespesas 
                        dados={variaveis} 
                        titulo={searchTerm ? "RESULTADO (VARIÁVEIS)" : "VARIÁVEIS"} 
                        icone={<LocalCafe />} corTema="#e65100" 
                        
                        // MODO GAVETA (NOVO)
                        onRowClick={(item) => { 
                            setDrawerId(item.id); 
                            setDrawerOpen(true); 
                        }}

                        // MODO MODAL (ANTIGO)
                        onEdit={(item) => { 
                            setSelectedItem(item); 
                            setOpenEditModal(true); 
                        }} 

                        onCheck={(item) => { setSelectedItem(item); setOpenBaixaModal(true); }} 
                        onDelete={handleDelete} 
                    />
                </Box>
            )}

            {/* --- MODAL ANTIGO (Lápis) --- */}
            <EditarDespesaModal
                open={openEditModal}
                despesa={selectedItem}
                onClose={() => setOpenEditModal(false)}
                onSave={() => fetchDespesas(searchTerm)}
                showSnackbar={showSnackbar}
            />

            {/* --- GAVETA NOVA (Clique na Linha) --- */}
            <TransactionDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                transactionId={drawerId} 
                onUpdate={() => fetchDespesas(searchTerm)} 
            />

            <BaixaUnificadaModal 
                open={openBaixaModal}
                onClose={() => setOpenBaixaModal(false)}
                item={selectedItem}
                onConfirmBaixa={async (id, dados) => {
                    await faturamentoService.updateDespesa(id, { pago: true, ...dados });
                    fetchDespesas(searchTerm);
                }}
            />

            <Dialog 
                open={openCategorias} 
                onClose={() => { setOpenCategorias(false); fetchDespesas(searchTerm); }} 
                maxWidth="md" fullWidth
            >
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
    <Paper 
        elevation={0} 
        sx={{ 
            p: 0.5, px: 1.5, borderRadius: 2, bgcolor: bgcolor, 
            display: 'flex', alignItems: 'center', gap: 1,
            border: `1px solid ${color}30`,
            minWidth: 130, height: 40
        }}
    >
        <Box sx={{ bgcolor: 'white', p: 0.3, borderRadius: '50%', display: 'flex', color: color }}>{icon}</Box>
        <Box sx={{ lineHeight: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: color, opacity: 0.9, fontSize: '0.65rem', display: 'block' }}>{title}</Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: color, fontSize: '0.85rem' }}>{formatMoney(value)}</Typography>
        </Box>
    </Paper>
);