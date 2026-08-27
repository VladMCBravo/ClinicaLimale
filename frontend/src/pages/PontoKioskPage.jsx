import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, CircularProgress, Grid } from '@mui/material';
import { AccessTime, Fingerprint, Input, FreeBreakfast, MeetingRoom } from '@mui/icons-material';
import apiClient from '../api/axiosConfig';

export default function PontoKioskPage() {
    const [horaAtual, setHoraAtual] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
    const [localizacao, setLocalizacao] = useState(null);
    const [statusLeitor, setStatusLeitor] = useState('Selecione o tipo de batida abaixo para iniciar.');

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
                (err) => console.log('Sem localização'),
                { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
            );
        }
    }, []);

    const handleBaterPonto = async (tipo_batida) => {
        setLoading(true);
        setMensagem({ tipo: '', texto: '' });
        
        try {
            // 1. Baixa todos os templates de digitais do Django
            setStatusLeitor('Preparando sistema biométrico...');
            const responseTemplates = await apiClient.get('/usuarios/ponto/biometrias/');
            const templatesCadastrados = responseTemplates.data;

            if (templatesCadastrados.length === 0) {
                throw new Error("Não há nenhuma digital cadastrada no sistema.");
            }

            // 2. Chama o middleware local (Windows) passando a lista para ele comparar
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
            setMensagem({ tipo: 'success', texto: `${responseDjango.data.detail} - Funcionário: ${responseDjango.data.nome_funcionario}` });
            setStatusLeitor('Ponto registrado com sucesso!');

        } catch (error) {
            const erroMsg = error.response?.data?.detail || error.message || "Erro de comunicação com o leitor biométrico.";
            setMensagem({ tipo: 'error', texto: erroMsg });
            setStatusLeitor('Falha na operação.');
        } finally {
            setLoading(false);
            // Reseta a interface após 6 segundos
            setTimeout(() => {
                setMensagem({ tipo: '', texto: '' });
                setStatusLeitor('Selecione o tipo de batida abaixo para iniciar.');
            }, 6000);
        }
    };

    return (
        <div className="tasy-workspace" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e9ecef', padding: '20px' }}>
            
            <div className="tasy-panel theme-blue" style={{ maxWidth: '550px', width: '100%' }}>
                
                <div className="tasy-panel-header">
                    <span className="tasy-panel-title">
                        <Fingerprint style={{ fontSize: '16px' }} />
                        Relógio de Ponto Biométrico
                    </span>
                </div>

                <div className="tasy-panel-body" style={{ textAlign: 'center', padding: '40px 20px' }}>
                    
                    <AccessTime sx={{ fontSize: 45, color: '#495057', mb: 1 }} />
                    
                    <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 0.5, color: '#212529', letterSpacing: '-1px' }}>
                        {horaAtual.toLocaleTimeString('pt-BR')}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ mb: 4, color: '#868e96', textTransform: 'uppercase' }}>
                        {horaAtual.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </Typography>

                    {mensagem.texto && (
                        <div style={{
                            padding: '12px',
                            marginBottom: '20px',
                            backgroundColor: mensagem.tipo === 'success' ? '#d3f9d8' : '#ffe3e3',
                            color: mensagem.tipo === 'success' ? '#2b8a3e' : '#c92a2a',
                            border: `1px solid ${mensagem.tipo === 'success' ? '#b2f2bb' : '#ffc9c9'}`,
                            fontSize: '14px',
                            fontWeight: '600',
                            textAlign: 'left'
                        }}>
                            {mensagem.texto}
                        </div>
                    )}

                    <div className="tasy-section-header" style={{ marginBottom: '20px', backgroundColor: '#f8f9fa', color: '#1c7ed6' }}>
                        {statusLeitor}
                    </div>

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress size={40} sx={{ color: '#1c7ed6' }} />
                        </Box>
                    ) : (
                        <Grid container spacing={1.5}>
                            <Grid item xs={6}>
                                <Button fullWidth disableElevation variant="contained" 
                                    sx={{ bgcolor: '#2f9e44', '&:hover': { bgcolor: '#2b8a3e' }, py: 2, borderRadius: 0 }} 
                                    onClick={() => handleBaterPonto('entrada')} startIcon={<Input />}>
                                    Entrada
                                </Button>
                            </Grid>
                            <Grid item xs={6}>
                                <Button fullWidth disableElevation variant="contained" 
                                    sx={{ bgcolor: '#e8590c', '&:hover': { bgcolor: '#d9480f' }, py: 2, borderRadius: 0 }} 
                                    onClick={() => handleBaterPonto('saida_pausa')} startIcon={<FreeBreakfast />}>
                                    Pausa
                                </Button>
                            </Grid>
                            <Grid item xs={6}>
                                <Button fullWidth disableElevation variant="contained" 
                                    sx={{ bgcolor: '#1c7ed6', '&:hover': { bgcolor: '#1971c2' }, py: 2, borderRadius: 0 }} 
                                    onClick={() => handleBaterPonto('retorno_pausa')} startIcon={<Fingerprint />}>
                                    Retorno
                                </Button>
                            </Grid>
                            <Grid item xs={6}>
                                <Button fullWidth disableElevation variant="contained" 
                                    sx={{ bgcolor: '#e03131', '&:hover': { bgcolor: '#c92a2a' }, py: 2, borderRadius: 0 }} 
                                    onClick={() => handleBaterPonto('saida')} startIcon={<MeetingRoom />}>
                                    Saída
                                </Button>
                            </Grid>
                        </Grid>
                    )}
                </div>
            </div>
        </div>
    );
}