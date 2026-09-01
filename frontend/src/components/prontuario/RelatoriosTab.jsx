// src/components/prontuario/RelatoriosTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, FormControl, InputLabel, Select,
    MenuItem, Button, TextField, CircularProgress, List, ListItem,
    ListItemText, Divider, IconButton, Tooltip,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    Autocomplete, FormControlLabel, Checkbox
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit'; // <-- NOVO ÍCONE

// IMPORTAÇÕES DO REACT QUILL (EDITOR RICO)
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

// Lista rápida de exemplo
const listaCIDs = [
    { codigo: 'J03.9', descricao: 'Amigdalite aguda não especificada' },
    { codigo: 'J01.9', descricao: 'Sinusite aguda não especificada' },
    { codigo: 'I10', descricao: 'Hipertensão essencial (primária)' },
    { codigo: 'A09', descricao: 'Diarreia e gastroenterite de origem infecciosa presumível' },
    { codigo: 'N39.0', descricao: 'Infecção do trato urinário de localização não especificada' },
    { codigo: 'M54.5', descricao: 'Dor lombar baixa' },
    { codigo: 'Z11.3', descricao: 'Exame de rastreamento para infecções de transmissão predominantemente sexual' },
    { codigo: 'Z00.0', descricao: 'Exame médico geral (Check-up)' }
];

