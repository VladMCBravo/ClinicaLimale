import React, { useState, useEffect } from 'react';
import { 
  Drawer, Button, TextField, Box, Typography, List, ListItem, ListItemText, 
  Chip, Divider, IconButton, CircularProgress, Tabs, Tab,
  Switch, FormControlLabel, FormGroup, Grid, MenuItem, Paper
} from '@mui/material';
import { FaCheckCircle, FaTimes, FaSave, FaHistory, FaTasks, FaBullhorn } from 'react-icons/fa';
import apiClient from '../../api/axiosConfig';
import { crmService } from '../../services/crmService';

const ORIGENS = ['GOOGLE', 'INSTAGRAM', 'FACEBOOK', 'SITE', 'INDICAÇÃO', 'MÉDICO', 'CONVÊNIO', 'OUTRO'];
const OBJECOES = ['PRECO', 'FORMA_PAGAMENTO', 'AGENDA', 'LOCALIZACAO', 'CONVENIO', 'ATENDIMENTO', 'CURIOSIDADE', 'MEDICO', 'MEDO', 'OUTRO'];

export default function FichaPacienteDrawer({ open, onClose, cicloId, onUpdate }) {
  const [loading, setLoading] = useState(true);
  const [detalhes, setDetalhes] = useState(null);
  
  const [novaAcaoDesc, setNovaAcaoDesc] = useState('');
  const [novaAcaoData, setNovaAcaoData] = useState(new Date().toISOString().split('T')[0]);
  const [dum, setDum] = useState('');
  const [semanas, setSemanas] = useState('');
  const [dias, setDias] = useState('');
  const [dataRef, setDataRef] = useState(new Date().toISOString().split('T')[0]);
  
  const [tabIndex, setTabIndex] = useState(0);
  const [comportamento, setComportamento] = useState({
    origem_aquisicao: '', segue_instagram: false, avaliou_google: false, indicou_outros: false,
    principal_objecao: '', observacoes_internas: '', nivel_urgencia: '', exame_interesse: '', 
    motivo_exame: '', concorrencia_mencionada: '', medico_solicitante: '' 
  });

  useEffect(() => {
    if (open && cicloId) { setTabIndex(0); loadDetalhes(); }
  }, [open, cicloId]);

  const loadDetalhes = async () => {
    try {
      setLoading(true);
      const res = await crmService.getCicloDetalhe(cicloId);
      let dados = res.data;

      let pacienteId = dados.paciente?.id || dados.paciente || dados.paciente_id;
      if (pacienteId) {
          try {
              const pRes = await apiClient.get(`/pacientes/${pacienteId}/`);
              if (pRes.data.dum || pRes.data.data_dum) dados.dum = pRes.data.dum || pRes.data.data_dum;
          } catch (e) {}
      }

      setDetalhes(dados);
      setDum(dados.dum ? dados.dum.split('T')[0] : '');
      
      if (dados.comportamento) {
          setComportamento(prev => ({ ...prev, ...dados.comportamento }));
      }
    } catch (error) {
        console.error(error);
    } finally { setLoading(false); }
  };

  const executarSalvamentoDum = async (valorDum) => {
    if (!valorDum) return alert("Data inválida.");
    setLoading(true); 
    try {
      await crmService.updateCiclo(cicloId, { dum: valorDum });
      let pacienteId = detalhes?.paciente?.id || detalhes?.paciente;
      if (pacienteId) await apiClient.patch(`/pacientes/${pacienteId}/`, { dum: valorDum });
      await loadDetalhes(); 
      if (onUpdate) onUpdate(); 
    } catch (error) { alert("Erro ao salvar DUM."); } 
    finally { setLoading(false); }
  };

  const handleSalvarDum = () => executarSalvamentoDum(dum);

  const handleCalcularReversa = () => {
    if (!semanas || !dataRef) return alert("Preencha as semanas e a data.");
    const dateObj = new Date(dataRef + 'T12:00:00'); 
    const diasTotais = (parseInt(semanas) * 7) + (parseInt(dias || 0));
    dateObj.setDate(dateObj.getDate() - diasTotais);
    executarSalvamentoDum(dateObj.toISOString().split('T')[0]);
  };

  const handleSalvarAcao = async () => {
    if (!novaAcaoDesc) return;
    try {
      await crmService.addAcao({ ciclo: cicloId, descricao: novaAcaoDesc, data_alvo: novaAcaoData, status: 'PENDENTE' });
      setNovaAcaoDesc('');
      loadDetalhes(); if (onUpdate) onUpdate(); 
    } catch (error) { alert("Erro ao salvar ação"); }
  };

  const handleConcluirAcao = async (acaoId) => {
    try { await crmService.concluirAcao(acaoId); loadDetalhes(); if (onUpdate) onUpdate(); } 
    catch (e) {}
  };

  const handleSalvarComportamento = async () => {
      setLoading(true);
      try {
          await crmService.updateCiclo(cicloId, { comportamento });
          await loadDetalhes();
          if (onUpdate) onUpdate();
      } catch (error) { alert("Erro ao salvar perfil."); } 
      finally { setLoading(false); }
  };

  const handleChange = (campo, valor) => setComportamento(prev => ({ ...prev, [campo]: valor }));

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', md: '550px' }, bgcolor: '#f4f5f7' } }}>
      
      {/* HEADER DO DRAWER */}
      <Box sx={{ p: 2, bgcolor: 'white', borderBottom: '1px solid #e0e0e0', position: 'sticky', top: 0, zIndex: 10 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold" color="#1C2E4A">{detalhes?.paciente_nome || 'Carregando...'}</Typography>
          <IconButton onClick={onClose}><FaTimes /></IconButton>
        </Box>
        <Tabs value={tabIndex} onChange={(e, val) => setTabIndex(val)} indicatorColor="primary" variant="fullWidth">
            <Tab icon={<FaTasks size={14}/>} iconPosition="start" label="Clínico / Tarefas" sx={{ fontWeight: 'bold' }} />
            <Tab icon={<FaBullhorn size={14}/>} iconPosition="start" label="Perfil Comercial" sx={{ fontWeight: 'bold' }} />
        </Tabs>
      </Box>

      {/* CONTEÚDO DO DRAWER */}
      <Box sx={{ p: 2, overflowY: 'auto' }}>
        {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box> : 
        
        tabIndex === 0 ? (
          /* ================= ABA 1: CLÍNICA E TAREFAS ================= */
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #90caf9', bgcolor: '#e3f2fd' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1565c0', mb: 1.5 }}>🤰 Datação da Gestação</Typography>
                
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <TextField label="DUM Informada" type="date" variant="filled" size="small" fullWidth InputLabelProps={{ shrink: true }} value={dum} onChange={(e) => setDum(e.target.value)} sx={{ bgcolor: 'white', borderRadius: 1 }} />
                    <Button variant="contained" size="small" onClick={handleSalvarDum}>Salvar</Button>
                </Box>
                <Divider sx={{ my: 1.5, borderColor: '#bbdefb' }}><Typography variant="caption" sx={{ color: '#1976d2', fontWeight: 'bold' }}>CÁLCULO POR ULTRASSOM</Typography></Divider>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField label="Semanas" type="number" variant="filled" size="small" sx={{ width: '80px', bgcolor: 'white' }} value={semanas} onChange={(e) => setSemanas(e.target.value)} />
                    <TextField label="Dias" type="number" variant="filled" size="small" sx={{ width: '80px', bgcolor: 'white' }} value={dias} onChange={(e) => setDias(e.target.value)} />
                    <TextField label="Data do USG" type="date" variant="filled" size="small" fullWidth InputLabelProps={{ shrink: true }} value={dataRef} onChange={(e) => setDataRef(e.target.value)} sx={{ bgcolor: 'white' }} />
                    <Button variant="contained" color="secondary" size="small" onClick={handleCalcularReversa}>Calc</Button>
                </Box>
                {detalhes.idade_gestacional && (
                    <Typography variant="body2" sx={{ mt: 2, color: '#0d47a1', textAlign: 'center', p: 1, bgcolor: '#bbdefb', borderRadius: 1, fontWeight: 'bold' }}>
                        Idade Atual calculada: {detalhes.idade_gestacional}
                    </Typography>
                )}
            </Paper>

            <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: '#1C2E4A' }}>Próximas Tarefas (Follow-up)</Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField fullWidth variant="filled" size="small" placeholder="Ex: Ligar para confirmar..." value={novaAcaoDesc} onChange={(e) => setNovaAcaoDesc(e.target.value)} sx={{ borderRadius: 1 }} />
                  <TextField type="date" variant="filled" size="small" value={novaAcaoData} onChange={(e) => setNovaAcaoData(e.target.value)} sx={{ width: '150px' }} />
                  <Button variant="contained" disableElevation onClick={handleSalvarAcao}>Agendar</Button>
                </Box>
                <List dense sx={{ bgcolor: '#f9f9f9', borderRadius: 1, p: 0 }}>
                  {detalhes.acoes?.filter(a => a.status === 'PENDENTE').map((acao) => (
                    <ListItem key={acao.id} secondaryAction={ <IconButton onClick={() => handleConcluirAcao(acao.id)}><FaCheckCircle color="#4caf50" /></IconButton> } sx={{ borderBottom: '1px solid #eee' }}>
                      <ListItemText primary={<Typography fontWeight="bold" fontSize="0.85rem">{acao.descricao}</Typography>} secondary={`Para: ${new Date(acao.data_alvo + 'T00:00:00').toLocaleDateString('pt-BR')}`} />
                    </ListItem>
                  ))}
                </List>
            </Paper>
          </Box>
        ) : (
          /* ================= ABA 2: PERFIL E MARKETING ================= */
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1C2E4A', mb: 2 }}>Métricas de Atendimento (Para Estatística)</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <TextField select variant="filled" fullWidth size="small" label="Canal de Aquisição" value={comportamento.origem_aquisicao || ''} onChange={(e) => handleChange('origem_aquisicao', e.target.value)} InputProps={{ disableUnderline: true }}>
                            <MenuItem value="">Não informado</MenuItem>
                            {ORIGENS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField select variant="filled" fullWidth size="small" label="Por que NÃO agendou?" value={comportamento.principal_objecao || ''} onChange={(e) => handleChange('principal_objecao', e.target.value)} InputProps={{ disableUnderline: true }}>
                            <MenuItem value="">Nenhuma Objeção</MenuItem>
                            {OBJECOES.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                        </TextField>
                    </Grid>
                    
                    <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, color: '#555' }}>Engajamento Social</Typography>
                        <FormGroup sx={{ gap: 1 }}>
                            <FormControlLabel control={<Switch color="primary" checked={comportamento.segue_instagram} onChange={(e) => handleChange('segue_instagram', e.target.checked)} />} label={<Typography fontSize="0.9rem">Segue no Instagram?</Typography>} />
                            <FormControlLabel control={<Switch color="primary" checked={comportamento.avaliou_google} onChange={(e) => handleChange('avaliou_google', e.target.checked)} />} label={<Typography fontSize="0.9rem">Fez avaliação no Google Maps?</Typography>} />
                        </FormGroup>
                    </Grid>

                    <Grid item xs={12}>
                        <TextField variant="filled" fullWidth multiline rows={3} size="small" label="Observações Livres (Gostos, restrições, alertas)" value={comportamento.observacoes_internas || ''} onChange={(e) => handleChange('observacoes_internas', e.target.value)} InputProps={{ disableUnderline: true }} />
                    </Grid>
                </Grid>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button variant="contained" size="large" disableElevation startIcon={<FaSave />} onClick={handleSalvarComportamento} sx={{ bgcolor: '#1C2E4A' }}>Salvar Ficha</Button>
                </Box>
            </Paper>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}