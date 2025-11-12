// src/components/prontuario/cardiologia/RelatoriosTab.jsx

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Grid, Paper, Typography, FormControl, InputLabel, Select,
    MenuItem, Button, TextField, CircularProgress, List, ListItem,
    ListItemText, Divider,
    IconButton, Tooltip // 1. IMPORTE IconButton E Tooltip
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'; // 2. IMPORTE O ÍCONE
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

export default function RelatoriosTab({ pacienteId, consultaAtualId, especialidade }) {
    const { showSnackbar } = useSnackbar();
    
    // --- ESTADOS DE DADOS ---
    const [templates, setTemplates] = useState([]); 
    const [savedReports, setSavedReports] = useState([]);
    
    // --- ESTADOS DA "ESTAÇÃO DE TRABALHO" (Lado Esquerdo) ---
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [titulo, setTitulo] = useState(''); 
    const [editorContent, setEditorContent] = useState('');
    
    // --- ESTADOS DE LOADING ---
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // 3. ADICIONE O NOVO ESTADO DE LOADING DO PDF
    const [pdfLoadingId, setPdfLoadingId] = useState(null); 


    // ... (as funções fetchTemplates e fetchSavedReports continuam iguais) ...
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


    // ... (o useEffect continua igual) ...
    useEffect(() => {
        if (pacienteId && especialidade) {
            fetchTemplates();
            fetchSavedReports();
        }
        setSelectedTemplateId('');
        setTitulo('');
        setEditorContent('');
    }, [pacienteId, especialidade, fetchTemplates, fetchSavedReports]);

    // ... (o handleGerarPreview continua igual) ...
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

    // ... (o handleSalvarRelatorio continua igual) ...
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
    
    // 4. ADICIONE A NOVA FUNÇÃO PARA GERAR O PDF
    const handleGerarPdf = async (relatorioId) => {
        // Impede cliques duplos
        if (pdfLoadingId) return; 
        
        setPdfLoadingId(relatorioId); // Ativa o loading para este item
        
        try {
            // --- CORREÇÃO AQUI ---
            
            // ALTERE DE: (ERRADO)
            // const response = await apiClient.get(
            //     `/api/pdf/relatorio/${relatorioId}/`,
            //     { responseType: 'blob' }
            // );

            // PARA: (CORRETO - Remova o /api do início)
            const response = await apiClient.get(
                `/pdf/relatorio/${relatorioId}/`,
                { responseType: 'blob' }
            );

            // Cria e abre o PDF em uma nova aba
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
            setPdfLoadingId(null); // Desativa o loading
        }
    };

    
    // 5. ATUALIZE A RENDERIZAÇÃO
    return (
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, borderColor: 'grey.400' }}>
            <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: 3 
            }}>

                {/* --- LADO ESQUERDO: ESTAÇÃO DE TRABALHO --- */}
                {/* ... (Todo o Lado Esquerdo continua igual) ... */}
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
                            disabled={!selectedTemplateId || isLoadingPreview || !consultaAtualId}
                        >
                            {isLoadingPreview ? <CircularProgress size={24} /> : 'Gerar Prévia (Usando Consulta Atual)'}
                        </Button>
                        {!consultaAtualId && (
                            <Typography variant="caption" color="error" sx={{textAlign: 'center', mt: -1}}>
                                Salve a consulta atual (SOAP) antes de gerar um relatório.
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


                {/* --- LADO DIREITO: HISTÓRICO (COM A MUDANÇA) --- */}
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
                                            // Adiciona o botão de PDF no final do item
                                            secondaryAction={
                                                <Tooltip title="Gerar PDF">
                                                    <span>
                                                        <IconButton
                                                            edge="end"
                                                            aria-label="gerar pdf"
                                                            onClick={() => handleGerarPdf(report.id)}
                                                            // Desabilita se este PDF estiver carregando
                                                            disabled={pdfLoadingId === report.id}
                                                        >
                                                            {/* Mostra loading ou ícone */}
                                                            {pdfLoadingId === report.id ? 
                                                                <CircularProgress size={20} color="inherit" /> : 
                                                                <PictureAsPdfIcon fontSize="small" />
                                                            }
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
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
        </Paper>
    );
}