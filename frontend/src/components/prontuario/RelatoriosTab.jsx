// src/components/prontuario/RelatoriosTab.jsx

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, FormControl, InputLabel, Select,
    MenuItem, Button, TextField, CircularProgress, 
    List, ListItem, ListItemText, Divider, IconButton, Tooltip,
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
    const [isLoading, setIsLoading] = useState(true);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    // 1. Corrija o fetchData
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Agora chamamos o caminho exato que configuramos no urls.py
            const [tempRes, repRes] = await Promise.all([
                apiClient.get('/prontuario/templates-relatorio/'),
                apiClient.get(`/prontuario/pacientes/${pacienteId}/relatorios/`) 
            ]);
            setTemplates(tempRes.data);
            setSavedReports(repRes.data);
        } catch (error) {
            showSnackbar('Erro ao carregar dados.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [pacienteId, showSnackbar]);

    // 2. Corrija o handleSave
    const handleSave = async (e) => {
        e.preventDefault();
        try {
            // Ajuste aqui também para o novo formato de rota
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/relatorios/criar/`, {
                titulo: titulo,
                conteudo_final: editorContent, // Mantenha o nome igual ao que está no serializer
                consulta: consultaAtualId || null,
                template_origem: selectedTemplateId || null
            });
            showSnackbar('Documento salvo!', 'success');
            setTitulo('');
            setEditorContent('');
            setSelectedTemplateId('');
            fetchData();
        } catch (error) {
            showSnackbar('Erro ao salvar.', 'error');
        }
    };

    // Lógica para Arquivar (Soft Delete no backend)
    const handleArquivarRelatorio = async () => {
        if (!confirmDeleteId) return;
        
        try {
            // Note que aqui usamos o delete(), ajuste se o seu backend usar POST
            await apiClient.delete(`/prontuario/relatorios/${confirmDeleteId}/`);
            showSnackbar('Documento arquivado com sucesso.', 'success');
            setConfirmDeleteId(null); 
            fetchData(); // Recarrega a lista automaticamente
        } catch (error) {
            showSnackbar('Erro ao arquivar o documento.', 'error');
            setConfirmDeleteId(null);
        }
    };

    // Lógica para Gerar o PDF (Igual à das prescrições, apontando para a rota de relatórios)
    const handleDownloadPdf = async (relatorioId) => {
        try {
            const response = await apiClient.get(
                `/pdf/relatorio/${relatorioId}/`, 
                { responseType: 'blob' }
            );

            const fileURL = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            window.open(fileURL, '_blank');
            setTimeout(() => URL.revokeObjectURL(fileURL), 100); 
        } catch (error) {
            showSnackbar('Erro ao gerar PDF do relatório.', 'error');
        }
    };

    if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress size={24}/></Box>;

    return (
        <Box className="tasy-compact-input" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            
            {/* 1. ÁREA DE EMISSÃO (Vertical) */}
            <Box component="form" onSubmit={handleSave} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography className="tasy-section-header">Emitir Documento</Typography>

                <FormControl fullWidth size="small">
                    <InputLabel>Modelo (Template)</InputLabel>
                    <Select value={selectedTemplateId} label="Modelo (Template)" onChange={(e) => setSelectedTemplateId(e.target.value)}>
                        <MenuItem value=""><em>Texto Livre</em></MenuItem>
                        {templates.map(t => <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>)}
                    </Select>
                </FormControl>

                <TextField label="Título do Documento (Ex: Atestado de 2 Dias)" value={titulo} onChange={(e) => setTitulo(e.target.value)} required fullWidth />
                
                <TextField 
                    label="Conteúdo" 
                    value={editorContent} 
                    onChange={(e) => setEditorContent(e.target.value)} 
                    multiline rows={8} required fullWidth 
                />

                <Button type="submit" variant="contained" disableElevation fullWidth>
                    Salvar e Gerar
                </Button>
            </Box>

            {/* 2. HISTÓRICO DE DOCUMENTOS */}
            <Box>
                <Typography className="tasy-section-header">Histórico do Paciente</Typography>
                {savedReports.length > 0 ? (
                    <List disablePadding sx={{ border: '1px solid #e0e0e0', bgcolor: '#ffffff' }}>
                        {savedReports.map(rep => (
                            <Box key={rep.id}>
                                <ListItem 
                                    secondaryAction={
                                        <Box>
                                            <IconButton size="small" onClick={() => handleDownloadPdf(rep.id)} color="primary"><PictureAsPdfIcon fontSize="small" /></IconButton>
                                            <IconButton size="small" onClick={() => setConfirmDeleteId(rep.id)} color="error"><DeleteIcon fontSize="small" /></IconButton>
                                        </Box>
                                    }
                                >
                                    <ListItemText 
                                        primary={<Typography variant="body2" fontWeight="600">{rep.titulo}</Typography>}
                                        secondary={<Typography variant="caption">{new Date(rep.data_criacao).toLocaleDateString('pt-BR')}</Typography>} 
                                    />
                                </ListItem>
                                <Divider />
                            </Box>
                        ))}
                    </List>
                ) : (
                    <Typography variant="body2" color="text.secondary">Nenhum documento emitido.</Typography>
                )}
            </Box>

            {/* Modal Confirmar Exclusão */}
            <Dialog
                open={!!confirmDeleteId}
                onClose={() => setConfirmDeleteId(null)}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
                PaperProps={{
                    style: { borderRadius: 0 } // Mantém o estilo Tasy (quadrado)
                }}
            >
                <DialogTitle id="alert-dialog-title" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                    Arquivar Documento?
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        Tem certeza que deseja remover este documento da visualização da consulta atual? 
                        Ele permanecerá arquivado no histórico geral do paciente para fins de auditoria.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => setConfirmDeleteId(null)} color="inherit" sx={{ textTransform: 'none' }}>
                        Cancelar
                    </Button>
                    <Button onClick={handleArquivarRelatorio} color="error" variant="contained" disableElevation autoFocus sx={{ textTransform: 'none' }}>
                        Sim, arquivar
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
}