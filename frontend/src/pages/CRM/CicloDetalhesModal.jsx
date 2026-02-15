import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, Button, 
  TextField, Box, Typography, List, ListItem, ListItemText, 
  Chip, Divider, IconButton, CircularProgress, Tabs, Tab
} from '@mui/material';
import { FaCheckCircle, FaTimes, FaSave, FaHistory, FaTasks } from 'react-icons/fa';
import apiClient from '../../api/axiosConfig';
import { crmService } from '../../services/crmService';

const DICAS_ACOES = [
  "Ligar para confirmar retorno",
  "Avisar que o laudo está pronto",
  "Ligar para remarcar (Falta)",
  "Pesquisa de Satisfação"
];

export default function CicloDetalhesModal({ open, onClose, cicloId, onUpdate }) {
  const [loading, setLoading] = useState(true);
  const [detalhes, setDetalhes] = useState(null);
  const [novaAcaoDesc, setNovaAcaoDesc] = useState('');
  const [novaAcaoData, setNovaAcaoData] = useState(new Date().toISOString().split('T')[0]);
  const [dum, setDum] = useState('');
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    if (open && cicloId) {
      setTabIndex(0);
      loadDetalhes();
    }
  }, [open, cicloId]);

  const loadDetalhes = async () => {
    try {
      setLoading(true);
      const res = await crmService.getCicloDetalhe(cicloId);
      let dadosFinais = res.data;

      // Puxa DUM extra se precisar
      let pacienteId = dadosFinais.paciente?.id || dadosFinais.paciente || dadosFinais.paciente_id;
      if (pacienteId) {
          try {
              const pacienteRes = await apiClient.get(`/pacientes/${pacienteId}/`);
              const dumReal = pacienteRes.data.dum || pacienteRes.data.data_dum;
              if (dumReal) dadosFinais.dum = dumReal;
          } catch (err) { console.warn("Erro ao buscar paciente", err); }
      }

      setDetalhes(dadosFinais);
      setDum(dadosFinais.dum ? dadosFinais.dum.split('T')[0] : '');

    } catch (error) {
        console.error("Erro ao carregar", error);
    } finally {
        setLoading(false);
    }
  };

  const handleSalvarDum = async () => {
    if (!dum) return alert("Selecione uma data para a DUM.");
    setLoading(true); 
    try {
      await crmService.updateCiclo(cicloId, { dum: dum });
      let pacienteId = detalhes.paciente?.id || detalhes.paciente;
      if (pacienteId) await apiClient.patch(`/pacientes/${pacienteId}/`, { dum: dum });
      
      await loadDetalhes(); 
      if (onUpdate) onUpdate(); 
    } catch (error) { alert("Erro ao salvar DUM."); } 
    finally { setLoading(false); }
  };

  const handleSalvarAcao = async () => {
    if (!novaAcaoDesc) return;
    try {
      await crmService.addAcao({
        ciclo: cicloId, descricao: novaAcaoDesc, data_alvo: novaAcaoData, status: 'PENDENTE'
      });
      setNovaAcaoDesc('');
      loadDetalhes(); 
      if (onUpdate) onUpdate(); 
    } catch (error) { alert("Erro ao salvar ação"); }
  };

  const handleConcluirAcao = async (acaoId) => {
    try {
      await crmService.concluirAcao(acaoId);
      loadDetalhes();
      if (onUpdate) onUpdate();
    } catch (error) { console.error("Erro", error); }
  };

  // --- CONSTRUTOR DE LINHA DO TEMPO INTELIGENTE ---
  const renderTimeline = () => {
    if (!detalhes) return null;
    let eventos = [];

    // Adiciona o Cadastro do Ciclo
    if (detalhes.data_inicio) {
        eventos.append({ data: detalhes.data_inicio, tipo: 'info', texto: 'Paciente ingressou no Funil CRM' });
    }

    // Puxa do backend os Agendamentos que já vêm em detalhes.agendamentos (Conforme serializers.py)
    if (detalhes.agendamentos && Array.isArray(detalhes.agendamentos)) {
        detalhes.agendamentos.forEach(ag => {
            eventos.push({
                data: ag.data_hora_inicio,
                tipo: ag.status === 'Realizado' ? 'success' : (ag.status === 'Cancelado' || ag.status === 'Não Compareceu' ? 'error' : 'warning'),
                texto: `${ag.tipo_agendamento}: ${ag.procedimento_descricao || ag.especialidade_nome} (${ag.status})`
            });
        });
    }

    // Ordena do mais recente para o mais antigo
    eventos.sort((a, b) => new Date(b.data) - new Date(a.data));

    return (
        <List sx={{ pt: 0 }}>
            {eventos.length === 0 && <Typography color="textSecondary">Nenhum evento histórico encontrado.</Typography>}
            {eventos.map((ev, idx) => (
                <ListItem key={idx} sx={{ borderLeft: `3px solid ${ev.tipo === 'success' ? '#4caf50' : ev.tipo === 'error' ? '#f44336' : '#2196f3'}`, mb: 1, bgcolor: '#f9f9f9' }}>
                    <ListItemText 
                        primary={ev.texto} 
                        secondary={new Date(ev.data).toLocaleString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'})}
                    />
                </ListItem>
            ))}
        </List>
    );
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: '#f4f5f7', pb: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" fontWeight="bold">{detalhes?.paciente_nome || 'Carregando...'}</Typography>
          <IconButton onClick={onClose} size="small"><FaTimes /></IconButton>
        </Box>
        <Tabs value={tabIndex} onChange={(e, val) => setTabIndex(val)} indicatorColor="primary">
            <Tab icon={<FaTasks />} iconPosition="start" label="Gestão & Ações" />
            <Tab icon={<FaHistory />} iconPosition="start" label="Linha do Tempo" />
        </Tabs>
      </DialogTitle>
      
      <DialogContent dividers sx={{ minHeight: '400px', bgcolor: 'white' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
        ) : tabIndex === 0 ? (
          <>
            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
              <Chip label={detalhes.fase_atual} color="primary" />
              <Chip label={detalhes.tipo} variant="outlined" />
            </Box>

            {/* DUM E GESTAÇÃO */}
            {(detalhes.tipo === 'GESTACAO' || detalhes.tipo === 'OBSTETRÍCIA') && (
                <Box sx={{ backgroundColor: '#fff3e0', p: 2, borderRadius: 2, mb: 3, border: '1px solid #ffe0b2' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#e65100', mb: 1 }}>
                        🤰 Calculadora Gestacional
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <TextField 
                            label="DUM (Última Menstruação)" type="date" size="small" fullWidth
                            InputLabelProps={{ shrink: true }} value={dum} onChange={(e) => setDum(e.target.value)}
                            sx={{ bgcolor: 'white' }}
                        />
                        <Button variant="contained" color="warning" disableElevation onClick={handleSalvarDum}>Salvar</Button>
                    </Box>
                    {detalhes.idade_gestacional && (
                        <Typography variant="body1" sx={{ mt: 2, color: '#d84315', fontWeight: 'bold', textAlign: 'center', p: 1, bgcolor: '#ffe0b2', borderRadius: 1 }}>
                            Idade Atual: {detalhes.idade_gestacional}
                        </Typography>
                    )}
                </Box>
            )}

            <Divider sx={{ my: 2 }} />

            {/* AÇÕES E DICAS */}
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: '#555' }}>
              🎯 Adicionar Próxima Ação
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {DICAS_ACOES.map((dica, i) => (
                    <Chip key={i} label={`+ ${dica}`} size="small" variant="outlined" sx={{ cursor: 'pointer', '&:hover': {bgcolor: '#e3f2fd'} }} onClick={() => setNovaAcaoDesc(dica)} />
                ))}
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
              <TextField 
                fullWidth size="small" placeholder="Ou digite uma ação customizada..."
                value={novaAcaoDesc} onChange={(e) => setNovaAcaoDesc(e.target.value)}
              />
              <TextField 
                type="date" size="small" value={novaAcaoData} onChange={(e) => setNovaAcaoData(e.target.value)}
              />
              <Button variant="contained" disableElevation onClick={handleSalvarAcao}>Agendar</Button>
            </Box>

            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: '#555' }}>Tarefas Pendentes</Typography>
            <List dense sx={{ bgcolor: '#f9f9f9', borderRadius: 2, border: '1px solid #eee' }}>
              {detalhes.acoes && detalhes.acoes.filter(a => a.status === 'PENDENTE').map((acao) => (
                <ListItem key={acao.id} secondaryAction={ <IconButton onClick={() => handleConcluirAcao(acao.id)}><FaCheckCircle color="#4caf50" /></IconButton> }>
                  <ListItemText 
                    primary={<Typography sx={{ fontWeight: 'bold', color: '#333', fontSize: '0.9rem' }}>{acao.descricao}</Typography>}
                    secondary={`Para: ${new Date(acao.data_alvo + 'T00:00:00').toLocaleDateString('pt-BR')}`}
                  />
                </ListItem>
              ))}
              {detalhes.acoes?.filter(a => a.status === 'PENDENTE').length === 0 && (
                <Typography variant="body2" sx={{ p: 2, textAlign: 'center', color: '#999' }}>Tudo em dia! Nenhuma tarefa pendente.</Typography>
              )}
            </List>
          </>
        ) : (
            renderTimeline()
        )}
      </DialogContent>
    </Dialog>
  );
}