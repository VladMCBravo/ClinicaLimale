import React, { useState, useEffect, useRef } from 'react';
import { 
  Dialog, Box, Typography, IconButton, TextField, Button, 
  List, ListItem, ListItemAvatar, ListItemText, Avatar, Badge,
  CircularProgress, Divider, Paper
} from '@mui/material';
import { Send as SendIcon, Person as PersonIcon, Event as EventIcon } from '@mui/icons-material';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../hooks/useAuth'; 
import apiClient from '../../api/axiosConfig';

// IMPORTANDO NOSSA NOVA COLUNA DA DIREITA
import ChatApoioDireita from './ChatApoioDireita';

const ChatInterno = ({ onClose, token }) => {
  const { user: currentUser } = useAuth(); 
  const { socket } = useChat();
  
  const [contatoAtivo, setContatoAtivo] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  
  const [equipe, setEquipe] = useState([]);
  const [loadingEquipe, setLoadingEquipe] = useState(true);
  
  const [mensagemAtual, setMensagemAtual] = useState('');
  const mensagensFimRef = useRef(null);
  
  const [naoLidasPorContato, setNaoLidasPorContato] = useState({});
  const contatoAtivoRef = useRef(contatoAtivo);

  useEffect(() => { 
    contatoAtivoRef.current = contatoAtivo; 
  }, [contatoAtivo]);

  useEffect(() => {
    mensagensFimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  // 1. BUSCAR EQUIPE REAL
  useEffect(() => {
    setLoadingEquipe(true);
    apiClient.get('/usuarios/usuarios/')
      .then(res => {
        const usuariosValidos = res.data.filter(u => 
          u.is_active && 
          u.id !== currentUser?.id &&
          (u.cargo === 'admin' || u.cargo === 'recepcao') &&
          (u.first_name && u.first_name.trim() !== '') 
        );
        
        const equipeFormatada = usuariosValidos.map(u => ({
          ...u,
          nome_exibicao: `${u.first_name} ${u.last_name || ''}`.trim(), 
          is_online: false 
        }));
        
        equipeFormatada.sort((a, b) => a.nome_exibicao.localeCompare(b.nome_exibicao));
        setEquipe(equipeFormatada);
      })
      .catch(err => console.error("Erro ao buscar equipe:", err))
      .finally(() => setLoadingEquipe(false));
  }, [currentUser]);

  // 2. OUVINTE DO WEBSOCKET 
  useEffect(() => {
    if (socket) {
      const handleMessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'chat_message') {
          const msg = data.message;
          const currentContato = contatoAtivoRef.current;
          
          const pertenceAAbaAtual = currentContato && (msg.sender_id === currentContato.id || msg.receiver_id === currentContato.id);
          
          if (pertenceAAbaAtual) {
            setMensagens((prev) => [...prev, { ...msg, sender: msg.sender_id === currentUser.id ? 'me' : 'other' }]);
          } else if (msg.sender_id !== currentUser.id) {
            setNaoLidasPorContato(prev => ({
              ...prev,
              [msg.sender_id]: (prev[msg.sender_id] || 0) + 1
            }));
          }

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
  }, [socket, currentUser.id]);

  // 3. BUSCAR HISTÓRICO REST
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


  // 4. FUNÇÕES DE ENVIO PARA O SOCKET
  const checkSocket = () => {
    if (!socket || socket.readyState !== 1) {
      alert(`Falha! O socket não está conectado.`);
      return false;
    }
    if (!contatoAtivo) {
      console.warn("BLOQUEADO: Nenhum contato selecionado.");
      return false;
    }
    return true;
  };

  const enviarMensagemTexto = (e) => {
    e.preventDefault();
    if (!checkSocket() || !mensagemAtual.trim()) return;

    const payload = {
      receiver_id: contatoAtivo.id,
      content: mensagemAtual.trim(),
      attachment_type: 'text'
    };
    
    try {
      socket.send(JSON.stringify(payload));
      setMensagemAtual('');
    } catch (err) { console.error("Erro socket:", err); }
  };

  const enviarCardAgendamento = (agendamento) => {
    if (!checkSocket()) return;

    const horaStr = agendamento.data_hora_inicio ? new Date(agendamento.data_hora_inicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
    const nomePaciente = agendamento.paciente_nome || 'Paciente não informado';

    const payload = {
      receiver_id: contatoAtivo.id,
      content: `Agendamento: ${nomePaciente} às ${horaStr}`, 
      attachment_type: 'appointment',
      attachment_id: agendamento.id,
      attachment_data: agendamento 
    };

    try { socket.send(JSON.stringify(payload)); } 
    catch (err) { console.error("Erro socket:", err); }
  };

  // --- NOVA FUNÇÃO: ENVIAR CARD DO PACIENTE ---
  const enviarCardPaciente = (paciente) => {
    if (!checkSocket()) return;

    // Resgatamos o telefone e email em vez do CPF
    const telefone = paciente.telefone_celular || 'Não informado';
    const email = paciente.email || 'Não informado';

    const payload = {
      receiver_id: contatoAtivo.id,
      // A string content abaixo é o texto que o chat vai desenhar dentro do balão
      content: `👤 ${paciente.nome_completo || paciente.nome}\n📱 Tel: ${telefone}\n✉️ Email: ${email}`, 
      attachment_type: 'patient',
      attachment_id: paciente.id,
      attachment_data: paciente 
    };

    try { socket.send(JSON.stringify(payload)); } 
    catch (err) { console.error("Erro socket:", err); }
  };

  const handleSelecionarContato = (func) => {
    setContatoAtivo(func);
    setNaoLidasPorContato(prev => {
        const newState = { ...prev };
        delete newState[func.id]; 
        return newState;
    });
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
                      onClick={() => handleSelecionarContato(func)} 
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
                      {naoLidasPorContato[func.id] > 0 && (
                        <Badge badgeContent={naoLidasPorContato[func.id]} color="error" sx={{ mr: 2 }} />
                      )}
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
                  const horaMsg = msg.timestamp || msg.created_at || new Date().toISOString();
                  const horaStr = new Date(horaMsg).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

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
                              <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 1, color: '#9e9e9e', fontSize: '0.65rem' }}>{horaStr}</Typography>
                            </Box>
                          </Paper>
                        ) : msg.attachment_type === 'patient' ? (
                          <Paper elevation={1} sx={{ overflow: 'hidden', borderRadius: 2, border: '1px solid #ce93d8' }}>
                            <Box sx={{ bgcolor: '#f3e5f5', px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PersonIcon color="secondary" fontSize="small" />
                              <Typography variant="caption" fontWeight="bold" color="secondary">CONTATO DE PACIENTE</Typography>
                            </Box>
                            <Box sx={{ p: 2, bgcolor: '#fff', whiteSpace: 'pre-wrap' }}>
                              <Typography variant="body2" fontWeight="bold" sx={{ color: '#333' }}>{msg.content}</Typography>
                              <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 1, color: '#9e9e9e', fontSize: '0.65rem' }}>{horaStr}</Typography>
                            </Box>
                          </Paper>
                        ) : (
                          <Paper elevation={0} sx={{ 
                            p: 1.5, px: 2, borderRadius: 2, 
                            bgcolor: isMe ? '#dcf8c6' : '#fff', 
                            border: '1px solid', borderColor: isMe ? '#c8e6c9' : '#e0e0e0',
                            borderTopRightRadius: isMe ? 0 : 8, borderTopLeftRadius: !isMe ? 0 : 8,
                          }}>
                            <Typography variant="body2" sx={{ color: '#222', whiteSpace: 'pre-wrap' }}>{msg.content}</Typography>
                            <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 0.5, color: isMe ? '#558b2f' : '#9e9e9e', fontSize: '0.65rem' }}>
                              {horaStr}
                            </Typography>
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
                  fullWidth size="small" placeholder="Escreva uma mensagem..." variant="outlined"
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

        {/* COLUNA DIREITA COMPONENTIZADA (A Mágica acontece aqui!) */}
        <ChatApoioDireita 
          onClose={onClose} 
          onEnviarAgendamento={enviarCardAgendamento} 
          onEnviarPaciente={enviarCardPaciente}
        />
        
    </Dialog>
  );
};

export default ChatInterno;