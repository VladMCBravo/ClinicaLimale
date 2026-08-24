// src/contexts/ChatContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';

// 1. IMPORTAR O ARQUIVO DE SOM
// import somNotificacao from '../assets/notification.mp3'; 

const ChatContext = createContext();
export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // 2. INSTANCIAR O OBJETO DE ÁUDIO (usando o useState para criar apenas uma vez)
  const [audioAlerta] = useState(new Audio(somNotificacao));

  useEffect(() => {
    if (user && token) {
      const ws = new WebSocket(`ws://localhost:8000/ws/chat/?token=${token}`);

      ws.onopen = () => console.log('🟢 Conectado ao Servidor de Chat Global');

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'chat_message') {
          
          if (data.message.sender_id !== user.id && !isChatOpen) {
            setMensagensNaoLidas((prev) => prev + 1);
            
            // 3. TOCAR O SOM
            // Usamos o .catch porque navegadores bloqueiam áudio se o usuário 
            // não tiver interagido com a página (clicado em algo) previamente.
            audioAlerta.play().catch((err) => {
              console.log("O navegador bloqueou o áudio automático:", err);
            });
          }
        }
      };

      setSocket(ws);
      return () => ws.close();
    }
  }, [user, token, isChatOpen, audioAlerta]); 

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