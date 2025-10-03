// src/hooks/useChatWebSocket.js
import { useState, useEffect, useRef } from 'react';
import ReconnectingWebSocket from 'reconnecting-websocket';

export const useChatWebSocket = (sessionId) => {
    const [messages, setMessages] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const ws = useRef(null);

    useEffect(() => {
        if (!sessionId) {
            return; // Não faz nada se não tiver um ID de sessão
        }

        // Constrói a URL do WebSocket a partir do host do backend
        // Adapte 'api.suaclinica.com' para o seu domínio de produção
        const backendHost = 'clinicalimale.onrender.com';
        const wsUrl = `wss://${backendHost}/ws/chat/${sessionId}/`;

        ws.current = new ReconnectingWebSocket(wsUrl);

        ws.current.onopen = () => {
            console.log(`WebSocket conectado para a sessão: ${sessionId}`);
            setIsConnected(true);
            // Aqui você pode carregar o histórico de mensagens da conversa via API REST
        };

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            // --- PONTO DO REFINAMENTO ---
            // Em vez de hardcoded 'bot', usamos os dados do backend.
            // O backend envia um objeto 'message' que contém 'text' e 'author'.
            const messagePayload = data.message; 

            if (messagePayload && messagePayload.text) {
                 setMessages((prevMessages) => [...prevMessages, { 
                    author: messagePayload.author || 'paciente', // Usa o autor do backend ou 'paciente' como fallback
                    text: messagePayload.text 
                }]);
            }
            // --- FIM DO REFINAMENTO ---
        };

        ws.current.onclose = () => {
            console.log(`WebSocket desconectado da sessão: ${sessionId}`);
            setIsConnected(false);
        };

        ws.current.onerror = (error) => {
            console.error("Erro no WebSocket:", error);
        };

        // Função de limpeza para fechar a conexão quando o componente for desmontado
        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [sessionId]); // O hook reage a mudanças no sessionId

    const sendMessage = (messageText) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ message: messageText }));
            // Adiciona a mensagem da recepção à lista localmente
            setMessages((prevMessages) => [...prevMessages, { author: 'recepcao', text: messageText }]);
        }
    };

    return { messages, isConnected, sendMessage };
};