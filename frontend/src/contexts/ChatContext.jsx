// src/contexts/ChatContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';

const ChatContext = createContext();
export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const { user } = useAuth(); // Puxamos apenas o user do Hook
  const [socket, setSocket] = useState(null);
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    // 1. Buscamos o token diretamente da raiz do navegador com garantia!
    const tokenSeguro = localStorage.getItem('token');

    if (user && tokenSeguro) {
      // 2. Apontamento dinâmico: Render em Produção, Localhost em testes
      const wsUrl = process.env.NODE_ENV === 'production'
        ? `wss://clinicalimale.onrender.com/ws/chat/?token=${tokenSeguro}`
        : `ws://localhost:8000/ws/chat/?token=${tokenSeguro}`;

      console.log("👉 [DEBUG CONTEXTO] Iniciando WebSocket em:", wsUrl);

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => console.log('🟢 [WEBSOCKET] Conectado ao Servidor de Chat Global!');
      
      ws.onerror = (error) => console.error('🔴 [WEBSOCKET] Erro de conexão:', error);

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
    } else {
      console.warn("👉 [DEBUG CONTEXTO] Conexão abortada. User:", !!user, "Token:", !!tokenSeguro);
    }
  }, [user, isChatOpen]); 

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