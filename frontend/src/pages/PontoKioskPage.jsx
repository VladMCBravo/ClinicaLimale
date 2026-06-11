import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, TextField, Button, Paper, CircularProgress, Alert, Container, Grid 
} from '@mui/material';
import { AccessTime, Fingerprint, Input, FreeBreakfast, MeetingRoom } from '@mui/icons-material';
import axios from 'axios';

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
                (pos) => {
                    setLocalizacao({
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude
                    });
                },
                (err) => {
                    setMensagem({ tipo: 'error', texto: 'Por favor, permita o acesso à localização do navegador para bater o ponto.' });
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        } else {
            setMensagem({ tipo: 'error', texto: 'Geolocalização não suportada neste dispositivo.' });
        }
    }, []);

    const handleBaterPonto = async (tipo_batida) => {
        if (!cpf || !pin) {
            setMensagem({ tipo: 'warning', texto: 'Preencha seu CPF e PIN.' });
            return;
        }
        if (!localizacao) {
            setMensagem({ tipo: 'error', texto: 'Aguardando sinal de GPS. Verifique a permissão do navegador.' });
            return;
        }

        setLoading(true);
        setMensagem({ tipo: '', texto: '' });

        try {
            // Ajuste a URL base conforme sua configuração do Axios
            const response = await axios.post('http://localhost:8000/api/usuarios/ponto/bater/', {
                cpf: cpf.replace(/\D/g, ''), // Remove pontos e traços
                pin: pin,
                tipo: tipo_batida,
                latitude: localizacao.latitude,
                longitude: localizacao.longitude
            });

            setMensagem({ tipo: 'success', texto: `${response.data.detail} (${response.data.tipo})` });
            // Limpa os campos após o sucesso
            setCpf('');
            setPin('');
            
            // Oculta a mensagem de sucesso após 5 segundos
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
                
                <AccessTime sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                
                <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1, fontFamily: 'monospace' }}>
                    {horaAtual.toLocaleTimeString('pt-BR')}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
                    {horaAtual.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </Typography>

                {mensagem.texto && (
                    <Alert severity={mensagem.tipo} sx={{ mb: 3, textAlign: 'left' }}>
                        {mensagem.texto}
                    </Alert>
                )}

                <TextField 
                    fullWidth label="Seu CPF" variant="outlined" margin="normal"
                    value={cpf} onChange={(e) => setCpf(e.target.value)}
                    placeholder="Somente números"
                />
                
                <TextField 
                    fullWidth label="PIN de Ponto" type="password" variant="outlined" margin="normal"
                    value={pin} onChange={(e) => setPin(e.target.value)}
                    inputProps={{ maxLength: 6 }} sx={{ mb: 4 }}
                    placeholder="Senha de 4 a 6 dígitos"
                />

                {loading ? (
                    <CircularProgress />
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
                
                {!localizacao && !loading && (
                    <Typography variant="caption" color="error" sx={{ display: 'block', mt: 3 }}>
                        * Aguardando permissão de GPS para liberar o painel...
                    </Typography>
                )}
            </Paper>
        </Box>
    );
}