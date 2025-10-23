// Crie este arquivo em: src/components/prontuario/DocumentosTab.jsx

import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, CircularProgress, Paper, List, ListItem, ListItemText } from '@mui/material';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';

// Este componente é um placeholder, mas é funcional.
// Ele lista documentos e permite upload (você precisará ajustar o backend para o upload)

export default function DocumentosTab({ pacienteId }) {
    const [documentos, setDocumentos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showSnackbar } = useSnackbar();
    // const [file, setFile] = useState(null); // Descomente para habilitar upload

    useEffect(() => {
        if (pacienteId) {
            setIsLoading(true);
            apiClient.get(`/prontuario/pacientes/${pacienteId}/documentos/`)
                .then(res => setDocumentos(res.data))
                .catch(err => showSnackbar('Erro ao buscar documentos.', 'error'))
                .finally(() => setIsLoading(false));
        }
    }, [pacienteId, showSnackbar]);
    
    // Lógica de Upload (Exemplo)
    /*
    const handleFileChange = (e) => setFile(e.target.files[0]);
    const handleUpload = async () => {
        if (!file) return;
        const formData = new FormData();
        formData.append('arquivo', file);
        formData.append('titulo', file.name);
        
        setIsLoading(true);
        try {
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/documentos/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showSnackbar('Documento enviado!', 'success');
            // Recarregar a lista
        } catch (err) {
            showSnackbar('Erro ao enviar documento.', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    */

    return (
        <Box>
            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Anexar Novo Documento</Typography>
                <input type="file" disabled /> 
                {/* <input type="file" onChange={handleFileChange} /> */}
                <Button variant="contained" disabled>Enviar</Button>
                {/* <Button variant="contained" onClick={handleUpload} disabled={isLoading || !file}>Enviar</Button> */}
                <Typography variant="body2" sx={{mt: 1}}>*Upload temporariamente desabilitado.*</Typography>
            </Paper>

            <Typography variant="h6" gutterBottom>Documentos Anexados</Typography>
            {isLoading ? <CircularProgress /> : (
                <List>
                    {documentos.length > 0 ? documentos.map(doc => (
                        <ListItem key={doc.id} button component="a" href={doc.arquivo} target="_blank">
                            <ListItemText 
                                primary={doc.titulo} 
                                secondary={`Enviado em ${new Date(doc.data_upload).toLocaleDateString('pt-BR')} por ${doc.enviado_por_nome}`}
                            />
                        </ListItem>
                    )) : (
                        <Typography>Nenhum documento anexado.</Typography>
                    )}
                </List>
            )}
        </Box>
    );
}