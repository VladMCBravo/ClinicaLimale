// src/components/financeiro/ProcedimentosView.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
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
import '../../atendimento.css';

const CAT_COLORS = {
    'US_GERAL': '#1c7ed6', 'MED_FETAL': '#7048e8', 'ECOCARDIOGRAMA': '#e03131',
    'MUSCULO': '#e8590c', 'DOPPLER': '#0b7285', 'OUTROS': '#868e96'
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

    const [order, setOrder] = useState('asc');
    const [orderBy, setOrderBy] = useState('descricao');
    const [collapsedCats, setCollapsedCats] = useState({});

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

    const handleOpenModal = (procedimento = null) => {
        setProcedimentoSelecionado(procedimento);
        setIsModalOpen(true);
    };

    const handleOpenCatModal = (cat) => {
        setCatEditing(cat);
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

    const thStyle = { fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #e9ecef' };

    return (
        <Box className="tasy-workspace" sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 0, backgroundColor: '#f1f3f5', overflow: 'hidden' }}>
            
            <Box className="tasy-flat-panel" sx={{ p: 2, mb: 1.5, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexShrink: 0, bgcolor: '#fff' }}>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontWeight: 600, color: '#495057', fontSize: '13px', textTransform: 'uppercase' }}>
                        Catálogo de Procedimentos
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip size="small" icon={<FormatListNumbered />} label={`Cadastrados: ${kpis.total}`} sx={{ borderRadius: '4px', fontWeight: 600, bgcolor: '#f1f3f5', color: '#495057' }} />
                        <Chip size="small" icon={<MonetizationOn />} label={`Com Preço: ${kpis.comValor}`} sx={{ borderRadius: '4px', fontWeight: 600, bgcolor: '#e7f5ff', color: '#1c7ed6' }} />
                        <Chip size="small" icon={<LocalHospital />} label={`Com TUSS: ${kpis.tuss}`} sx={{ borderRadius: '4px', fontWeight: 600, bgcolor: '#fff4e6', color: '#e8590c' }} />
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField 
                        size="small" className="tasy-compact-input" placeholder="Buscar exame ou código..." 
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
                        InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
                        sx={{ width: 220 }} 
                    />
                    <Button variant="outlined" component="label" size="small" startIcon={isUploading ? <CircularProgress size={16} color="inherit" /> : <CloudUpload />} disabled={isUploading} sx={{ textTransform: 'none', borderRadius: '4px', color: '#495057', borderColor: '#ced4da', fontSize: '12px', fontWeight: 600 }}>
                        {isUploading ? 'Processando...' : 'Importar'}
                        <input type="file" accept=".csv, .txt" hidden onChange={handleFileUpload} />
                    </Button>
                    <Button variant="outlined" color="error" size="small" startIcon={<PictureAsPdf />} onClick={() => setIsPdfModalOpen(true)} sx={{ textTransform: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                        Exportar
                    </Button>
                    <Button variant="contained" disableElevation color="primary" size="small" startIcon={<Add />} onClick={() => handleOpenModal(null)} sx={{ textTransform: 'none', borderRadius: '4px', fontWeight: 600, bgcolor: '#1c7ed6', fontSize: '12px' }}>
                        Novo Procedimento
                    </Button>
                </Box>
            </Box>

            <Box className="tasy-flat-panel" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: '#fff' }}>
                <TableContainer sx={{ flexGrow: 1 }}>
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
                                Object.keys(groupedAndSortedList).sort().map((cat) => {
                                    
                                    const procsCat = groupedAndSortedList[cat];
                                    const comValorCat = procsCat.filter(p => Number(p.valor_particular) > 0).length;
                                    const comTussCat = procsCat.filter(p => p.codigo_tuss).length;

                                    return (
                                        <React.Fragment key={cat}>
                                            <TableRow sx={{ bgcolor: `${CAT_COLORS[cat]}08` }}>
                                                <TableCell colSpan={5} sx={{ py: 0.5, borderBottom: `1px solid ${CAT_COLORS[cat]}30` }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <IconButton size="small" onClick={() => toggleCategory(cat)} sx={{ color: CAT_COLORS[cat] }}>
                                                                {collapsedCats[cat] ? <KeyboardArrowDown fontSize="small" /> : <KeyboardArrowUp fontSize="small" />}
                                                            </IconButton>
                                                            <Typography sx={{ color: CAT_COLORS[cat], textTransform: 'uppercase', fontSize: '12px', fontWeight: 700 }}>
                                                                {CAT_LABELS[cat] || cat}
                                                            </Typography>
                                                            
                                                            <Chip label={procsCat.length} size="small" sx={{ height: 20, fontSize: '10px', bgcolor: `${CAT_COLORS[cat]}20`, color: CAT_COLORS[cat], fontWeight: 'bold', borderRadius: '4px' }} />
                                                            <Chip label={`Preço: ${comValorCat}`} size="small" sx={{ height: 20, fontSize: '10px', fontWeight: 'bold', ml: 1, borderRadius: '4px', bgcolor: '#e7f5ff', color: '#1c7ed6' }} />
                                                            <Chip label={`TUSS: ${comTussCat}`} size="small" sx={{ height: 20, fontSize: '10px', fontWeight: 'bold', borderRadius: '4px', bgcolor: '#fff4e6', color: '#e8590c' }} />
                                                        </Box>
                                                        <Button 
                                                            size="small" variant="outlined" startIcon={<AccessTime />} onClick={() => handleOpenCatModal(cat)}
                                                            sx={{ color: CAT_COLORS[cat], borderColor: `${CAT_COLORS[cat]}50`, textTransform: 'none', height: 26, fontSize: '11px', fontWeight: 600, bgcolor: 'white', '&:hover': { bgcolor: `${CAT_COLORS[cat]}10` } }}
                                                        >
                                                            Agenda da Categoria
                                                        </Button>
                                                    </Box>
                                                </TableCell>
                                            </TableRow>

                                            {!collapsedCats[cat] && procsCat.map((proc) => (
                                                <TableRow key={proc.id} hover sx={{ '& td': { borderBottom: '1px solid #f1f3f5' } }}>
                                                    <TableCell sx={{ fontFamily: 'monospace', color: '#6c757d', fontSize: '12px', fontWeight: 600, pl: 3 }}>
                                                        {proc.codigo_tuss || '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip 
                                                            label={CAT_LABELS[proc.categoria] || proc.categoria} size="small" 
                                                            sx={{ fontSize: '10px', height: 20, fontWeight: 'bold', bgcolor: `${CAT_COLORS[proc.categoria]}15`, color: CAT_COLORS[proc.categoria], borderRadius: '4px' }}
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ fontSize: '12px', fontWeight: 500, color: '#343a40' }}>
                                                        {proc.descricao}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ fontWeight: 600, color: proc.valor_particular ? '#2b8a3e' : '#adb5bd', fontSize: '12px' }}>
                                                        {proc.valor_particular ? formatMoney(proc.valor_particular) : '-'}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Tooltip title="Editar Regras e Preços">
                                                            <IconButton onClick={() => handleOpenModal(proc)} size="small" sx={{ color: '#868e96', '&:hover': { color: '#1c7ed6' } }}>
                                                                <Edit fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </React.Fragment>
                                    );
                                })
                            ) : (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6, color: '#868e96', fontSize: '13px' }}>Nenhum procedimento encontrado.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <Box sx={{ p: 1.5, borderTop: '1px solid #e9ecef', bgcolor: '#f8f9fa', textAlign: 'right' }}>
                    <Typography sx={{ color: '#6c757d', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                        EXIBINDO {filteredList.length} REGISTROS
                    </Typography>
                </Box>
            </Box>

            <ProcedimentoModal open={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={fetchProcedimentos} procedimento={procedimentoSelecionado} />
            
            <Dialog open={catModalOpen} onClose={() => setCatModalOpen(false)} maxWidth="sm" fullWidth disableEscapeKeyDown={isSubmittingCat} PaperProps={{ className: 'tasy-flat-panel' }}>
                <DialogTitle sx={{ bgcolor: '#f8f9fa', p: 2, borderBottom: '1px solid #e9ecef' }}>
                    <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#495057', textTransform: 'uppercase' }}>
                        Configurar Agenda: {CAT_LABELS[catEditing] || catEditing}
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: '#868e96', mt: 0.5 }}>
                        Atenção: Salvar esta regra aplicará os mesmos dias e horários para <b>todos</b> os exames desta categoria de uma só vez.
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ mt: 2, bgcolor: '#f4f6f8', p: 3 }}>
                    
                    <div className="tasy-panel theme-blue">
                        <div className="tasy-panel-body">
                            <div className="tasy-section-header">Requisitos Operacionais</div>
                            <Box display="flex" gap={2}>
                                <TextField label="Duração Padrão (minutos)" type="number" value={catConfigAgenda.duracao_padrao} onChange={(e) => setCatConfigAgenda({...catConfigAgenda, duracao_padrao: e.target.value})} size="small" className="tasy-compact-input" sx={{ width: 200 }} />
                                <TextField label="Equipamento Exigido" value={catConfigAgenda.equipamento_obrigatorio} onChange={(e) => setCatConfigAgenda({...catConfigAgenda, equipamento_obrigatorio: e.target.value.toUpperCase()})} size="small" className="tasy-compact-input" sx={{ flexGrow: 1 }} placeholder="Tag da Sala (Ex: SAMSUNG_V7)" />
                            </Box>
                        </div>
                    </div>

                    <div className="tasy-panel theme-blue">
                        <div className="tasy-panel-body">
                            <div className="tasy-section-header">Dias e Horários Autorizados</div>
                            <Box sx={{ display: 'flex', gap: 1, mb: 2, p: 1.5, bgcolor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 1, alignItems: 'center' }}>
                                <TextField select label="Dia da Semana" value={catNovoDia.dia_semana} onChange={(e) => setCatNovoDia({...catNovoDia, dia_semana: e.target.value})} size="small" className="tasy-compact-input" sx={{ flexGrow: 1 }}>
                                    {DIAS_SEMANA.map(dia => <MenuItem key={dia.value} value={dia.value}>{dia.label}</MenuItem>)}
                                </TextField>
                                <TextField label="Início" type="time" size="small" className="tasy-compact-input" value={catNovoDia.hora_inicio} onChange={(e) => setCatNovoDia({...catNovoDia, hora_inicio: e.target.value})} InputLabelProps={{ shrink: true }} sx={{ width: 100 }} />
                                <TextField label="Fim" type="time" size="small" className="tasy-compact-input" value={catNovoDia.hora_fim} onChange={(e) => setCatNovoDia({...catNovoDia, hora_fim: e.target.value})} InputLabelProps={{ shrink: true }} sx={{ width: 100 }} />
                                <Button onClick={handleAddCatDia} variant="contained" disableElevation sx={{ bgcolor: '#1c7ed6', height: 36, minWidth: 40, p: 0 }}><AddCircle fontSize="small" /></Button>
                            </Box>

                            <Stack spacing={1}>
                                {catConfigAgenda.dias_funcionamento.length === 0 ? (
                                    <Typography sx={{ fontSize: '12px', color: '#868e96', textAlign: 'center', py: 2 }}>
                                        Nenhuma regra configurada.
                                    </Typography>
                                ) : catConfigAgenda.dias_funcionamento.map((dia) => (
                                    <Box key={dia.dia_semana} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, border: '1px solid #dee2e6', borderRadius: 1, bgcolor: 'white' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Chip label={DIAS_SEMANA.find(d => d.value === dia.dia_semana)?.label} sx={{ bgcolor: '#e7f5ff', color: '#1c7ed6', fontWeight: 600, width: 110, borderRadius: '4px', fontSize: '11px' }} />
                                            <Typography sx={{ fontSize: '13px', color: '#495057' }}>{dia.hora_inicio} às {dia.hora_fim}</Typography>
                                        </Box>
                                        <IconButton size="small" sx={{ color: '#e03131' }} onClick={() => handleRemoveCatDia(dia.dia_semana)}><Delete fontSize="small" /></IconButton>
                                    </Box>
                                ))}
                            </Stack>
                        </div>
                    </div>
                </DialogContent>
                <DialogActions sx={{ p: 1.5, borderTop: '1px solid #dee2e6', bgcolor: '#f8f9fa' }}>
                    <Button onClick={() => setCatModalOpen(false)} disabled={isSubmittingCat} sx={{ color: '#868e96', fontSize: '12px', fontWeight: 600 }}>Cancelar</Button>
                    <Button variant="contained" disableElevation onClick={handleSaveCatConfig} disabled={isSubmittingCat} startIcon={isSubmittingCat ? <CircularProgress size={16} color="inherit"/> : <AccessTime />} sx={{ fontWeight: 600, fontSize: '12px', bgcolor: '#1c7ed6' }}>
                        {isSubmittingCat ? 'Aplicando...' : 'Aplicar em Todos'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={isPdfModalOpen} onClose={() => setIsPdfModalOpen(false)} maxWidth="xs" fullWidth PaperProps={{ className: 'tasy-flat-panel' }}>
                <DialogTitle sx={{ bgcolor: '#f8f9fa', p: 2, borderBottom: '1px solid #e9ecef' }}>
                    <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#495057', textTransform: 'uppercase' }}>Exportar Tabela</Typography>
                </DialogTitle>
                <DialogContent sx={{ mt: 2, p: 3 }}>
                    <Typography sx={{ fontSize: '12px', color: '#6c757d', mb: 2 }}>Selecione quais dados devem constar no PDF:</Typography>
                    <Stack spacing={1}>
                        <FormControlLabel control={<Checkbox checked={pdfOptions.showTuss} onChange={(e) => setPdfOptions({...pdfOptions, showTuss: e.target.checked})} size="small" />} label={<Typography sx={{ fontSize: '13px', color: '#495057' }}>Incluir Código TUSS</Typography>} />
                        <FormControlLabel control={<Checkbox checked={pdfOptions.showValues} onChange={(e) => setPdfOptions({...pdfOptions, showValues: e.target.checked})} size="small" />} label={<Typography sx={{ fontSize: '13px', color: '#495057' }}>Incluir Valores Particulares</Typography>} />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 1.5, borderTop: '1px solid #e9ecef', bgcolor: '#f8f9fa' }}>
                    <Button onClick={() => setIsPdfModalOpen(false)} sx={{ color: '#868e96', fontSize: '12px', fontWeight: 600 }} disabled={isGerandoPdf}>Cancelar</Button>
                    <Button onClick={handleGerarPdf} variant="contained" disableElevation startIcon={isGerandoPdf ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdf />} disabled={isGerandoPdf} sx={{fontWeight: 600, fontSize: '12px', bgcolor: '#e03131'}}>
                        {isGerandoPdf ? 'Gerando...' : 'Baixar PDF'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}