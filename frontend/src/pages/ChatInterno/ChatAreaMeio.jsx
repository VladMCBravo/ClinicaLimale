import React, { useRef, useEffect } from 'react';
import { Box, Typography, Avatar, TextField, IconButton, Paper, Button } from '@mui/material';
import { 
  Send as SendIcon, Person as PersonIcon, Event as EventIcon, 
  Description as DescriptionIcon, Done as DoneIcon, DoneAll as DoneAllIcon, Groups as GroupsIcon, AttachFile as AttachFileIcon
} from '@mui/icons-material';

export default function ChatAreaMeio({ 
  contatoAtivo, mensagens, mensagemAtual, setMensagemAtual, 
  onSendMessage, onBaixarDocumento, onOpenApoio 
}) {
  const mensagensFimRef = useRef(null);

  useEffect(() => {
    mensagensFimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  if (!contatoAtivo) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f0f2f5' }}>
        <Typography variant="button" color="text.secondary" sx={{ letterSpacing: 1 }}>
          Selecione um membro ou consultório para iniciar
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#f0f2f5', position: 'relative' }}>
      
      {/* HEADER DO CHAT */}
      <Box sx={{ p: 2, bgcolor: '#fff', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center' }}>
        <Avatar sx={{ bgcolor: contatoAtivo.is_room ? '#ef6c00' : '#1976d2', mr: 2 }}>
          {contatoAtivo.is_room ? <GroupsIcon /> : contatoAtivo.nome_exibicao?.charAt(0)}
        </Avatar>
        <Box>
          <Typography variant="subtitle1" fontWeight="bold" lineHeight={1.2}>
            {contatoAtivo.nome_exibicao || contatoAtivo.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" textTransform="capitalize">
            {contatoAtivo.is_room ? 'Grupo do Consultório' : contatoAtivo.cargo}
          </Typography>
        </Box>
      </Box>
      
      {/* ÁREA DE MENSAGENS */}
      <Box sx={{ flex: 1, p: 3, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {mensagens.map((msg, idx) => {
          const isMe = msg.sender === 'me';
          const horaMsg = msg.timestamp || msg.created_at || new Date().toISOString();
          const horaStr = new Date(horaMsg).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

          const renderHorarioETiques = () => (
            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mt: 0.5, color: isMe ? '#558b2f' : '#9e9e9e', fontSize: '0.65rem' }}>
              {horaStr}
              {isMe && (
                <Box component="span" sx={{ ml: 0.5, display: 'inline-flex' }}>
                  {msg.is_read ? <DoneAllIcon sx={{ fontSize: 16, color: '#2196f3' }} /> 
                   : msg.is_delivered ? <DoneAllIcon sx={{ fontSize: 16, color: '#9e9e9e' }} /> 
                   : <DoneIcon sx={{ fontSize: 16, color: '#9e9e9e' }} />}
                </Box>
              )}
            </Typography>
          );

          return (
            <Box key={idx} sx={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              {/* Box que agrupa Nome, Balão de Mensagem e Tiques, para parecer com WhatsApp */}
              <Box sx={{ maxWidth: '85%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                
                {/* Nome aparece DENTRO do conceito visual do balão (ou grudado nele) */}
                {!isMe && contatoAtivo.is_room && msg.sender_nome && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      display: 'block', 
                      color: '#075e54', // Tom esverdeado WhatsApp para dar constraste
                      fontWeight: 'bold', 
                      mb: 0.2, 
                      ml: 0.5 
                    }}
                  >
                    {msg.sender_nome}
                  </Typography>
                )}
              
                {msg.attachment_type === 'appointment' ? (
                  <Paper elevation={1} sx={{ overflow: 'hidden', borderRadius: 2, border: '1px solid #90caf9', width: '100%' }}>
                    <Box sx={{ bgcolor: '#e3f2fd', px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <EventIcon color="primary" fontSize="small" />
                      <Typography variant="caption" fontWeight="bold" color="primary">FICHA DE AGENDAMENTO</Typography>
                    </Box>
                    <Box sx={{ p: 2, bgcolor: '#fff' }}>
                      <Typography variant="body2" fontWeight="bold" sx={{ color: '#333' }}>{msg.content}</Typography>
                      {renderHorarioETiques()}
                    </Box>
                  </Paper>
                ) : msg.attachment_type === 'document' ? (
                  <Paper elevation={1} sx={{ overflow: 'hidden', borderRadius: 2, border: '1px solid #ff9800', width: '100%' }}>
                    <Box sx={{ bgcolor: '#fff3e0', px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DescriptionIcon color="warning" fontSize="small" />
                      <Typography variant="caption" fontWeight="bold" color="warning.dark">DOCUMENTO MÉDICO</Typography>
                    </Box>
                    <Box sx={{ p: 2, bgcolor: '#fff', whiteSpace: 'pre-wrap' }}>
                      <Typography variant="body2" fontWeight="bold" sx={{ color: '#333' }}>{msg.content}</Typography>
                      <Button size="small" variant="outlined" color="warning" onClick={() => onBaixarDocumento(msg.attachment_id)} sx={{ mt: 1, textTransform: 'none' }}>
                        Visualizar PDF
                      </Button>
                      {renderHorarioETiques()}
                    </Box>
                  </Paper>
                ) : msg.attachment_type === 'patient' ? (
                  <Paper elevation={1} sx={{ overflow: 'hidden', borderRadius: 2, border: '1px solid #ce93d8', width: '100%' }}>
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
                    p: 1, px: 1.5, borderRadius: 2.5,  // Arredondamento mais orgânico (WhatsApp style)
                    bgcolor: isMe ? '#dcf8c6' : '#fff', 
                    border: '1px solid', borderColor: isMe ? '#c8e6c9' : '#e0e0e0',
                    borderTopRightRadius: isMe ? 0 : 12, borderTopLeftRadius: !isMe ? 0 : 12,
                    boxShadow: '0px 1px 1px rgba(0,0,0,0.1)' // Sombrinha suave do balão
                  }}>
                    <Typography variant="body2" sx={{ color: '#111', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                       {msg.content}
                    </Typography>
                    {renderHorarioETiques()}
                  </Paper>
                )}
              </Box>
            </Box>
          );
        })}
        <div ref={mensagensFimRef} />
      </Box>

      {/* INPUT DE TEXTO */}
      <Box component="form" onSubmit={onSendMessage} sx={{ 
          p: 2, 
          pb: 'max(env(safe-area-inset-bottom), 16px)', // Protege contra a barra do iPhone
          bgcolor: '#fff', borderTop: '1px solid #e0e0e0', 
          display: 'flex', gap: 1, alignItems: 'center' 
      }}>
        
        {/* BOTÃO DE ANEXAR (Agenda/Pacientes) */}
        {onOpenApoio && (
          <IconButton onClick={onOpenApoio} sx={{ flexShrink: 0, bgcolor: '#f0f2f5' }}>
            <AttachFileIcon />
          </IconButton>
        )}

        <TextField 
          value={mensagemAtual} onChange={(e) => setMensagemAtual(e.target.value)}
          fullWidth size="small" placeholder="Escreva..." variant="outlined"
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 5, bgcolor: '#f8f9fa' } }}
        />
        
        {/* BOTÃO ENVIAR (Com flexShrink para não ser espremido) */}
        <IconButton type="submit" color="primary" sx={{ 
            flexShrink: 0, 
            width: 40, height: 40, // Força a largura fixa e redonda
            bgcolor: '#1976d2', color: '#fff', 
            '&:hover': { bgcolor: '#1565c0' } 
        }}>
          <SendIcon fontSize="small" sx={{ ml: 0.5 }} />
        </IconButton>
      </Box>
    </Box>
  );
}