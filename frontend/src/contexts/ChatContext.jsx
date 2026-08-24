// src/contexts/ChatContext.jsx
import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';

const ChatContext = createContext();
export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  // 1. Puxa as variáveis de forma segura do hook
  const auth = useAuth() || {};
  const user = auth.user;
  const token = auth.token;

  const [socket, setSocket] = useState(null);
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // 2. O SEGREDO: Usamos Refs para que o WebSocket consiga ler esses valores
  // sem precisar reiniciar a conexão toda vez que a janela abre/fecha!
  const isChatOpenRef = useRef(isChatOpen);
  const userRef = useRef(user);

  useEffect(() => { isChatOpenRef.current = isChatOpen; }, [isChatOpen]);
  useEffect(() => { userRef.current = user; }, [user]);

  // 3. MOTOR DE CONEXÃO BLINDADO
  useEffect(() => {
    // Busca o token do hook ou do cofre local
    const tokenSeguro = token || localStorage.getItem('token') || localStorage.getItem('access');

    if (tokenSeguro) {
      const wsUrl = process.env.NODE_ENV === 'production'
        ? `wss://clinicalimale.onrender.com/ws/chat/?token=${tokenSeguro}`
        : `ws://localhost:8000/ws/chat/?token=${tokenSeguro}`;

      console.log("👉 [DEBUG WS] Iniciando motor WebSocket...");
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
          console.log('🟢 [WEBSOCKET] Conectado e PRONTO!');
          setSocket(ws);
      };

      ws.onclose = () => {
          console.log('⚪ [WEBSOCKET] Conexão encerrada.');
          setSocket(null);
      };

      ws.onerror = (err) => console.error('🔴 [WEBSOCKET] Erro:', err);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'chat_message') {
          // Lemos os valores a partir do Ref (sem reiniciar a conexão)
          const currentUser = userRef.current;
          const chatAberto = isChatOpenRef.current;

          if (currentUser && data.message.sender_id !== currentUser.id && !chatAberto) {
            setMensagensNaoLidas((prev) => prev + 1);
          }
        }
      };

      return () => ws.close();
    }
  }, [token]); // Depende APENAS do Token. Só reconecta se o usuário deslogar/logar.

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