import React, { useState, useEffect, useRef } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/axiosConfig';

import ChatSidebarEsquerda from './ChatInterno/ChatSidebarEsquerda';
import ChatAreaMeio from './ChatInterno/ChatAreaMeio';
// Nota: O ChatApoioDireita (agenda/pacientes) foi intencionalmente ocultado 
// na versão mobile para focar na comunicação rápida estilo WhatsApp.

export default function ChatMobilePage() {
  const { user: currentUser } = useAuth();
  const { socket, naoLidas, setNaoLidas, ultimaAtividade, setContatoAtivoKey } = useChat();
  const { showSnackbar } = useSnackbar();

  const [contatoAtivo, setContatoAtivoState] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [mensagemAtual, setMensagemAtual] = useState('');

  const contatoAtivoRef = useRef(contatoAtivo);

  const setContatoAtivo = (item) => {
    setContatoAtivoState(item);
    if (item) {
      const chave = item.is_room ? `room_${item.id}` : `user_${item.id}`;
      setContatoAtivoKey(chave);
    } else {
      setContatoAtivoKey(null);
    }
  };

  useEffect(() => { contatoAtivoRef.current = contatoAtivo; }, [contatoAtivo]);

  useEffect(() => {
    return () => setContatoAtivoKey(null);
  }, []);

  // 1. OUVINTE DO WEBSOCKET
  useEffect(() => {
    if (!socket) return;
    const handleMessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'chat_message') {
        const msg = data.message;
        const currentContato = contatoAtivoRef.current;
        const incomingChatKey = msg.room_id ? `room_${msg.room_id}` : `user_${msg.sender_id}`;
        
        let activeChatKey = null;
        if (currentContato) {
            activeChatKey = currentContato.is_room ? `room_${currentContato.id}` : `user_${currentContato.id}`;
        }

        const pertenceAAbaAtual = (incomingChatKey === activeChatKey) || (!msg.room_id && msg.sender_id === currentUser.id);

        if (pertenceAAbaAtual) {
            setMensagens((prev) => [...prev, { ...msg, sender: msg.sender_id === currentUser.id ? 'me' : 'other' }]);
            if (msg.sender_id !== currentUser.id) {
               socket.send(JSON.stringify({ action: 'update_status', message_id: msg.id, status: 'read' }));
            }
          } else if (msg.sender_id !== currentUser.id) {
            
            // 👇 CORREÇÃO 1: Avisa o PC que a mensagem chegou (Tique duplo cinza) 👇
            if (socket.readyState === WebSocket.OPEN) {
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

  // 👇 CORREÇÃO 2: Controle de Visibilidade e Acionamento de Push 👇
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // App minimizado: Desconecta o WebSocket na força! 
        // Isso avisa o Django imediatamente que estamos offline, forçando ele a mandar Push.
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.close(); 
        }
      } else if (document.visibilityState === 'visible') {
        // App voltou pra tela: Se o usuário estava dentro de uma conversa, 
        // forçamos um recarregamento da mesma para puxar as mensagens perdidas do REST.
        if (contatoAtivoRef.current) {
          setContatoAtivoState({ ...contatoAtivoRef.current }); 
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [socket]);

  // 2. BUSCAR HISTÓRICO REST
  useEffect(() => {
    if (contatoAtivo) {
      setMensagens([]);
      const url = contatoAtivo.is_room ? `/chat/history/?room_id=${contatoAtivo.id}` : `/chat/history/?contact_id=${contatoAtivo.id}`;
      apiClient.get(url)
        .then(res => {
          const lista = Array.isArray(res.data) ? res.data : (res.data.results || []);
          const historicoFormatado = lista.map(msg => {
            if (!msg.is_mine && !msg.is_read && socket && socket.readyState === 1) {
                socket.send(JSON.stringify({ action: 'update_status', message_id: msg.id, status: 'read' }));
                msg.is_read = true;
            }
            return { ...msg, sender: msg.is_mine ? 'me' : 'other' };
          });
          setMensagens(historicoFormatado);
        })
        .catch(err => console.error("Erro ao carregar histórico:", err));
    }
  }, [contatoAtivo, socket]);

  const dispararMensagem = (conteudo, tipo, idAnexo = null, dadosAnexo = null) => {
    if (!socket || socket.readyState !== 1 || !contatoAtivo) return;
    const payload = {
      action: 'send_message',
      content: conteudo,
      attachment_type: tipo,
      attachment_id: idAnexo,
      attachment_data: dadosAnexo,
      room_id: contatoAtivo.is_room ? contatoAtivo.id : undefined,
      receiver_id: !contatoAtivo.is_room ? contatoAtivo.id : undefined,
    };
    socket.send(JSON.stringify(payload));
  };

  const enviarTexto = (e) => {
    e.preventDefault();
    if (mensagemAtual.trim()) {
      dispararMensagem(mensagemAtual.trim(), 'text');
      setMensagemAtual('');
    }
  };

  const baixarDocumento = async (id) => {
    try {
        const res = await apiClient.get(`/pdf/atestado/${id}/`, { responseType: 'blob' });
        window.open(URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' })), '_blank');
    } catch (err) { alert("Erro ao abrir documento."); }
  };

  return (
    <Box sx={{ 
      height: '100vh', 
      width: '100vw', 
      display: 'flex', 
      overflow: 'hidden', 
      bgcolor: '#fff',
      // 👇 CORREÇÃO 3: Respeita as áreas recortadas do celular (câmera no topo e barra no rodapé) 👇
      pt: 'env(safe-area-inset-top, 20px)', 
      pb: 'env(safe-area-inset-bottom, 10px)'
    }}>
      
      {/* SE NÃO HOUVER CONTATO SELECIONADO: MOSTRA A LISTA EM TELA CHEIA */}
      {!contatoAtivo && (
        <ChatSidebarEsquerda 
          width="100%" 
          currentUser={currentUser}
          contatoAtivo={contatoAtivo} 
          setContatoAtivo={setContatoAtivo} 
          naoLidas={naoLidas} 
          setNaoLidas={setNaoLidas}
          ultimaAtividade={ultimaAtividade}
        />
      )}

      {/* SE HOUVER CONTATO: MOSTRA O CHAT EM TELA CHEIA */}
      {contatoAtivo && (
        <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          
          {/* HEADER MOBILE COM BOTÃO VOLTAR */}
          <Box sx={{ bgcolor: '#1a233b', color: '#fff', px: 1, py: 0.5, display: 'flex', alignItems: 'center' }}>
            <IconButton color="inherit" onClick={() => setContatoAtivo(null)}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ ml: 1 }}>
              {contatoAtivo.nome_exibicao || contatoAtivo.name}
            </Typography>
          </Box>

          {/* O ChatAreaMeio preenche o resto da tela */}
          <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
            <ChatAreaMeio 
              contatoAtivo={contatoAtivo}
              mensagens={mensagens}
              mensagemAtual={mensagemAtual}
              setMensagemAtual={setMensagemAtual}
              onSendMessage={enviarTexto}
              onBaixarDocumento={baixarDocumento}
            />
          </Box>
        </Box>
      )}

    </Box>
  );
}