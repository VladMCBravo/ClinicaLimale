// ChatContext.jsx
import React, { createContext, useState, useEffect, useContext, useRef, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';

const ChatContext = createContext();
export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const auth = useAuth() || {};
  const user = auth.user;
  const [socket, setSocket] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // ANTES: só existia um contador global (mensagensNaoLidas) que era zerado
  // ao abrir o chat, sem guardar de qual conversa vinha a mensagem.
  // AGORA: guardamos por conversa (chave "user_8" / "room_3"), igual ao que a
  // sidebar precisa pra badge + ordenação. Isso sobrevive independente do
  // ChatInterno estar montado ou não, porque mora aqui no Provider (que nunca desmonta).
  const [naoLidas, setNaoLidas] = useState({});
  const [ultimaAtividade, setUltimaAtividade] = useState({});

  // Qual conversa está aberta DENTRO do chat agora (ex: "user_8"). Null se nenhuma
  // ou se o chat estiver fechado. É isso que evita contar como "não lida" uma
  // mensagem da conversa que a pessoa já está olhando.
  const [contatoAtivoKey, setContatoAtivoKey] = useState(null);

  const isChatOpenRef = useRef(isChatOpen);
  const userRef = useRef(user);
  const contatoAtivoKeyRef = useRef(contatoAtivoKey);

  useEffect(() => { isChatOpenRef.current = isChatOpen; }, [isChatOpen]);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { contatoAtivoKeyRef.current = contatoAtivoKey; }, [contatoAtivoKey]);

  useEffect(() => {
    // Fonte correta e única do token
    const tokenSeguro = sessionStorage.getItem('authToken');
    if (!tokenSeguro || !user) return; // sem token ou sem usuário logado, não conecta

    let ws;
    let reconnectTimeout;
    let manualClose = false;

    const connect = () => {
      const wsUrl = process.env.NODE_ENV === 'production'
        ? `wss://clinicalimale.onrender.com/ws/chat/?token=${tokenSeguro}`
        : `ws://localhost:8000/ws/chat/?token=${tokenSeguro}`;

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('🟢 [WEBSOCKET] Conectado!');
        setSocket(ws);
      };

      ws.onclose = () => {
        console.log('⚪ [WEBSOCKET] Conexão encerrada.');
        setSocket(null);
        if (!manualClose) {
          reconnectTimeout = setTimeout(connect, 3000); // reconexão automática
        }
      };

      ws.onerror = (err) => console.error('🔴 [WEBSOCKET] Erro:', err);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'chat_message') {
          const msg = data.message;
          const currentUser = userRef.current;
          const chatAberto = isChatOpenRef.current;
          const chaveConversa = msg.room_id ? `room_${msg.room_id}` : `user_${msg.sender_id}`;
          const souEuQueMandei = currentUser && msg.sender_id === currentUser.id;
          const estaOlhandoEssaConversaAgora = chatAberto && contatoAtivoKeyRef.current === chaveConversa;

          console.log(
            `[CHAT-CTX] chat_message id=${msg.id} de sender_id=${msg.sender_id} (${msg.sender_nome || '?'}) ` +
            `chave=${chaveConversa} souEuQueMandei=${souEuQueMandei} chatAberto=${chatAberto} ` +
            `conversaAtiva=${contatoAtivoKeyRef.current} estaOlhandoEssaConversaAgora=${estaOlhandoEssaConversaAgora}`
          );

          // Guarda o horário da última mensagem SEMPRE, esteja o chat aberto ou não,
          // é o que a sidebar usa pra ordenar tipo WhatsApp.
          setUltimaAtividade(prev => ({ ...prev, [chaveConversa]: msg.created_at || new Date().toISOString() }));

          if (!souEuQueMandei && !estaOlhandoEssaConversaAgora) {
            setNaoLidas(prev => {
              const atualizado = { ...prev, [chaveConversa]: (prev[chaveConversa] || 0) + 1 };
              console.log(`[CHAT-CTX] naoLidas[${chaveConversa}] agora = ${atualizado[chaveConversa]}`, atualizado);
              return atualizado;
            });

            // Avisa o backend que a mensagem chegou no dispositivo (tique cinza duplo),
            // mesmo com o chat fechado. Antes isso só acontecia se o ChatInterno estivesse montado.
            if (ws.readyState === 1) {
              ws.send(JSON.stringify({ action: 'update_status', message_id: msg.id, status: 'delivered' }));
            }
          }
        }
      };
    };

    connect();

    return () => {
      manualClose = true;
      clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, [user]); // reconecta quando o usuário loga/desloga

  // Badge global (ex: sininho no header) = soma de todas as conversas não lidas.
  const mensagensNaoLidas = useMemo(
    () => Object.values(naoLidas).reduce((soma, n) => soma + n, 0),
    [naoLidas]
  );

  // Só abre/fecha o painel. NÃO zera mais naoLidas aqui — cada conversa some do
  // contador quando a pessoa efetivamente clica nela (isso já é feito na sidebar).
  const abrirChat = () => setIsChatOpen(true);
  const fecharChat = () => {
    setIsChatOpen(false);
    setContatoAtivoKey(null); // ninguém está "olhando" nenhuma conversa agora
  };

  return (
    <ChatContext.Provider value={{
      socket,
      isChatOpen,
      abrirChat,
      fecharChat,
      mensagensNaoLidas,
      naoLidas,
      setNaoLidas,
      ultimaAtividade,
      setContatoAtivoKey,
    }}>
      {children}
    </ChatContext.Provider>
  );
};