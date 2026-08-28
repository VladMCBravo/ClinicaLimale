// src/components/financeiro/ProcedimentosView.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    CircularProgress, IconButton, Button, TextField, InputAdornment, Chip, Tooltip, Stack,
    Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Checkbox, TableSortLabel,
    MenuItem
} from '@mui/material';
import { 
    Edit, CloudUpload, Add, Search, LocalHospital, MonetizationOn, AccessTime,
    FormatListNumbered, PictureAsPdf, KeyboardArrowUp, KeyboardArrowDown, AddCircle, Delete
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

const DIAS_SEMANA = [
    { value: 0, label: 'Segunda-feira' }, { value: 1, label: 'Terça-feira' }, { value: 2, label: 'Quarta-feira' },
    { value: 3, label: 'Quinta-feira' }, { value: 4, label: 'Sexta-feira' }, { value: 5, label: 'Sábado' }, { value: 6, label: 'Domingo' }
];

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

    // ESTADOS PARA O MODAL DE EDIÇÃO EM MASSA (CATEGORIA)
    const [catModalOpen, setCatModalOpen] = useState(false);
    const [catEditing, setCatEditing] = useState(null);
    const [catConfigAgenda, setCatConfigAgenda] = useState({ duracao_padrao: 15, equipamento_obrigatorio: '', dias_funcionamento: [] });
    const [catNovoDia, setCatNovoDia] = useState({ dia_semana: '', hora_inicio: '08:00', hora_fim: '18:00' });
    const [isSubmittingCat, setIsSubmittingCat] = useState(false);

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

    const filteredList = useMemo(() => {
        if (!searchTerm) return procedimentos;
        const lowerTerm = searchTerm.toLowerCase();
        return procedimentos.filter(p => 
            p.descricao.toLowerCase().includes(lowerTerm) || 
            (p.codigo_tuss && p.codigo_tuss.includes(lowerTerm))
        );
    }, [procedimentos, searchTerm]);

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

    // FUNÇÕES DO MODAL INDIVIDUAL
    const handleOpenModal = (procedimento = null) => {
        setProcedimentoSelecionado(procedimento);
        setIsModalOpen(true);
    };

    // FUNÇÕES DO MODAL EM MASSA (CATEGORIA)
    const handleOpenCatModal = (cat) => {
        setCatEditing(cat);
        // Usa o primeiro item da categoria como molde para preencher o formulário inicial
        const firstProc = groupedAndSortedList[cat][0];
        if (firstProc && firstProc.configuracao_clinica) {
            setCatConfigAgenda({
                duracao_padrao: firstProc.configuracao_clinica.duracao_minutos || 15,
                equipamento_obrigatorio: firstProc.configuracao_clinica.equipamento_obrigatorio || '',
                dias_funcionamento: firstProc.configuracao_clinica.dias_funcionamento || []
            });
        } else {
            setCatConfigAgenda({ duracao_padrao: 15, equipamento_obrigatorio: '', dias_funcionamento: [] });
        }
        setCatNovoDia({ dia_semana: '', hora_inicio: '08:00', hora_fim: '18:00' });
        setCatModalOpen(true);
    };

    const handleAddCatDia = () => {
        if (catNovoDia.dia_semana === '' || !catNovoDia.hora_inicio || !catNovoDia.hora_fim) return showSnackbar('Preencha horários.', 'warning');
        if (catConfigAgenda.dias_funcionamento.some(d => d.dia_semana === catNovoDia.dia_semana)) return showSnackbar('Dia já configurado.', 'warning');
        setCatConfigAgenda(prev => ({ ...prev, dias_funcionamento: [...prev.dias_funcionamento, catNovoDia].sort((a, b) => a.dia_semana - b.dia_semana) }));
        setCatNovoDia({ dia_semana: '', hora_inicio: '08:00', hora_fim: '18:00' });
    };

    const handleRemoveCatDia = (dia_semana) => {
        setCatConfigAgenda(prev => ({ ...prev, dias_funcionamento: prev.dias_funcionamento.filter(d => d.dia_semana !== dia_semana) }));
    };

    const handleSaveCatConfig = async () => {
        setIsSubmittingCat(true);
        try {
            const procsDaCat = groupedAndSortedList[catEditing];
            // Atualiza todos os procedimentos da categoria de forma assíncrona paralela
            await Promise.all(procsDaCat.map(proc => {
                return faturamentoService.updateProcedimento(proc.id, {
                    codigo_tuss: proc.codigo_tuss,
                    descricao: proc.descricao,
                    categoria: proc.categoria,
                    valor_particular: proc.valor_particular,
                    configuracao_clinica: catConfigAgenda
                });
            }));
            showSnackbar(`Agenda aplicada a ${procsDaCat.length} procedimentos com sucesso!`, 'success');
            setCatModalOpen(false);
            fetchProcedimentos();
        } catch (error) {
            showSnackbar('Erro ao aplicar regras na categoria.', 'error');
        } finally {
            setIsSubmittingCat(false);
        }
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

    const thStyle = { fontWeight: 700, bgcolor: '#f8f9fa', color: '#495057', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid #dee2e6' };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 1, backgroundColor: '#f1f3f5', overflow: 'hidden' }}>
            
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

            <Paper className="tasy-flat-panel" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <TableContainer className="tasy-workspace" sx={{ flexGrow: 1, bgcolor: '#ffffff' }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ ...thStyle, width: 140 }}>
                                    <TableSortLabel active={orderBy === 'codigo_tuss'} direction={orderBy === 'codigo_tuss' ? order : 'asc'} onClick={() => handleRequestSort('codigo_tuss')}>Código TUSS</TableSortLabel>
                                </TableCell>
                                <TableCell sx={{ ...thStyle, width: 140 }}>
                                    <TableSortLabel active={orderBy === 'categoria'} direction={orderBy === 'categoria' ? order : 'asc'} onClick={() => handleRequestSort('categoria')}>Categoria</TableSortLabel>
                                </TableCell>
                                <TableCell sx={{ ...thStyle }}>
                                    <TableSortLabel active={orderBy === 'descricao'} direction={orderBy === 'descricao' ? order : 'asc'} onClick={() => handleRequestSort('descricao')}>Descrição do Exame</TableSortLabel>
                                </TableCell>
                                <TableCell align="right" sx={{ ...thStyle, width: 160 }}>
                                    <TableSortLabel active={orderBy === 'valor_particular'} direction={orderBy === 'valor_particular' ? order : 'asc'} onClick={() => handleRequestSort('valor_particular')}>Valor Particular</TableSortLabel>
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
                                        {/* LINHA DE CABEÇALHO DO GRUPO (COLORIDA E COM BOTÃO DE MASSA) */}
                                        <TableRow sx={{ bgcolor: `${CAT_COLORS[cat]}15` }}>
                                            <TableCell colSpan={5} sx={{ py: 0.5, borderBottom: `1px solid ${CAT_COLORS[cat]}40` }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <IconButton size="small" onClick={() => toggleCategory(cat)} sx={{ color: CAT_COLORS[cat] }}>
                                                            {collapsedCats[cat] ? <KeyboardArrowDown fontSize="small" /> : <KeyboardArrowUp fontSize="small" />}
                                                        </IconButton>
                                                        <Typography variant="body2" fontWeight="bold" sx={{ color: CAT_COLORS[cat] }}>
                                                            {CAT_LABELS[cat] || cat}
                                                        </Typography>
                                                        <Chip label={groupedAndSortedList[cat].length} size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: `${CAT_COLORS[cat]}30`, color: CAT_COLORS[cat], fontWeight: 'bold' }} />
                                                    </Box>
                                                    <Button 
                                                        size="small" variant="outlined" startIcon={<AccessTime />} onClick={() => handleOpenCatModal(cat)}
                                                        sx={{ color: CAT_COLORS[cat], borderColor: `${CAT_COLORS[cat]}80`, textTransform: 'none', height: 26, fontSize: '0.7rem', bgcolor: 'white', '&:hover': { bgcolor: `${CAT_COLORS[cat]}10` } }}
                                                    >
                                                        Agenda da Categoria
                                                    </Button>
                                                </Box>
                                            </TableCell>
                                        </TableRow>

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

            <ProcedimentoModal open={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={fetchProcedimentos} procedimento={procedimentoSelecionado} />
            
            {/* NOVO MODAL: CONFIGURAÇÃO DE AGENDA EM MASSA */}
            <Dialog open={catModalOpen} onClose={() => setCatModalOpen(false)} maxWidth="sm" fullWidth disableEscapeKeyDown={isSubmittingCat}>
                <DialogTitle sx={{ bgcolor: `${CAT_COLORS[catEditing]}15`, p: 2, borderBottom: `1px solid ${CAT_COLORS[catEditing]}40` }}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ color: CAT_COLORS[catEditing] }}>
                        Configurar Agenda: {CAT_LABELS[catEditing] || catEditing}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Atenção: Salvar esta regra aplicará os mesmos dias e horários para <b>todos</b> os exames desta categoria.
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ mt: 2, bgcolor: '#f1f3f5' }}>
                    <Paper className="tasy-flat-panel" sx={{ p: 2, mb: 2 }}>
                        <div className="tasy-section-header" style={{ margin: '-16px -16px 16px -16px' }}>Requisitos Operacionais</div>
                        <Box display="flex" gap={2}>
                            <TextField 
                                label="Duração Padrão (minutos)" type="number" value={catConfigAgenda.duracao_padrao} onChange={(e) => setCatConfigAgenda({...catConfigAgenda, duracao_padrao: e.target.value})} 
                                size="small" className="tasy-compact-input" sx={{ width: 200 }} 
                            />
                            <TextField 
                                label="Equipamento Exigido" value={catConfigAgenda.equipamento_obrigatorio} onChange={(e) => setCatConfigAgenda({...catConfigAgenda, equipamento_obrigatorio: e.target.value.toUpperCase()})} 
                                size="small" className="tasy-compact-input" sx={{ flexGrow: 1 }} placeholder="Tag da Sala (Ex: SAMSUNG_V7)"
                            />
                        </Box>
                    </Paper>

                    <Paper className="tasy-flat-panel" sx={{ p: 2 }}>
                        <div className="tasy-section-header" style={{ margin: '-16px -16px 16px -16px' }}>Dias e Horários Autorizados</div>
                        <Box sx={{ display: 'flex', gap: 1, mb: 2, p: 1.5, bgcolor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 1, alignItems: 'center' }}>
                            <TextField 
                                select label="Dia da Semana" value={catNovoDia.dia_semana} onChange={(e) => setCatNovoDia({...catNovoDia, dia_semana: e.target.value})} 
                                size="small" className="tasy-compact-input" sx={{ flexGrow: 1 }}
                            >
                                {DIAS_SEMANA.map(dia => <MenuItem key={dia.value} value={dia.value}>{dia.label}</MenuItem>)}
                            </TextField>
                            <TextField label="Início" type="time" size="small" className="tasy-compact-input" value={catNovoDia.hora_inicio} onChange={(e) => setCatNovoDia({...catNovoDia, hora_inicio: e.target.value})} InputLabelProps={{ shrink: true }} sx={{ width: 100 }} />
                            <TextField label="Fim" type="time" size="small" className="tasy-compact-input" value={catNovoDia.hora_fim} onChange={(e) => setCatNovoDia({...catNovoDia, hora_fim: e.target.value})} InputLabelProps={{ shrink: true }} sx={{ width: 100 }} />
                            <Button onClick={handleAddCatDia} variant="outlined" color="primary" sx={{ height: 38, minWidth: 40, p: 0, borderRadius: 1 }}><AddCircle /></Button>
                        </Box>

                        <Stack spacing={1}>
                            {catConfigAgenda.dias_funcionamento.length === 0 ? (
                                <Typography variant="caption" color="text.secondary" align="center" sx={{ py: 2 }}>
                                    Nenhuma regra configurada.
                                </Typography>
                            ) : catConfigAgenda.dias_funcionamento.map((dia) => (
                                <Box key={dia.dia_semana} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, border: '1px solid #dee2e6', borderRadius: 1, bgcolor: 'white' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Chip label={DIAS_SEMANA.find(d => d.value === dia.dia_semana)?.label} color="primary" variant="outlined" size="small" sx={{ fontWeight: 'bold', width: 110 }} />
                                        <Typography variant="body2" sx={{ color: '#495057' }}>{dia.hora_inicio} às {dia.hora_fim}</Typography>
                                    </Box>
                                    <IconButton size="small" color="error" onClick={() => handleRemoveCatDia(dia.dia_semana)}><Delete fontSize="small" /></IconButton>
                                </Box>
                            ))}
                        </Stack>
                    </Paper>
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '1px solid #dee2e6' }}>
                    <Button onClick={() => setCatModalOpen(false)} disabled={isSubmittingCat} sx={{ color: '#495057' }}>Cancelar</Button>
                    <Button 
                        variant="contained" color="primary" onClick={handleSaveCatConfig} disabled={isSubmittingCat}
                        startIcon={isSubmittingCat ? <CircularProgress size={16} color="inherit"/> : <AccessTime />}
                        sx={{ fontWeight: 'bold' }}
                    >
                        {isSubmittingCat ? 'Aplicando...' : 'Aplicar em Todos'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* MODAL DE PDF MANTIDO INTACTO */}
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