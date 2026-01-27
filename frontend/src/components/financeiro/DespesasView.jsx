// src/components/financeiro/DespesasView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    Button, CircularProgress, TextField, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Typography, Grid, Switch, InputAdornment, Chip, Box,
    Dialog, DialogTitle, DialogContent, DialogActions, MenuItem
} from '@mui/material';
import { 
    Edit, Delete, AddCircleOutline, Search, 
    MoneyOff, CheckCircle, Warning, Domain, LocalCafe 
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatDataSimples = (dataString) => {
    if (!dataString) return '-';
    return dayjs(dataString).format('DD/MM/YYYY');
};

// Componente Interno de Tabela Otimizado
const TabelaDespesas = ({ dados, titulo, icone, corTema, onEdit, onToggleStatus, onDelete }) => (
    <Paper elevation={0} sx={{ border: `1px solid ${corTema}40`, borderRadius: 2, overflow: 'hidden', flex: 1 }}>
        <Box sx={{ px: 2, py: 1, bgcolor: `${corTema}10`, display: 'flex', alignItems: 'center', gap: 1 }}>
            {React.cloneElement(icone, { sx: { fontSize: 18, color: corTema } })}
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: corTema, flexGrow: 1 }}>{titulo}</Typography>
            <Chip label={dados.length} size="small" />
        </Box>
        <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ fontSize: '0.7rem' }}>Data</TableCell>
                        <TableCell sx={{ fontSize: '0.7rem' }}>Descrição</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.7rem' }}>Valor</TableCell>
                        <TableCell align="center" sx={{ fontSize: '0.7rem' }}>Ações</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {dados.map((item) => (
                        <TableRow key={item.id} hover>
                            <TableCell sx={{ fontSize: '0.75rem' }}>{formatDataSimples(item.data_despesa)}</TableCell>
                            <TableCell sx={{ fontSize: '0.75rem' }}>
                                <strong>{item.descricao}</strong>
                                <div style={{ fontSize: '0.65rem', color: '#888' }}>{item.categoria_nome}</div>
                            </TableCell>
                            <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{formatMoney(item.valor)}</TableCell>
                            <TableCell align="center">
                                <IconButton size="small" onClick={() => onEdit(item)}><Edit sx={{ fontSize: 16 }} /></IconButton>
                                {!item.pago && (
                                    <IconButton size="small" color="success" onClick={() => onToggleStatus(item)}><CheckCircle sx={{ fontSize: 16 }} /></IconButton>
                                )}
                                <IconButton size="small" color="error" onClick={() => onDelete(item.id)}><Delete sx={{ fontSize: 16 }} /></IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    </Paper>
);

export default function DespesasView() {
    const { showSnackbar } = useSnackbar();
    const [despesas, setDespesas] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [mesFiltro, setMesFiltro] = useState(dayjs().month()); 
    const [anoFiltro, setAnoFiltro] = useState(dayjs().year());

    const [openEditModal, setOpenEditModal] = useState(false);
    const [editFormData, setEditFormData] = useState({});

    // Carregamento de dados inicial
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [resD, resC] = await Promise.all([
                faturamentoService.getDespesas(),
                faturamentoService.getCategoriasDespesa()
            ]);
            setDespesas(resD.data || []);
            setCategorias(resC.data || []);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // Lógica de Processamento (Calculada apenas quando os dados mudam)
    const processedData = useMemo(() => {
        const filtered = despesas.filter(d => {
            const dataRef = dayjs(d.data_despesa || d.data_vencimento);
            const matchesDate = dataRef.month() === mesFiltro && dataRef.year() === anoFiltro;
            const matchesSearch = d.descricao.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesDate && matchesSearch;
        });

        const fixas = filtered.filter(d => d.categoria_tipo === 'Fixa');
        const variaveis = filtered.filter(d => d.categoria_tipo !== 'Fixa');
        const resumoGeral = filtered.reduce((acc, curr) => {
            const val = parseFloat(curr.valor || 0);
            acc.total += val;
            curr.pago ? (acc.pagas += val) : (acc.aPagar += val);
            return acc;
        }, { pagas: 0, aPagar: 0, total: 0 });

        return { fixas, variaveis, resumoGeral };
    }, [despesas, mesFiltro, anoFiltro, searchTerm]);

    const { fixas, variaveis, resumoGeral } = processedData;

    const handleToggleStatus = async (item) => {
        try {
            await faturamentoService.updateDespesa(item.id, { ...item, pago: !item.pago });
            showSnackbar('Status atualizado', 'success');
            fetchData();
        } catch (e) { showSnackbar('Erro ao atualizar', 'error'); }
    };

    const onDelete = async (id) => {
        if (!window.confirm("Deseja excluir?")) return;
        await faturamentoService.deleteDespesa(id);
        fetchData();
    };

    const onEdit = (item) => {
        setEditFormData(item);
        setOpenEditModal(true);
    };

    if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

    return (
        <Box>
            {/* KPIs Rápidos */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={4}>
                    <Paper sx={{ p: 2, borderLeft: '4px solid #1a233b' }}>
                        <Typography variant="caption">TOTAL DO MÊS</Typography>
                        <Typography variant="h6" fontWeight="bold">{formatMoney(resumoGeral.total)}</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={4}>
                    <Paper sx={{ p: 2, borderLeft: '4px solid #2e7d32' }}>
                        <Typography variant="caption" color="success.main">PAGAS</Typography>
                        <Typography variant="h6" fontWeight="bold" color="success.main">{formatMoney(resumoGeral.pagas)}</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={4}>
                    <Paper sx={{ p: 2, borderLeft: '4px solid #d32f2f' }}>
                        <Typography variant="caption" color="error">A PAGAR</Typography>
                        <Typography variant="h6" fontWeight="bold" color="error">{formatMoney(resumoGeral.aPagar)}</Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Toolbar */}
            <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
                <TextField 
                    size="small" placeholder="Filtrar despesa..." 
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'gray' }} /> }}
                />
                <Select size="small" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)}>
                    {Array.from({ length: 12 }, (_, i) => (
                        <MenuItem key={i} value={i}>{dayjs().month(i).format('MMMM')}</MenuItem>
                    ))}
                </Select>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                <TabelaDespesas dados={fixas} titulo="DESPESAS FIXAS" icone={<Domain />} corTema="#1565c0" onEdit={onEdit} onToggleStatus={handleToggleStatus} onDelete={onDelete} />
                <TabelaDespesas dados={variaveis} titulo="DESPESAS VARIÁVEIS" icone={<LocalCafe />} corTema="#e65100" onEdit={onEdit} onToggleStatus={handleToggleStatus} onDelete={handleDelete} />
            </Box>

            {/* Modal de Edição (Simplificado) */}
            <Dialog open={openEditModal} onClose={() => setOpenEditModal(false)}>
                <DialogTitle>Editar Despesa</DialogTitle>
                <DialogContent>
                    <TextField fullWidth margin="dense" label="Descrição" value={editFormData.descricao || ''} onChange={(e) => setEditFormData({...editFormData, descricao: e.target.value})} />
                    <TextField fullWidth margin="dense" label="Valor" type="number" value={editFormData.valor || ''} onChange={(e) => setEditFormData({...editFormData, valor: e.target.value})} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEditModal(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={async () => {
                        await faturamentoService.updateDespesa(editFormData.id, editFormData);
                        setOpenEditModal(false);
                        fetchData();
                    }}>Salvar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}