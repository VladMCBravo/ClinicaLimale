import React, { useState, useEffect, useRef } from 'react';
import { 
  Dialog, Box, Typography, IconButton, TextField, Button, 
  List, ListItem, ListItemAvatar, ListItemText, Avatar, Badge,
  CircularProgress, Divider, Tabs, Tab, Paper
} from '@mui/material';
import { Close as CloseIcon, Send as SendIcon, Person as PersonIcon, Event as EventIcon } from '@mui/icons-material';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../hooks/useAuth'; 
import apiClient from '../../api/axiosConfig';

const ChatInterno = ({ onClose, token }) => {
  const { user: currentUser } = useAuth(); 
  const { socket } = useChat();
  
  const [contatoAtivo, setContatoAtivo] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [abaDireita, setAbaDireita] = useState(0); 
  
  const [equipe, setEquipe] = useState([]);
  const [loadingEquipe, setLoadingEquipe] = useState(true);
  
  const [agendamentosHoje, setAgendamentosHoje] = useState([]);
  const [termoBusca, setTermoBusca] = useState('');
  const [resultadosBusca, setResultadosBusca] = useState([]);
  const [loadingApoio, setLoadingApoio] = useState(false);

  const [mensagemAtual, setMensagemAtual] = useState('');
  const mensagensFimRef = useRef(null);

  useEffect(() => {
    mensagensFimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  // 1. BUSCAR EQUIPE REAL
  useEffect(() => {
    setLoadingEquipe(true);
    apiClient.get('/usuarios/usuarios/')
      .then(res => {
        // Nova regra de filtro adicionada aqui
        const usuariosValidos = res.data.filter(u => 
          u.is_active && 
          u.id !== currentUser?.id &&
          (u.cargo === 'admin' || u.cargo === 'recepcao')
        );
        
        const equipeFormatada = usuariosValidos.map(u => ({
          ...u,
          nome_exibicao: `${u.first_name} ${u.last_name}`,
          is_online: false 
        }));
        
        equipeFormatada.sort((a, b) => a.nome_exibicao.localeCompare(b.nome_exibicao));
        setEquipe(equipeFormatada);
      })
      .catch(err => console.error("Erro ao buscar equipe:", err))
      .finally(() => setLoadingEquipe(false));
  }, [currentUser]);

  // 2. OUVINTE DO WEBSOCKET (Mensagens e Status)
  useEffect(() => {
    if (socket) {
      const handleMessage = (event) => {
        console.log("📥 [WEBSOCKET RECEBEU]:", event.data); 
        
        const data = JSON.parse(event.data);
        if (data.type === 'chat_message') {
          setMensagens((prev) => [...prev, data.message]);
        } else if (data.type === 'user_status') {
          setEquipe((prevEquipe) => 
            prevEquipe.map((func) => 
              func.id === data.user_id ? { ...func, is_online: data.is_online } : func
            )
          );
        }
      };
      socket.addEventListener('message', handleMessage);
      return () => socket.removeEventListener('message', handleMessage);
    }
  }, [socket]);

  // 3. BUSCAR HISTÓRICO REST AO CLICAR NUM CONTATO
  useEffect(() => {
    if (contatoAtivo) {
      setMensagens([]); 
      apiClient.get(`/chat/history/?contact_id=${contatoAtivo.id}`)
        .then(res => {
          const data = res.data;
          const lista = Array.isArray(data) ? data : (data.results || []);
          const historicoFormatado = lista.map(msg => ({
            ...msg,
            sender: msg.is_mine ? 'me' : 'other' 
          }));
          setMensagens(historicoFormatado);
        })
        .catch(err => console.error("Erro ao carregar histórico:", err));
    }
  }, [contatoAtivo]);

  // 4. BUSCAR AGENDAMENTOS DO DIA
  useEffect(() => {
    if (abaDireita === 0) {
      setLoadingApoio(true);
      apiClient.get('/agendamentos/hoje/')
        .then(res => {
          const data = res.data;
          setAgendamentosHoje(Array.isArray(data) ? data : (data.results || []));
        })
        .catch(err => console.error("Erro ao buscar agendamentos:", err))
        .finally(() => setLoadingApoio(false));
    }
  }, [abaDireita]);

  // 5. BUSCAR PACIENTES
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

  // 6. FUNÇÕES DE ENVIO (COM DEBUGS)
  const enviarMensagemTexto = (e) => {
    e.preventDefault();
    
    console.log("👉 [DEBUG CHAT] 1. Botão Enviar acionado!");
    console.log("👉 [DEBUG CHAT] 2. Mensagem digitada:", mensagemAtual);
    console.log("👉 [DEBUG CHAT] 3. Contato Selecionado:", contatoAtivo ? contatoAtivo.nome_exibicao : 'Nenhum');
    console.log("👉 [DEBUG CHAT] 4. Existe um socket criado?", !!socket);
    console.log("👉 [DEBUG CHAT] 5. Qual o status da conexão? (1 = OPEN):", socket ? socket.readyState : 'NULO');

    if (!socket || socket.readyState !== 1) {
      alert(`Falha! O socket não está conectado. Status atual: ${socket?.readyState}`);
      return;
    }

    if (mensagemAtual.trim() && contatoAtivo) {
      const payload = {
        receiver_id: contatoAtivo.id,
        content: mensagemAtual.trim(),
        attachment_type: 'text'
      };
      
      console.log("👉 [DEBUG CHAT] 6. Enviando este JSON para o Django:", payload);
      
      try {
        socket.send(JSON.stringify(payload));
        console.log("👉 [DEBUG CHAT] 7. Disparo realizado com sucesso pro backend!");
        setMensagemAtual('');
      } catch (err) {
        console.error("❌ ERRO ao tentar disparar o socket:", err);
      }
    } else {
      console.warn("👉 [DEBUG CHAT] BLOQUEADO: Ou a mensagem está vazia, ou nenhum contato foi selecionado.");
    }
  };

  const enviarCardAgendamento = (agendamento) => {
    console.log("👉 [DEBUG CARD] 1. Botão Enviar Cartão acionado!", agendamento);
    if (!socket || socket.readyState !== 1) {
      alert(`Falha! O socket não está conectado. Status atual: ${socket?.readyState}`);
      return;
    }

    if (socket && contatoAtivo) {
      const horaStr = agendamento.data_hora_inicio ? new Date(agendamento.data_hora_inicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
      const nomePaciente = agendamento.paciente_nome || 'Paciente não informado';

      const payload = {
        receiver_id: contatoAtivo.id,
        content: `Agendamento: ${nomePaciente} às ${horaStr}`, 
        attachment_type: 'appointment',
        attachment_id: agendamento.id,
        attachment_data: agendamento 
      };

      console.log("👉 [DEBUG CARD] 2. Enviando JSON:", payload);

      try {
        socket.send(JSON.stringify(payload));
        console.log("👉 [DEBUG CARD] 3. Cartão disparado com sucesso!");
      } catch (err) {
        console.error("❌ ERRO ao tentar disparar o socket:", err);
      }
    } else {
        console.warn("👉 [DEBUG CARD] BLOQUEADO: Nenhum contato selecionado.");
    }
  };

  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: { height: '90vh', display: 'flex', flexDirection: 'row', borderRadius: 2, overflow: 'hidden' }
      }}
    >
        {/* COLUNA ESQUERDA: LISTA DA EQUIPE */}
        <Box sx={{ width: '25%', display: 'flex', flexDirection: 'column', borderRight: '1px solid #e0e0e0', bgcolor: '#fff' }}>
          <Box sx={{ p: 2, bgcolor: '#1a233b', color: '#fff', display: 'flex', alignItems: 'center' }}>
            <Typography variant="subtitle1" fontWeight="bold">Comunicação Interna</Typography>
          </Box>
          
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {loadingEquipe ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={30} /></Box>
            ) : (
              <List disablePadding>
                {equipe.map((func) => (
                  <React.Fragment key={func.id}>
                    <ListItem 
                      button 
                      selected={contatoAtivo?.id === func.id}
                      onClick={() => setContatoAtivo(func)}
                      sx={{ 
                        '&.Mui-selected': { bgcolor: '#e3f2fd', borderLeft: '4px solid #1976d2' },
                        '&:hover': { bgcolor: '#f5f5f5' },
                        borderLeft: '4px solid transparent'
                      }}
                    >
                      <ListItemAvatar>
                        <Badge 
                          overlap="circular" 
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          variant="dot"
                          color={func.is_online ? "success" : "error"}
                          sx={{ '& .MuiBadge-badge': { border: '2px solid white' } }}
                        >
                          <Avatar sx={{ bgcolor: func.cargo === 'medico' ? '#0288d1' : '#7b1fa2' }}>
                            {func.nome_exibicao.charAt(0)}
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={func.nome_exibicao} 
                        secondary={func.cargo}
                        primaryTypographyProps={{ fontWeight: contatoAtivo?.id === func.id ? 'bold' : 'normal', fontSize: '0.9rem' }}
                        secondaryTypographyProps={{ textTransform: 'capitalize', fontSize: '0.75rem' }}
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>
        </Box>

        {/* COLUNA DO MEIO: ÁREA DO CHAT */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#f0f2f5', position: 'relative' }}>
          {contatoAtivo ? (
            <>
              <Box sx={{ p: 2, bgcolor: '#fff', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: '#1976d2', mr: 2 }}>{contatoAtivo.nome_exibicao.charAt(0)}</Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" lineHeight={1.2}>{contatoAtivo.nome_exibicao}</Typography>
                  <Typography variant="caption" color="text.secondary" textTransform="capitalize">{contatoAtivo.cargo}</Typography>
                </Box>
              </Box>
              
              <Box sx={{ flex: 1, p: 3, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {mensagens.map((msg, idx) => {
                  const isMe = msg.sender === 'me';
                  return (
                    <Box key={idx} sx={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                      <Box sx={{ maxWidth: '75%' }}>
                        
                        {msg.attachment_type === 'appointment' ? (
                          <Paper elevation={1} sx={{ overflow: 'hidden', borderRadius: 2, border: '1px solid #90caf9' }}>
                            <Box sx={{ bgcolor: '#e3f2fd', px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                              <EventIcon color="primary" fontSize="small" />
                              <Typography variant="caption" fontWeight="bold" color="primary">FICHA DE AGENDAMENTO</Typography>
                            </Box>
                            <Box sx={{ p: 2, bgcolor: '#fff' }}>
                              <Typography variant="body2" fontWeight="bold" sx={{ color: '#333' }}>{msg.content}</Typography>
                              <Button size="small" variant="outlined" sx={{ mt: 1, textTransform: 'none' }}>Ver no Prontuário</Button>
                            </Box>
                          </Paper>
                        ) : msg.attachment_type === 'patient' ? (
                          <Paper elevation={1} sx={{ overflow: 'hidden', borderRadius: 2, border: '1px solid #ce93d8' }}>
                            <Box sx={{ bgcolor: '#f3e5f5', px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PersonIcon color="secondary" fontSize="small" />
                              <Typography variant="caption" fontWeight="bold" color="secondary">CONTATO DE PACIENTE</Typography>
                            </Box>
                            <Box sx={{ p: 2, bgcolor: '#fff' }}>
                              <Typography variant="body2" fontWeight="bold" sx={{ color: '#333' }}>{msg.content}</Typography>
                            </Box>
                          </Paper>
                        ) : (
                          <Paper elevation={0} sx={{ 
                            p: 1.5, 
                            px: 2,
                            borderRadius: 2, 
                            bgcolor: isMe ? '#dcf8c6' : '#fff', 
                            border: '1px solid',
                            borderColor: isMe ? '#c8e6c9' : '#e0e0e0',
                            borderTopRightRadius: isMe ? 0 : 8,
                            borderTopLeftRadius: !isMe ? 0 : 8,
                          }}>
                            <Typography variant="body2" sx={{ color: '#222' }}>{msg.content}</Typography>
                          </Paper>
                        )}
                      </Box>
                    </Box>
                  );
                })}
                <div ref={mensagensFimRef} />
              </Box>

              <Box component="form" onSubmit={enviarMensagemTexto} sx={{ p: 2, bgcolor: '#fff', borderTop: '1px solid #e0e0e0', display: 'flex', gap: 1 }}>
                <TextField 
                  value={mensagemAtual}
                  onChange={(e) => setMensagemAtual(e.target.value)}
                  fullWidth 
                  size="small" 
                  placeholder="Escreva uma mensagem..." 
                  variant="outlined"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 5, bgcolor: '#f8f9fa' } }}
                />
                <IconButton type="submit" color="primary" sx={{ bgcolor: '#1976d2', color: '#fff', '&:hover': { bgcolor: '#1565c0' } }}>
                  <SendIcon fontSize="small" />
                </IconButton>
              </Box>
            </>
          ) : (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="button" color="text.secondary" sx={{ letterSpacing: 1 }}>
                Selecione um membro da equipe para iniciar
              </Typography>
            </Box>
          )}
        </Box>

        {/* COLUNA DIREITA: APOIO CLÍNICO */}
        <Box sx={{ width: '25%', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e0e0e0', bgcolor: '#fff' }}>
          
          <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e0e0e0' }}>
            <Tabs value={abaDireita} onChange={(e, val) => setAbaDireita(val)} sx={{ minHeight: 36 }}>
              <Tab label="Agenda Hoje" sx={{ minHeight: 36, py: 0, fontSize: '0.75rem', fontWeight: 'bold' }} />
              <Tab label="Pacientes" sx={{ minHeight: 36, py: 0, fontSize: '0.75rem', fontWeight: 'bold' }} />
            </Tabs>
            <IconButton size="small" onClick={onClose} sx={{ color: '#d32f2f' }} title="Fechar Chat">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ flex: 1, p: 2, overflowY: 'auto', bgcolor: '#f8f9fa' }}>
            {loadingApoio && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress size={24} /></Box>}

            {abaDireita === 0 && !loadingApoio && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {agendamentosHoje?.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" align="center" mt={2}>Agenda vazia hoje.</Typography>
                ) : (
                  agendamentosHoje?.map(agendamento => (
                    <Paper key={agendamento.id} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
                      <Box sx={{ bgcolor: '#f5f5f5', px: 1.5, py: 1, borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" fontWeight="bold" color="text.secondary">
                          {agendamento.data_hora_inicio ? new Date(agendamento.data_hora_inicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">ID: {agendamento.paciente_id || agendamento.paciente}</Typography>
                      </Box>
                      <Box sx={{ p: 1.5 }}>
                        <Typography variant="body2" fontWeight="bold" noWrap>{agendamento.paciente_nome}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }} noWrap>
                          {agendamento.procedimento_descricao || 'Consulta Padrão'}
                        </Typography>
                        <Button 
                          fullWidth 
                          size="small" 
                          variant="outlined" 
                          onClick={() => enviarCardAgendamento(agendamento)}
                          sx={{ textTransform: 'none' }}
                        >
                          Enviar Cartão p/ Chat
                        </Button>
                      </Box>
                    </Paper>
                  ))
                )}
              </Box>
            )}

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
                      <Typography variant="caption" color="text.secondary" display="block">CPF: {paciente.cpf || 'Não informado'}</Typography>
                    </Paper>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </Box>
    </Dialog>
  );
};

export default ChatInterno;