export default function RelatoriosTab({ pacienteId, consultaAtualId, especialidade }) {
    const { showSnackbar } = useSnackbar();
    
    const [templates, setTemplates] = useState([]); 
    const [savedReports, setSavedReports] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [titulo, setTitulo] = useState(''); 
    const [editorContent, setEditorContent] = useState('');
    const [cidSelecionado, setCidSelecionado] = useState(null);
    const [autorizouCid, setAutorizouCid] = useState(false);
    
    // NOVO ESTADO PARA CONTROLAR O MODAL DO EDITOR
    const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);

    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pdfLoadingId, setPdfLoadingId] = useState(null); 
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    const fetchTemplates = useCallback(async () => {
        setIsLoadingTemplates(true);
        try {
            const url = especialidade
                ? `/prontuario/templates/?especialidade=${especialidade}`
                : `/prontuario/templates/`;
            const res = await apiClient.get(url);
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
        if (pacienteId) {
            fetchTemplates();
            fetchSavedReports();
        }
        setSelectedTemplateId('');
        setTitulo('');
        setEditorContent('');
        setCidSelecionado(null);
        setAutorizouCid(false);
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
            
            // O backend deve retornar texto ou HTML (se já for HTML, o Quill lê perfeitamente)
            // Se vier texto com \n, podemos converter para <br> para o Quill entender inicialmentetemplateNome
            let conteudoPreenchido = res.data.conteudo_preenchido || '';
            // Substitui quebras de linha normais por tags <br> para o editor visual
            conteudoPreenchido = conteudoPreenchido.replace(/(?:\r\n|\r|\n)/g, '<br>');
            
            setEditorContent(conteudoPreenchido);
            const templateNome = templates.find(t => t.id === selectedTemplateId)?.titulo || 'Relatório';
            setTitulo(templateNome);
            
            // Abre o modal automaticamente ao gerar a prévia para o médico já editar
            setIsEditorModalOpen(true);
        } catch (err) {
            showSnackbar('Erro ao gerar prévia do relatório.', 'error');
        } finally {
            setIsLoadingPreview(false);
        }
    };

    const handleSalvarRelatorio = async () => {
        // Verifica se está vazio (o Quill vazio fica como '<p><br></p>')
        const isContentEmpty = !editorContent || editorContent === '<p><br></p>';
        
        if (!titulo || isContentEmpty) {
            showSnackbar('O título e o conteúdo do relatório não podem estar vazios.', 'warning');
            return;
        }
        setIsSubmitting(true);
        try {
            const safeTemplateId = parseInt(selectedTemplateId, 10);

            const payload = {
                titulo: titulo,
                conteudo_final: editorContent, // Agora enviamos HTML
                cid: cidSelecionado ? cidSelecionado.codigo : null,
                paciente_autorizou_cid: autorizouCid
            };

            if (!isNaN(safeTemplateId) && safeTemplateId > 0) {
                payload.template_origem = safeTemplateId;
            }

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

    // Configurações dos botões da barra de ferramentas do Quill
    const quillModules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }], // Títulos
            ['bold', 'italic', 'underline'], // Formatação básica
            [{ 'list': 'ordered'}, { 'list': 'bullet' }], // Listas
            [{ 'align': [] }], // Alinhamento
            ['clean'] // Limpar formatação
        ],
    };

    return (
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

                <Box sx={{ border: '1px solid #e0e0e0', p: 1.5, borderRadius: 1, bgcolor: '#fafafa' }}>
                    <Autocomplete
                        options={listaCIDs}
                        getOptionLabel={(option) => `${option.codigo} - ${option.descricao}`}
                        value={cidSelecionado}
                        onChange={(event, newValue) => setCidSelecionado(newValue)}
                        size="small"
                        renderInput={(params) => (
                            <TextField {...params} label="Diagnóstico / CID-10 (Opcional)" placeholder="Digite a doença..." />
                        )}
                        isOptionEqualToValue={(option, value) => option.codigo === value?.codigo}
                        clearOnEscape
                    />
                    <FormControlLabel
                        sx={{ mt: 0.5, '& .MuiFormControlLabel-label': { fontSize: '0.75rem', color: '#555' } }}
                        control={
                            <Checkbox 
                                size="small"
                                checked={autorizouCid} 
                                onChange={(e) => setAutorizouCid(e.target.checked)}
                                disabled={!cidSelecionado} 
                            />
                        }
                        label="Paciente autoriza impressão do CID (Res. CFM nº 1.658/2002)."
                    />
                </Box>
                
                {/* --- CAIXA QUE SUBSTITUI O ANTIGO TEXTFIELD --- */}
                <Box sx={{ 
                    border: '1px dashed #bdbdbd', 
                    borderRadius: 1, 
                    p: 2, 
                    textAlign: 'center', 
                    bgcolor: editorContent ? '#f0f7ff' : '#fafafa' 
                }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        {editorContent && editorContent !== '<p><br></p>' 
                            ? 'O texto está preenchido. Clique abaixo para visualizar ou editar.' 
                            : 'Nenhum texto. Clique abaixo para redigir o relatório.'}
                    </Typography>
                    <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<EditIcon />}
                        onClick={() => setIsEditorModalOpen(true)}
                        fullWidth
                        sx={{ bgcolor: 'white' }}
                    >
                        Redigir / Editar Texto
                    </Button>
                </Box>

                <Button
                    variant="contained"
                    color="success"
                    onClick={handleSalvarRelatorio}
                    disabled={isSubmitting || !titulo || (!editorContent || editorContent === '<p><br></p>')}
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

            {/* --- MODAL DO EDITOR REACT QUILL --- */}
            <Dialog 
                open={isEditorModalOpen} 
                onClose={() => setIsEditorModalOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: { height: '80vh', display: 'flex', flexDirection: 'column' } // Ocupa 80% da altura da tela
                }}
            >
                <DialogTitle sx={{ borderBottom: '1px solid #e0e0e0', bgcolor: '#f5f5f5' }}>
                    Editor de Relatório Médico
                </DialogTitle>
                <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    {/* CSS customizado para garantir que o Quill ocupe 100% da área do modal */}
                    <Box sx={{ 
                        flexGrow: 1, 
                        display: 'flex', 
                        flexDirection: 'column',
                        '& .quill': { display: 'flex', flexDirection: 'column', flexGrow: 1, height: '100%' },
                        '& .ql-container': { flexGrow: 1, overflowY: 'auto', fontSize: '1rem', fontFamily: 'inherit' },
                        '& .ql-toolbar': { bgcolor: 'white', position: 'sticky', top: 0, zIndex: 1 }
                    }}>
                        <ReactQuill
                            theme="snow"
                            value={editorContent}
                            onChange={setEditorContent}
                            modules={quillModules}
                            placeholder="Redija o relatório aqui..."
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ borderTop: '1px solid #e0e0e0', p: 2 }}>
                    <Button onClick={() => setIsEditorModalOpen(false)} color="inherit">
                        Fechar
                    </Button>
                    <Button onClick={() => setIsEditorModalOpen(false)} variant="contained" color="primary">
                        Concluir Edição
                    </Button>
                </DialogActions>
            </Dialog>

            {/* DIÁLOGO DE CONFIRMAÇÃO DE ARQUIVAMENTO */}
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