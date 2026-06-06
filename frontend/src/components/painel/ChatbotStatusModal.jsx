import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, Box, Typography, Button, CircularProgress, IconButton } from '@mui/material';
import { FaTimes, FaQrcode, FaCheckCircle, FaExclamationTriangle, FaSignOutAlt } from 'react-icons/fa';
import apiClient from '../../api/axiosConfig';

export default function ChatbotStatusModal({ open, onClose }) {
    const [statusData, setStatusData] = useState({ status: 'loading', qr_code_base64: null, mensagem: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            verificarStatus();
        }
    }, [open]);

    const verificarStatus = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/chatbot/whatsapp/status/');
            setStatusData(response.data);
        } catch (error) {
            setStatusData({ status: 'erro', mensagem: 'Erro de comunicação com o servidor.' });
        } finally {
            setLoading(false);
        }
    };

    // --- NOVA FUNÇÃO DE DESCONECTAR ---
    const handleDesconectar = async () => {
        if (!window.confirm("Tem certeza que deseja desconectar o número de WhatsApp atual? O Chatbot vai parar de funcionar até você ler o QR Code novamente.")) return;
        
        setLoading(true);
        try {
            await apiClient.post('/chatbot/whatsapp/logout/');
            // Assim que desconecta, chama o verificarStatus para puxar o QR Code novo na hora!
            await verificarStatus(); 
        } catch (error) {
            alert("Erro ao tentar desconectar o WhatsApp.");
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f4f5f7', pb: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">Conexão do WhatsApp</Typography>
                <IconButton onClick={onClose} size="small"><FaTimes size={16}/></IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 250, justifyContent: 'center' }}>
                
                {loading ? (
                    <CircularProgress />
                ) : statusData.status === 'conectado' ? (
                    <Box sx={{ textAlign: 'center', color: '#2e7d32', width: '100%' }}>
                        <FaCheckCircle size={60} style={{ marginBottom: 15 }} />
                        <Typography variant="h6" fontWeight="bold">Conectado!</Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                            O Chatbot e os envios automáticos estão funcionando normalmente.
                        </Typography>
                        
                        {/* NOVO BOTÃO DE DESCONECTAR */}
                        <Button 
                            variant="outlined" 
                            color="error" 
                            fullWidth 
                            startIcon={<FaSignOutAlt />}
                            onClick={handleDesconectar}
                        >
                            Desconectar Número
                        </Button>
                    </Box>
                ) : statusData.status === 'qr_code' ? (
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="error" fontWeight="bold" sx={{ mb: 2 }}>
                            Desconectado. Leia o QR Code para reconectar:
                        </Typography>
                        <Box sx={{ p: 1, border: '2px dashed #ccc', borderRadius: 2, display: 'inline-block', mb: 2 }}>
                            <img src={statusData.qr_code_base64} alt="QR Code WhatsApp" style={{ width: 200, height: 200 }} />
                        </Box>
                        
                        <Button 
                            variant="contained" 
                            fullWidth 
                            onClick={verificarStatus} 
                            startIcon={<FaQrcode />}
                        >
                            Atualizar QR Code
                        </Button>
                    </Box>
                ) : (
                    <Box sx={{ textAlign: 'center', color: '#d32f2f' }}>
                        <FaExclamationTriangle size={50} style={{ marginBottom: 15 }} />
                        <Typography variant="subtitle1" fontWeight="bold">Erro de Conexão</Typography>
                        <Typography variant="body2">{statusData.mensagem}</Typography>
                        
                        <Button variant="contained" fullWidth sx={{ mt: 3 }} onClick={verificarStatus}>
                            Tentar Novamente
                        </Button>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
}