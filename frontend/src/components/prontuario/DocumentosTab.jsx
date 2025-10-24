// src/components/prontuario/DocumentosTab.jsx - UPLOAD HABILITADO

import React, { useState, useEffect, useCallback } from 'react'; // Adicione useCallback
import {
    Box, Button, CircularProgress, TextField, Typography, Paper,
    List, ListItem, ListItemText, ListItemAvatar, Avatar, IconButton, Tooltip // Imports do Material UI
} from '@mui/material';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'; // Ícones
import DownloadIcon from '@mui/icons-material/Download';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';

export default function DocumentosTab({ pacienteId }) {
    const { showSnackbar } = useSnackbar();
    const [documentos, setDocumentos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false); // Estado para loading do upload

    // --- Estados para o formulário de upload ---
    const [selectedFile, setSelectedFile] = useState(null); // Arquivo selecionado
    const [titulo, setTitulo] = useState(''); // Título do arquivo

    // Função para buscar documentos (usando useCallback)
    const fetchDocumentos = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get(`/prontuario/pacientes/${pacienteId}/documentos/`);
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
    }, [fetchDocumentos]); // Dependência correta

    // Handler para mudança de arquivo
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        setSelectedFile(file);
        // Sugere um título baseado no nome do arquivo, mas permite edição
        if (file) {
            setTitulo(file.name.split('.').slice(0, -1).join('.') || file.name); 
        } else {
            setTitulo('');
        }
    };

    // Handler para o upload
    const handleUpload = async (e) => {
        e.preventDefault(); // Previne o reload da página
        if (!selectedFile) {
            showSnackbar('Por favor, selecione um arquivo.', 'warning');
            return;
        }
        setIsUploading(true);

        const formData = new FormData();
        formData.append('arquivo', selectedFile);
        formData.append('titulo', titulo); // Envia o título digitado

        try {
            // A URL deve bater com a do seu backend
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/documentos/`, formData, { 
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            showSnackbar('Documento enviado com sucesso!', 'success');
            // Limpa o formulário
            setSelectedFile(null);
            setTitulo(''); 
            // Limpa o input de arquivo (necessário para selecionar o mesmo arquivo novamente)
            const fileInput = document.getElementById(`file-input-${pacienteId}`); 
            if(fileInput) fileInput.value = '';
            // Recarrega a lista
            fetchDocumentos(); 
        } catch (error) {
            console.error("Erro ao enviar documento:", error.response?.data);
            showSnackbar(`Erro ao enviar documento: ${error.response?.data?.detail || error.message}`, 'error');
        } finally {
            setIsUploading(false);
        }
    };

    // Mostra loading inicial
    if (isLoading && documentos.length === 0) return <CircularProgress />;

     return (
        <Box>
            {/* --- Formulário de Upload HABILITADO --- */}
            <Paper component="form" onSubmit={handleUpload} elevation={2} sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Anexar Novo Documento</Typography>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                    {/* Botão para selecionar arquivo */}
                    <Button variant="outlined" component="label" sx={{ flexShrink: 0 }}>
                        Selecionar Arquivo
                        <input 
                            id={`file-input-${pacienteId}`} // ID único para resetar
                            type="file" 
                            hidden 
                            onChange={handleFileChange} 
                        />
                    </Button>
                    {/* Mostra o nome do arquivo selecionado */}
                    {selectedFile && <Typography variant="body2" sx={{ mt: 1 }}>{selectedFile.name}</Typography>}
                </Box>
                {/* Campo para o Título */}
                <TextField
                    label="Título do Arquivo"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    fullWidth
                    required // Título obrigatório
                    margin="dense" // Margem menor
                    size="small" // Tamanho menor
                    sx={{ mb: 2 }}
                />
                {/* Botão de Enviar */}
                <Button 
                    type="submit" 
                    variant="contained" 
                    disabled={isUploading || !selectedFile} // Desabilita se estiver enviando ou sem arquivo
                >
                    {isUploading ? <CircularProgress size={24} color="inherit"/> : 'Enviar'}
                </Button>
            </Paper>
            {/* --- Fim do Formulário --- */}


            {/* Lista de Documentos Anexados */}
            <Typography variant="h6" gutterBottom>Documentos Anexados</Typography>
            {isLoading ? <CircularProgress size={24}/> : ( // Loading menor para recarga
                <List component={Paper}>
                    {documentos.length > 0 ? (
                        documentos.map(doc => (
                            <ListItem 
                                key={doc.id} 
                                // Botão de download na direita
                                secondaryAction={ 
                                    <Tooltip title="Baixar Documento">
                                        <IconButton edge="end" href={doc.arquivo} target="_blank" rel="noopener noreferrer">
                                            <DownloadIcon />
                                        </IconButton>
                                    </Tooltip>
                                }
                                sx={{ borderBottom: '1px solid #eee' }} // Linha divisória
                            >
                                <ListItemAvatar>
                                    <Avatar><InsertDriveFileIcon /></Avatar>
                                </ListItemAvatar>
                                <ListItemText 
                                    primary={doc.titulo} // Usa o título salvo
                                    secondary={`Enviado por ${doc.enviado_por_nome || 'Usuário Desconhecido'} em ${new Date(doc.data_upload).toLocaleDateString('pt-BR')}`} 
                                />
                            </ListItem>
                        ))
                    ) : (
                        <ListItem>
                            <ListItemText primary="Nenhum documento anexado para este paciente." />
                        </ListItem>
                    )}
                </List>
            )}
        </Box>
    );
}