import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, IconButton, TextField, Button, 
  CircularProgress, Tabs, Tab, Paper, MenuItem, Select, FormControl 
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import apiClient from '../../api/axiosConfig';

// Ajuste o caminho do PacienteModal conforme a sua estrutura de pastas
import PacienteModal from '../PacienteModal'; 

export default function ChatApoioDireita({ onClose, onEnviarAgendamento, onEnviarPaciente }) {
  const [abaDireita, setAbaDireita] = useState(0);
  const [loadingApoio, setLoadingApoio] = useState(false);
  
  // --- ESTADOS DA AGENDA ---
  const [agendamentos, setAgendamentos] = useState([]);
  const [dataAgenda, setDataAgenda] = useState(() => {
    // Inicializa com a data de hoje no formato YYYY-MM-DD
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

  // Dispara a busca sempre que a aba for Agenda(0) ou a Data mudar
  useEffect(() => {
    if (abaDireita === 0) {
      buscarAgendamentos();
    }
  }, [abaDireita, dataAgenda]);

  // 2. ALTERAR STATUS DO AGENDAMENTO
  const handleStatusChange = async (agendamentoId, novoStatus) => {
    setIsUpdatingStatus(true);
    try {
      // PATCH permite atualização parcial (apenas o status)
      await apiClient.patch(`/agendamentos/${agendamentoId}/`, { status: novoStatus });
      buscarAgendamentos(); // Recarrega a lista para mostrar a cor/status atualizado
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

  // 4. ABRIR EDIÇÃO DO PACIENTE
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
      <Box sx={{ flex: 1, p: 2, overflowY: 'auto', bgcolor: '#f8f9fa' }}>
        {loadingApoio && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress size={24} /></Box>}

        {/* --- ABA 0: AGENDA --- */}
        {abaDireita === 0 && !loadingApoio && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            
            {/* SELETOR DE DATA */}
            <TextField
              type="date"
              size="small"
              fullWidth
              value={dataAgenda}
              onChange={(e) => setDataAgenda(e.target.value)}
              sx={{ bgcolor: '#fff', mb: 1 }}
            />

            {agendamentos?.length === 0 ? (
              <Typography variant="body2" color="text.secondary" align="center" mt={2}>Agenda vazia neste dia.</Typography>
            ) : (
              agendamentos?.map(agendamento => (
                <Paper key={agendamento.id} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
                  <Box sx={{ bgcolor: '#f5f5f5', px: 1.5, py: 1, borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" fontWeight="bold" color="text.secondary">
                      {agendamento.data_hora_inicio ? new Date(agendamento.data_hora_inicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1.5 }}>
                    <Typography variant="body2" fontWeight="bold" noWrap>{agendamento.paciente_nome}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }} noWrap>
                      {agendamento.procedimento_descricao || 'Consulta Padrão'}
                    </Typography>
                    
                    {/* SELETOR DE STATUS */}
                    <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                        <Select
                            value={agendamento.status || ''}
                            onChange={(e) => handleStatusChange(agendamento.id, e.target.value)}
                            disabled={isUpdatingStatus}
                            sx={{ fontSize: '0.75rem', height: 30 }}
                        >
                            <MenuItem value="Agendado" sx={{fontSize: '0.8rem'}}>🗓️ Agendado</MenuItem>
                            <MenuItem value="Confirmado" sx={{fontSize: '0.8rem'}}>✅ Confirmado</MenuItem>
                            <MenuItem value="Aguardando Pagamento" sx={{fontSize: '0.8rem'}}>⏳ Aguard. Pgto.</MenuItem>
                            <MenuItem value="Realizado" sx={{fontSize: '0.8rem'}}>🏁 Realizado</MenuItem>
                            <MenuItem value="Não Compareceu" sx={{fontSize: '0.8rem'}}>👻 Faltou</MenuItem>
                            <MenuItem value="Cancelado" sx={{fontSize: '0.8rem'}}>❌ Cancelado</MenuItem>
                        </Select>
                    </FormControl>

                    <Button 
                      fullWidth size="small" variant="outlined" 
                      onClick={() => onEnviarAgendamento(agendamento)}
                      sx={{ textTransform: 'none', fontSize: '0.7rem' }}
                    >
                      Enviar Cartão p/ Chat
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
            <Box component="form" onSubmit={buscarPacientes} sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField 
                fullWidth size="small" placeholder="Nome ou CPF..." 
                value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)}
                sx={{ bgcolor: '#fff' }}
              />
              <Button type="submit" variant="contained" disableElevation sx={{ minWidth: '40px', px: 1 }}>🔍</Button>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {!loadingApoio && resultadosBusca?.map(paciente => (
                <Paper key={paciente.id} elevation={0} sx={{ p: 1.5, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                  <Typography variant="body2" fontWeight="bold">{paciente.nome_completo || paciente.nome}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>CPF: {paciente.cpf || 'Não informado'}</Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button 
                        size="small" variant="contained" color="secondary" fullWidth disableElevation
                        onClick={() => onEnviarPaciente(paciente)}
                        sx={{ textTransform: 'none', fontSize: '0.7rem' }}
                    >
                        Enviar Contato
                    </Button>
                    <Button 
                        size="small" variant="outlined" fullWidth
                        onClick={() => handleEditarPaciente(paciente)}
                        sx={{ textTransform: 'none', fontSize: '0.7rem' }}
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

      {/* MODAL DE EDIÇÃO DO PACIENTE (Importado do seu sistema) */}
      {modalPacienteOpen && (
          <PacienteModal
              open={modalPacienteOpen}
              onClose={() => setModalPacienteOpen(false)}
              pacienteParaEditar={pacienteEditando}
              onSave={() => {
                  setModalPacienteOpen(false);
                  // Recarrega a busca para refletir a edição
                  buscarPacientes(new Event('submit')); 
              }}
          />
      )}
    </Box>
  );
}