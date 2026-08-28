// src/components/financeiro/ProcedimentosView.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    CircularProgress, IconButton, Button, TextField, InputAdornment, Chip, Tooltip, Stack,
    Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Checkbox, TableSortLabel
} from '@mui/material';
import { 
    Edit, CloudUpload, Add, Search, LocalHospital, MonetizationOn, 
    FormatListNumbered, PictureAsPdf, KeyboardArrowUp, KeyboardArrowDown 
} from '@mui/icons-material';

import { useSnackbar } from '../../contexts/SnackbarContext';
import { faturamentoService } from '../../services/faturamentoService';
import ProcedimentoModal from './ProcedimentoModal';
import { gerarPdfProcedimentos } from '../../utils/tabelaValoresPdfGenerator'; 
import './Financeiro.css';

const CAT_COLORS = {
    'US_GERAL': '#1565c0', 'MED_FETAL': '#7b1fa2', 'ECOCARDIOGRAMA': '#c62828',
    'MUSCULO': '#e65100', 'DOPPLER': '#00838f', 'OUTROS': '#6c757d'
};

const CAT_LABELS = {
    'US_GERAL': 'Geral', 'MED_FETAL': 'Fetal', 'ECOCARDIOGRAMA': 'Eco',
    'MUSCULO': 'Músculo', 'DOPPLER': 'Doppler', 'OUTROS': 'Outros'
};

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function ProcedimentosView() {
    const [procedimentos, setProcedimentos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [isUploading, setIsUploading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [procedimentoSelecionado, setProcedimentoSelecionado] = useState(null); 
    const [searchTerm, setSearchTerm] = useState('');

    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [pdfOptions, setPdfOptions] = useState({ showValues: true, showTuss: true });
    const [isGerandoPdf, setIsGerandoPdf] = useState(false);

    // Estados para Ordenação
    const [order, setOrder] = useState('asc');
    const [orderBy, setOrderBy] = useState('descricao');

    // Estado para as categorias minimizadas
    const [collapsedCats, setCollapsedCats] = useState({});

    const { showSnackbar } = useSnackbar();

    const fetchProcedimentos = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await faturamentoService.getProcedimentos();
            setProcedimentos(response.data);
        } catch (error) { 
            showSnackbar('Erro ao carregar procedimentos.', 'error'); 
        } finally { 
            setIsLoading(false); 
        }
    }, [showSnackbar]);

    useEffect(() => { fetchProcedimentos(); }, [fetchProcedimentos]);

    // 1. Aplica a busca textual
    const filteredList = useMemo(() => {
        if (!searchTerm) return procedimentos;
        const lowerTerm = searchTerm.toLowerCase();
        return procedimentos.filter(p => 
            p.descricao.toLowerCase().includes(lowerTerm) || 
            (p.codigo_tuss && p.codigo_tuss.includes(lowerTerm))
        );
    }, [procedimentos, searchTerm]);

    // 2. Agrupa por categoria e ordena os itens dentro do grupo
    const groupedAndSortedList = useMemo(() => {
        const groups = {};
        filteredList.forEach(proc => {
            const cat = proc.categoria || 'OUTROS';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(proc);
        });

        Object.keys(groups).forEach(cat => {
            groups[cat].sort((a, b) => {
                let valA = a[orderBy] || '';
                let valB = b[orderBy] || '';

                if (orderBy === 'valor_particular') {
                    valA = Number(valA) || 0;
                    valB = Number(valB) || 0;
                } else {
                    valA = valA.toString().toLowerCase();
                    valB = valB.toString().toLowerCase();
                }

                if (valA < valB) return order === 'asc' ? -1 : 1;
                if (valA > valB) return order === 'asc' ? 1 : -1;
                return 0;
            });
        });

        return groups;
    }, [filteredList, order, orderBy]);

    const kpis = useMemo(() => {
        return {
            total: procedimentos.length,
            comValor: procedimentos.filter(p => Number(p.valor_particular) > 0).length,
            tuss: procedimentos.filter(p => p.codigo_tuss).length
        };
    }, [procedimentos]);

    const handleRequestSort = (property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const toggleCategory = (cat) => {
        setCollapsedCats(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    const handleOpenModal = (procedimento = null) => {
        setProcedimentoSelecionado(procedimento);
        setIsModalOpen(true);
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setIsUploading(true);
        const formData = new FormData();
        formData.append('arquivo_tuss', file);
        try {
            await faturamentoService.uploadTuss(formData); 
            showSnackbar('Arquivo TUSS processado!', 'success');
            fetchProcedimentos(); 
        } catch (error) { showSnackbar('Erro no upload.', 'error'); } 
        finally { setIsUploading(false); event.target.value = null; }
    };

    const handleGerarPdf = () => {
        setIsGerandoPdf(true);
        // Passamos filteredList pois o PDF já lida com a lista plana
        gerarPdfProcedimentos(filteredList, pdfOptions, (blob) => {
            try {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'Procedimentos_Limale.pdf';
                a.click();
                showSnackbar('PDF gerado!', 'success');
            } catch (error) { showSnackbar('Erro ao processar PDF.', 'error'); } 
            finally { setIsPdfModalOpen(false); setIsGerandoPdf(false); }
        });
    };

    // Estilo comum para os cabeçalhos menores
    const thStyle = { fontWeight: 700, bgcolor: '#f8f9fa', color: '#495057', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid #dee2e6' };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 1, backgroundColor: '#f1f3f5', overflow: 'hidden' }}>
            
            {/* CABEÇALHO UNIFICADO COMPACTO */}
            <Paper className="tasy-flat-panel" sx={{ p: 1, mb: 1, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#495057', textTransform: 'uppercase' }}>
                        Catálogo de Procedimentos
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip size="small" icon={<FormatListNumbered />} label={`Cadastrados: ${kpis.total}`} sx={{ borderRadius: 1, fontWeight: 'bold' }} />
                        <Chip size="small" icon={<MonetizationOn />} label={`Com Preço: ${kpis.comValor}`} sx={{ borderRadius: 1, fontWeight: 'bold' }} color="success" variant="outlined" />
                        <Chip size="small" icon={<LocalHospital />} label={`Com TUSS: ${kpis.tuss}`} sx={{ borderRadius: 1, fontWeight: 'bold' }} color="warning" variant="outlined" />
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField 
                        size="small" className="tasy-compact-input" placeholder="Buscar exame ou código..." 
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
                        InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
                        sx={{ width: 220 }} 
                    />
                    <Button variant="outlined" component="label" size="small" startIcon={isUploading ? <CircularProgress size={16} color="inherit" /> : <CloudUpload />} disabled={isUploading} sx={{ textTransform: 'none', borderRadius: 1, color: '#495057', borderColor: '#ced4da' }}>
                        {isUploading ? 'Processando...' : 'Importar'}
                        <input type="file" accept=".csv, .txt" hidden onChange={handleFileUpload} />
                    </Button>
                    <Button variant="outlined" color="error" size="small" startIcon={<PictureAsPdf />} onClick={() => setIsPdfModalOpen(true)} sx={{ textTransform: 'none', borderRadius: 1 }}>
                        Exportar
                    </Button>
                    <Button variant="contained" color="primary" size="small" startIcon={<Add />} onClick={() => handleOpenModal(null)} sx={{ textTransform: 'none', borderRadius: 1, fontWeight: 'bold' }}>
                        Novo
                    </Button>
                </Box>
            </Paper>

            {/* TABELA PRINCIPAL TASY */}
            <Paper className="tasy-flat-panel" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <TableContainer className="tasy-workspace" sx={{ flexGrow: 1, bgcolor: '#ffffff' }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ ...thStyle, width: 140 }}>
                                    <TableSortLabel active={orderBy === 'codigo_tuss'} direction={orderBy === 'codigo_tuss' ? order : 'asc'} onClick={() => handleRequestSort('codigo_tuss')}>
                                        Código TUSS
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={{ ...thStyle, width: 140 }}>
                                    <TableSortLabel active={orderBy === 'categoria'} direction={orderBy === 'categoria' ? order : 'asc'} onClick={() => handleRequestSort('categoria')}>
                                        Categoria
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={{ ...thStyle }}>
                                    <TableSortLabel active={orderBy === 'descricao'} direction={orderBy === 'descricao' ? order : 'asc'} onClick={() => handleRequestSort('descricao')}>
                                        Descrição do Exame
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell align="right" sx={{ ...thStyle, width: 160 }}>
                                    <TableSortLabel active={orderBy === 'valor_particular'} direction={orderBy === 'valor_particular' ? order : 'asc'} onClick={() => handleRequestSort('valor_particular')}>
                                        Valor Particular
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell align="center" sx={{ ...thStyle, width: 80 }}>Ação</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}><CircularProgress /></TableCell></TableRow>
                            ) : Object.keys(groupedAndSortedList).length > 0 ? (
                                Object.keys(groupedAndSortedList).sort().map((cat) => (
                                    <React.Fragment key={cat}>
                                        {/* LINHA DE CABEÇALHO DO GRUPO (CATEGORIA) */}
                                        <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                            <TableCell colSpan={5} sx={{ py: 0.5, borderBottom: '1px solid #dee2e6' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <IconButton size="small" onClick={() => toggleCategory(cat)}>
                                                        {collapsedCats[cat] ? <KeyboardArrowDown fontSize="small" /> : <KeyboardArrowUp fontSize="small" />}
                                                    </IconButton>
                                                    <Typography variant="body2" fontWeight="bold" color="#495057">
                                                        {CAT_LABELS[cat] || cat}
                                                    </Typography>
                                                    <Chip label={groupedAndSortedList[cat].length} size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: '#e9ecef', color: '#495057', fontWeight: 'bold' }} />
                                                </Box>
                                            </TableCell>
                                        </TableRow>

                                        {/* ITENS DA CATEGORIA (Se não estiver minimizada) */}
                                        {!collapsedCats[cat] && groupedAndSortedList[cat].map((proc) => (
                                            <TableRow key={proc.id} hover sx={{ '& td': { borderBottom: '1px solid #f1f3f5' } }}>
                                                <TableCell sx={{ fontFamily: 'monospace', color: '#6c757d', fontSize: '0.8rem', fontWeight: 'bold', pl: 3 }}>
                                                    {proc.codigo_tuss || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={CAT_LABELS[proc.categoria] || proc.categoria} size="small" 
                                                        sx={{ fontSize: '0.65rem', height: 20, fontWeight: 'bold', bgcolor: `${CAT_COLORS[proc.categoria]}15`, color: CAT_COLORS[proc.categoria], border: `1px solid ${CAT_COLORS[proc.categoria]}50` }}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#343a40' }}>
                                                    {proc.descricao}
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold', color: proc.valor_particular ? '#2e7d32' : '#adb5bd', fontSize: '0.85rem' }}>
                                                    {proc.valor_particular ? formatMoney(proc.valor_particular) : '-'}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Tooltip title="Editar Regras e Preços">
                                                        <IconButton onClick={() => handleOpenModal(proc)} size="small" sx={{ color: '#1565c0' }}>
                                                            <Edit fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </React.Fragment>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6, color: '#868e96' }}>Nenhum procedimento encontrado.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <Box sx={{ p: 1, borderTop: '1px solid #dee2e6', bgcolor: '#f8f9fa', textAlign: 'right' }}>
                    <Typography variant="caption" sx={{ color: '#6c757d', fontWeight: 'bold' }}>
                        EXIBINDO {filteredList.length} REGISTROS
                    </Typography>
                </Box>
            </Paper>

            {/* MODAIS MANTIDOS INTACTOS */}
            <ProcedimentoModal open={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={fetchProcedimentos} procedimento={procedimentoSelecionado} />
            <Dialog open={isPdfModalOpen} onClose={() => setIsPdfModalOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ bgcolor: '#f8f9fa', p: 2, borderBottom: '1px solid #dee2e6' }}>
                    <Typography variant="subtitle1" fontWeight="bold">Exportar Tabela</Typography>
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Selecione quais dados devem constar no PDF:</Typography>
                    <Stack spacing={1}>
                        <FormControlLabel control={<Checkbox checked={pdfOptions.showTuss} onChange={(e) => setPdfOptions({...pdfOptions, showTuss: e.target.checked})} />} label="Incluir Código TUSS" />
                        <FormControlLabel control={<Checkbox checked={pdfOptions.showValues} onChange={(e) => setPdfOptions({...pdfOptions, showValues: e.target.checked})} />} label="Incluir Valores Particulares" />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '1px solid #dee2e6' }}>
                    <Button onClick={() => setIsPdfModalOpen(false)} color="inherit" disabled={isGerandoPdf}>Cancelar</Button>
                    <Button onClick={handleGerarPdf} variant="contained" color="primary" startIcon={isGerandoPdf ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdf />} disabled={isGerandoPdf} sx={{fontWeight:'bold'}}>
                        {isGerandoPdf ? 'Gerando...' : 'Baixar PDF'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}