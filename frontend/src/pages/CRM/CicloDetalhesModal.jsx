import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, Button, 
  TextField, Box, Typography, List, ListItem, ListItemText, 
  Chip, Divider, IconButton, CircularProgress 
} from '@mui/material';
import { FaCheckCircle, FaTimes, FaSave } from 'react-icons/fa';
import apiClient from '../../api/axiosConfig'; // <--- ADICIONE ISSO
import { crmService } from '../../services/crmService';

export default function CicloDetalhesModal({ open, onClose, cicloId, onUpdate }) {
  const [loading, setLoading] = useState(true);
  const [detalhes, setDetalhes] = useState(null);
  const [novaAcaoDesc, setNovaAcaoDesc] = useState('');
  const [novaAcaoData, setNovaAcaoData] = useState(new Date().toISOString().split('T')[0]);

  // State para DUM
  const [dum, setDum] = useState('');

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
      
      // Carrega a DUM se existir (formato YYYY-MM-DD)
      if (res.data.dum) {
        // Se vier YYYY-MM-DD (padrão Django Rest Framework), usa direto
        setDum(res.data.dum);
      } else if (res.data.data_dum) {
        // Se vier DD/MM/YYYY, converte
        if (res.data.data_dum.includes('/')) {
            setDum(res.data.data_dum.split('/').reverse().join('-'));
        } else {
            setDum(res.data.data_dum);
        }
      } else {
        setDum('');
      }
    } catch (error) {
        console.error("Erro ao carregar detalhes", error);
    } finally {
        setLoading(false);
    }
  }; // <--- FALTAVA FECHAR AQUI

  const handleSalvarDum = async () => {
    if (!dum) return alert("Selecione uma data para a DUM.");
    
    setLoading(true); 
    try {
      console.log(`Salvando DUM: ${dum}`);
      
      // 1. Tenta atualizar o CICLO (CRM)
      // Enviamos nos dois formatos de chave para garantir
      await crmService.updateCiclo(cicloId, { dum: dum, data_dum: dum });

      // 2. Tenta atualizar o PACIENTE DIRETAMENTE (A Fonte da Verdade)
      // Isso garante que se o CRM for apenas "leitura", o paciente seja atualizado
      if (detalhes && detalhes.paciente) {
          // O ID do paciente geralmente vem dentro de 'detalhes.paciente' (se for int) 
          // ou 'detalhes.paciente.id' (se for objeto). Vamos testar ambos.
          const pacienteId = typeof detalhes.paciente === 'object' ? detalhes.paciente.id : detalhes.paciente;
          
          if (pacienteId) {
              await apiClient.patch(`/pacientes/${pacienteId}/`, { dum: dum });
              console.log("Paciente atualizado diretamente via ID:", pacienteId);
          }
      }

      // 3. Recarrega tudo
      await loadDetalhes(); 
      if (onUpdate) onUpdate(); // Atualiza o Kanban (Card)
      
      alert("✅ DUM Salva com sucesso!");

    } catch (error) {
      console.error("Erro ao salvar DUM:", error);
      alert("Erro ao salvar. Verifique se a data é válida.");
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
  };

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
            {/* CABEÇALHO: Nome e DUM */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{detalhes.paciente_nome}</Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
                <Chip label={detalhes.fase_atual} color="primary" size="small" />
                {detalhes.receita_acumulada > 0 && (
                    <Typography variant="caption" sx={{ color: 'green', fontWeight: 'bold' }}>
                        R$ {detalhes.receita_acumulada}
                    </Typography>
                )}
              </Box>
            </Box>

            {/* BOX DE GESTÃO GESTACIONAL */}
            {detalhes.tipo === 'GESTACAO' && (
                <Box sx={{ backgroundColor: '#e3f2fd', p: 2, borderRadius: 2, mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1565c0', mb: 1 }}>
                        🤰 Calculadora Gestacional
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <TextField 
                            label="DUM (Data Última Menstruação)"
                            type="date" 
                            size="small"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={dum} 
                            onChange={(e) => setDum(e.target.value)}
                            sx={{ bgcolor: 'white' }}
                        />
                        <Button 
                            variant="contained" 
                            size="medium"
                            sx={{ minWidth: '40px', px: 2 }}
                            onClick={handleSalvarDum}
                        >
                            <FaSave />
                        </Button>
                    </Box>
                    {/* Se tiver idade gestacional calculada, mostra aqui */}
                    {detalhes.idade_gestacional && (
                        <Typography variant="body2" sx={{ mt: 1, color: '#0d47a1' }}>
                            <strong>Idade Atual:</strong> {detalhes.idade_gestacional}
                        </Typography>
                    )}
                </Box>
            )}

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