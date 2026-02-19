import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, Button, 
  TextField, Box, Typography, List, ListItem, ListItemText, 
  Chip, Divider, IconButton, CircularProgress, Tabs, Tab,
  Switch, FormControlLabel, FormGroup, Grid, MenuItem
} from '@mui/material';
import { FaCheckCircle, FaTimes, FaSave, FaHistory, FaTasks, FaBullhorn } from 'react-icons/fa';
import apiClient from '../../api/axiosConfig';
import { crmService } from '../../services/crmService';

const DICAS_ACOES = [
  "Ligar para confirmar retorno",
  "Avisar que o laudo está pronto",
  "Ligar para remarcar (Falta)",
  "Pesquisa de Satisfação"
];

const ORIGENS = ['GOOGLE', 'INSTAGRAM', 'INDICACAO', 'MEDICO', 'CONVENIO', 'OUTRO'];
const PERFIS = ['TRANQUILA', 'INSEGURA', 'ANSIOSA', 'DECIDIDA', 'INDEFINIDO'];
const OBJECOES = ['PRECO', 'AGENDA', 'MEDICO', 'DISTANCIA', 'MEDO', 'OUTRO'];

export default function CicloDetalhesModal({ open, onClose, cicloId, onUpdate }) {
  const [loading, setLoading] = useState(true);
  const [detalhes, setDetalhes] = useState(null);
  const [novaAcaoDesc, setNovaAcaoDesc] = useState('');
  const [novaAcaoData, setNovaAcaoData] = useState(new Date().toISOString().split('T')[0]);
  const [dum, setDum] = useState('');
  const [tabIndex, setTabIndex] = useState(0);

  // --- NOVO ESTADO: COMPORTAMENTO E MARKETING ---
  const [comportamento, setComportamento] = useState({
    origem_aquisicao: '', segue_instagram: false, avaliou_google: false, indicou_outros: false,
    perfil_emocional: 'INDEFINIDO', principal_objecao: '', observacoes_internas: ''
  });

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

      // Puxa DUM
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
      
      // Carrega os dados de comportamento se existirem (AMARRANDO A PONTA SOLTA)
      if (dadosFinais.comportamento) {
          setComportamento({
              origem_aquisicao: dadosFinais.comportamento.origem_aquisicao || '',
              segue_instagram: dadosFinais.comportamento.segue_instagram || false,
              avaliou_google: dadosFinais.comportamento.avaliou_google || false,
              indicou_outros: dadosFinais.comportamento.indicou_outros || false,
              perfil_emocional: dadosFinais.comportamento.perfil_emocional || 'INDEFINIDO',
              principal_objecao: dadosFinais.comportamento.principal_objecao || '',
              observacoes_internas: dadosFinais.comportamento.observacoes_internas || ''
          });
      }

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

  // --- NOVA FUNÇÃO: SALVAR MARKETING E PERFIL ---
  const handleSalvarComportamento = async () => {
      setLoading(true);
      try {
          await crmService.updateCiclo(cicloId, { comportamento });
          await loadDetalhes();
          if (onUpdate) onUpdate();
      } catch (error) {
          alert("Erro ao salvar perfil da paciente.");
      } finally {
          setLoading(false);
      }
  };

  const handleChangeComportamento = (campo, valor) => {
      setComportamento(prev => ({ ...prev, [campo]: valor }));
  };

  const renderTimeline = () => {
    if (!detalhes) return null;
    let eventos = []; 

    if (detalhes.data_inicio) {
        eventos.push({ data: detalhes.data_inicio, tipo: 'info', texto: 'Paciente ingressou no Funil CRM' });
    }

    if (detalhes.agendamentos && Array.isArray(detalhes.agendamentos)) {
        detalhes.agendamentos.forEach(ag => {
            eventos.push({
                data: ag.data_hora_inicio,
                tipo: ag.status === 'Realizado' ? 'success' : (ag.status === 'Cancelado' || ag.status === 'Não Compareceu' ? 'error' : 'warning'),
                texto: `${ag.tipo_agendamento}: ${ag.procedimento_descricao || ag.especialidade_nome} (${ag.status})`
            });
        });
    }

    eventos.sort((a, b) => new Date(b.data) - new Date(a.data));

    return (
        <List sx={{ pt: 0 }}>
            {eventos.length === 0 && <Typography color="textSecondary">Nenhum evento histórico encontrado.</Typography>}
            {eventos.map((ev, idx) => (
                <ListItem key={idx} sx={{ borderLeft: `3px solid ${ev.tipo === 'success' ? '#4caf50' : ev.tipo === 'error' ? '#f44336' : '#2196f3'}`, mb: 1, bgcolor: '#f9f9f9', py: 0.5 }}>
                    <ListItemText 
                        primary={<Typography variant="body2" fontWeight="bold">{ev.texto}</Typography>} 
                        secondary={<Typography variant="caption">{new Date(ev.data).toLocaleString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</Typography>}
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
          <Typography variant="subtitle1" fontWeight="bold">{detalhes?.paciente_nome || 'Carregando...'}</Typography>
          <IconButton onClick={onClose} size="small"><FaTimes size={16}/></IconButton>
        </Box>
        <Tabs value={tabIndex} onChange={(e, val) => setTabIndex(val)} indicatorColor="primary" sx={{ minHeight: '36px' }}>
            <Tab icon={<FaTasks size={14}/>} iconPosition="start" label="Gestão" sx={{ minHeight: '36px', py: 0, fontSize: '0.8rem' }} />
            <Tab icon={<FaBullhorn size={14}/>} iconPosition="start" label="Perfil & Mkt" sx={{ minHeight: '36px', py: 0, fontSize: '0.8rem' }} />
            <Tab icon={<FaHistory size={14}/>} iconPosition="start" label="Histórico" sx={{ minHeight: '36px', py: 0, fontSize: '0.8rem' }} />
        </Tabs>
      </DialogTitle>
      
      <DialogContent dividers sx={{ minHeight: '400px', bgcolor: 'white', p: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
        ) : tabIndex === 0 ? (
          // ABA 1: GESTÃO (Mantida igual, com DUM e Tarefas)
          <>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Chip label={detalhes.fase_atual} color="primary" size="small" />
              <Chip label={detalhes.tipo} variant="outlined" size="small" />
            </Box>

            <Box sx={{ backgroundColor: '#e3f2fd', p: 1.5, borderRadius: 2, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1565c0', mb: 1 }}>
                    🤰 Calculadora Gestacional / DUM
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
                        <strong>Idade Atual calculada:</strong> {detalhes.idade_gestacional}
                    </Typography>
                )}
            </Box>

            <Divider sx={{ my: 1.5 }} />

            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: '#555' }}>🎯 Adicionar Próxima Ação</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                {DICAS_ACOES.map((dica, i) => (
                    <Chip key={i} label={`+ ${dica}`} size="small" variant="outlined" sx={{ fontSize: '0.65rem', cursor: 'pointer', '&:hover': {bgcolor: '#e3f2fd'} }} onClick={() => setNovaAcaoDesc(dica)} />
                ))}
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField fullWidth size="small" placeholder="Ou digite uma ação..." value={novaAcaoDesc} onChange={(e) => setNovaAcaoDesc(e.target.value)} />
              <TextField type="date" size="small" value={novaAcaoData} onChange={(e) => setNovaAcaoData(e.target.value)} sx={{ width: '150px' }} />
              <Button variant="contained" disableElevation onClick={handleSalvarAcao}>Agendar</Button>
            </Box>

            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: '#555' }}>Tarefas Pendentes</Typography>
            <List dense sx={{ bgcolor: '#f9f9f9', borderRadius: 2, border: '1px solid #eee', py: 0 }}>
              {detalhes.acoes && detalhes.acoes.filter(a => a.status === 'PENDENTE').map((acao) => (
                <ListItem key={acao.id} secondaryAction={ <IconButton size="small" onClick={() => handleConcluirAcao(acao.id)}><FaCheckCircle color="#4caf50" size={16}/></IconButton> }>
                  <ListItemText 
                    primary={<Typography sx={{ fontWeight: 'bold', color: '#333', fontSize: '0.8rem' }}>{acao.descricao}</Typography>}
                    secondary={<Typography sx={{ fontSize: '0.7rem' }}>Para: {new Date(acao.data_alvo + 'T00:00:00').toLocaleDateString('pt-BR')}</Typography>}
                  />
                </ListItem>
              ))}
              {detalhes.acoes?.filter(a => a.status === 'PENDENTE').length === 0 && (
                <Typography variant="body2" sx={{ p: 2, textAlign: 'center', color: '#999', fontSize: '0.8rem' }}>Tudo em dia!</Typography>
              )}
            </List>
          </>

        ) : tabIndex === 1 ? (
          // ABA 2: PERFIL & MARKETING (NOVA)
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            
            {/* Bloco de Origem e Engajamento */}
            <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#555', mb: 1.5 }}>Origem e Engajamento</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            select fullWidth size="small" label="Como conheceu a clínica?"
                            value={comportamento.origem_aquisicao}
                            onChange={(e) => handleChangeComportamento('origem_aquisicao', e.target.value)}
                        >
                            <MenuItem value="">Não informado</MenuItem>
                            {ORIGENS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormGroup sx={{ gap: 0 }}>
                            <FormControlLabel control={<Switch size="small" checked={comportamento.segue_instagram} onChange={(e) => handleChangeComportamento('segue_instagram', e.target.checked)} />} label={<Typography sx={{ fontSize: '0.8rem' }}>Segue no Instagram?</Typography>} />
                            <FormControlLabel control={<Switch size="small" checked={comportamento.avaliou_google} onChange={(e) => handleChangeComportamento('avaliou_google', e.target.checked)} />} label={<Typography sx={{ fontSize: '0.8rem' }}>Avaliou no Google?</Typography>} />
                            <FormControlLabel control={<Switch size="small" checked={comportamento.indicou_outros} onChange={(e) => handleChangeComportamento('indicou_outros', e.target.checked)} color="success" />} label={<Typography sx={{ fontSize: '0.8rem', fontWeight: comportamento.indicou_outros ? 'bold' : 'normal' }}>É uma Promotora? (Indicou alguém)</Typography>} />
                        </FormGroup>
                    </Grid>
                </Grid>
            </Box>

            <Divider />

            {/* Bloco de Perfil Comportamental (O resgate da ponta solta) */}
            <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#555', mb: 1.5 }}>Comportamento Clínico</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            select fullWidth size="small" label="Perfil Emocional"
                            value={comportamento.perfil_emocional}
                            onChange={(e) => handleChangeComportamento('perfil_emocional', e.target.value)}
                        >
                            {PERFIS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            select fullWidth size="small" label="Principal Objeção (Gargalo)"
                            value={comportamento.principal_objecao}
                            onChange={(e) => handleChangeComportamento('principal_objecao', e.target.value)}
                        >
                            <MenuItem value="">Nenhuma / Não mapeada</MenuItem>
                            {OBJECOES.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                        </TextField>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth multiline rows={2} size="small" label="Observações de Atendimento (Ex: Prefere ser chamada de Beta)"
                            value={comportamento.observacoes_internas}
                            onChange={(e) => handleChangeComportamento('observacoes_internas', e.target.value)}
                        />
                    </Grid>
                </Grid>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button variant="contained" disableElevation startIcon={<FaSave />} onClick={handleSalvarComportamento}>
                    Salvar Perfil
                </Button>
            </Box>
          </Box>
        ) : (
          // ABA 3: HISTÓRICO
          renderTimeline()
        )}
      </DialogContent>
    </Dialog>
  );
}