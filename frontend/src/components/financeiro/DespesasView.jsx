// src/components/financeiro/DespesasView.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    TextField, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Typography, Chip, Box, InputAdornment, Button, Drawer, LinearProgress
} from '@mui/material';
import { Search, Add, Settings, Domain, LocalCafe } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

import { faturamentoService } from '../../services/faturamentoService';
import LancamentoCaixaModal from './LancamentoCaixaModal';
import { ExpenseDrawerContent } from './ExpensePaymentDrawer'; // NOVO DRAWER
import CategoriasTab from '../configuracoes/CategoriasTab';

// Importa CSS Global
import './Financeiro.css';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// Subcomponente de Tabela Compacta
const DespesaTable = ({ data, title, icon, color, onRowClick }) => {
    // Totais locais da tabela
    const total = useMemo(() => data.reduce((acc, i) => acc + parseFloat(i.valor), 0), [data]);

    return (
        <Paper variant="outlined" sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 2, borderTop: `3px solid ${color}` }}>
            {/* Header da Tabela */}
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
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#fff', color: '#666', fontSize: '0.75rem' }}>Vencimento</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#fff', color: '#666', fontSize: '0.75rem' }}>Descrição</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: '#fff', color: '#666', fontSize: '0.75rem' }}>Valor</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#fff', color: '#666', fontSize: '0.75rem' }}>Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: '#999', fontSize: '0.8rem' }}>Sem despesas</TableCell></TableRow>
                        ) : data.map((item) => {
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

            {/* Rodapé Fixo */}
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
    
    // Modais e Drawer
    const [modalOpen, setModalOpen] = useState(false); // Nova Despesa
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

    // Separa dados (Fixas vs Variáveis)
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
            
            {/* TOOLBAR */}
            <div className="fin-toolbar" style={{ marginBottom: 10 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <DatePicker 
                        views={['month', 'year']} 
                        value={filtroData} 
                        onChange={(v) => { setFiltroData(v); setBusca(''); }} 
                        slotProps={{ textField: { size: 'small', variant: 'standard', sx: { width: 120 } } }}
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
                        sx={{ width: 250, borderBottom: '1px solid #ddd' }} 
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

            {/* CONTEÚDO (DUAS TABELAS) */}
            <Box sx={{ flexGrow: 1, display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, overflow: 'hidden', position: 'relative' }}>
                {loading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }} />}

                <DespesaTable 
                    data={fixas} 
                    title="DESPESAS FIXAS" 
                    icon={<Domain />} 
                    color="#1565c0" // Azul
                    onRowClick={handleRowClick}
                />
                
                <DespesaTable 
                    data={variaveis} 
                    title="DESPESAS VARIÁVEIS" 
                    icon={<LocalCafe />} 
                    color="#e65100" // Laranja
                    onRowClick={handleRowClick}
                />
            </Box>

            {/* MODAIS */}
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

            {/* Gerenciador de Categorias (Reutilizado) */}
            <Drawer anchor="right" open={openCategorias} onClose={() => { setOpenCategorias(false); carregarDados(); }}>
                <Box sx={{ width: 400, p: 2 }}>
                    <CategoriasTab />
                </Box>
            </Drawer>
        </div>
    );
}