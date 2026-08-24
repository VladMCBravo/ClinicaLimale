// src/contexts/ChatContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';

const ChatContext = createContext();
export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    if (user && token) {
      // Regra dinâmica: Se for produção (Vercel), usa a URL do Render. Se for local, usa localhost.
      const wsUrl = process.env.NODE_ENV === 'production'
        ? `wss://clinicalimale.onrender.com/ws/chat/?token=${token}`
        : `ws://localhost:8000/ws/chat/?token=${token}`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => console.log('🟢 Conectado ao Servidor de Chat Global');

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'chat_message') {
          if (data.message.sender_id !== user.id && !isChatOpen) {
            setMensagensNaoLidas((prev) => prev + 1);
          }
        }
      };

      setSocket(ws);
      return () => ws.close();
    }
  }, [user, token, isChatOpen]); // <- AQUI ESTAVA O VILÃO (já removido!)

  const abrirChat = () => {
    setIsChatOpen(true);
    setMensagensNaoLidas(0);
  };

  const fecharChat = () => setIsChatOpen(false);

  return (
    <ChatContext.Provider value={{ socket, mensagensNaoLidas, isChatOpen, abrirChat, fecharChat }}>
      {children}
    </ChatContext.Provider>
  );
};