// src/components/financeiro/ProcedimentosView.jsx
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
import { gerarPdfProcedimentos } from '../../utils/tabelaValoresPdfGenerator'; // Ajuste o caminho se necessário

// Mapeamento de cores para categorias
const CAT_COLORS = {
    'US_GERAL': 'primary',
    'MED_FETAL': 'secondary',
    'ECOCARDIOGRAMA': 'error',
    'MUSCULO': 'warning',
    'DOPPLER': 'info',
    'OUTROS': 'default'
};

const CAT_LABELS = {
    'US_GERAL': 'Geral',
    'MED_FETAL': 'Fetal',
    'ECOCARDIOGRAMA': 'Eco',
    'MUSCULO': 'Músculo',
    'DOPPLER': 'Doppler',
    'OUTROS': 'Outros'
};

const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function ProcedimentosView() {
    // --- ESTADOS: Dados ---
    const [procedimentos, setProcedimentos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // --- ESTADOS: Controles e Interface ---
    const [isUploading, setIsUploading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [procedimentoSelecionado, setProcedimentoSelecionado] = useState(null); 
    const [searchTerm, setSearchTerm] = useState('');

    // --- ESTADOS: PDF ---
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [pdfOptions, setPdfOptions] = useState({ showValues: true, showTuss: true });
    const [isGerandoPdf, setIsGerandoPdf] = useState(false);

    const { showSnackbar } = useSnackbar();

    // --- EFEITOS E BUSCA DE DADOS ---
    const fetchProcedimentos = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await faturamentoService.getProcedimentos();
            // Ordena por nome
            const sorted = response.data.sort((a, b) => a.descricao.localeCompare(b.descricao));
            setProcedimentos(sorted);
        } catch (error) {
            showSnackbar('Erro ao carregar procedimentos.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => {
        fetchProcedimentos();
    }, [fetchProcedimentos]);

    // --- CÁLCULOS E FILTRAGEM (useMemo) ---
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

    // --- HANDLERS: Interface e Lógica ---
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
            showSnackbar('Arquivo TUSS processado com sucesso!', 'success');
            fetchProcedimentos(); 
        } catch (error) {
            showSnackbar('Erro no upload do arquivo.', 'error');
        } finally {
            setIsUploading(false);
            event.target.value = null; 
        }
    };

    // --- HANDLERS: PDF ---
    const handleGerarPdf = () => {
        setIsGerandoPdf(true);
        
        gerarPdfProcedimentos(filteredList, pdfOptions, (blob) => {
            try {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'Procedimentos_Limale.pdf';
                a.click();
                
                showSnackbar('PDF gerado com sucesso!', 'success');
            } catch (error) {
                showSnackbar('Erro ao processar o PDF.', 'error');
            } finally {
                setIsPdfModalOpen(false);
                setIsGerandoPdf(false);
            }
        });
    };

    return (
        <Box sx={{ 
            p: 1, 
            height: 'calc(100vh - 155px)', // Layout travado
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden' 
        }}>
            
            {/* 1. HEADER UNIFICADO (KPIs + Ações) */}
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: 1.5,
                gap: 2,
                flexWrap: 'wrap'
            }}>
                {/* Lado Esquerdo: KPIs */}
                <Stack direction="row" spacing={1.5}>
                    <CompactKPI 
                        title="CADASTROS" 
                        value={kpis.total} 
                        icon={<FormatListNumbered fontSize="inherit" />} 
                        color="#1565c0" 
                        bgcolor="#e3f2fd"
                    />
                    <CompactKPI 
                        title="PARTICULARES" 
                        value={kpis.comValor} 
                        icon={<MonetizationOn fontSize="inherit" />} 
                        color="#2e7d32" 
                        bgcolor="#e8f5e9"
                    />
                     <CompactKPI 
                        title="TUSS" 
                        value={kpis.tuss} 
                        icon={<LocalHospital fontSize="inherit" />} 
                        color="#ed6c02" 
                        bgcolor="#fff3e0"
                    />
                </Stack>

                {/* Lado Direito: Busca e Botões */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField 
                        size="small" 
                        placeholder="Buscar exame ou código..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        InputProps={{ 
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search sx={{ color: 'gray', fontSize: 18 }} />
                                </InputAdornment>
                            ),
                            style: { fontSize: '0.8rem', paddingLeft: 0 }
                        }}
                        sx={{ width: 240, bgcolor: 'white' }} 
                    />
                    
                    <Button
                        variant="outlined"
                        component="label"
                        size="small"
                        startIcon={isUploading ? <CircularProgress size={16} /> : <CloudUpload />}
                        disabled={isUploading}
                        sx={{ height: 40, textTransform: 'none', fontWeight: 'bold' }}
                    >
                        {isUploading ? '...' : 'Importar TUSS'}
                        <input type="file" accept=".csv, .txt" hidden onChange={handleFileUpload} />
                    </Button>
                    <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<PictureAsPdf />}
                        onClick={() => setIsPdfModalOpen(true)}
                        sx={{ height: 40, textTransform: 'none', fontWeight: 'bold' }}
                    >
                        PDF
                    </Button>

                    <Button 
                        variant="contained" 
                        color="primary" 
                        size="small"
                        startIcon={<Add />}
                        onClick={() => handleOpenModal(null)}
                        sx={{ height: 40, bgcolor: '#1a233b', textTransform: 'none', fontWeight: 'bold' }}
                    >
                        Novo
                    </Button>
                </Box>
            </Box>

            {/* 2. TABELA COM SCROLL INTERNO */}
            <Paper variant="outlined" sx={{ 
                flexGrow: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                overflow: 'hidden', 
                borderRadius: 2 
            }}>
                <TableContainer sx={{ 
                    flexGrow: 1, 
                    overflowY: 'auto',
                    '&::-webkit-scrollbar': { width: '6px' },
                    '&::-webkit-scrollbar-track': { background: '#f1f1f1' },
                    '&::-webkit-scrollbar-thumb': { background: '#ccc', borderRadius: '4px' }
                }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: 120 }}>Código TUSS</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: 140 }}>Categoria</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Descrição</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: 150 }}>Valor Particular</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: 80 }}>Editar</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5 }}><CircularProgress /></TableCell></TableRow>
                            ) : filteredList.length > 0 ? (
                                filteredList.map((proc) => (
                                    <TableRow key={proc.id} hover>
                                        <TableCell sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.75rem' }}>
                                            {proc.codigo_tuss || '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={CAT_LABELS[proc.categoria] || proc.categoria} 
                                                size="small" 
                                                color={CAT_COLORS[proc.categoria] || 'default'} 
                                                variant="outlined"
                                                sx={{ fontSize: '0.65rem', height: 20, fontWeight: 'bold' }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.8rem', fontWeight: 500, color: '#444' }}>
                                            {proc.descricao}
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', color: proc.valor_particular ? '#2e7d32' : '#999', fontSize: '0.8rem' }}>
                                            {proc.valor_particular ? formatMoney(proc.valor_particular) : '-'}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="Editar Preços e Dados">
                                                <IconButton onClick={() => handleOpenModal(proc)} size="small">
                                                    <Edit fontSize="small" color="primary" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5, color: 'text.secondary' }}>Nenhum procedimento encontrado.</TableCell></TableRow>
                            )}
                        </TableBody>
                        
                        {/* Footer Fixo */}
                        <TableFooter sx={{ position: 'sticky', bottom: 0, bgcolor: '#fafafa', zIndex: 2, borderTop: '1px solid #eee' }}>
                             <TableRow>
                                <TableCell colSpan={5} sx={{ textAlign: 'right', fontSize: '0.7rem', color: '#666', pr: 2 }}>
                                    Mostrando {filteredList.length} registros
                                </TableCell>
                             </TableRow>
                        </TableFooter>
                    </Table>
                </TableContainer>
            </Paper>

            {/* MODAL UNIFICADO (PROCEDIMENTO) */}
            <ProcedimentoModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={fetchProcedimentos}
                procedimento={procedimentoSelecionado}
            />

            {/* MODAL DE PDF */}
            <Dialog open={isPdfModalOpen} onClose={() => setIsPdfModalOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Exportar Procedimentos</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Selecione quais informações devem constar no documento:
                    </Typography>
                    <Stack spacing={1}>
                        <FormControlLabel
                            control={<Checkbox checked={pdfOptions.showTuss} onChange={(e) => setPdfOptions({...pdfOptions, showTuss: e.target.checked})} />}
                            label="Incluir Código TUSS"
                        />
                        <FormControlLabel
                            control={<Checkbox checked={pdfOptions.showValues} onChange={(e) => setPdfOptions({...pdfOptions, showValues: e.target.checked})} />}
                            label="Incluir Valores Particulares"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setIsPdfModalOpen(false)} disabled={isGerandoPdf}>Cancelar</Button>
                    <Button onClick={handleGerarPdf} variant="contained" color="error" startIcon={isGerandoPdf ? <CircularProgress size={20} color="inherit" /> : <PictureAsPdf />} disabled={isGerandoPdf}>
                        {isGerandoPdf ? 'Processando...' : 'Gerar Documento'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

// COMPONENTE KPI COMPACTO (Padronizado)
const CompactKPI = ({ title, value, icon, color, bgcolor }) => (
    <Paper 
        elevation={0} 
        sx={{ 
            p: 0.5, px: 1.5, borderRadius: 2, bgcolor: bgcolor, 
            display: 'flex', alignItems: 'center', gap: 1,
            border: `1px solid ${color}30`,
            minWidth: 120,
            height: 40
        }}
    >
        <Box sx={{ bgcolor: 'white', p: 0.3, borderRadius: '50%', display: 'flex', color: color }}>
            {icon}
        </Box>
        <Box sx={{ lineHeight: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: color, opacity: 0.9, fontSize: '0.65rem', display: 'block' }}>
                {title}
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: color, fontSize: '0.85rem' }}>
                {value}
            </Typography>
        </Box>
    </Paper>
);