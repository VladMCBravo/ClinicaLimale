// src/components/prontuario/RelatoriosTab.jsx
// VERSÃO CORRIGIDA: Layout Vertical Adaptado para a Barra Lateral Direita

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, FormControl, InputLabel, Select,
    MenuItem, Button, TextField, CircularProgress, List, ListItem,
    ListItemText, Divider, IconButton, Tooltip,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

export default function RelatoriosTab({ pacienteId, consultaAtualId, especialidade }) {
    const { showSnackbar } = useSnackbar();
    
    const [templates, setTemplates] = useState([]); 
    const [savedReports, setSavedReports] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [titulo, setTitulo] = useState(''); 
    const [editorContent, setEditorContent] = useState('');
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pdfLoadingId, setPdfLoadingId] = useState(null); 
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    const fetchTemplates = useCallback(async () => {
        setIsLoadingTemplates(true);
        try {
            const res = await apiClient.get(`/prontuario/templates/?especialidade=${especialidade}`);
            setTemplates(res.data);
        } catch (err) {
            showSnackbar('Erro ao carregar modelos de relatório.', 'error');
        } finally {
            setIsLoadingTemplates(false);
        }
    }, [especialidade, showSnackbar]);

    const fetchSavedReports = useCallback(async () => {
        setIsLoadingHistory(true);
        try {
            const res = await apiClient.get(`/prontuario/pacientes/${pacienteId}/relatorios/`);
            setSavedReports(res.data);
        } catch (err) {
            showSnackbar('Erro ao carregar histórico de relatórios.', 'error');
        } finally {
            setIsLoadingHistory(false);
        }
    }, [pacienteId, showSnackbar]);

    useEffect(() => {
        if (pacienteId && especialidade) {
            fetchTemplates();
            fetchSavedReports();
        }
        setSelectedTemplateId('');
        setTitulo('');
        setEditorContent('');
    }, [pacienteId, especialidade, fetchTemplates, fetchSavedReports]);

    const handleGerarPreview = async () => {
        if (!selectedTemplateId) {
            showSnackbar('Selecione um modelo de relatório primeiro.', 'warning');
            return;
        }
        setIsLoadingPreview(true);
        try {
            const payload = {
                template_id: selectedTemplateId,
                consulta_id: consultaAtualId || null 
            };
            const res = await apiClient.post(
                `/prontuario/pacientes/${pacienteId}/gerar-preview-relatorio/`,
                payload
            );
            
            setEditorContent(res.data.conteudo_preenchido);
            const templateNome = templates.find(t => t.id === selectedTemplateId)?.titulo || 'Relatório';
            setTitulo(templateNome);
        } catch (err) {
            showSnackbar('Erro ao gerar prévia do relatório.', 'error');
        } finally {
            setIsLoadingPreview(false);
        }
    };

    const handleSalvarRelatorio = async () => {
        if (!titulo || !editorContent) {
            showSnackbar('O título e o conteúdo do relatório não podem estar vazios.', 'warning');
            return;
        }
        setIsSubmitting(true);
        try {
            const payload = {
                titulo: titulo,
                conteudo_final: editorContent,
                template_origem: selectedTemplateId || null,
                consulta: consultaAtualId || null
            };
            await apiClient.post(
                `/prontuario/pacientes/${pacienteId}/relatorios/criar/`,
                payload
            );
            
            showSnackbar('Relatório salvo com sucesso!', 'success');
            setEditorContent('');
            setTitulo('');
            setSelectedTemplateId('');
            fetchSavedReports(); 
        } catch (err) {
            showSnackbar('Erro ao salvar o relatório.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleGerarPdf = async (relatorioId) => {
        if (pdfLoadingId) return; 
        setPdfLoadingId(relatorioId); 
        
        try {
            const response = await apiClient.get(
                `/pdf/relatorio/${relatorioId}/`,
                { responseType: 'blob' }
            );
            const fileURL = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            window.open(fileURL, '_blank');
            setTimeout(() => URL.revokeObjectURL(fileURL), 100); 
        } catch (error) {
            console.error("Erro ao gerar PDF do relatório:", error);
            showSnackbar('Erro ao gerar PDF do relatório.', 'error');
        } finally {
            setPdfLoadingId(null); 
        }
    };
    
    const handleArquivarRelatorio = async () => {
        const relatorioId = confirmDeleteId;
        if (!relatorioId) return;
        try {
            await apiClient.post(`/prontuario/relatorios/${relatorioId}/arquivar/`);
            showSnackbar('Relatório arquivado com sucesso.', 'success');
            fetchSavedReports();
        } catch (error) {
            showSnackbar('Erro ao arquivar o relatório.', 'error');
        } finally {
            setConfirmDeleteId(null);
        }
    };

    return (
        // 1. Aplicação da classe "tasy-compact-input" e layout totalmente vertical
        <Box className="tasy-compact-input" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

            {/* --- SEÇÃO 1: GERAR NOVO RELATÓRIO --- */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography className="tasy-section-header">Gerar Novo Relatório</Typography>
                
                <FormControl fullWidth size="small" disabled={isLoadingTemplates}>
                    <InputLabel id="template-select-label">Selecione um Modelo</InputLabel>
                    <Select
                        labelId="template-select-label"
                        label="Selecione um Modelo"
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                    >
                        {isLoadingTemplates ? <MenuItem disabled>Carregando...</MenuItem> :
                            templates.map(template => (
                            <MenuItem key={template.id} value={template.id}>{template.titulo}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleGerarPreview}
                    disabled={!selectedTemplateId || isLoadingPreview}
                    size="small"
                    disableElevation
                >
                    {isLoadingPreview ? <CircularProgress size={20} color="inherit" /> : 'Gerar Prévia'}
                </Button>

                {/* Feedback visual discreto */}
                <Typography variant="caption" color={consultaAtualId ? "success.main" : "warning.main"} sx={{ mt: -1, lineHeight: 1.2 }}>
                    {consultaAtualId 
                        ? '✓ Consulta atual incluída na prévia.' 
                        : '⚠ Sem consulta. A prévia usará apenas dados do paciente.'}
                </Typography>

                <TextField
                    label="Título do Relatório"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    size="small"
                    fullWidth
                />
                
                <TextField
                    label="Conteúdo do Relatório"
                    value={editorContent}
                    onChange={(e) => setEditorContent(e.target.value)}
                    multiline
                    rows={8} // 2. Reduzido de 15 para 8 para caber melhor na barra lateral
                    fullWidth
                    disabled={isLoadingPreview}
                />

                <Button
                    variant="contained"
                    color="success"
                    onClick={handleSalvarRelatorio}
                    disabled={isSubmitting || !editorContent || !titulo}
                    size="small"
                    disableElevation
                >
                    {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Salvar Relatório'}
                </Button>
            </Box>

            {/* --- SEÇÃO 2: RELATÓRIOS SALVOS --- */}
            <Box>
                <Typography className="tasy-section-header">Relatórios Salvos</Typography>
                
                {isLoadingHistory ? <CircularProgress size={24} sx={{ m: 2, display: 'block' }} /> :
                    savedReports.length === 0 ? <Typography variant="body2" color="text.secondary">Nenhum relatório salvo.</Typography> : (
                    <List dense disablePadding>
                        {savedReports.map(report => (
                            <React.Fragment key={report.id}>
                                <ListItem
                                    disablePadding
                                    sx={{ py: 1 }}
                                    secondaryAction={
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            <Tooltip title="Gerar PDF" placement="top">
                                                <span>
                                                    <IconButton size="small" onClick={() => handleGerarPdf(report.id)} disabled={pdfLoadingId === report.id}>
                                                        {pdfLoadingId === report.id ? <CircularProgress size={16} /> : <PictureAsPdfIcon fontSize="small" color="primary" />}
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <Tooltip title="Arquivar" placement="top">
                                                <span>
                                                    <IconButton size="small" onClick={() => setConfirmDeleteId(report.id)} disabled={pdfLoadingId === report.id}>
                                                        <DeleteIcon fontSize="small" color="error" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </Box>
                                    }
                                >
                                    <ListItemText
                                        primary={<Typography variant="body2" fontWeight="500">{report.titulo}</Typography>}
                                        secondary={<Typography variant="caption" color="text.secondary">{new Date(report.data_criacao).toLocaleDateString()}</Typography>}
                                    />
                                </ListItem>
                                <Divider component="li" />
                            </React.Fragment>
                        ))}
                    </List>
                )}
            </Box>

            {/* DIÁLOGO DE CONFIRMAÇÃO */}
            <Dialog open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)}>
                <DialogTitle>Arquivar Relatório?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Tem certeza que deseja arquivar este relatório? Ele será removido desta lista.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
                    <Button onClick={handleArquivarRelatorio} color="error" autoFocus>Sim, Arquivar</Button>
                </DialogActions>
            </Dialog>
            
        </Box>
    );
}