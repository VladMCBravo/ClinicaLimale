import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, IconButton, TextField, Button, 
  CircularProgress, Tabs, Tab, Paper, MenuItem, Select, FormControl 
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import apiClient from '../../api/axiosConfig';

// Importação ajustada após a correção do Vercel
import PacienteModal from '../../components/PacienteModal'; 

export default function ChatApoioDireita({ onClose, onEnviarAgendamento, onEnviarPaciente }) {
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

  // 1. BUSCAR AGENDAMENTOS POR DATA
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

  // 2. ALTERAR STATUS DO AGENDAMENTO
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

  // 3. BUSCAR PACIENTES
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

  return (
    <Box sx={{ width: '25%', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e0e0e0', bgcolor: '#fff' }}>
      
      {/* CABEÇALHO DAS ABAS */}
      <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e0e0e0' }}>
        <Tabs value={abaDireita} onChange={(e, val) => setAbaDireita(val)} sx={{ minHeight: 36 }}>
          <Tab label="Agenda" sx={{ minHeight: 36, py: 0, fontSize: '0.75rem', fontWeight: 'bold' }} />
          <Tab label="Pacientes" sx={{ minHeight: 36, py: 0, fontSize: '0.75rem', fontWeight: 'bold' }} />
        </Tabs>
        <IconButton size="small" onClick={onClose} sx={{ color: '#d32f2f' }} title="Fechar Chat">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* CONTEÚDO DAS ABAS */}
      <Box sx={{ flex: 1, p: 1.5, overflowY: 'auto', bgcolor: '#f8f9fa' }}>
        {loadingApoio && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress size={24} /></Box>}

        {/* --- ABA 0: AGENDA --- */}
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
                  
                  {/* Linha 1: Horário (tag azul) e Nome do Paciente */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, gap: 1 }}>
                    <Typography variant="caption" sx={{ bgcolor: '#e3f2fd', color: '#1976d2', px: 1, py: 0.2, borderRadius: 1, fontWeight: 'bold' }}>
                      {agendamento.data_hora_inicio ? new Date(agendamento.data_hora_inicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" noWrap sx={{ flex: 1, fontSize: '0.75rem' }}>
                      {agendamento.paciente_nome}
                    </Typography>
                  </Box>
                  
                  {/* Linha 2: Nome do Procedimento */}
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, pl: 0.5, fontSize: '0.7rem' }} noWrap>
                    {agendamento.procedimento_descricao || 'Consulta Padrão'}
                  </Typography>
                  
                  {/* Linha 3: Controles lado a lado (Select de status e Botão de Enviar) */}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <FormControl size="small" sx={{ flex: 1 }}>
                        <Select
                            value={agendamento.status || ''}
                            onChange={(e) => handleStatusChange(agendamento.id, e.target.value)}
                            disabled={isUpdatingStatus}
                            sx={{ 
                              fontSize: '0.7rem', 
                              height: 28, 
                              '& .MuiSelect-select': { py: 0, display: 'flex', alignItems: 'center' } 
                            }}
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
                      variant="outlined" 
                      onClick={() => onEnviarAgendamento(agendamento)}
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

        {/* --- ABA 1: PACIENTES --- */}
        {abaDireita === 1 && (
          <Box>
            <Box component="form" onSubmit={buscarPacientes} sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
              <TextField 
                fullWidth size="small" placeholder="Nome..." 
                value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)}
                sx={{ bgcolor: '#fff', '& .MuiInputBase-input': { py: 0.8, fontSize: '0.8rem' } }}
              />
              <Button type="submit" variant="contained" disableElevation sx={{ minWidth: '40px', px: 1, height: 32, bgcolor: '#1a233b' }}>🔍</Button>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {!loadingApoio && resultadosBusca?.map(paciente => (
                <Paper key={paciente.id} elevation={0} sx={{ p: 1, border: '1px solid #e0e0e0', borderRadius: 1.5 }}>
                  <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.75rem', mb: 0.5 }}>{paciente.nome_completo || paciente.nome}</Typography>
                  
                  {/* Trocamos o CPF pelos dados de contato diretos! */}
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem' }}>
                    📱 {paciente.telefone_celular || 'Sem telefone'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, fontSize: '0.7rem' }}>
                    ✉️ {paciente.email || 'Sem e-mail'}
                  </Typography>
                  
                  {/* Botões super compactos na mesma linha */}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button 
                        variant="contained" fullWidth disableElevation
                        onClick={() => onEnviarPaciente(paciente)}
                        sx={{ textTransform: 'none', fontSize: '0.7rem', height: 26, bgcolor: '#1a233b', '&:hover': { bgcolor: '#16233a' } }}
                    >
                        Enviar Contato
                    </Button>
                    <Button 
                        variant="outlined" fullWidth
                        onClick={() => handleEditarPaciente(paciente)}
                        sx={{ textTransform: 'none', fontSize: '0.7rem', height: 26, color: '#1a233b', borderColor: '#cfd8dc' }}
                    >
                        Editar
                    </Button>
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
    </Box>
  );
}