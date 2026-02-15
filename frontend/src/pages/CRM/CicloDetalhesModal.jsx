import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, Button, 
  TextField, Box, Typography, List, ListItem, ListItemText, 
  Chip, Divider, IconButton, CircularProgress 
} from '@mui/material';
import { FaCheckCircle, FaTimes, FaSave } from 'react-icons/fa';
import apiClient from '../../api/axiosConfig';
import { crmService } from '../../services/crmService';

export default function CicloDetalhesModal({ open, onClose, cicloId, onUpdate }) {
  const [loading, setLoading] = useState(true);
  const [detalhes, setDetalhes] = useState(null);
  const [novaAcaoDesc, setNovaAcaoDesc] = useState('');
  const [novaAcaoData, setNovaAcaoData] = useState(new Date().toISOString().split('T')[0]);
  const [dum, setDum] = useState('');

  useEffect(() => {
    if (open && cicloId) {
      loadDetalhes();
    }
  }, [open, cicloId]);

  const loadDetalhes = async () => {
    try {
      setLoading(true);
      const res = await crmService.getCicloDetalhe(cicloId);
      let dadosFinais = res.data;

      let pacienteId = dadosFinais.paciente?.id || dadosFinais.paciente || dadosFinais.paciente_id;

      if (pacienteId) {
          try {
              const pacienteRes = await apiClient.get(`/pacientes/${pacienteId}/`);
              const dumReal = pacienteRes.data.dum || pacienteRes.data.data_dum || pacienteRes.data.data_ultima_menstruacao;
              if (dumReal) dadosFinais.dum = dumReal;
          } catch (err) {
              console.warn("Erro ao buscar paciente auxiliar", err);
          }
      }

      setDetalhes(dadosFinais);
      
      let dataInput = '';
      if (dadosFinais.dum) {
        dataInput = dadosFinais.dum;
      } else if (dadosFinais.data_dum) {
        dataInput = dadosFinais.data_dum.includes('/') 
            ? dadosFinais.data_dum.split('/').reverse().join('-') 
            : dadosFinais.data_dum;
      }
      setDum(dataInput);

    } catch (error) {
        console.error("Erro ao carregar detalhes", error);
    } finally {
        setLoading(false);
    }
  };

  const handleSalvarDum = async () => {
    if (!dum) return alert("Selecione uma data para a DUM.");
    setLoading(true); 

    try {
      await crmService.updateCiclo(cicloId, { dum: dum, data_dum: dum });
      
      if (detalhes) {
          let pacienteId = detalhes.paciente?.id || detalhes.paciente || detalhes.paciente_id;
          if (pacienteId) {
              await apiClient.patch(`/pacientes/${pacienteId}/`, { dum: dum });
          }
      }

      await loadDetalhes(); 
      if (onUpdate) onUpdate(); 
      
    } catch (error) {
      alert("Erro ao salvar. Verifique a conexão.");
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
      loadDetalhes(); 
      if (onUpdate) onUpdate(); 
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
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f4f5f7' }}>
        <Typography variant="h6" fontWeight="bold">Ficha de Acompanhamento</Typography>
        <IconButton onClick={onClose}><FaTimes /></IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
        ) : detalhes ? (
          <>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#333' }}>{detalhes.paciente_nome}</Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
                <Chip label={detalhes.fase_atual} color="primary" size="small" />
                <Chip label={detalhes.tipo} variant="outlined" size="small" />
              </Box>
            </Box>

            {detalhes.tipo === 'GESTACAO' && (
                <Box sx={{ backgroundColor: '#e3f2fd', p: 2, borderRadius: 2, mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1565c0', mb: 1 }}>
                        🤰 Calculadora Gestacional
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <TextField 
                            label="DUM (Data Última Menstruação)" type="date" size="small" fullWidth
                            InputLabelProps={{ shrink: true }} value={dum} onChange={(e) => setDum(e.target.value)}
                            sx={{ bgcolor: 'white' }}
                        />
                        <Button variant="contained" size="medium" sx={{ minWidth: '40px', px: 2 }} onClick={handleSalvarDum}>
                            <FaSave />
                        </Button>
                    </Box>
                    {detalhes.idade_gestacional && (
                        <Typography variant="body2" sx={{ mt: 1, color: '#0d47a1' }}>
                            <strong>Idade Atual:</strong> {detalhes.idade_gestacional}
                        </Typography>
                    )}
                </Box>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: '#555' }}>
              🎯 Adicionar Próxima Ação
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
              <TextField 
                fullWidth size="small" placeholder="Ex: Ligar para agendar retorno..."
                value={novaAcaoDesc} onChange={(e) => setNovaAcaoDesc(e.target.value)}
              />
              <TextField 
                type="date" size="small" value={novaAcaoData} onChange={(e) => setNovaAcaoData(e.target.value)}
              />
              <Button variant="contained" disableElevation onClick={handleSalvarAcao}>Salvar</Button>
            </Box>

            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: '#555' }}>Histórico de Atendimento</Typography>
            <List dense sx={{ bgcolor: '#f9f9f9', borderRadius: 2, border: '1px solid #eee' }}>
              {detalhes.acoes && detalhes.acoes.map((acao) => (
                <ListItem key={acao.id}
                  secondaryAction={
                    acao.status === 'PENDENTE' && (
                      <IconButton edge="end" onClick={() => handleConcluirAcao(acao.id)}>
                        <FaCheckCircle color="#4caf50" />
                      </IconButton>
                    )
                  }
                >
                  <ListItemText 
                    primary={<Typography sx={{ fontWeight: acao.status === 'PENDENTE' ? 'bold' : 'normal', color: '#333', fontSize: '0.9rem' }}>{acao.descricao}</Typography>}
                    secondary={`Agendado para: ${new Date(acao.data_alvo + 'T00:00:00').toLocaleDateString('pt-BR')} - ${acao.status}`}
                    sx={{ textDecoration: acao.status === 'REALIZADA' ? 'line-through' : 'none', opacity: acao.status === 'REALIZADA' ? 0.6 : 1 }}
                  />
                </ListItem>
              ))}
              {detalhes.acoes?.length === 0 && (
                <Typography variant="body2" sx={{ p: 2, textAlign: 'center', color: '#999' }}>
                  Nenhuma ação registrada neste ciclo.
                </Typography>
              )}
            </List>
          </>
        ) : (
          <Typography sx={{p: 3}}>Nenhum dado encontrado.</Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}