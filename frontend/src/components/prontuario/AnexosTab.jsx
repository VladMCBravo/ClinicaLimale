// src/components/prontuario/AnexosTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, CircularProgress, TextField, Typography, Paper,
    List, ListItem, ListItemText, ListItemAvatar, Avatar, IconButton
} from '@mui/material';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DownloadIcon from '@mui/icons-material/Download';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';

export default function AnexosTab({ pacienteId }) {
    const { showSnackbar } = useSnackbar();
    const [documentos, setDocumentos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    // --- CORREÇÃO: Adicionando 'titulo' ao estado do formulário ---
    const [selectedFile, setSelectedFile] = useState(null);
    const [titulo, setTitulo] = useState('');
    const [descricao, setDescricao] = useState('');

    const fetchDocumentos = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get(`/prontuario/pacientes/${pacienteId}/atestados/`);
            setDocumentos(response.data);
        } catch (error) {
            console.error("Erro ao buscar documentos:", error);
            showSnackbar('Erro ao carregar documentos.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [pacienteId, showSnackbar]);

    useEffect(() => {
        fetchDocumentos();
    }, [fetchDocumentos]);

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile) {
            showSnackbar('Por favor, selecione um arquivo.', 'warning');
            return;
        }
        setIsUploading(true);

        const formData = new FormData();
        formData.append('arquivo', selectedFile);
        formData.append('titulo', titulo); // <-- ADICIONADO AO FORMDATA
        formData.append('descricao', descricao);

        try {
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/atestados/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            showSnackbar('Documento enviado com sucesso!', 'success');
            setSelectedFile(null);
            setTitulo(''); // <-- LIMPA O CAMPO APÓS O ENVIO
            setDescricao('');
            fetchDocumentos();
        } catch (error) {
            console.error("Erro ao enviar documento:", error.response?.data);
            showSnackbar('Erro ao enviar documento.', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    if (isLoading) return <CircularProgress />;

     return (
        <Box>
            <Paper component="form" onSubmit={handleUpload} elevation={2} sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Anexar Novo Documento</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Button variant="outlined" component="label">
                        Selecionar Arquivo
                        <input type="file" hidden onChange={handleFileChange} />
                    </Button>
                    {selectedFile && <Typography variant="body2">{selectedFile.name}</Typography>}
                </Box>
                {/* --- CORREÇÃO: Adicionando o campo de Título ao formulário --- */}
                <TextField
                    label="Título do Arquivo"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    fullWidth
                    required
                    margin="normal"
                />
                <TextField
                    label="Descrição do Arquivo"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    fullWidth
                    margin="normal"
                />
                <Button type="submit" variant="contained" disabled={isUploading} sx={{mt: 1}}>
                    {isUploading ? <CircularProgress size={24} /> : 'Enviar'}
                </Button>
            </Paper>

            <Typography variant="h6" gutterBottom>Documentos Anexados</Typography>
            <List component={Paper}>
                {documentos.length > 0 ? (
                    documentos.map(doc => (
                        <ListItem key={doc.id} secondaryAction={
                            <IconButton edge="end" href={doc.arquivo} target="_blank" rel="noopener noreferrer">
                                <DownloadIcon />
                            </IconButton>
                        }>
                            <ListItemAvatar>
                                <Avatar><InsertDriveFileIcon /></Avatar>
                            </ListItemAvatar>
                            <ListItemText 
                                primary={doc.descricao} 
                                secondary={`Enviado por ${doc.enviado_por_nome} em ${new Date(doc.data_upload).toLocaleDateString('pt-BR')}`} 
                            />
                        </ListItem>
                    ))
                ) : (
                    <ListItem>
                        <ListItemText primary="Nenhum documento anexado para este paciente." />
                    </ListItem>
                )}
            </List>
        </Box>
    );
}