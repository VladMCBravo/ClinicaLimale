// ChatContext.jsx
import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';

const ChatContext = createContext();
export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const auth = useAuth() || {};
  const user = auth.user;
  const [socket, setSocket] = useState(null);
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const isChatOpenRef = useRef(isChatOpen);
  const userRef = useRef(user);
  useEffect(() => { isChatOpenRef.current = isChatOpen; }, [isChatOpen]);
  useEffect(() => { userRef.current = user; }, [user]);
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
          const currentUser = userRef.current;
          const chatAberto = isChatOpenRef.current;
          if (currentUser && data.message.sender_id !== currentUser.id && !chatAberto) {
            setMensagensNaoLidas((prev) => prev + 1);
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
  const abrirChat = () => { setIsChatOpen(true); setMensagensNaoLidas(0); };
  const fecharChat = () => setIsChatOpen(false);
  return (
    <ChatContext.Provider value={{ socket, mensagensNaoLidas, isChatOpen, abrirChat, fecharChat }}>
      {children}
    </ChatContext.Provider>
  );
};
