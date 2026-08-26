import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, IconButton, TextField, Button, 
  CircularProgress, Tabs, Tab, Paper, MenuItem, Select, FormControl, Dialog, List
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import apiClient from '../../api/axiosConfig';

import PacienteModal from '../../components/PacienteModal'; 

export default function ChatApoioDireita({ onClose, onEnviarAgendamento, onEnviarPaciente, onEnviarDocumento }) {
  const [abaDireita, setAbaDireita] = useState(0);
  const [loadingApoio, setLoadingApoio] = useState(false);
  
  // --- ESTADOS DA AGENDA ---
  const [agendamentos, setAgendamentos] = useState([]);
  const [dataAgenda, setDataAgenda] = useState(() => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  });
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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

  const buscarAgendamentos = () => {
    setLoadingApoio(true);
    apiClient.get(`/agendamentos/hoje/?data=${dataAgenda}`)
      .then(res => {
        const data = res.data;
        setAgendamentos(Array.isArray(data) ? data : (data.results || []));
      })
      .catch(err => console.error("Erro ao buscar agendamentos:", err))
      .finally(() => setLoadingApoio(false));
  };

  useEffect(() => {
    if (abaDireita === 0) buscarAgendamentos();
  }, [abaDireita, dataAgenda]);

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

  // --- FUNÇÃO PARA BUSCAR OS DOCUMENTOS ---
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
    <Box sx={{ width: '25%', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e0e0e0', bgcolor: '#fff' }}>
      
      <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e0e0e0' }}>
        <Tabs value={abaDireita} onChange={(e, val) => setAbaDireita(val)} sx={{ minHeight: 36 }}>
          <Tab label="Agenda" sx={{ minHeight: 36, py: 0, fontSize: '0.75rem', fontWeight: 'bold' }} />
          <Tab label="Pacientes" sx={{ minHeight: 36, py: 0, fontSize: '0.75rem', fontWeight: 'bold' }} />
        </Tabs>
        <IconButton size="small" onClick={onClose} sx={{ color: '#d32f2f' }} title="Fechar Chat">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, p: 1.5, overflowY: 'auto', bgcolor: '#f8f9fa' }}>
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
              agendamentos?.map(agendamento => (
                <Paper key={agendamento.id} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 1.5, p: 1, bgcolor: '#fff' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, gap: 1 }}>
                    <Typography variant="caption" sx={{ bgcolor: '#e3f2fd', color: '#1976d2', px: 1, py: 0.2, borderRadius: 1, fontWeight: 'bold' }}>
                      {agendamento.data_hora_inicio ? new Date(agendamento.data_hora_inicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" noWrap sx={{ flex: 1, fontSize: '0.75rem' }}>
                      {agendamento.paciente_nome}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, pl: 0.5, fontSize: '0.7rem' }} noWrap>
                    {agendamento.procedimento_descricao || 'Consulta Padrão'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <FormControl size="small" sx={{ flex: 1 }}>
                        <Select
                            value={agendamento.status || ''}
                            onChange={(e) => handleStatusChange(agendamento.id, e.target.value)}
                            disabled={isUpdatingStatus}
                            sx={{ fontSize: '0.7rem', height: 28, '& .MuiSelect-select': { py: 0, display: 'flex', alignItems: 'center' } }}
                        >
                            <MenuItem value="Agendado" sx={{fontSize: '0.75rem'}}>🗓️ Agendado</MenuItem>
                            <MenuItem value="Confirmado" sx={{fontSize: '0.75rem'}}>✅ Confirmado</MenuItem>
                            <MenuItem value="Aguardando Pagamento" sx={{fontSize: '0.75rem'}}>⏳ Aguard. Pgto.</MenuItem>
                            <MenuItem value="Realizado" sx={{fontSize: '0.75rem'}}>🏁 Realizado</MenuItem>
                            <MenuItem value="Não Compareceu" sx={{fontSize: '0.75rem'}}>👻 Faltou</MenuItem>
                            <MenuItem value="Cancelado" sx={{fontSize: '0.75rem'}}>❌ Cancelado</MenuItem>
                        </Select>
                    </FormControl>
                    <Button 
                      variant="outlined" onClick={() => onEnviarAgendamento(agendamento)}
                      sx={{ textTransform: 'none', fontSize: '0.7rem', height: 28, px: 1, minWidth: 'auto', color: '#1a233b', borderColor: '#cfd8dc' }}
                    >
                      Enviar
                    </Button>
                  </Box>
                </Paper>
              ))
            )}
          </Box>
        )}

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

      {/* MODAL DE EDIÇÃO DO PACIENTE */}
      {modalPacienteOpen && (
          <PacienteModal
              open={modalPacienteOpen}
              onClose={() => setModalPacienteOpen(false)}
              pacienteParaEditar={pacienteEditando}
              onSave={() => {
                  setModalPacienteOpen(false);
                  buscarPacientes(new Event('submit')); 
              }}
          />
      )}

      {/* MODAL DE LISTA DE DOCUMENTOS */}
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
                                  <Typography variant="body2" fontWeight="bold" sx={{ color: '#1C2E4A' }}>
                                    {doc.tipo_atestado || 'Documento Médico'}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                      Emitido em: {new Date(doc.data_emissao || doc.created_at).toLocaleDateString('pt-BR')}
                                  </Typography>
                              </Box>
                              <Button 
                                  variant="contained" size="small" disableElevation
                                  sx={{ bgcolor: '#ff9800', '&:hover': {bgcolor: '#e65100'}, textTransform: 'none', fontWeight: 'bold' }}
                                  onClick={() => {
                                      onEnviarDocumento(doc, pacienteDocs);
                                      setModalDocsOpen(false);
                                  }}
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