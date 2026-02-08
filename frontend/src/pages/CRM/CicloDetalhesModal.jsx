import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, Button, 
  TextField, Box, Typography, List, ListItem, ListItemText, 
  Chip, Divider, IconButton, CircularProgress 
} from '@mui/material';
import { FaCheckCircle, FaTimes, FaSave } from 'react-icons/fa';
import apiClient from '../../api/axiosConfig'; // Importante
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
    console.log("🔍 [DEBUG] Iniciando loadDetalhes para Ciclo ID:", cicloId);
    try {
      setLoading(true);
      
      // 1. Busca dados do Ciclo (CRM)
      const res = await crmService.getCicloDetalhe(cicloId);
      let dadosFinais = res.data;
      
      // 2. IDENTIFICA O PACIENTE E BUSCA A DATA REAL (FONTE DA VERDADE)
      let pacienteId = null;
      if (dadosFinais.paciente && typeof dadosFinais.paciente === 'object') {
          pacienteId = dadosFinais.paciente.id;
      } else if (dadosFinais.paciente) {
          pacienteId = dadosFinais.paciente;
      } else if (dadosFinais.paciente_id) {
          pacienteId = dadosFinais.paciente_id;
      }

      if (pacienteId) {
          try {
              // Busca o cadastro fresco do paciente
              const pacienteRes = await apiClient.get(`/pacientes/${pacienteId}/`);
              console.log("🏥 [DEBUG] DUM Real do Paciente (Banco):", pacienteRes.data.dum);
              
              // Se o paciente tem DUM, usamos ela (ignora a do Ciclo que pode estar velha)
              if (pacienteRes.data.dum) {
                  dadosFinais.dum = pacienteRes.data.dum;
              }
          } catch (err) {
              console.warn("⚠️ Não foi possível confirmar a DUM no cadastro do paciente.", err);
          }
      }

      console.log("📦 [DEBUG] Dados Finais para Tela:", dadosFinais);
      setDetalhes(dadosFinais);
      
      // Processa a data para o input (YYYY-MM-DD)
      let dataInput = '';
      if (dadosFinais.dum) {
        dataInput = dadosFinais.dum;
      } else if (dadosFinais.data_dum) {
        if (dadosFinais.data_dum.includes('/')) {
            dataInput = dadosFinais.data_dum.split('/').reverse().join('-');
        } else {
            dataInput = dadosFinais.data_dum;
        }
      }
      
      setDum(dataInput);

    } catch (error) {
        console.error("❌ [DEBUG] Erro ao carregar detalhes", error);
    } finally {
        setLoading(false);
    }
  };

  const handleSalvarDum = async () => {
    if (!dum) return alert("Selecione uma data para a DUM.");
    
    console.log("💾 [DEBUG] Botão Salvar Clicado. Data:", dum);
    setLoading(true); 

    try {
      // 1. Tenta atualizar o CICLO
      console.log("🚀 [DEBUG] Enviando PATCH para o Ciclo...");
      await crmService.updateCiclo(cicloId, { dum: dum, data_dum: dum });
      console.log("✅ [DEBUG] Ciclo atualizado com sucesso.");

      // 2. Tenta atualizar o PACIENTE DIRETAMENTE
      console.log("🕵️ [DEBUG] Tentando identificar Paciente ID em:", detalhes);
      
      if (detalhes) {
          // Tenta achar o ID em vários lugares possíveis
          let pacienteId = null;
          
          if (detalhes.paciente && typeof detalhes.paciente === 'object') {
              pacienteId = detalhes.paciente.id;
              console.log("👉 [DEBUG] ID achado em detalhes.paciente.id:", pacienteId);
          } else if (detalhes.paciente) {
              pacienteId = detalhes.paciente;
              console.log("👉 [DEBUG] ID achado em detalhes.paciente (direto):", pacienteId);
          } else if (detalhes.paciente_id) {
              pacienteId = detalhes.paciente_id;
              console.log("👉 [DEBUG] ID achado em detalhes.paciente_id:", pacienteId);
          }

          if (pacienteId) {
              console.log(`🚀 [DEBUG] Enviando PATCH para Paciente ID ${pacienteId}...`);
              await apiClient.patch(`/pacientes/${pacienteId}/`, { dum: dum });
              console.log("✅ [DEBUG] Paciente atualizado com sucesso via API direta.");
          } else {
              console.warn("⚠️ [DEBUG] NÃO FOI POSSÍVEL IDENTIFICAR O ID DO PACIENTE. A atualização direta falhou.");
              alert("Atenção: Não consegui vincular ao cadastro do paciente. O ID não foi encontrado.");
          }
      }

      // 3. Recarrega tudo
      await loadDetalhes(); 
      if (onUpdate) onUpdate(); 
      
      alert("✅ DUM Salva!");

    } catch (error) {
      console.error("❌ [DEBUG] Erro CRÍTICO ao salvar DUM:", error);
      alert("Erro ao salvar. Veja o console (F12).");
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
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Detalhes do Ciclo (DEBUG MODE)
        <IconButton onClick={onClose}><FaTimes /></IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
        ) : detalhes ? (
          <>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{detalhes.paciente_nome}</Typography>
              <Typography variant="caption" sx={{color:'red'}}>DEBUG: Paciente ID: {JSON.stringify(detalhes.paciente)}</Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
                <Chip label={detalhes.fase_atual} color="primary" size="small" />
              </Box>
            </Box>

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
                    {detalhes.idade_gestacional && (
                        <Typography variant="body2" sx={{ mt: 1, color: '#0d47a1' }}>
                            <strong>Idade Atual:</strong> {detalhes.idade_gestacional}
                        </Typography>
                    )}
                </Box>
            )}

            <Divider sx={{ my: 2 }} />

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