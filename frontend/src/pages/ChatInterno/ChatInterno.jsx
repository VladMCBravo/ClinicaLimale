import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../hooks/useAuth'; 
import apiClient from '../../api/axiosConfig';

// NOSSOS COMPONENTES MODULARIZADOS
import ChatSidebarEsquerda from './ChatSidebarEsquerda';
import ChatAreaMeio from './ChatAreaMeio';
import ChatApoioDireita from './ChatApoioDireita';

const ChatInterno = ({ onClose, token }) => {
  const { user: currentUser } = useAuth(); 
  const { socket } = useChat();
  const { showSnackbar } = useSnackbar(); 
  
  const [contatoAtivo, setContatoAtivo] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [mensagemAtual, setMensagemAtual] = useState('');
  
  // Agora as não lidas usam prefixos: "user_2" ou "room_1"
  const [naoLidas, setNaoLidas] = useState({});
  // NOVO: guarda o horário da última mensagem de cada conversa (mesma chave "user_2"/"room_1")
  // -> é isso que faltava para ordenar a sidebar por "quem mandou mensagem por último", estilo WhatsApp
  const [ultimaAtividade, setUltimaAtividade] = useState({});
  const contatoAtivoRef = useRef(contatoAtivo);

  useEffect(() => { contatoAtivoRef.current = contatoAtivo; }, [contatoAtivo]);

  // 1. OUVINTE DO WEBSOCKET
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event) => {
      const data = JSON.parse(event.data);

      console.log('[CHAT-WS] Evento recebido do socket:', data);

      if (data.type === 'chat_message') {
        const msg = data.message;
        const currentContato = contatoAtivoRef.current;
        
        // Identifica qual é a chave da mensagem recebida (P2P ou Grupo)
        const incomingChatKey = msg.room_id ? `room_${msg.room_id}` : `user_${msg.sender_id}`;
        
        // Identifica qual a aba que o usuário está olhando agora
        let activeChatKey = null;
        if (currentContato) {
            activeChatKey = currentContato.is_room ? `room_${currentContato.id}` : `user_${currentContato.id}`;
        }

        // É da aba aberta? Ou fui eu mesmo que mandei via P2P (para refletir na minha tela)?
        const pertenceAAbaAtual = (incomingChatKey === activeChatKey) || (!msg.room_id && msg.sender_id === currentUser.id);

        console.log(
          `[CHAT-WS] msg_id=${msg.id} de sender_id=${msg.sender_id} (${msg.sender_nome || '?'}) ` +
          `incomingChatKey=${incomingChatKey} activeChatKey=${activeChatKey} pertenceAAbaAtual=${pertenceAAbaAtual}`
        );

        // NOVO: registra o horário desta conversa, esteja ela aberta ou não.
        // É isso que a sidebar vai usar pra subir a conversa mais recente pro topo.
        setUltimaAtividade(prev => {
          const atualizado = { ...prev, [incomingChatKey]: msg.created_at || new Date().toISOString() };
          console.log('[CHAT-WS] ultimaAtividade atualizada:', atualizado);
          return atualizado;
        });

        if (pertenceAAbaAtual) {
          setMensagens((prev) => [...prev, { ...msg, sender: msg.sender_id === currentUser.id ? 'me' : 'other' }]);
          
          if (msg.sender_id !== currentUser.id) {
             socket.send(JSON.stringify({ action: 'update_status', message_id: msg.id, status: 'read' }));
          }
        } 
        else if (msg.sender_id !== currentUser.id) {
          // Chegou para outra aba! Aumenta a bolinha vermelha.
          socket.send(JSON.stringify({ action: 'update_status', message_id: msg.id, status: 'delivered' }));
          
          setNaoLidas(prev => {
            const atualizado = {
              ...prev,
              [incomingChatKey]: (prev[incomingChatKey] || 0) + 1
            };
            console.log(`[CHAT-WS] naoLidas[${incomingChatKey}] agora = ${atualizado[incomingChatKey]}`, atualizado);
            return atualizado;
          });

          try { new Audio('/notificacao.mp3').play().catch(()=>{}); } catch (e) { }
          showSnackbar(`Nova mensagem em ${msg.room_id ? 'Consultório' : (msg.sender_nome || 'Colega')}!`, 'info');
        }
      } 
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
    };
    
    socket.addEventListener('message', handleMessage);
    return () => socket.removeEventListener('message', handleMessage);
  }, [socket, currentUser.id, showSnackbar]);

  // 2. BUSCAR HISTÓRICO REST
  useEffect(() => {
    if (contatoAtivo) {
      setMensagens([]); 
      // Roteamento inteligente: /history/?room_id=X ou /history/?contact_id=Y
      const url = contatoAtivo.is_room 
          ? `/chat/history/?room_id=${contatoAtivo.id}`
          : `/chat/history/?contact_id=${contatoAtivo.id}`;

      console.log('[CHAT-HIST] Buscando histórico em', url);

      apiClient.get(url)
        .then(res => {
          const lista = Array.isArray(res.data) ? res.data : (res.data.results || []);
          console.log(`[CHAT-HIST] ${lista.length} mensagens recebidas de ${url}`);
          const historicoFormatado = lista.map(msg => {
            if (!msg.is_mine && !msg.is_read && socket && socket.readyState === 1) {
                socket.send(JSON.stringify({ action: 'update_status', message_id: msg.id, status: 'read' }));
                msg.is_read = true;
            }
            return { ...msg, sender: msg.is_mine ? 'me' : 'other' };
          });
          setMensagens(historicoFormatado);
        })
        .catch(err => console.error("[CHAT-HIST] Erro ao carregar histórico:", err));
    }
  }, [contatoAtivo, socket]);

  // 3. FUNÇÕES DE ENVIO GENÉRICAS
  const dispararMensagem = (conteudo, tipo, idAnexo = null, dadosAnexo = null) => {
    if (!socket || socket.readyState !== 1 || !contatoAtivo) {
      console.warn('[CHAT-WS] Envio abortado: socket não pronto ou nenhum contato ativo.', {
        socketState: socket?.readyState, contatoAtivo
      });
      return;
    }

    const payload = {
      action: 'send_message',
      content: conteudo,
      attachment_type: tipo,
      attachment_id: idAnexo,
      attachment_data: dadosAnexo,
      // Direcionamento dinâmico
      room_id: contatoAtivo.is_room ? contatoAtivo.id : undefined,
      receiver_id: !contatoAtivo.is_room ? contatoAtivo.id : undefined,
    };

    console.log('[CHAT-WS] Enviando payload:', payload);
    socket.send(JSON.stringify(payload));
  };

  const enviarTexto = (e) => {
    e.preventDefault();
    if (mensagemAtual.trim()) {
      dispararMensagem(mensagemAtual.trim(), 'text');
      setMensagemAtual('');
    }
  };

  const enviarAgendamento = (ag) => dispararMensagem(
    `Agendamento: ${ag.paciente_nome} às ${new Date(ag.data_hora_inicio).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`, 
    'appointment', ag.id, ag
  );

  const enviarPaciente = (pac) => dispararMensagem(
    `👤 ${pac.nome_completo || pac.nome}\n📱 Tel: ${pac.telefone_celular || 'N/I'}\n✉️ Email: ${pac.email || 'N/I'}`, 
    'patient', pac.id, pac
  );

  const enviarDocumento = (doc, pac) => dispararMensagem(
    `📄 ${doc.tipo_atestado || 'Documento'}\n👤 Paciente: ${pac.nome_completo || pac.nome}`, 
    'document', doc.id, doc
  );

  const baixarDocumento = async (id) => {
    try {
        const res = await apiClient.get(`/pdf/atestado/${id}/`, { responseType: 'blob' });
        window.open(URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' })), '_blank');
    } catch (err) { alert("Erro ao abrir documento."); }
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="xl" fullWidth PaperProps={{ sx: { height: '90vh', display: 'flex', flexDirection: 'row', borderRadius: 2, overflow: 'hidden' }}}>
        
        <ChatSidebarEsquerda 
          currentUser={currentUser}
          contatoAtivo={contatoAtivo} 
          setContatoAtivo={setContatoAtivo} 
          naoLidas={naoLidas} 
          setNaoLidas={setNaoLidas}
          ultimaAtividade={ultimaAtividade}
        />

        <ChatAreaMeio 
          contatoAtivo={contatoAtivo}
          mensagens={mensagens}
          mensagemAtual={mensagemAtual}
          setMensagemAtual={setMensagemAtual}
          onSendMessage={enviarTexto}
          onBaixarDocumento={baixarDocumento}
        />

        <ChatApoioDireita 
          onClose={onClose} 
          onEnviarAgendamento={enviarAgendamento} 
          onEnviarPaciente={enviarPaciente}
          onEnviarDocumento={enviarDocumento}
        />
        
    </Dialog>
  );
};

export default ChatInterno;