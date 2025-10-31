// src/components/prontuario/cardiologia/RelatoriosTab.jsx

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Grid, Paper, Typography, FormControl, InputLabel, Select,
    MenuItem, Button, TextField, CircularProgress, List, ListItem,
    ListItemText, Divider
} from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

export default function RelatoriosTab({ pacienteId, consultaAtualId, especialidade }) {
    const { showSnackbar } = useSnackbar();
    
    // --- ESTADOS DE DADOS ---
    const [templates, setTemplates] = useState([]); // Lista de templates (do dropdown)
    const [savedReports, setSavedReports] = useState([]); // Histórico de relatórios salvos
    
    // --- ESTADOS DA "ESTAÇÃO DE TRABALHO" (Lado Esquerdo) ---
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [titulo, setTitulo] = useState(''); // Título para salvar
    const [editorContent, setEditorContent] = useState(''); // O texto do relatório
    
    // --- ESTADOS DE LOADING ---
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 1. FUNÇÃO PARA BUSCAR OS TEMPLATES (Modelos)
    const fetchTemplates = useCallback(async () => {
        setIsLoadingTemplates(true);
        try {
            // Usamos o endpoint GERAL que criamos, filtrando pela especialidade
            const res = await apiClient.get(`/prontuario/templates/?especialidade=${especialidade}`);
            setTemplates(res.data);
        } catch (err) {
            showSnackbar('Erro ao carregar modelos de relatório.', 'error');
        } finally {
            setIsLoadingTemplates(false);
        }
    }, [especialidade, showSnackbar]);

    // 2. FUNÇÃO PARA BUSCAR O HISTÓRICO DE RELATÓRIOS SALVOS
    const fetchSavedReports = useCallback(async () => {
        setIsLoadingHistory(true);
        try {
            // Usamos o endpoint específico do paciente
            const res = await apiClient.get(`/prontuario/pacientes/${pacienteId}/relatorios/`);
            setSavedReports(res.data);
        } catch (err) {
            showSnackbar('Erro ao carregar histórico de relatórios.', 'error');
        } finally {
            setIsLoadingHistory(false);
        }
    }, [pacienteId, showSnackbar]);

    // 3. BUSCAR DADOS INICIAIS QUANDO O PACIENTE MUDAR
    useEffect(() => {
        if (pacienteId && especialidade) {
            fetchTemplates();
            fetchSavedReports();
        }
        // Limpar tudo ao trocar de paciente
        setSelectedTemplateId('');
        setTitulo('');
        setEditorContent('');
    }, [pacienteId, especialidade, fetchTemplates, fetchSavedReports]);

    // 4. HANDLER: GERAR PRÉVIA (A "MÁGICA")
    const handleGerarPreview = async () => {
        if (!selectedTemplateId) {
            showSnackbar('Selecione um modelo de relatório primeiro.', 'warning');
            return;
        }
        setIsLoadingPreview(true);
        try {
            const payload = {
                template_id: selectedTemplateId,
                // Envia o ID da consulta atual (SOAP) se ele existir!
                consulta_id: consultaAtualId || null 
            };
            const res = await apiClient.post(
                `/prontuario/pacientes/${pacienteId}/gerar-preview-relatorio/`,
                payload
            );
            
            // Preenche o editor com o texto do backend
            setEditorContent(res.data.conteudo_preenchido);
            
            // Sugere um título (ex: "Atestado de Atividade Física")
            const templateNome = templates.find(t => t.id === selectedTemplateId)?.titulo || 'Relatório';
            setTitulo(templateNome);

        } catch (err) {
            showSnackbar('Erro ao gerar prévia do relatório.', 'error');
        } finally {
            setIsLoadingPreview(false);
        }
    };

    // 5. HANDLER: SALVAR O RELATÓRIO
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
            // Limpa o editor e atualiza o histórico
            setEditorContent('');
            setTitulo('');
            setSelectedTemplateId('');
            fetchSavedReports(); // <-- Atualiza a lista da direita

        } catch (err) {
            showSnackbar('Erro ao salvar o relatório.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // 6. RENDERIZAÇÃO DO COMPONENTE
    return (
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, borderColor: 'grey.400' }}>
            <Grid container spacing={3}>

                {/* --- LADO ESQUERDO: ESTAÇÃO DE TRABALHO --- */}
                <Grid item xs={12} md={8}>
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
                </Grid>

                {/* --- LADO DIREITO: HISTÓRICO --- */}
                <Grid item xs={12} md={4}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                        Relatórios Salvos
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                        {isLoadingHistory ? <CircularProgress /> :
                         savedReports.length === 0 ? <Typography>Nenhum relatório salvo.</Typography> : (
                            <List dense>
                                {savedReports.map(report => (
                                    <React.Fragment key={report.id}>
                                        <ListItem>
                                            <ListItemText
                                                primary={report.titulo}
                                                secondary={`Em: ${new Date(report.data_criacao).toLocaleDateString()} por Dr(a) ${report.medico_nome}`}
                                            />
                                            {/* (Opcional) Adicionar botões de "Ver" ou "Imprimir" aqui */}
                                        </ListItem>
                                        <Divider component="li" />
                                    </React.Fragment>
                                ))}
                            </List>
                         )}
                    </Paper>
                </Grid>
            </Grid>
        </Paper>
    );
}