// src/components/financeiro/DespesasView.jsx
import React, { useState, useMemo } from 'react';
import {
    TextField, Paper, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, IconButton, Typography, 
    Grid, Chip, Box, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions,
    MenuItem, Select
} from '@mui/material';
import { Edit, Delete, CheckCircle, Domain, LocalCafe, Search } from '@mui/icons-material';
import dayjs from 'dayjs';
import { faturamentoService } from '../../services/faturamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import LancamentoCaixaModal from './LancamentoCaixaModal'; 

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// Mantivemos o componente visual TabelaDespesas igual (ele é apenas visual)
const TabelaDespesas = ({ dados, titulo, icone, corTema, onEdit, onCheck, onDelete }) => (
    <Paper elevation={0} sx={{ border: `1px solid ${corTema}40`, borderRadius: 2, overflow: 'hidden', flex: 1 }}>
        <Box sx={{ px: 1.5, py: 0.8, bgcolor: `${corTema}10`, display: 'flex', alignItems: 'center', gap: 1 }}>
            {React.cloneElement(icone, { sx: { fontSize: 16, color: corTema } })}
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: corTema, flexGrow: 1, textTransform: 'uppercase' }}>
                {titulo}
            </Typography>
            <Chip label={dados.length} size="small" sx={{ height: 18, fontSize: '0.6rem' }} />
        </Box>
        <TableContainer sx={{ maxHeight: 350 }}>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Vencimento</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Descrição</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Valor</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Ações</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {dados.map((item) => {
                        const isVencida = !item.pago && dayjs(item.data_vencimento).isBefore(dayjs(), 'day');
                        return (
                            <TableRow key={item.id} hover sx={{ bgcolor: isVencida ? '#fff5f5' : 'inherit' }}>
                                <TableCell sx={{ fontSize: '0.75rem' }}>
                                    {(item.data_vencimento || item.data_despesa) 
                                        ? dayjs(item.data_vencimento || item.data_despesa).format('DD/MM/YY') 
                                        : '--'}
                                </TableCell>
                                <TableCell sx={{ py: 0.5 }}>
                                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 500 }}>{item.descricao}</Typography>
                                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.65rem' }}>
                                        {item.categoria_nome} • {item.categoria_tipo}
                                    </Typography>
                                </TableCell>
                                <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{formatMoney(item.valor)}</TableCell>
                                <TableCell align="center">
                                    <Stack direction="row" spacing={0} justifyContent="center">
                                        <IconButton size="small" onClick={() => onEdit(item)} color="primary"><Edit sx={{ fontSize: 14 }} /></IconButton>
                                        {!item.pago && (
                                            <IconButton size="small" onClick={() => onCheck(item)} color="success"><CheckCircle sx={{ fontSize: 14 }} /></IconButton>
                                        )}
                                        <IconButton size="small" color="error" onClick={() => onDelete(item.id)}><Delete sx={{ fontSize: 14 }} /></IconButton>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    </Paper>
);

// RECEBE dadosIniciais e onReload
export default function DespesasView({ dadosIniciais = [], onReload }) {
    const { showSnackbar } = useSnackbar();
    
    // Filtros Locais
    const [searchTerm, setSearchTerm] = useState('');
    const [mesFiltro, setMesFiltro] = useState(dayjs().month()); 
    const [anoFiltro, setAnoFiltro] = useState(dayjs().year());
    
    // Modais
    const [openMestreModal, setOpenMestreModal] = useState(false);
    const [openConfirmBaixa, setOpenConfirmBaixa] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // 1. FILTRAGEM (Memory Based) - Não usa mais useEffect para fetch
    const processedData = useMemo(() => {
        const filtered = dadosIniciais.filter(d => {
            const dataRef = dayjs(d.data_despesa || d.data_vencimento);
            // Corrige comparação de data para não falhar se data for nula
            if (!dataRef.isValid()) return false;

            return dataRef.month() === mesFiltro && 
                   dataRef.year() === anoFiltro &&
                   (d.descricao || '').toLowerCase().includes(searchTerm.toLowerCase());
        });

        const fixas = filtered.filter(d => d.categoria_tipo === 'Fixa');
        const variaveis = filtered.filter(d => d.categoria_tipo !== 'Fixa');
        
        const resumoGeral = filtered.reduce((acc, curr) => {
            const val = parseFloat(curr.valor || 0);
            acc.total += val;
            curr.pago ? (acc.pagas += val) : (acc.aPagar += val);
            if (!curr.pago && dayjs(curr.data_vencimento).isBefore(dayjs(), 'day')) acc.atrasadasCount++;
            return acc;
        }, { pagas: 0, aPagar: 0, total: 0, atrasadasCount: 0 });

        return { fixas, variaveis, resumoGeral };
    }, [dadosIniciais, mesFiltro, anoFiltro, searchTerm]);

    const { fixas, variaveis, resumoGeral } = processedData;

    // AÇÕES
    const handleConfirmarBaixaRapida = async () => {
        try {
            await faturamentoService.alternarPagamento(selectedItem.id, { pago: true });
            showSnackbar('Baixa realizada!', 'success');
            setOpenConfirmBaixa(false);
            onReload(); // <--- AVISA O PAI
        } catch (e) { showSnackbar('Erro ao processar.', 'error'); }
    };

    const onDelete = async (id) => {
        if (!window.confirm("Deseja realmente excluir esta despesa?")) return;
        try {
            await faturamentoService.deleteDespesa(id);
            onReload(); // <--- AVISA O PAI
        } catch (e) { showSnackbar('Erro ao excluir', 'error'); }
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            console.log("🔍 [FRONT DEBUG] Iniciando busca de despesas...");
            const res = await faturamentoService.getDespesas();
            
            console.log("📦 [FRONT DEBUG] Resposta completa:", res);
            console.log("📊 [FRONT DEBUG] Dados (data):", res.data);
            console.log("🔢 [FRONT DEBUG] Quantidade:", res.data?.length);

            if (res.data && res.data.length > 0) {
                console.log("Exemplo do item 0:", res.data[0]);
                // Verifica se os campos essenciais existem
                if (!res.data[0].categoria_nome) console.warn("⚠️ ALERTA: 'categoria_nome' está undefined!");
                if (!res.data[0].categoria_tipo) console.warn("⚠️ ALERTA: 'categoria_tipo' está undefined!");
            }

            setDespesas(res.data || []);
        } catch (error) {
            console.error("❌ [FRONT DEBUG] Erro ao buscar despesas:", error);
        } finally { 
            setIsLoading(false); 
        }
    };

    return (
        <Box>
            {/* KPIs */}
            <Grid container spacing={1} sx={{ mb: 2 }}>
                <Grid item xs={4}>
                    <Paper variant="outlined" sx={{ p: 1, borderLeft: '4px solid #1a233b', bgcolor: '#f8f9fa' }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.6rem' }}>TOTAL (FILTRADO)</Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{formatMoney(resumoGeral.total)}</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={4}>
                    <Paper variant="outlined" sx={{ p: 1, borderLeft: '4px solid #2e7d32', bgcolor: '#f0f9f1' }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.6rem', color: '#2e7d32' }}>PAGAS</Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>{formatMoney(resumoGeral.pagas)}</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={4}>
                    <Paper variant="outlined" sx={{ p: 1, borderLeft: '4px solid #d32f2f', bgcolor: '#fff5f5' }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.6rem', color: '#d32f2f' }}>A PAGAR</Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#d32f2f' }}>{formatMoney(resumoGeral.aPagar)}</Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* FILTROS */}
            <Box sx={{ mb: 1.5, display: 'flex', gap: 1 }}>
                <TextField 
                    size="small" placeholder="Filtrar..." 
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{ startAdornment: <Search sx={{ mr: 0.5, color: 'gray', fontSize: 16 }} /> }}
                    sx={{ width: 180 }}
                />
                <Select size="small" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} sx={{ fontSize: '0.75rem', height: 32 }}>
                    {Array.from({ length: 12 }, (_, i) => (
                        <MenuItem key={i} value={i} sx={{fontSize: '0.75rem'}}>{dayjs().month(i).format('MMMM')}</MenuItem>
                    ))}
                </Select>
            </Box>

            {/* TABELAS */}
            <Box sx={{ display: 'flex', gap: 1.5, flexDirection: { xs: 'column', md: 'row' } }}>
                <TabelaDespesas 
                    dados={fixas} titulo="FIXAS" icone={<Domain />} corTema="#1565c0" 
                    onEdit={(item) => { setSelectedItem(item); setOpenMestreModal(true); }} 
                    onCheck={(item) => { setSelectedItem(item); setOpenConfirmBaixa(true); }}
                    onDelete={onDelete} 
                />
                <TabelaDespesas 
                    dados={variaveis} titulo="VARIÁVEIS" icone={<LocalCafe />} corTema="#e65100" 
                    onEdit={(item) => { setSelectedItem(item); setOpenMestreModal(true); }} 
                    onCheck={(item) => { setSelectedItem(item); setOpenConfirmBaixa(true); }}
                    onDelete={onDelete} 
                />
            </Box>

            {/* MODAIS */}
            <LancamentoCaixaModal 
                open={openMestreModal} initialData={selectedItem} 
                onClose={() => { setOpenMestreModal(false); onReload(); }} 
            />

            <Dialog open={openConfirmBaixa} onClose={() => setOpenConfirmBaixa(false)}>
                <DialogTitle>Confirmar Baixa</DialogTitle>
                <DialogContent>
                    <Typography>Liquidar <strong>{selectedItem?.descricao}</strong>?</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenConfirmBaixa(false)}>Cancelar</Button>
                    <Button onClick={handleConfirmarBaixaRapida} variant="contained" color="success">Confirmar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}