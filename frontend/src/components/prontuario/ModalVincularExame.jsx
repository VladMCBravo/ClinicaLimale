import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, Button, 
  List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Typography, CircularProgress 
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import apiClient from '../../api/axiosConfig';

export default function ModalVincularExame({ open, onClose, paciente, onSuccess }) {
  const [examesPendentes, setExamesPendentes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchPendentes();
    }
  }, [open]);

  const fetchPendentes = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/exames/pendentes/'); 
      // NOVO: Lê os dados corretamente mesmo se houver paginação
      const dados_seguros = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setExamesPendentes(dados_seguros);
    } catch (error) {
      console.error("Erro ao buscar pendentes", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVincular = async (exameId) => {
    try {
      // Chama a rota VincularPacienteView
      await apiClient.post(`/exames/${exameId}/vincular/`, {
        paciente_id: paciente.id
      });
      onSuccess(); // Avisa o pai para recarregar ou mostrar msg
      onClose();
    } catch (error) {
      alert("Erro ao vincular exame.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Vincular Exame a {paciente?.nome_completo}</DialogTitle>
      <DialogContent dividers>
        {loading ? <CircularProgress /> : (
          examesPendentes.length === 0 ? (
            <Typography>Nenhum exame pendente encontrado na "Caixa de Entrada".</Typography>
          ) : (
            <List>
              {examesPendentes.map((exame) => (
                <ListItem key={exame.id} divider>
                  <ListItemText 
                    primary={`Data: ${exame.data_exame}`} 
                    secondary={`Pasta original: ${exame.nome_paciente_pasta}`} 
                  />
                  <ListItemSecondaryAction>
                    <Button 
                      variant="contained" 
                      color="primary" 
                      size="small"
                      startIcon={<LinkIcon />}
                      onClick={() => handleVincular(exame.id)}
                    >
                      Vincular
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
      </DialogActions>
    </Dialog>
  );
}