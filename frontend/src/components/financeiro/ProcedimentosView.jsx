import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableFooter,
    CircularProgress, IconButton, Button, TextField, InputAdornment, Chip, Tooltip, Stack,
    Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Checkbox
} from '@mui/material';
import { 
    Edit, CloudUpload, Add, Search, LocalHospital, MonetizationOn, FormatListNumbered, PictureAsPdf 
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

    const { showSnackbar } = useSnackbar();

    const fetchProcedimentos = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await faturamentoService.getProcedimentos();
            const sorted = response.data.sort((a, b) => a.descricao.localeCompare(b.descricao));
            setProcedimentos(sorted);
        } catch (error) { showSnackbar('Erro ao carregar procedimentos.', 'error'); } 
        finally { setIsLoading(false); }
    }, [showSnackbar]);

    useEffect(() => { fetchProcedimentos(); }, [fetchProcedimentos]);

    const filteredList = useMemo(() => {
        if (!searchTerm) return procedimentos;
        const lowerTerm = searchTerm.toLowerCase();
        return procedimentos.filter(p => 
            p.descricao.toLowerCase().includes(lowerTerm) || 
            (p.codigo_tuss && p.codigo_tuss.includes(lowerTerm))
        );
    }, [procedimentos, searchTerm]);

    const kpis = useMemo(() => {
        return {
            total: procedimentos.length,
            comValor: procedimentos.filter(p => Number(p.valor_particular) > 0).length,
            tuss: procedimentos.filter(p => p.codigo_tuss).length
        };
    }, [procedimentos]);

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

    const KpiCard = ({ title, value, color, icon }) => (
        <Paper className="tasy-flat-panel" sx={{ p: 1, display: 'flex', alignItems: 'center', minWidth: 160, borderLeft: `4px solid ${color}` }}>
            <Box sx={{ flexGrow: 1 }}>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#6c757d', textTransform: 'uppercase' }}>{title}</Typography>
                <Typography sx={{ fontSize: '1.1rem', fontWeight: 900, color: '#343a40', lineHeight: 1 }}>{value}</Typography>
            </Box>
            <Box sx={{ color: color, opacity: 0.8, fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>{icon}</Box>
        </Paper>
    );

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 1, backgroundColor: '#f1f3f5', overflow: 'hidden' }}>
            
            {/* CABEÇALHO TASY */}
            <Paper className="tasy-flat-panel" sx={{ p: 1, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <Stack direction="row" spacing={1.5}>
                    <KpiCard title="Total Cadastrado" value={kpis.total} color="#1565c0" icon={<FormatListNumbered />} />
                    <KpiCard title="Com Preço Particular" value={kpis.comValor} color="#2e7d32" icon={<MonetizationOn />} />
                    <KpiCard title="Com Código TUSS" value={kpis.tuss} color="#ed6c02" icon={<LocalHospital />} />
                </Stack>

                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField 
                        size="small" className="tasy-compact-input" placeholder="Buscar exame ou código..." 
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
                        InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
                        sx={{ width: 220 }} 
                    />
                    <Button
                        variant="outlined" component="label" size="small"
                        startIcon={isUploading ? <CircularProgress size={16} color="inherit" /> : <CloudUpload />}
                        disabled={isUploading}
                        sx={{ textTransform: 'none', borderRadius: 1, color: '#495057', borderColor: '#ced4da' }}
                    >
                        {isUploading ? 'Processando...' : 'Importar TUSS'}
                        <input type="file" accept=".csv, .txt" hidden onChange={handleFileUpload} />
                    </Button>
                    <Button
                        variant="outlined" color="error" size="small" startIcon={<PictureAsPdf />} onClick={() => setIsPdfModalOpen(true)}
                        sx={{ textTransform: 'none', borderRadius: 1 }}
                    >
                        Exportar
                    </Button>
                    <Button 
                        variant="contained" color="primary" size="small" startIcon={<Add />} onClick={() => handleOpenModal(null)}
                        sx={{ textTransform: 'none', borderRadius: 1, fontWeight: 'bold' }}
                    >
                        Novo Procedimento
                    </Button>
                </Box>
            </Paper>

            {/* TABELA PRINCIPAL TASY */}
            <Paper className="tasy-flat-panel" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div className="tasy-section-header" style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                    Catálogo de Procedimentos e Exames
                </div>
                <TableContainer sx={{ flexGrow: 1, bgcolor: '#ffffff' }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057', width: 120 }}>Código TUSS</TableCell>
                                <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057', width: 140 }}>Categoria</TableCell>
                                <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057' }}>Descrição do Exame</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057', width: 150 }}>Valor Particular</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057', width: 80 }}>Ação</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}><CircularProgress /></TableCell></TableRow>
                            ) : filteredList.length > 0 ? (
                                filteredList.map((proc) => (
                                    <TableRow key={proc.id} hover>
                                        <TableCell sx={{ fontFamily: 'monospace', color: '#6c757d', fontSize: '0.8rem', fontWeight: 'bold' }}>
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
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6, color: '#868e96' }}>Nenhum procedimento encontrado.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                {/* RODAPÉ */}
                <Box sx={{ p: 1, borderTop: '1px solid #dee2e6', bgcolor: '#f8f9fa', textAlign: 'right' }}>
                    <Typography variant="caption" sx={{ color: '#6c757d', fontWeight: 'bold' }}>
                        EXIBINDO {filteredList.length} REGISTROS
                    </Typography>
                </Box>
            </Paper>

            {/* MODAIS */}
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