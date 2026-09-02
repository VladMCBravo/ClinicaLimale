// src/components/PontoModal.jsx
import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogContent, Button, Typography, Box, Alert, Grid, CircularProgress 
} from '@mui/material';
import { 
    AccessTime, Fingerprint, Input, FreeBreakfast, MeetingRoom 
} from '@mui/icons-material';
import apiClient from '../api/axiosConfig';

export default function PontoModal({ open, onClose }) {
    const [horaAtual, setHoraAtual] = useState(new Date());
    const [loadingPonto, setLoadingPonto] = useState(false);
    const [mensagemPonto, setMensagemPonto] = useState({ tipo: '', texto: '' });
    const [localizacao, setLocalizacao] = useState(null);
    const [statusLeitor, setStatusLeitor] = useState('Selecione o tipo de batida abaixo para iniciar.');

    // Relógio rodando apenas quando o modal está aberto
    useEffect(() => {
        let timer;
        if (open) {
            timer = setInterval(() => setHoraAtual(new Date()), 1000);
            setStatusLeitor('Selecione o tipo de batida abaixo para iniciar.');
            setMensagemPonto({ tipo: '', texto: '' });
        }
        return () => clearInterval(timer);
    }, [open]);

    // Busca o GPS quando o modal abre
    useEffect(() => {
        if (open) {
            setMensagemPonto({ tipo: 'info', texto: 'Buscando localização...' });
            
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        setLocalizacao({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
                        setMensagemPonto({ tipo: '', texto: '' }); 
                    },
                    (err) => setMensagemPonto({ tipo: 'error', texto: 'Permissão de localização negada ou indisponível.' }),
                    { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
                );
            } else {
                setMensagemPonto({ tipo: 'error', texto: 'Geolocalização não suportada.' });
            }
        }
    }, [open]);

    const handleBaterPonto = async (tipo_batida) => {
        setLoadingPonto(true);
        setMensagemPonto({ tipo: '', texto: '' });
        
        try {
            // 1. Baixa todos os templates de digitais do Django
            setStatusLeitor('Preparando sistema biométrico...');
            const responseTemplates = await apiClient.get('/usuarios/ponto/biometrias/');
            const templatesCadastrados = responseTemplates.data;

            if (templatesCadastrados.length === 0) {
                throw new Error("Não há nenhuma digital cadastrada no sistema.");
            }

            // 2. Chama o middleware local (Windows) passando a lista para comparar
            setStatusLeitor('Luz acesa. Coloque o dedo no leitor...');
            const respostaLocal = await fetch('http://localhost:8080/api/identificar-digital', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ templates_cadastrados: templatesCadastrados })
            });
            
            const dadosLocal = await respostaLocal.json();

            if (dadosLocal.status !== 'sucesso') {
                throw new Error(dadosLocal.mensagem || "Digital não reconhecida. Tente novamente.");
            }

            setStatusLeitor('Digital reconhecida! Registrando o ponto...');

            // 3. O leitor local achou o funcionário. Avisamos o Django qual foi o ID.
            const responseDjango = await apiClient.post('/usuarios/ponto/bater-biometria/', {
                usuario_id: dadosLocal.usuario_id,
                tipo: tipo_batida,
                latitude: localizacao ? localizacao.latitude : null,
                longitude: localizacao ? localizacao.longitude : null
            });

            // Mostra o nome do funcionário retornado pelo Django
            setMensagemPonto({ tipo: 'success', texto: `${responseDjango.data.detail} - Funcionário: ${responseDjango.data.nome_funcionario}` });
            setStatusLeitor('Ponto registrado com sucesso!');

            // Fecha o modal sozinho após 3 segundos
            setTimeout(() => {
                onClose();
            }, 3000);

        } catch (error) {
            const erroMsg = error.response?.data?.detail || error.message || "Erro de comunicação com o leitor biométrico.";
            setMensagemPonto({ tipo: 'error', texto: erroMsg });
            setStatusLeitor('Falha na operação.');
        } finally {
            setLoadingPonto(false);
            setTimeout(() => {
                if(open) setStatusLeitor('Selecione o tipo de batida abaixo para iniciar.');
            }, 5000);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogContent sx={{ p: 4, textAlign: 'center' }}>
                
                <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2, color: '#1a233b' }}>
                    <Fingerprint sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Registro de Ponto
                </Typography>
                
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <AccessTime sx={{ fontSize: 40, color: '#1a233b', mb: 0.5 }} />
                    <Typography variant="h3" sx={{ fontWeight: 'bold', fontFamily: 'monospace', color: '#1a233b' }}>
                        {horaAtual.toLocaleTimeString('pt-BR')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'lowercase' }}>
                        {horaAtual.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </Typography>
                </Box>
                
                {mensagemPonto.texto && (
                    <Alert severity={mensagemPonto.tipo} sx={{ mb: 2, textAlign: 'left' }}>{mensagemPonto.texto}</Alert>
                )}

                <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f8f9fa', color: '#1c7ed6', borderRadius: '8px', fontWeight: 'bold' }}>
                    {statusLeitor}
                </div>

                {loadingPonto ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>
                ) : (
                    <Grid container spacing={1.5}>
                        <Grid item xs={6}><Button fullWidth variant="contained" color="success" onClick={() => handleBaterPonto('entrada')} startIcon={<Input />}>Entrada</Button></Grid>
                        <Grid item xs={6}><Button fullWidth variant="outlined" color="warning" onClick={() => handleBaterPonto('saida_pausa')} startIcon={<FreeBreakfast />}>Pausa</Button></Grid>
                        <Grid item xs={6}><Button fullWidth variant="outlined" color="info" onClick={() => handleBaterPonto('retorno_pausa')} startIcon={<Fingerprint />}>Retorno</Button></Grid>
                        <Grid item xs={6}><Button fullWidth variant="contained" color="error" onClick={() => handleBaterPonto('saida')} startIcon={<MeetingRoom />}>Saída</Button></Grid>
                    </Grid>
                )}
                
                <Button onClick={onClose} sx={{ mt: 3, color: 'text.secondary' }}>Cancelar</Button>
            </DialogContent>
        </Dialog>
    );
}