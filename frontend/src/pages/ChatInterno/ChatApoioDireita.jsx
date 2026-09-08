import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, Typography, IconButton, TextField, Button, 
  CircularProgress, Tabs, Tab, Paper, MenuItem, Select, FormControl, Dialog, List, Tooltip, Chip
} from '@mui/material';
import { Close as CloseIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';

import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MeetingRoomOutlinedIcon from '@mui/icons-material/MeetingRoomOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import MedicalInformationIcon from '@mui/icons-material/MedicalInformation';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';

import apiClient from '../../api/axiosConfig';
import PacienteModal from '../../components/PacienteModal'; 

// Importa sua lógica de semáforo e formatação de horas
import { calcularStatusSemaforo } from '../../utils/semaforoAgendamento';
import { formatarHoraTZ } from '../../utils/format';

export default function ChatApoioDireita({ 
  onClose, onEnviarAgendamento, onEnviarPaciente, onEnviarDocumento, width = '25%', tabExterna = null 
}) {
  const [abaDireita, setAbaDireita] = useState(0);
  const [loadingApoio, setLoadingApoio] = useState(false);

  // Sincroniza a aba se for controlada externamente (ex: Pelo Clipe no Mobile)
  useEffect(() => {
    if (tabExterna !== null) setAbaDireita(tabExterna);
  }, [tabExterna]);
  
  // --- ESTADOS DA AGENDA E SEMÁFORO ---
  const [agendamentos, setAgendamentos] = useState([]);
  const [dataAgenda, setDataAgenda] = useState(() => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  });
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [now, setNow] = useState(new Date());

  // Ticker: Atualiza o estado "now" a cada 30 segundos (Igual ao seu PacientesDoDiaSidebar)
  useEffect(() => {
      const interval = setInterval(() => setNow(new Date()), 30000);
      return () => clearInterval(interval);
  }, []);

  // --- ESTADOS DOS PACIENTES ---
  const [termoBusca, setTermoBusca] = useState('');
  const [resultadosBusca, setResultadosBusca] = useState([]);
  
  // --- ESTADOS DO MODAL DE EDIÇÃO ---
  const [modalPacienteOpen, setModalPacienteOpen] = useState(false);
  const [pacienteEditando, setPacienteEditando] = useState(null);

  // --- ESTADOS DE DOCUMENTOS ---
  const [modalDocsOpen, setModalDocsOpen] = useState(false);
  const [pacienteDocs, setPacienteDocs] = useState(null);
  const [listaDocs, setListaDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const buscarAgendamentos = useCallback(() => {
    setLoadingApoio(true);
    apiClient.get(`/agendamentos/hoje/?data=${dataAgenda}`)
      .then(res => {
        const data = res.data;
        const arrayAgendamentos = Array.isArray(data) ? data : (data.results || []);
        
        // Agrupamento para não repetir paciente no mesmo horário (Lógica copiada do seu Sidebar)
        const agrupadosMap = new Map();
        arrayAgendamentos.forEach(ag => {
            const chave = `${ag.paciente_id || ag.paciente}_${ag.data_hora_inicio}`;
            const procAtual = ag.procedimento_descricao || ag.especialidade_nome || ag.procedimento || 'Consulta';
            
            if (agrupadosMap.has(chave)) {
                const existente = agrupadosMap.get(chave);
                existente.procedimento_descricao += ` + ${procAtual}`;
                if (ag.status_pagamento === 'Pendente') existente.status_pagamento = 'Pendente';
                existente.is_encaixe = existente.is_encaixe || ag.is_encaixe;
            } else {
                const novo = { ...ag };
                novo.procedimento_descricao = procAtual;
                agrupadosMap.set(chave, novo);
            }
        });

        const dadosOrdenados = Array.from(agrupadosMap.values()).sort((a, b) => 
            new Date(a.data_hora_inicio) - new Date(b.data_hora_inicio)
        );
        
        setAgendamentos(dadosOrdenados);
      })
      .catch(err => console.error("Erro ao buscar agendamentos:", err))
      .finally(() => setLoadingApoio(false));
  }, [dataAgenda]);

  useEffect(() => {
    if (abaDireita === 0) buscarAgendamentos();
  }, [abaDireita, dataAgenda, buscarAgendamentos]);

  const handleStatusChange = async (agendamentoId, novoStatus) => {
    setIsUpdatingStatus(true);
    try {
      await apiClient.patch(`/agendamentos/${agendamentoId}/`, { status: novoStatus });
      buscarAgendamentos(); 
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Não foi possível atualizar o status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const buscarPacientes = (e) => {
    e.preventDefault();
    if (!termoBusca) return;
    setLoadingApoio(true);
    apiClient.get(`/pacientes/?search=${termoBusca}`)
      .then(res => {
        const data = res.data;
        setResultadosBusca(Array.isArray(data) ? data : (data.results || []));
      })
      .catch(err => console.error("Erro ao buscar pacientes:", err))
      .finally(() => setLoadingApoio(false));
  };

  const handleEditarPaciente = (paciente) => {
    setPacienteEditando(paciente);
    setModalPacienteOpen(true);
  };

  const handleAbrirDocumentos = (paciente) => {
    setPacienteDocs(paciente);
    setModalDocsOpen(true);
    setLoadingDocs(true);
    apiClient.get(`/prontuario/pacientes/${paciente.id}/atestados/`)
        .then(res => setListaDocs(res.data.results || res.data || []))
        .catch(err => {
            console.error(err);
            alert("Erro ao buscar documentos deste paciente.");
        })
        .finally(() => setLoadingDocs(false));
  };

  return (
    <Box sx={{ width: width, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e0e0e0', bgcolor: '#fff', height: '100%' }}>
      
      {/* CABEÇALHO UNIFICADO: Agora tem abas tanto no Desktop quanto no Mobile! */}
      <Box sx={{ p: 1, bgcolor: tabExterna !== null ? '#1a233b' : '#fff', color: tabExterna !== null ? '#fff' : 'inherit', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e0e0e0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          
          {tabExterna !== null && (
            <IconButton color="inherit" onClick={onClose} sx={{ mr: 1, flexShrink: 0 }}>
              <ArrowBackIcon />
            </IconButton>
          )}

          <Tabs 
            value={abaDireita} 
            onChange={(e, val) => setAbaDireita(val)} 
            sx={{ minHeight: 36, '& .MuiTab-root': { color: tabExterna !== null ? '#rgba(255,255,255,0.7)' : 'inherit' }, '& .Mui-selected': { color: tabExterna !== null ? '#fff !important' : 'primary.main' } }}
          >
            <Tab label="Agenda" sx={{ minHeight: 36, py: 0, fontSize: '0.75rem', fontWeight: 'bold' }} />
            <Tab label="Pacientes" sx={{ minHeight: 36, py: 0, fontSize: '0.75rem', fontWeight: 'bold' }} />
          </Tabs>
        </Box>

        {tabExterna === null && (
          <IconButton size="small" onClick={onClose} sx={{ color: '#d32f2f' }} title="Fechar Chat">
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* ÁREA DE SCROLL */}
      <Box sx={{ flex: 1, p: 1.5, overflowY: 'auto', bgcolor: '#f8f9fa', pb: 8 }}>
        {loadingApoio && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress size={24} /></Box>}

        {abaDireita === 0 && !loadingApoio && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <TextField
              type="date" size="small" fullWidth value={dataAgenda}
              onChange={(e) => setDataAgenda(e.target.value)}
              sx={{ bgcolor: '#fff', mb: 1, '& .MuiInputBase-input': { py: 0.8, fontSize: '0.8rem' } }}
            />

            {agendamentos?.length === 0 ? (
              <Typography variant="body2" color="text.secondary" align="center" mt={2}>Agenda vazia neste dia.</Typography>
            ) : (
              agendamentos?.map(agendamento => {
                const isCancelado = agendamento.status === 'Cancelado' || agendamento.status === 'Não Compareceu';
                const isDevendo = agendamento.status_pagamento === 'Pendente';
                const isEncaixe = agendamento.is_encaixe && !isCancelado;
                
                // Calculamos a cor baseada no seu Semáforo
                const semaforo = calcularStatusSemaforo(agendamento, now);

                return (
                  <Box
                    key={agendamento.id}
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        p: 1, mb: 1, borderRadius: 1.5,
                        bgcolor: semaforo.cor.bg,
                        border: `1px solid ${semaforo.cor.border}`,
                        borderLeft: `4px solid ${semaforo.cor.indicator}`,
                        opacity: isCancelado ? 0.6 : 1,
                    }}
                  >
                      {/* LINHA 1: Horário, ID, Nome e Cronômetro */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <Box sx={{ display: 'flex', gap: 0.6, alignItems: 'center', overflow: 'hidden', minWidth: 0, flexGrow: 1 }}>
                              <Typography sx={{ fontWeight: 800, fontSize: '0.72rem', color: semaforo.cor.text, flexShrink: 0 }}>
                                  {formatarHoraTZ(agendamento.data_hora_inicio)}
                              </Typography>
                              <Box component="span" sx={{
                                  bgcolor: semaforo.cor.text, color: semaforo.cor.bg,
                                  px: 0.5, py: 0.1, borderRadius: '4px', fontSize: '0.55rem',
                                  fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', flexShrink: 0
                              }}>
                                  ID: {agendamento.paciente_id || agendamento.paciente}
                              </Box>
                              <Typography noWrap sx={{ fontWeight: 700, fontSize: '0.72rem', color: semaforo.cor.text, minWidth: 0 }}>
                                  {agendamento.paciente_nome}
                              </Typography>
                          </Box>

                          {/* CRONÔMETRO + STATUS */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, flexShrink: 0, ml: 0.5, maxWidth: '40%' }}>
                              {semaforo.timer && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, bgcolor: 'rgba(255,255,255,0.5)', px: 0.5, py: 0.05, borderRadius: 1, flexShrink: 0 }}>
                                      <AccessTimeIcon sx={{ fontSize: 10, color: semaforo.cor.text }} />
                                      <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, color: semaforo.cor.text, whiteSpace: 'nowrap' }}>
                                          {semaforo.timer}
                                      </Typography>
                                  </Box>
                              )}
                              <Typography noWrap sx={{ fontSize: '0.6rem', fontWeight: 600, color: semaforo.cor.text, opacity: 0.9, minWidth: 0 }}>
                                  {semaforo.label}
                              </Typography>
                          </Box>
                      </Box>

                      {/* LINHA 2: Procedimento e Tags */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5, mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, overflow: 'hidden', minWidth: 0, flexGrow: 1 }}>
                              <MedicalInformationIcon sx={{ fontSize: 11, color: semaforo.cor.indicator, flexShrink: 0 }} />
                              <Typography noWrap sx={{ fontSize: '0.6rem', color: semaforo.cor.text, opacity: 0.9, minWidth: 0 }}>
                                  {agendamento.procedimento_descricao || 'Consulta'}
                              </Typography>
                          </Box>

                          <Box sx={{ display: 'flex', gap: 0.4, alignItems: 'center', flexShrink: 0 }}>
                              {agendamento.primeira_consulta ? (
                                  <Chip label="1ª Vez" size="small" sx={{ height: '14px', fontSize: '0.5rem', bgcolor: '#fff8e1', color: '#f57f17', border: '1px solid #ffe082', '& .MuiChip-label': { px: 0.4 } }} />
                              ) : (
                                  <AssignmentReturnIcon sx={{ color: semaforo.cor.indicator, fontSize: 12 }} />
                              )}
                              {isEncaixe && <Chip label="⚡ Encaixe" size="small" sx={{ height: '14px', fontSize: '0.5rem', bgcolor: '#fff3e0', color: '#e65100', border: '1px solid #ffcc80', fontWeight: 'bold', '& .MuiChip-label': { px: 0.4 } }} />}
                              {isDevendo && !isCancelado && <MonetizationOnIcon sx={{ color: '#d32f2f', fontSize: 13 }} />}
                          </Box>
                      </Box>

                      {/* LINHA 3: AÇÕES E STATUS (Dropdown + Botão Enviar) */}
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <FormControl size="small" sx={{ flex: 1, bgcolor: '#fff', borderRadius: 1 }}>
                            <Select
                                value={agendamento.status || ''}
                                onChange={(e) => handleStatusChange(agendamento.id, e.target.value)}
                                disabled={isUpdatingStatus}
                                sx={{ fontSize: '0.7rem', height: 28, '& .MuiSelect-select': { py: 0, display: 'flex', alignItems: 'center' } }}
                            >
                                <MenuItem value="Agendado" sx={{fontSize: '0.75rem'}}>🗓️ Agendado</MenuItem>
                                <MenuItem value="Confirmado" sx={{fontSize: '0.75rem'}}>✅ Confirmado</MenuItem>
                                <MenuItem value="Aguardando" sx={{fontSize: '0.75rem'}}>🏁 Check-in</MenuItem>
                                <MenuItem value="Aguardando Pagamento" sx={{fontSize: '0.75rem'}}>⏳ Aguard. Pgto.</MenuItem>
                                <MenuItem value="Em Atendimento" sx={{fontSize: '0.75rem'}}>🩺 Em Atend.</MenuItem>
                                <MenuItem value="Realizado" sx={{fontSize: '0.75rem'}}>🏁 Realizado</MenuItem>
                                <MenuItem value="Não Compareceu" sx={{fontSize: '0.75rem'}}>👻 Faltou</MenuItem>
                                <MenuItem value="Cancelado" sx={{fontSize: '0.75rem'}}>❌ Cancelado</MenuItem>
                            </Select>
                        </FormControl>
                        <Button 
                          variant="contained" 
                          disableElevation
                          onClick={() => onEnviarAgendamento(agendamento)}
                          sx={{ textTransform: 'none', fontSize: '0.7rem', height: 28, px: 1.5, minWidth: 'auto', bgcolor: semaforo.cor.indicator, color: '#fff', '&:hover': { filter: 'brightness(0.85)' } }}
                        >
                          Anexar Chat
                        </Button>
                      </Box>
                  </Box>
                );
              })
            )}
          </Box>
        )}

        {/* --- ABA PACIENTES (Inalterada logicamente) --- */}
        {abaDireita === 1 && (
          <Box>
            <Box component="form" onSubmit={buscarPacientes} sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
              <TextField 
                fullWidth size="small" placeholder="Nome..." value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)}
                sx={{ bgcolor: '#fff', '& .MuiInputBase-input': { py: 0.8, fontSize: '0.8rem' } }}
              />
              <Button type="submit" variant="contained" disableElevation sx={{ minWidth: '40px', px: 1, height: 32, bgcolor: '#1a233b' }}>🔍</Button>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {!loadingApoio && resultadosBusca?.map(paciente => (
                <Paper key={paciente.id} elevation={0} sx={{ p: 1, border: '1px solid #e0e0e0', borderRadius: 1.5 }}>
                  <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.75rem', mb: 0.5 }}>{paciente.nome_completo || paciente.nome}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem' }}>📱 {paciente.telefone_celular || 'Sem telefone'}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, fontSize: '0.7rem' }}>✉️ {paciente.email || 'Sem e-mail'}</Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Button 
                        variant="contained" fullWidth disableElevation
                        onClick={() => onEnviarPaciente(paciente)}
                        sx={{ textTransform: 'none', fontSize: '0.7rem', height: 26, bgcolor: '#1a233b', '&:hover': { bgcolor: '#16233a' } }}
                    >
                        Enviar Contato
                    </Button>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Button 
                            variant="outlined" fullWidth
                            onClick={() => handleEditarPaciente(paciente)}
                            sx={{ textTransform: 'none', fontSize: '0.7rem', height: 26, color: '#1a233b', borderColor: '#cfd8dc' }}
                        >
                            Editar
                        </Button>
                        <Button 
                            variant="outlined" fullWidth
                            onClick={() => handleAbrirDocumentos(paciente)}
                            sx={{ textTransform: 'none', fontSize: '0.7rem', height: 26, color: '#e65100', borderColor: '#ffe0b2', bgcolor: '#fff3e0' }}
                        >
                            Docs
                        </Button>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {/* --- MODAIS DE APOIO (Inalterados) --- */}
      {modalPacienteOpen && (
          <PacienteModal open={modalPacienteOpen} onClose={() => setModalPacienteOpen(false)} pacienteParaEditar={pacienteEditando} onSave={() => { setModalPacienteOpen(false); buscarPacientes(new Event('submit')); }} />
      )}

      <Dialog open={modalDocsOpen} onClose={() => setModalDocsOpen(false)} maxWidth="sm" fullWidth>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#1C2E4A', color: '#fff' }}>
              <Typography variant="subtitle1" fontWeight="bold">Documentos do Paciente</Typography>
              <IconButton size="small" onClick={() => setModalDocsOpen(false)} sx={{ color: '#fff' }}><CloseIcon /></IconButton>
          </Box>
          <Box sx={{ p: 2, minHeight: 200, bgcolor: '#f4f6f8' }}>
              {loadingDocs ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
              ) : listaDocs.length === 0 ? (
                  <Typography align="center" sx={{ mt: 4, color: '#666' }}>Nenhum documento médico encontrado para este paciente.</Typography>
              ) : (
                  <List disablePadding>
                      {listaDocs.map(doc => (
                          <Paper key={doc.id} elevation={0} sx={{ border: '1px solid #e0e0e0', mb: 1.5, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 2 }}>
                              <Box>
                                  <Typography variant="body2" fontWeight="bold" sx={{ color: '#1C2E4A' }}>{doc.tipo_atestado || 'Documento Médico'}</Typography>
                                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>Emitido em: {new Date(doc.data_emissao || doc.created_at).toLocaleDateString('pt-BR')}</Typography>
                              </Box>
                              <Button 
                                  variant="contained" size="small" disableElevation
                                  sx={{ bgcolor: '#ff9800', '&:hover': {bgcolor: '#e65100'}, textTransform: 'none', fontWeight: 'bold' }}
                                  onClick={() => { onEnviarDocumento(doc, pacienteDocs); setModalDocsOpen(false); }}
                              >
                                  Enviar p/ Chat
                              </Button>
                          </Paper>
                      ))}
                  </List>
              )}
          </Box>
      </Dialog>
    </Box>
  );
}