// src/components/prontuario/cardiologia/RelatoriosTab.jsx
// VERSÃO FINAL: Com ícone de arquivar (lixeira) e diálogo de confirmação

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Grid, Paper, Typography, FormControl, InputLabel, Select,
    MenuItem, Button, TextField, CircularProgress, List, ListItem,
    ListItemText, Divider,
    IconButton, Tooltip,
    // --- 1. IMPORTAR ÍCONE DA LIXEIRA E COMPONENTES DE DIÁLOGO ---
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DeleteIcon from '@mui/icons-material/Delete'; // <-- Ícone da lixeira
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

export default function RelatoriosTab({ pacienteId, consultaAtualId, especialidade }) {
    const { showSnackbar } = useSnackbar();
    
    // ... (Estados de dados e loading continuam iguais) ...
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

    // --- 2. ADICIONAR ESTADO PARA O DIÁLOGO DE CONFIRMAÇÃO ---
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);


    // ... (fetchTemplates e fetchSavedReports continuam iguais) ...
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
            // Esta view no backend deve ser atualizada para
            // retornar apenas relatórios com "ativo=True"
            const res = await apiClient.get(`/prontuario/pacientes/${pacienteId}/relatorios/`);
            setSavedReports(res.data);
        } catch (err) {
            showSnackbar('Erro ao carregar histórico de relatórios.', 'error');
        } finally {
            setIsLoadingHistory(false);
        }
    }, [pacienteId, showSnackbar]);


    // ... (useEffect e handleGerarPreview continuam iguais) ...
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

    // ... (handleSalvarRelatorio e handleGerarPdf continuam iguais) ...
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
            if (error.response && error.response.status === 404) {
                showSnackbar('Erro 404: Rota do PDF de relatório não encontrada.', 'error');
            } else {
                showSnackbar('Erro ao gerar PDF do relatório.', 'error');
            }
        } finally {
            setPdfLoadingId(null); 
        }
    };

    // --- 3. ADICIONAR FUNÇÕES PARA O "SOFT DELETE" (Arquivar) ---
    
    // Esta função será chamada pelo botão "Arquivar" do diálogo
    const handleArquivarRelatorio = async () => {
        const relatorioId = confirmDeleteId;
        if (!relatorioId) return;

        try {
            // ATENÇÃO: Este é um NOVO ENDPOINT que seu backend precisa criar.
            // Ele deve ser um POST ou PATCH que seta "ativo = False" no relatório.
            await apiClient.post(`/prontuario/relatorios/${relatorioId}/arquivar/`);
            
            showSnackbar('Relatório arquivado com sucesso.', 'success');
            
            // Recarrega a lista (que agora virá filtrada do backend sem esse item)
            fetchSavedReports();

        } catch (error) {
            console.error("Erro ao arquivar relatório:", error);
            showSnackbar('Erro ao arquivar o relatório.', 'error');
        } finally {
            // Fecha o diálogo de confirmação
            setConfirmDeleteId(null);
        }
    };

    // Esta função apenas abre o diálogo
    const handleOpenConfirmDialog = (id) => {
        setConfirmDeleteId(id);
    };

    
    return (
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, borderColor: 'grey.400' }}>
            <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: 3 
            }}>

                {/* --- LADO ESQUERDO: ESTAÇÃO DE TRABALHO (Sem alterações) --- */}
                <Box sx={{ flex: { md: 2 }, width: '100%' }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                        Gerar Novo Relatório
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* Dropdown de Templates */}
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

                        {/* Botão Gerar */}
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleGerarPreview}
                            disabled={!selectedTemplateId || isLoadingPreview}
                        >
                            {isLoadingPreview ? <CircularProgress size={24} /> 
                                : (consultaAtualId ? 'Gerar Prévia (Usando Consulta Atual)' : 'Gerar Prévia (Sem Consulta)')
                            }
                        </Button>
                        
                        {!consultaAtualId ? (
                            <Typography variant="caption" color="warning.main" sx={{textAlign: 'center', mt: -1}}>
                                Consulta (SOAP) não salva nesta sessão. A prévia usará apenas dados do paciente.
                            </Typography>
                        ) : (
                             <Typography variant="caption" color="success.main" sx={{textAlign: 'center', mt: -1}}>
                                Consulta atual (SOAP) será incluída na prévia.
                            </Typography>
                        )}


                        {/* Editor de Texto */}
                        <TextField
                            label="Título do Relatório"
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value)}
                            size="small"
                            fullWidth
                        />
                        <TextField
                            label="Conteúdo do Relatório (Editável)"
                            value={editorContent}
                            onChange={(e) => setEditorContent(e.target.value)}
                            multiline
                            rows={15}
                            fullWidth
                            disabled={isLoadingPreview}
                        />

                        {/* Botão Salvar */}
                        <Button
                            variant="contained"
                            color="success"
                            onClick={handleSalvarRelatorio}
                            disabled={isSubmitting || !editorContent || !titulo}
                        >
                            {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Relatório'}
                        </Button>
                    </Paper>
                </Box>


                {/* --- LADO DIREITO: HISTÓRICO (COM A LIXEIRA) --- */}
                <Box sx={{ flex: { md: 1 }, width: '100%' }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                        Relatórios Salvos
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                        {isLoadingHistory ? <CircularProgress /> :
                         savedReports.length === 0 ? <Typography>Nenhum relatório salvo.</Typography> : (
                            <List dense>
                                {savedReports.map(report => (
                                    <React.Fragment key={report.id}>
                                        <ListItem
                                            // --- 4. ATUALIZAR O SECONDARY ACTION ---
                                            // Colocamos os dois botões dentro de um Box
                                            secondaryAction={
                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                    {/* Botão de PDF (igual ao de antes) */}
                                                    <Tooltip title="Gerar PDF">
                                                        <span>
                                                            <IconButton
                                                                edge="end"
                                                                aria-label="gerar pdf"
                                                                onClick={() => handleGerarPdf(report.id)}
                                                                disabled={pdfLoadingId === report.id}
                                                            >
                                                                {pdfLoadingId === report.id ? 
                                                                    <CircularProgress size={20} color="inherit" /> : 
                                                                    <PictureAsPdfIcon fontSize="small" />
                                                                }
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>

                                                    {/* Botão de Arquivar (Lixeira) */}
                                                    <Tooltip title="Arquivar Relatório">
                                                        <span>
                                                            <IconButton
                                                                edge="end"
                                                                aria-label="arquivar"
                                                                onClick={() => handleOpenConfirmDialog(report.id)}
                                                                disabled={pdfLoadingId === report.id} // Desabilita se o PDF estiver carregando
                                                            >
                                                                <DeleteIcon fontSize="small" color="error" />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                </Box>
                                            }
                                        >
                                            <ListItemText
                                                primary={report.titulo}
                                                secondary={`Em: ${new Date(report.data_criacao).toLocaleDateString()} por Dr(a) ${report.medico_nome}`}
                                            />
                                        </ListItem>
                                        <Divider component="li" />
                                    </React.Fragment>
                                ))}
                            </List>
                         )}
                    </Paper>
                </Box>
            </Box>

            {/* --- 5. ADICIONAR O DIÁLOGO DE CONFIRMAÇÃO NO FINAL --- */}
            <Dialog
                open={!!confirmDeleteId}
                onClose={() => setConfirmDeleteId(null)}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">
                    Arquivar Relatório?
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        Tem certeza que deseja arquivar este relatório? 
                        Ele será removido desta lista, mas permanecerá visível no 
                        histórico do sistema (Admin) para fins de auditoria.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
                    <Button onClick={handleArquivarRelatorio} color="error" autoFocus>
                        Sim, Arquivar
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}