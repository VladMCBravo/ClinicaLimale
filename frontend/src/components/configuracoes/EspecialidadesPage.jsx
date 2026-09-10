// src/components/configuracoes/EspecialidadesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
    Box, Typography, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, CircularProgress, Button, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, InputAdornment,
    FormControl, InputLabel, Select, MenuItem, List, ListItem, ListItemText,
    FormControlLabel, Checkbox, Stack, Tooltip
} from '@mui/material';
import { 
    Edit as EditIcon, 
    Delete as DeleteIcon, 
    PictureAsPdf as PictureAsPdfIcon,
    Add as AddIcon,
    AttachMoney
} from '@mui/icons-material';

import { useSnackbar } from '../../contexts/SnackbarContext';
import { configuracoesService } from '../services/configuracoesService';
import { faturamentoService } from '../../services//faturamentoService';
import { gerarPdfEspecialidades } from '../utils/tabelaValoresPdfGenerator'; 

// Importante: verifique se o caminho do css está correto de acordo com a pasta atual
import '../../atendimento.css'; 

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

    const thStyle = { fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #e9ecef' };
    
    return (
        <Box className="tasy-workspace" sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 0, backgroundColor: '#f1f3f5', overflow: 'hidden' }}>
            
            {/* CABEÇALHO DA TELA */}
            <Box className="tasy-flat-panel" sx={{ p: 2, mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, bgcolor: '#fff' }}>
                <Typography sx={{ fontWeight: 600, color: '#495057', fontSize: '13px', textTransform: 'uppercase' }}>
                    Gestão de Especialidades Médicas
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="outlined" color="error" size="small" startIcon={<PictureAsPdfIcon />} onClick={() => setIsPdfModalOpen(true)} sx={{ textTransform: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                        Exportar PDF
                    </Button>
                    <Button variant="contained" disableElevation color="primary" size="small" startIcon={<AddIcon />} onClick={() => handleOpenModal()} sx={{ textTransform: 'none', borderRadius: '4px', fontWeight: 600, bgcolor: '#1c7ed6', fontSize: '12px' }}>
                        Nova Especialidade
                    </Button>
                </Box>
            </Box>
            
            {/* ÁREA DA TABELA */}
            <Box className="tasy-flat-panel" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: '#fff' }}>
                <TableContainer sx={{ flexGrow: 1 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={thStyle}>Nome da Especialidade</TableCell>
                                <TableCell sx={{ ...thStyle, width: 220 }}>Valor da Consulta (Particular)</TableCell>
                                <TableCell align="center" sx={{ ...thStyle, width: 120 }}>Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={3} align="center" sx={{ py: 6 }}><CircularProgress /></TableCell></TableRow>
                            ) : especialidades.length > 0 ? (
                                especialidades.map((item) => (
                                    <TableRow key={item.id} hover sx={{ '& td': { borderBottom: '1px solid #f8f9fa' } }}>
                                        <TableCell sx={{ fontSize: '12px', fontWeight: 600, color: '#343a40' }}>{item.nome}</TableCell>
                                        <TableCell sx={{ fontWeight: 600, color: item.valor_consulta ? '#2b8a3e' : '#adb5bd', fontSize: '12px' }}>
                                            {item.valor_consulta ? `R$ ${parseFloat(item.valor_consulta).toFixed(2)}` : 'Não definido'}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="Editar Especialidade">
                                                <IconButton onClick={() => handleOpenModal(item)} size="small" sx={{ color: '#868e96', '&:hover': { color: '#1c7ed6' } }}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Excluir Especialidade">
                                                <IconButton onClick={() => handleDelete(item.id)} size="small" sx={{ color: '#868e96', '&:hover': { color: '#e03131' } }}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={3} align="center" sx={{ py: 6, color: '#868e96', fontSize: '13px' }}>Nenhuma especialidade cadastrada.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <Box sx={{ p: 1.5, borderTop: '1px solid #e9ecef', bgcolor: '#f8f9fa', textAlign: 'right' }}>
                    <Typography sx={{ color: '#6c757d', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                        EXIBINDO {especialidades.length} REGISTROS
                    </Typography>
                </Box>
            </Box>

            {/* MODAL DE EDIÇÃO/CRIAR ESPECIALIDADE */}
            <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth disableEscapeKeyDown={isSubmitting} PaperProps={{ className: 'tasy-flat-panel' }}>
                <DialogTitle sx={{ bgcolor: '#f8f9fa', borderBottom: '1px solid #e9ecef', p: 2 }}>
                    <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#495057', textTransform: 'uppercase' }}>
                        {itemParaEditar ? 'Gerenciar Especialidade' : 'Nova Especialidade'}
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ mt: 2, bgcolor: '#f4f6f8', p: 3 }}>
                    
                    <div className="tasy-panel theme-blue">
                        <div className="tasy-panel-body">
                            <div className="tasy-section-header">Dados Gerais</div>
                            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                                <TextField 
                                    className="tasy-compact-input" autoFocus label="Nome da Especialidade" 
                                    fullWidth size="small" value={formData.nome} 
                                    onChange={(e) => setFormData({...formData, nome: e.target.value})} 
                                />
                                <TextField 
                                    className="tasy-compact-input" label="Valor Particular" type="number" size="small" 
                                    value={formData.valor_consulta} onChange={(e) => setFormData({...formData, valor_consulta: e.target.value})} 
                                    InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }} 
                                />
                            </Box>
                        </div>
                    </div>

                    {itemParaEditar && (
                        <div className="tasy-panel theme-blue">
                            <div className="tasy-panel-body">
                                <div className="tasy-section-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Tabela de Convênios</span>
                                    <span style={{ fontSize: '10px', fontWeight: 'normal', textTransform: 'none', color: '#868e96' }}>Repasse de consultas.</span>
                                </div>
                                <Box sx={{ display: 'flex', gap: 1, mb: 2, p: 1.5, bgcolor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 1, alignItems: 'center' }}>
                                    <FormControl fullWidth size="small" sx={{ flex: 2 }} className="tasy-compact-input">
                                        <InputLabel>Convênio / Plano</InputLabel>
                                        <Select value={planoSelecionadoId} label="Convênio / Plano" onChange={(e) => setPlanoSelecionadoId(e.target.value)}>
                                            {planosDisponiveis.map(p => <MenuItem key={p.id} value={p.id}><strong>{p.convenio_nome}</strong> &nbsp;—&nbsp; {p.nome}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                    <TextField className="tasy-compact-input" label="Valor (R$)" type="number" value={valorConvenio} onChange={(e) => setValorConvenio(e.target.value)} size="small" sx={{ flex: 1 }} />
                                    <Button onClick={handleAddPrecoConvenio} variant="contained" disableElevation color="success" disabled={isSubmitting} size="small" sx={{ height: 36, fontWeight: 600, fontSize: '12px' }}>Adicionar</Button>
                                </Box>
                                
                                <List dense sx={{ border: '1px solid #dee2e6', borderRadius: 1, maxHeight: 160, overflow: 'auto', bgcolor: '#ffffff', p: 0 }}>
                                    {valoresConvenio.map(item => (
                                        <ListItem key={item.id} divider sx={{ '&:hover': { bgcolor: '#f8f9fa' } }}>
                                            <ListItemText 
                                                primary={<Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#343a40' }}>{item.convenio_nome} - {item.plano_nome}</Typography>} 
                                            />
                                            <Typography sx={{ fontSize: '13px', color: '#2b8a3e', fontWeight: 600 }}>R$ {item.valor}</Typography>
                                        </ListItem>
                                    ))}
                                    {valoresConvenio.length === 0 && <ListItem><ListItemText secondary={<Typography sx={{ fontSize: '12px', color: '#868e96' }}>Nenhum valor de convênio cadastrado.</Typography>} /></ListItem>}
                                </List>
                            </div>
                        </div>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 1.5, borderTop: '1px solid #e9ecef', bgcolor: '#f8f9fa' }}>
                    <Button onClick={handleCloseModal} sx={{ color: '#868e96', fontSize: '12px', fontWeight: 600 }}>Cancelar</Button>
                    <Button onClick={handleSave} variant="contained" disableElevation disabled={isSubmitting} sx={{ fontWeight: 600, fontSize: '12px', bgcolor: '#1c7ed6' }}>
                        {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Salvar Especialidade'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* MODAL DE PDF */}
            <Dialog open={isPdfModalOpen} onClose={() => setIsPdfModalOpen(false)} maxWidth="xs" fullWidth PaperProps={{ className: 'tasy-flat-panel' }}>
                <DialogTitle sx={{ bgcolor: '#f8f9fa', p: 2, borderBottom: '1px solid #e9ecef' }}>
                    <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#495057', textTransform: 'uppercase' }}>Exportar Especialidades</Typography>
                </DialogTitle>
                <DialogContent sx={{ mt: 2, p: 3 }}>
                    <Typography sx={{ fontSize: '12px', color: '#6c757d', mb: 2 }}>
                        Selecione quais informações devem constar no documento:
                    </Typography>
                    <Stack spacing={1}>
                        <FormControlLabel
                            control={<Checkbox size="small" checked={pdfOptions.showValues} onChange={(e) => setPdfOptions({...pdfOptions, showValues: e.target.checked})} />}
                            label={<Typography sx={{ fontSize: '13px', color: '#495057' }}>Incluir Valores Particulares</Typography>}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 1.5, borderTop: '1px solid #e9ecef', bgcolor: '#f8f9fa' }}>
                    <Button onClick={() => setIsPdfModalOpen(false)} disabled={isGerandoPdf} sx={{ color: '#868e96', fontSize: '12px', fontWeight: 600 }}>Cancelar</Button>
                    <Button onClick={handleGerarPdf} variant="contained" disableElevation color="error" startIcon={isGerandoPdf ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfIcon />} disabled={isGerandoPdf} sx={{ fontWeight: 600, fontSize: '12px', bgcolor: '#e03131' }}>
                        {isGerandoPdf ? 'Processando...' : 'Gerar Documento'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}