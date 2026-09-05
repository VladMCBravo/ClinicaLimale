import React, { useState, useEffect, useRef } from 'react';
import { 
  Dialog, Box, Typography, IconButton, TextField, Button, 
  List, ListItem, ListItemAvatar, ListItemText, Avatar, Badge,
  CircularProgress, Divider, Paper
} from '@mui/material';
import { 
  Send as SendIcon, Person as PersonIcon, Event as EventIcon, 
  Description as DescriptionIcon, Done as DoneIcon, DoneAll as DoneAllIcon 
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../hooks/useAuth'; 
import apiClient from '../../api/axiosConfig';

// IMPORTANDO NOSSA NOVA COLUNA DA DIREITA
import ChatApoioDireita from './ChatApoioDireita';

const ChatInterno = ({ onClose, token }) => {
  const { user: currentUser } = useAuth(); 
  const { socket } = useChat();
  const { showSnackbar } = useSnackbar(); // <--- ADICIONE ESTA LINHA
  
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
          (u.cargo === 'admin' || u.cargo === 'recepcao' || u.cargo === 'medico') && // <-- Adicione 'medico' aqui
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
            
            // NOVO: Se a mensagem não é minha e estou com a aba aberta, eu li!
            if (msg.sender_id !== currentUser.id) {
               socket.send(JSON.stringify({ action: 'update_status', message_id: msg.id, status: 'read' }));
            }
          } else if (msg.sender_id !== currentUser.id) {
            
            // NOVO: A mensagem é pra mim, mas estou em outra aba. Foi entregue, mas não lida.
            socket.send(JSON.stringify({ action: 'update_status', message_id: msg.id, status: 'delivered' }));
            
            setNaoLidasPorContato(prev => ({
              ...prev,
              [msg.sender_id]: (prev[msg.sender_id] || 0) + 1
            }));

            // NOVO: Toca o som de notificação (coloque o arquivo public/notificacao.mp3)
            try {
                const audio = new Audio('/notificacao.mp3');
                audio.play();
            } catch (e) { console.warn("Navegador bloqueou áudio", e); }

            // NOVO: Dispara notificação visual usando o SEU provider!
            showSnackbar(`Nova mensagem de ${msg.sender_nome || 'um colega'}!`, 'info');
          }
        } 
        // NOVO: Escuta a mudança de status (os tiques azuis)
        else if (data.type === 'message_status') {
            setMensagens(prev => prev.map(m => {
                if (m.id === data.message_id) {
                    return { 
                        ...m, 
                        is_delivered: data.status === 'delivered' || m.is_delivered || data.status === 'read',
                        is_read: data.status === 'read' || m.is_read 
                    };
                }
                return m;
            }));
        }
        else if (data.type === 'user_status') {
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
          const historicoFormatado = lista.map(msg => {
            // Varre o histórico e avisa o backend que agora você leu
            if (!msg.is_mine && !msg.is_read && socket && socket.readyState === 1) {
                socket.send(JSON.stringify({ action: 'update_status', message_id: msg.id, status: 'read' }));
                msg.is_read = true;
            }
            return {
                ...msg,
                sender: msg.is_mine ? 'me' : 'other' 
            };
          });
          setMensagens(historicoFormatado);
        })
        .catch(err => console.error("Erro ao carregar histórico:", err));
    }
  }, [contatoAtivo, socket]);


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
      action: 'send_message', // <--- NOVO
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
      action: 'send_message', // <--- NOVO
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
      action: 'send_message', // <--- NOVO
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

  // --- NOVA FUNÇÃO: ENVIAR CARD DO DOCUMENTO ---
  const enviarCardDocumento = (doc, paciente) => {
    if (!checkSocket()) return;

    const dataBR = new Date(doc.data_emissao || doc.created_at).toLocaleDateString('pt-BR');
    const tipo = doc.tipo_atestado || 'Documento Médico';

    const payload = {
      action: 'send_message', // <--- NOVO
      receiver_id: contatoAtivo.id,
      content: `📄 ${tipo}\n👤 Paciente: ${paciente.nome_completo || paciente.nome}\n📅 Data: ${dataBR}`, 
      attachment_type: 'document',
      attachment_id: doc.id,
      attachment_data: doc 
    };

    try { socket.send(JSON.stringify(payload)); } 
    catch (err) { console.error("Erro socket:", err); }
  };

  // --- NOVA FUNÇÃO: ABRIR O PDF DO CHAT ---
  const baixarDocumento = async (id) => {
    try {
        const res = await apiClient.get(`/pdf/atestado/${id}/`, { responseType: 'blob' });
        const fileURL = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        window.open(fileURL, '_blank');
    } catch (err) {
        try { // Fallback para a rota alternativa que estava no seu AtestadoModal
            const resAlt = await apiClient.get(`/prontuario/atestados/${id}/pdf/`, { responseType: 'blob' });
            const fileURLAlt = URL.createObjectURL(new Blob([resAlt.data], { type: 'application/pdf' }));
            window.open(fileURLAlt, '_blank');
        } catch (err2) {
            alert("Erro ao abrir documento. Ele pode ter sido excluído.");
        }
    }
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

                  // CRIAMOS ISSO PARA NÃO REPETIR O CÓDIGO 4 VEZES!
                  const renderHorarioETiques = () => (
                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mt: 1, color: isMe ? '#558b2f' : '#9e9e9e', fontSize: '0.65rem' }}>
                      {horaStr}
                      {isMe && (
                        <Box component="span" sx={{ ml: 0.5, display: 'inline-flex' }}>
                          {msg.is_read ? (
                            <DoneAllIcon sx={{ fontSize: 16, color: '#2196f3' }} /> /* Azul: Lido */
                          ) : msg.is_delivered ? (
                            <DoneAllIcon sx={{ fontSize: 16, color: '#9e9e9e' }} /> /* Cinza Duplo: Entregue */
                          ) : (
                            <DoneIcon sx={{ fontSize: 16, color: '#9e9e9e' }} />    /* Cinza Simples: Enviado */
                          )}
                        </Box>
                      )}
                    </Typography>
                  );

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
                              {renderHorarioETiques()}
                            </Box>
                          </Paper>
                        ) : msg.attachment_type === 'document' ? (
                          <Paper elevation={1} sx={{ overflow: 'hidden', borderRadius: 2, border: '1px solid #ff9800' }}>
                            <Box sx={{ bgcolor: '#fff3e0', px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                              <DescriptionIcon color="warning" fontSize="small" />
                              <Typography variant="caption" fontWeight="bold" color="warning.dark">DOCUMENTO MÉDICO</Typography>
                            </Box>
                            <Box sx={{ p: 2, bgcolor: '#fff', whiteSpace: 'pre-wrap' }}>
                              <Typography variant="body2" fontWeight="bold" sx={{ color: '#333' }}>{msg.content}</Typography>
                              <Button 
                                size="small" variant="outlined" color="warning" 
                                onClick={() => baixarDocumento(msg.attachment_id)}
                                sx={{ mt: 1, textTransform: 'none' }}
                              >
                                Visualizar PDF
                              </Button>
                              {renderHorarioETiques()}
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
                              {renderHorarioETiques()}
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
                            {renderHorarioETiques()}
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
          onEnviarDocumento={enviarCardDocumento} /* <--- NOVA LINHA AQUI */
        />
        
    </Dialog>
  );
};

export default ChatInterno;