import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, Button, 
  TextField, Box, Typography, List, ListItem, ListItemText, 
  Chip, Divider, IconButton, CircularProgress 
} from '@mui/material';
import { FaCheckCircle, FaTimes } from 'react-icons/fa';
import { crmService } from '../../services/crmService';

export default function CicloDetalhesModal({ open, onClose, cicloId, onUpdate }) {
  const [loading, setLoading] = useState(true);
  const [detalhes, setDetalhes] = useState(null);
  const [novaAcaoDesc, setNovaAcaoDesc] = useState('');
  const [novaAcaoData, setNovaAcaoData] = useState(new Date().toISOString().split('T')[0]);

  // Carrega os dados completos quando abre o modal
  useEffect(() => {
    if (open && cicloId) {
      loadDetalhes();
    }
  }, [open, cicloId]);

  const loadDetalhes = async () => {
    try {
      setLoading(true);
      const res = await crmService.getCicloDetalhe(cicloId);
      setDetalhes(res.data);
    } catch (error) {
      console.error("Erro ao carregar detalhes", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarAcao = async () => {
    if (!novaAcaoDesc) return;
    try {
      await crmService.addAcao({
        ciclo: cicloId,
        descricao: novaAcaoDesc,
        data_alvo: novaAcaoData,
        status: 'PENDENTE'
      });
      setNovaAcaoDesc('');
      loadDetalhes(); // Recarrega a lista
      if (onUpdate) onUpdate(); // Atualiza o Kanban atrás
    } catch (error) {
      alert("Erro ao salvar ação");
    }
  };

  const handleConcluirAcao = async (acaoId) => {
    try {
      await crmService.concluirAcao(acaoId);
      loadDetalhes();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Erro ao concluir", error);
    }
  }

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Detalhes do Ciclo
        <IconButton onClick={onClose}><FaTimes /></IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
        ) : detalhes ? (
          <>
            {/* Cabeçalho do Paciente */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6">{detalhes.paciente_nome}</Typography>
              <Chip label={detalhes.fase_atual} color="primary" size="small" sx={{ mr: 1 }} />
              <Typography variant="caption" color="text.secondary">
                Receita Acumulada: R$ {detalhes.receita_acumulada}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Seção Próxima Ação */}
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
              🎯 Nova Próxima Ação
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
              <TextField 
                fullWidth size="small" 
                placeholder="Ex: Ligar para confirmar..."
                value={novaAcaoDesc}
                onChange={(e) => setNovaAcaoDesc(e.target.value)}
              />
              <TextField 
                type="date" size="small"
                value={novaAcaoData}
                onChange={(e) => setNovaAcaoData(e.target.value)}
              />
              <Button variant="contained" onClick={handleSalvarAcao}>Add</Button>
            </Box>

            {/* Lista de Ações */}
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Histórico de Ações</Typography>
            <List dense sx={{ bgcolor: '#f9f9f9', borderRadius: 1 }}>
              {detalhes.acoes && detalhes.acoes.map((acao) => (
                <ListItem key={acao.id}
                  secondaryAction={
                    acao.status === 'PENDENTE' && (
                      <IconButton edge="end" onClick={() => handleConcluirAcao(acao.id)}>
                        <FaCheckCircle color="green" />
                      </IconButton>
                    )
                  }
                >
                  <ListItemText 
                    primary={acao.descricao}
                    secondary={`Para: ${acao.data_alvo} - ${acao.status}`}
                    sx={{ textDecoration: acao.status === 'REALIZADA' ? 'line-through' : 'none' }}
                  />
                </ListItem>
              ))}
              {detalhes.acoes?.length === 0 && (
                <Typography variant="body2" sx={{ p: 2, textAlign: 'center', color: 'gray' }}>
                  Nenhuma ação registrada.
                </Typography>
              )}
            </List>
          </>
        ) : (
          <Typography>Erro ao carregar dados.</Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}