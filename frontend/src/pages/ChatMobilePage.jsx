import React, { useState, useEffect, useRef } from 'react';
import { Box, IconButton, Typography, Paper, BottomNavigation, BottomNavigationAction } from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon, 
  Chat as ChatIcon, 
  CalendarMonth as CalendarIcon, 
  People as PeopleIcon 
} from '@mui/icons-material';

import { useSnackbar } from '../contexts/SnackbarContext';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/axiosConfig';

import ChatSidebarEsquerda from './ChatInterno/ChatSidebarEsquerda';
import ChatAreaMeio from './ChatInterno/ChatAreaMeio';
import ChatApoioDireita from './ChatInterno/ChatApoioDireita';

export default function ChatMobilePage() {
  const { user: currentUser } = useAuth();
  const { socket, naoLidas, setNaoLidas, ultimaAtividade, setContatoAtivoKey } = useChat();
  const { showSnackbar } = useSnackbar();

  const [contatoAtivo, setContatoAtivoState] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [mensagemAtual, setMensagemAtual] = useState('');
  
  const [abaMobile, setAbaMobile] = useState(0);

  const contatoAtivoRef = useRef(contatoAtivo);

  const setContatoAtivo = (item) => {
    setContatoAtivoState(item);
    if (item) {
      setContatoAtivoKey(item.is_room ? `room_${item.id}` : `user_${item.id}`);
    } else {
      setContatoAtivoKey(null);
    }
  };

  useEffect(() => { contatoAtivoRef.current = contatoAtivo; }, [contatoAtivo]);
  useEffect(() => { return () => setContatoAtivoKey(null); }, []);

  // ... (Seus dois useEffects originais do WebSocket e REST permanecem intocados aqui)
  useEffect(() => {
    if (!socket) return;
    const handleMessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'chat_message') {
        const msg = data.message;
        const currentContato = contatoAtivoRef.current;
        const incomingChatKey = msg.room_id ? `room_${msg.room_id}` : `user_${msg.sender_id}`;
        let activeChatKey = currentContato ? (currentContato.is_room ? `room_${currentContato.id}` : `user_${currentContato.id}`) : null;

        if (incomingChatKey === activeChatKey || (!msg.room_id && msg.sender_id === currentUser.id)) {
          setMensagens((prev) => [...prev, { ...msg, sender: msg.sender_id === currentUser.id ? 'me' : 'other' }]);
          if (msg.sender_id !== currentUser.id && socket.readyState === 1) {
             socket.send(JSON.stringify({ action: 'update_status', message_id: msg.id, status: 'read' }));
          }
        } else if (msg.sender_id !== currentUser.id) {
          if (socket.readyState === 1) {
            socket.send(JSON.stringify({ action: 'update_status', message_id: msg.id, status: 'delivered' }));
          }
          try { new Audio('/notificacao.mp3').play().catch(()=>{}); } catch (e) { }
          showSnackbar(`Nova mensagem de ${msg.sender_nome || 'Colega'}`, 'info');
        }
      } else if (data.type === 'message_status') {
          setMensagens(prev => prev.map(m => {
              if (m.id === data.message_id) {
                  return { ...m, is_delivered: data.status === 'delivered' || m.is_delivered || data.status === 'read', is_read: data.status === 'read' || m.is_read };
              }
              return m;
          }));
      }
    };
    socket.addEventListener('message', handleMessage);
    return () => socket.removeEventListener('message', handleMessage);
  }, [socket, currentUser.id, showSnackbar]);

  useEffect(() => {
    if (contatoAtivo) {
      setMensagens([]);
      const url = contatoAtivo.is_room ? `/chat/history/?room_id=${contatoAtivo.id}` : `/chat/history/?contact_id=${contatoAtivo.id}`;
      apiClient.get(url).then(res => {
          const lista = Array.isArray(res.data) ? res.data : (res.data.results || []);
          const historicoFormatado = lista.map(msg => {
            if (!msg.is_mine && !msg.is_read && socket && socket.readyState === 1) {
                socket.send(JSON.stringify({ action: 'update_status', message_id: msg.id, status: 'read' }));
                msg.is_read = true;
            }
            return { ...msg, sender: msg.is_mine ? 'me' : 'other' };
          });
          setMensagens(historicoFormatado);
        }).catch(err => console.error("Erro ao carregar histórico:", err));
    }
  }, [contatoAtivo, socket]);

  const dispararMensagem = (conteudo, tipo, idAnexo = null, dadosAnexo = null) => {
    if (!socket || socket.readyState !== 1 || !contatoAtivo) return;
    const payload = {
      action: 'send_message', content: conteudo, attachment_type: tipo, attachment_id: idAnexo, attachment_data: dadosAnexo,
      room_id: contatoAtivo.is_room ? contatoAtivo.id : undefined, receiver_id: !contatoAtivo.is_room ? contatoAtivo.id : undefined,
    };
    socket.send(JSON.stringify(payload));
  };

  const enviarTexto = (e) => {
    e.preventDefault();
    if (mensagemAtual.trim()) { dispararMensagem(mensagemAtual.trim(), 'text'); setMensagemAtual(''); }
  };

  const enviarAgendamento = (ag) => {
    dispararMensagem(`Agendamento: ${ag.paciente_nome} às ${new Date(ag.data_hora_inicio).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`, 'appointment', ag.id, ag);
    setAbaMobile(0);
  };

  const enviarPaciente = (pac) => {
    dispararMensagem(`👤 ${pac.nome_completo || pac.nome}\n📱 Tel: ${pac.telefone_celular || 'N/I'}`, 'patient', pac.id, pac);
    setAbaMobile(0);
  };

  const enviarDocumento = (doc, pac) => {
    dispararMensagem(`📄 ${doc.tipo_atestado || 'Documento'}\n👤 Paciente: ${pac.nome_completo || pac.nome}`, 'document', doc.id, doc);
    setAbaMobile(0);
  };

  const baixarDocumento = async (id) => {
    try {
        const res = await apiClient.get(`/pdf/atestado/${id}/`, { responseType: 'blob' });
        window.open(URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' })), '_blank');
    } catch (err) { alert("Erro ao abrir documento."); }
  };

  return (
    // FIX 2: Substituímos '100vh' por '100dvh' e definimos o paddingTop no Notch da câmera
    <Box sx={{ 
        height: '100dvh', 
        width: '100vw', 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden', 
        bgcolor: '#fff',
        pt: 'max(env(safe-area-inset-top), 16px)' 
    }}>
      
      {/* Container flexível onde renderiza as listas. Adicionamos mb se tiver navbar */}
      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', mb: !contatoAtivo ? '56px' : 0 }}>
        
        {abaMobile === 0 && !contatoAtivo && (
            <ChatSidebarEsquerda 
              width="100%" currentUser={currentUser} contatoAtivo={contatoAtivo} setContatoAtivo={setContatoAtivo} 
              naoLidas={naoLidas} setNaoLidas={setNaoLidas} ultimaAtividade={ultimaAtividade}
            />
        )}

        {abaMobile === 0 && contatoAtivo && (
          <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ bgcolor: '#1a233b', color: '#fff', px: 1, py: 1, display: 'flex', alignItems: 'center' }}>
              <IconButton color="inherit" onClick={() => setContatoAtivo(null)}>
                <ArrowBackIcon />
              </IconButton>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ ml: 1 }}>
                {contatoAtivo.nome_exibicao || contatoAtivo.name}
              </Typography>
            </Box>

            <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
              <ChatAreaMeio 
                contatoAtivo={contatoAtivo} 
                mensagens={mensagens} 
                mensagemAtual={mensagemAtual}
                setMensagemAtual={setMensagemAtual} 
                onSendMessage={enviarTexto} 
                onBaixarDocumento={baixarDocumento}
                onOpenApoio={() => setAbaMobile(1)} 
              />
            </Box>
          </Box>
        )}

        {/* FIX 4: No mobile, garantimos que OnClose da área direita VOLTE para Aba 0 */}
        {(abaMobile === 1 || abaMobile === 2) && (
           <ChatApoioDireita 
             width="100%"
             tabExterna={abaMobile === 1 ? 0 : 1} 
             onClose={() => setAbaMobile(0)} 
             onEnviarAgendamento={enviarAgendamento} 
             onEnviarPaciente={enviarPaciente}
             onEnviarDocumento={enviarDocumento}
           />
        )}
      </Box>

      {/* FIX 3: Rodapé com position FIXED na base */}
      {!contatoAtivo && (
        <Paper 
          elevation={8}
          sx={{ 
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            pb: 'env(safe-area-inset-bottom)', // Impede que cubra a barra Home do iOS
            zIndex: 1000 
          }}
        >
          <BottomNavigation
            showLabels
            value={abaMobile}
            onChange={(event, newValue) => setAbaMobile(newValue)}
            sx={{ bgcolor: '#f8f9fa' }}
          >
            <BottomNavigationAction label="Chats" icon={<ChatIcon />} />
            <BottomNavigationAction label="Agenda" icon={<CalendarIcon />} />
            <BottomNavigationAction label="Pacientes" icon={<PeopleIcon />} />
          </BottomNavigation>
        </Paper>
      )}

    </Box>
  );
}