// src/components/chat/ChatPanel.jsx
import React, { useState, useEffect } from 'react';
import { Box, List, ListItem, ListItemText, Typography, TextField, Button, Paper } from '@mui/material';
import apiClient from '../../api/axiosConfig'; // Seu cliente Axios
import { useChatWebSocket } from '../../hooks/useChatWebSocket';

function ChatWindow({ sessionId }) {
    const { messages, isConnected, sendMessage } = useChatWebSocket(sessionId);
    const [newMessage, setNewMessage] = useState('');

    const handleSend = () => {
        if (newMessage.trim()) {
            sendMessage(newMessage);
            setNewMessage('');
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography variant="h6" sx={{ p: 2 }}>
                Conversa (Sessão: {sessionId}) - {isConnected ? 'Conectado' : 'Desconectado'}
            </Typography>
            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
                {messages.map((msg, index) => (
                    <Paper 
                        key={index} 
                        sx={{ 
                            p: 1.5, 
                            mb: 1, 
                            // Estilo dinâmico baseado no autor
                            bgcolor: msg.author === 'recepcao' ? 'primary.light' : 'grey.200',
                            ml: msg.author === 'recepcao' ? 'auto' : 0, // Alinha à direita se for da recepção
                            mr: msg.author === 'paciente' ? 'auto' : 0, // Alinha à esquerda se for do paciente
                            maxWidth: '80%',
                        }}
                    >
                        <Typography variant="body2">{msg.text}</Typography>
                    </Paper>
                ))}
            </Box>
            <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
                <TextField fullWidth size="small" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
                <Button variant="contained" onClick={handleSend}>Enviar</Button>
            </Box>
        </Box>
    );
}

export default function ChatPanel() {
    const [conversas, setConversas] = useState([]);
    const [selectedSessionId, setSelectedSessionId] = useState(null);

    useEffect(() => {
        // Busca a lista de conversas ativas da API
        const fetchConversas = async () => {
            try {
                const response = await apiClient.get('/chatbot/conversas-ativas/');
                setConversas(response.data);
            } catch (error) {
                console.error("Erro ao buscar conversas:", error);
            }
        };
        fetchConversas();
    }, []);

    if (selectedSessionId) {
        return <ChatWindow sessionId={selectedSessionId} />;
    }

    return (
        <Box>
            <Typography variant="h6" sx={{ p: 2 }}>Conversas Ativas</Typography>
            <List>
                {conversas.map((chat) => (
                    <ListItem button key={chat.session_id} onClick={() => setSelectedSessionId(chat.session_id)}>
                        <ListItemText
                            primary={`Paciente: ${chat.paciente_nome}`}
                            secondary={`Sessão: ${chat.session_id}`}
                        />
                    </ListItem>
                ))}
            </List>
        </Box>
    );
}