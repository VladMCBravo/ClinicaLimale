import React, { createContext, useState, useEffect, useContext, useRef, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';

const ChatContext = createContext();
export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const auth = useAuth() || {};
  const user = auth.user;
  const [socket, setSocket] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [naoLidas, setNaoLidas] = useState({});
  const [ultimaAtividade, setUltimaAtividade] = useState({});
  const [contatoAtivoKey, setContatoAtivoKey] = useState(null);

  const isChatOpenRef = useRef(isChatOpen);
  const userRef = useRef(user);
  const contatoAtivoKeyRef = useRef(contatoAtivoKey);

  useEffect(() => { isChatOpenRef.current = isChatOpen; }, [isChatOpen]);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { contatoAtivoKeyRef.current = contatoAtivoKey; }, [contatoAtivoKey]);

  useEffect(() => {
    const tokenSeguro = sessionStorage.getItem('authToken');
    if (!tokenSeguro || !user) return;

    let ws;
    let reconnectTimeout;
    let manualClose = false;
    let isIntentionallyClosed = false; // <-- A CHAVE DO NOSSO SUCESSO

    const connect = () => {
      // Se foi fechado de propósito pelo celular, não deixe reconectar!
      if (isIntentionallyClosed || manualClose) return;

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
        // SÓ RECONECTA SE NÃO FOI UM FECHAMENTO INTENCIONAL
        if (!manualClose && !isIntentionallyClosed) {
          reconnectTimeout = setTimeout(connect, 3000);
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

          setUltimaAtividade(prev => ({ ...prev, [chaveConversa]: msg.created_at || new Date().toISOString() }));

          if (!souEuQueMandei && !estaOlhandoEssaConversaAgora) {
            setNaoLidas(prev => {
              return { ...prev, [chaveConversa]: (prev[chaveConversa] || 0) + 1 };
            });

            if (ws.readyState === 1) {
              ws.send(JSON.stringify({ action: 'update_status', message_id: msg.id, status: 'delivered' }));
            }
          }
        }
      };
    };

    connect();

    // ==========================================
    // CONTROLE DE VISIBILIDADE (O MATADOR DE ZUMBIS CENTRAL)
    // ==========================================
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log('💤 [WEBSOCKET] App minimizado. Suspendendo reconexão...');
        isIntentionallyClosed = true; // Avisa o onclose para NÃO reconectar
        clearTimeout(reconnectTimeout);
        if (ws && ws.readyState === 1) {
          ws.close();
        }
      } else if (document.visibilityState === 'visible') {
        console.log('☀️ [WEBSOCKET] App reaberto. Restaurando conexão...');
        isIntentionallyClosed = false; // Libera a reconexão
        if (!ws || ws.readyState === 3) {
          connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handleVisibilityChange);

    return () => {
      manualClose = true;
      isIntentionallyClosed = true;
      clearTimeout(reconnectTimeout);
      ws?.close();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handleVisibilityChange);
    };
  }, [user]);

  const mensagensNaoLidas = useMemo(
    () => Object.values(naoLidas).reduce((soma, n) => soma + n, 0),
    [naoLidas]
  );

  const abrirChat = () => setIsChatOpen(true);
  const fecharChat = () => {
    setIsChatOpen(false);
    setContatoAtivoKey(null);
  };

  return (
    <ChatContext.Provider value={{
      socket, isChatOpen, abrirChat, fecharChat, mensagensNaoLidas,
      naoLidas, setNaoLidas, ultimaAtividade, setContatoAtivoKey,
    }}>
      {children}
    </ChatContext.Provider>
  );
};