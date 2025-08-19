// src/components/prontuario/AnexosTab.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  Box, Button, CircularProgress, Paper, TextField, Typography,
  List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Link
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';

const formatarData = (dataString) => new Date(dataString).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const API_BASE_URL = 'http://127.0.0.1:8000';

export default function AnexosTab({ pacienteId }) {
  const [documentos, setDocumentos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { showSnackbar } = useSnackbar();

  // Estados para o formulário de upload
  const [titulo, setTitulo] = useState('');
  const [arquivo, setArquivo] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchDocumentos = useCallback(async () => {
    setIsLoading(true);
    const token = sessionStorage.getItem('authToken');
    try {
      const response = await fetch(`${API_BASE_URL}/api/pacientes/${pacienteId}/documentos/`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) throw new Error('Falha ao buscar documentos.');
      const data = await response.json();
      setDocumentos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [pacienteId]);

  useEffect(() => {
    fetchDocumentos();
  }, [fetchDocumentos]);

  const handleFileChange = (event) => {
    setArquivo(event.target.files[0]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!titulo || !arquivo) {
      showSnackbar('Por favor, preencha o título e selecione um arquivo.', 'warning');
      return;
    }

    setIsUploading(true);
    const token = sessionStorage.getItem('authToken');
    const formData = new FormData();
    formData.append('titulo', titulo);
    formData.append('arquivo', arquivo);

    try {
      const response = await fetch(`${API_BASE_URL}/api/pacientes/${pacienteId}/documentos/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` }, // Não defina Content-Type, o navegador faz isso por você com FormData
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(JSON.stringify(errData));
      }
      showSnackbar('Arquivo enviado com sucesso!', 'success');
      setTitulo('');
      setArquivo(null);
      document.getElementById('file-input').value = null; // Limpa o input de arquivo
      fetchDocumentos();
    } catch (err) {
      showSnackbar(`Erro ao enviar arquivo: ${err.message}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleDelete = async (docId) => {
    if (!window.confirm('Tem certeza que deseja deletar este anexo?')) return;
    
    const token = sessionStorage.getItem('authToken');
    try {
        await fetch(`${API_BASE_URL}/api/pacientes/${pacienteId}/documentos/${docId}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Token ${token}` },
        });
        showSnackbar('Documento deletado com sucesso.', 'success');
        fetchDocumentos();
    } catch (err) {
        showSnackbar('Falha ao deletar o documento.', 'error');
    }
  };


  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
  if (error) return <Typography color="error">Erro: {error}</Typography>;

  return (
    <Box>
      <Paper component="form" onSubmit={handleSubmit} sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Novo Anexo</Typography>
        <TextField
          label="Título do Documento"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          fullWidth
          required
          sx={{ mb: 2 }}
        />
        <Button
          component="label"
          variant="outlined"
          startIcon={<UploadFileIcon />}
          sx={{ mb: 2 }}
        >
          Selecionar Arquivo
          <input
            type="file"
            id="file-input"
            hidden
            onChange={handleFileChange}
          />
        </Button>
        {arquivo && <Typography sx={{ ml: 2, display: 'inline' }}>{arquivo.name}</Typography>}
        <LoadingButton
          type="submit"
          variant="contained"
          loading={isUploading}
          sx={{ display: 'block', mt: 1 }}
        >
          Enviar
        </LoadingButton>
      </Paper>

      <Typography variant="h6" gutterBottom>Histórico de Anexos</Typography>
      {documentos.length === 0 ? (
        <Typography>Nenhum documento anexado para este paciente.</Typography>
      ) : (
        <List component={Paper}>
          {documentos.map(doc => (
            <ListItem key={doc.id} divider>
              <ListItemText
                primary={
                  <Link href={`${API_BASE_URL}${doc.arquivo}`} target="_blank" rel="noopener noreferrer">
                    {doc.titulo}
                  </Link>
                }
                secondary={`Enviado em: ${formatarData(doc.data_upload)} por ${doc.enviado_por_nome || 'Usuário Deletado'}`}
              />
              <ListItemSecondaryAction>
                <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(doc.id)}>
                  <DeleteIcon color="error" />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}