import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, TextField, Button, Paper, CircularProgress, Alert, Grid 
} from '@mui/material';
import { AccessTime, Fingerprint, Input, FreeBreakfast, MeetingRoom } from '@mui/icons-material';
import apiClient from '../api/axiosConfig'; // <-- USANDO SEU APICLIENT PARA CORRIGIR O ERRO DE CORS

export default function PontoKioskPage() {
    const [horaAtual, setHoraAtual] = useState(new Date());
    const [cpf, setCpf] = useState('');
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
    const [localizacao, setLocalizacao] = useState(null);

    // Relógio em tempo real
    useEffect(() => {
        const timer = setInterval(() => setHoraAtual(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Captura o GPS assim que a tela abre
    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setLocalizacao({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                (err) => setMensagem({ tipo: 'error', texto: 'Permita o acesso à localização para bater o ponto.' }),
                { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 } // <--- NOVO CÓDIGO AQUI
            );
        } else {
            setMensagem({ tipo: 'error', texto: 'Geolocalização não suportada.' });
        }
    }, []);

    const handleBaterPonto = async (tipo_batida) => {
        if (!cpf || !pin) {
            setMensagem({ tipo: 'warning', texto: 'Preencha seu CPF e PIN.' });
            return;
        }
        
        setLoading(true);
        setMensagem({ tipo: '', texto: '' });

        try {
            // Usando apiClient (resolve o erro do Vercel vs Localhost)
            const response = await apiClient.post('/usuarios/ponto/bater/', {
                cpf: cpf.replace(/\D/g, ''),
                pin: pin,
                tipo: tipo_batida,
                // Envia as coordenadas se tiver, ou null se for PC
                latitude: localizacao ? localizacao.latitude : null,
                longitude: localizacao ? localizacao.longitude : null
            });

            setMensagem({ tipo: 'success', texto: `${response.data.detail} (${response.data.tipo})` });
            setCpf('');
            setPin('');
            setTimeout(() => setMensagem({ tipo: '', texto: '' }), 5000);

        } catch (error) {
            const erroMsg = error.response?.data?.detail || "Erro ao conectar com o servidor.";
            setMensagem({ tipo: 'error', texto: erroMsg });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f0f2f5', p: 2 }}>
            <Paper elevation={4} sx={{ maxWidth: 500, width: '100%', p: 4, borderRadius: 4, textAlign: 'center' }}>
                
                <AccessTime sx={{ fontSize: 50, color: '#1a233b', mb: 1 }} />
                
                <Typography variant="h2" sx={{ fontWeight: 'bold', mb: 0.5, fontFamily: 'monospace', color: '#1a233b' }}>
                    {horaAtual.toLocaleTimeString('pt-BR')}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4, textTransform: 'lowercase' }}>
                    {horaAtual.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </Typography>

                {mensagem.texto && (
                    <Alert severity={mensagem.tipo} sx={{ mb: 3, textAlign: 'left' }}>
                        {mensagem.texto}
                    </Alert>
                )}

                <TextField 
                    fullWidth label="Seu CPF" variant="outlined" margin="dense"
                    value={cpf} onChange={(e) => setCpf(e.target.value)}
                    placeholder="Somente números"
                />
                
                <TextField 
                    fullWidth label="PIN de Ponto" type="password" variant="outlined" margin="dense"
                    value={pin} onChange={(e) => setPin(e.target.value)}
                    inputProps={{ maxLength: 6 }} sx={{ mb: 4, mt: 2 }}
                    placeholder="Senha de 4 a 6 dígitos"
                />

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>
                ) : (
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <Button fullWidth variant="contained" color="success" size="large" onClick={() => handleBaterPonto('entrada')} startIcon={<Input />}>
                                Entrada
                            </Button>
                        </Grid>
                        <Grid item xs={6}>
                            <Button fullWidth variant="outlined" color="warning" size="large" onClick={() => handleBaterPonto('saida_pausa')} startIcon={<FreeBreakfast />}>
                                Pausa
                            </Button>
                        </Grid>
                        <Grid item xs={6}>
                            <Button fullWidth variant="outlined" color="info" size="large" onClick={() => handleBaterPonto('retorno_pausa')} startIcon={<Fingerprint />}>
                                Retorno
                            </Button>
                        </Grid>
                        <Grid item xs={6}>
                            <Button fullWidth variant="contained" color="error" size="large" onClick={() => handleBaterPonto('saida')} startIcon={<MeetingRoom />}>
                                Saída
                            </Button>
                        </Grid>
                    </Grid>
                )}
            </Paper>
        </Box>
    );
}