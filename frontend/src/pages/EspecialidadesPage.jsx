// src/pages/EspecialidadesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
    Box, Typography, Paper, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, CircularProgress, Button, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, InputAdornment,
    FormControl, InputLabel, Select, MenuItem, List, ListItem, ListItemText, Divider,
    FormControlLabel, Checkbox, Stack 
} from '@mui/material';
import { 
    Edit as EditIcon, 
    Delete as DeleteIcon, 
    PictureAsPdf as PictureAsPdfIcon,
    Add as AddIcon
} from '@mui/icons-material';

import { useSnackbar } from '../contexts/SnackbarContext';
import { configuracoesService } from '../services/configuracoesService';
import { faturamentoService } from '../services/faturamentoService';
import { gerarPdfEspecialidades } from '../utils/tabelaValoresPdfGenerator'; 

export default function EspecialidadesPage() {
    const [especialidades, setEspecialidades] = useState([]);
    const [planosDisponiveis, setPlanosDisponiveis] = useState([]);
    const [valoresConvenio, setValoresConvenio] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemParaEditar, setItemParaEditar] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ nome: '', valor_consulta: '' });
    const [planoSelecionadoId, setPlanoSelecionadoId] = useState('');
    const [valorConvenio, setValorConvenio] = useState('');

    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [pdfOptions, setPdfOptions] = useState({ showValues: true });
    const [isGerandoPdf, setIsGerandoPdf] = useState(false);

    const { showSnackbar } = useSnackbar();

    const fetchDados = useCallback(async () => {
        setIsLoading(true);
        try {
            const [espRes, planosRes] = await Promise.all([
                configuracoesService.getEspecialidades(),
                faturamentoService.getPlanosConvenio()
            ]);
            setEspecialidades(espRes.data);
            setPlanosDisponiveis(planosRes.data.filter(p => (p.convenio_nome || '').toLowerCase() !== 'particular'));
        } catch (error) {
            showSnackbar('Erro ao carregar dados.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => { fetchDados(); }, [fetchDados]);

    const handleOpenModal = (item = null) => {
        setItemParaEditar(item);
        if (item) {
            setFormData({ nome: item.nome, valor_consulta: item.valor_consulta || '' });
            setValoresConvenio(item.valores_convenio || []);
        } else {
            setFormData({ nome: '', valor_consulta: '' });
            setValoresConvenio([]);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setItemParaEditar(null);
        setFormData({ nome: '', valor_consulta: '' });
        setPlanoSelecionadoId('');
        setValorConvenio('');
    };

    const handleSave = async () => {
        if (!formData.nome.trim()) return showSnackbar('O nome não pode estar vazio.', 'warning');
        setIsSubmitting(true);
        try {
            const dataToSend = {
                nome: formData.nome,
                valor_consulta: formData.valor_consulta ? parseFloat(formData.valor_consulta) : null
            };
            if (itemParaEditar) await configuracoesService.updateEspecialidade(itemParaEditar.id, dataToSend);
            else await configuracoesService.createEspecialidade(dataToSend);
            
            showSnackbar('Especialidade salva com sucesso!', 'success');
            handleCloseModal();
            fetchDados();
        } catch (error) { showSnackbar('Erro ao salvar.', 'error'); } 
        finally { setIsSubmitting(false); }
    };
    
    const handleAddPrecoConvenio = async () => {
        if (!planoSelecionadoId || !valorConvenio) return showSnackbar('Selecione um plano e informe o valor.', 'warning');
        setIsSubmitting(true);
        try {
            await configuracoesService.definirPrecoConvenioEspecialidade(itemParaEditar.id, { plano_convenio_id: planoSelecionadoId, valor: valorConvenio });
            showSnackbar('Preço de convênio adicionado!', 'success');
            setPlanoSelecionadoId(''); setValorConvenio('');
            fetchDados(); handleCloseModal();
        } catch (error) { showSnackbar('Erro ao salvar preço.', 'error'); } 
        finally { setIsSubmitting(false); }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Deseja deletar esta especialidade?')) {
            try { await configuracoesService.deleteEspecialidade(id); fetchDados(); } 
            catch { showSnackbar('Erro ao deletar.', 'error'); }
        }
    };

    const handleGerarPdf = () => {
        setIsGerandoPdf(true);
        gerarPdfEspecialidades(especialidades, pdfOptions, (blob) => {
            try {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'Especialidades_Limale.pdf';
                a.click();
                showSnackbar('PDF gerado com sucesso!', 'success');
            } catch (error) { showSnackbar('Erro ao processar o PDF.', 'error'); } 
            finally { setIsPdfModalOpen(false); setIsGerandoPdf(false); }
        });
    };
    
    return (
        // Alterado de margin: auto / p: 2 para ocupar a tela 100% igual aos procedimentos
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 1, backgroundColor: '#f1f3f5', overflow: 'hidden' }}>
            
            <Paper className="tasy-flat-panel" sx={{ p: 1, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#495057', textTransform: 'uppercase' }}>
                    Gestão de Especialidades
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="outlined" color="error" size="small" startIcon={<PictureAsPdfIcon />} onClick={() => setIsPdfModalOpen(true)} sx={{ textTransform: 'none', borderRadius: 1 }}>
                        Exportar PDF
                    </Button>
                    <Button variant="contained" color="primary" size="small" startIcon={<AddIcon />} onClick={() => handleOpenModal()} sx={{ textTransform: 'none', borderRadius: 1, fontWeight: 'bold' }}>
                        Nova Especialidade
                    </Button>
                </Box>
            </Paper>
            
            <Paper className="tasy-flat-panel" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div className="tasy-section-header" style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                    Especialidades e Consultas
                </div>
                <TableContainer className="tasy-workspace" sx={{ flexGrow: 1, bgcolor: '#ffffff' }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057', borderBottom: '1px solid #dee2e6' }}>Nome da Especialidade</TableCell>
                                <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057', borderBottom: '1px solid #dee2e6', width: 180 }}>Valor (Particular)</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057', borderBottom: '1px solid #dee2e6', width: 100 }}>Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={3} align="center" sx={{ py: 6 }}><CircularProgress /></TableCell></TableRow>
                            ) : especialidades.length > 0 ? (
                                especialidades.map((item) => (
                                    <TableRow key={item.id} hover sx={{ '& td': { borderBottom: '1px solid #f1f3f5' } }}>
                                        <TableCell sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#343a40' }}>{item.nome}</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', color: item.valor_consulta ? '#2e7d32' : '#adb5bd', fontSize: '0.85rem' }}>
                                            {item.valor_consulta ? `R$ ${parseFloat(item.valor_consulta).toFixed(2)}` : 'Não definido'}
                                        </TableCell>
                                        <TableCell align="center">
                                            <IconButton onClick={() => handleOpenModal(item)} size="small" sx={{ color: '#1565c0' }}><EditIcon fontSize="small" /></IconButton>
                                            <IconButton onClick={() => handleDelete(item.id)} size="small" color="error"><DeleteIcon fontSize="small" /></IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={3} align="center" sx={{ py: 6, color: '#868e96' }}>Nenhuma especialidade cadastrada.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <Box sx={{ p: 1, borderTop: '1px solid #dee2e6', bgcolor: '#f8f9fa', textAlign: 'right' }}>
                    <Typography variant="caption" sx={{ color: '#6c757d', fontWeight: 'bold' }}>
                        EXIBINDO {especialidades.length} REGISTROS
                    </Typography>
                </Box>
            </Paper>

            {/* MODAL DE EDIÇÃO/CRIAR ESPECIALIDADE (mantido intacto estruturalmente, apenas ajustes estéticos de DialogTitle) */}
            <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ bgcolor: '#f8f9fa', borderBottom: '1px solid #dee2e6', p: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">{itemParaEditar ? 'Gerenciar Especialidade' : 'Nova Especialidade'}</Typography>
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <Typography variant="overline" color="text.secondary">Dados Gerais</Typography>
                    <Box sx={{ display: 'flex', gap: 2, mb: 3, mt: 1 }}>
                        <TextField autoFocus label="Nome da Especialidade" fullWidth size="small" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} />
                        <TextField label="Valor Particular" type="number" size="small" value={formData.valor_consulta} onChange={(e) => setFormData({...formData, valor_consulta: e.target.value})} InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }} />
                    </Box>

                    {itemParaEditar && (
                        <>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="overline" color="text.secondary">Tabela de Convênios</Typography>
                            <Box sx={{ display: 'flex', gap: 2, mt: 1, mb: 2, alignItems: 'center' }}>
                                <FormControl fullWidth size="small" sx={{flex: 2}}>
                                    <InputLabel>Convênio / Plano</InputLabel>
                                    <Select value={planoSelecionadoId} label="Convênio / Plano" onChange={(e) => setPlanoSelecionadoId(e.target.value)}>
                                        {planosDisponiveis.map(p => <MenuItem key={p.id} value={p.id}><strong>{p.convenio_nome}</strong> &nbsp;—&nbsp; {p.nome}</MenuItem>)}
                                    </Select>
                                </FormControl>
                                <TextField label="Valor (R$)" type="number" value={valorConvenio} onChange={(e) => setValorConvenio(e.target.value)} size="small" sx={{ flex: 1 }} />
                                <Button onClick={handleAddPrecoConvenio} variant="contained" color="primary" disabled={isSubmitting} size="small" sx={{ height: 40 }}>Add</Button>
                            </Box>
                            
                            <List dense sx={{ border: '1px solid #dee2e6', borderRadius: 1, maxHeight: 150, overflow: 'auto', bgcolor: '#f8f9fa' }}>
                                {valoresConvenio.map(item => (
                                    <ListItem key={item.id} divider>
                                        <ListItemText primary={`${item.convenio_nome} - ${item.plano_nome}`} secondary={<Typography variant="body2" color="success.main" fontWeight="bold">R$ {item.valor}</Typography>} />
                                    </ListItem>
                                ))}
                                {valoresConvenio.length === 0 && <ListItem><ListItemText secondary="Nenhum valor de convênio cadastrado." /></ListItem>}
                            </List>
                        </>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '1px solid #dee2e6' }}>
                    <Button onClick={handleCloseModal}>Cancelar</Button>
                    <Button onClick={handleSave} variant="contained" disabled={isSubmitting} sx={{ fontWeight: 'bold' }}>
                        {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Especialidade'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={isPdfModalOpen} onClose={() => setIsPdfModalOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ bgcolor: '#f8f9fa', p: 2, borderBottom: '1px solid #dee2e6' }}>
                    <Typography variant="subtitle1" fontWeight="bold">Exportar Especialidades</Typography>
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Selecione quais informações devem constar no documento:
                    </Typography>
                    <Stack spacing={1}>
                        <FormControlLabel
                            control={<Checkbox checked={pdfOptions.showValues} onChange={(e) => setPdfOptions({...pdfOptions, showValues: e.target.checked})} />}
                            label="Incluir Valores Particulares"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '1px solid #dee2e6' }}>
                    <Button onClick={() => setIsPdfModalOpen(false)} disabled={isGerandoPdf}>Cancelar</Button>
                    <Button onClick={handleGerarPdf} variant="contained" color="error" startIcon={isGerandoPdf ? <CircularProgress size={20} color="inherit" /> : <PictureAsPdfIcon />} disabled={isGerandoPdf}>
                        {isGerandoPdf ? 'Processando...' : 'Gerar Documento'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}