import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/axiosConfig'; // <-- IMPORTANDO O SEU APICLIENT AQUI TAMBÉM
import {
    FaUserFriends, FaFileInvoiceDollar, FaCog, FaSignOutAlt, 
    FaTachometerAlt, FaVideo, FaStethoscope, FaFileMedical, 
    FaClock, FaComments
} from 'react-icons/fa';
import { 
    AccessTime, Fingerprint, Input, FreeBreakfast, MeetingRoom 
} from '@mui/icons-material';
import { 
    IconButton, Dialog, DialogContent, 
    Button, TextField, Typography, Box, Alert, Grid, CircularProgress, Badge
} from '@mui/material';
import ChatInterno from './ChatInterno'; // Ajuste o caminho se necessário
import StatusRobo from './StatusRobo';
import logoImage from '../assets/logo.png';
import './Navbar.css';

const Navbar = () => {
    const { user, logout, token } = useAuth();
    
    // --- ESTADOS DO MODAL DE PONTO ---
    const [modalPontoOpen, setModalPontoOpen] = useState(false);
    const [horaAtual, setHoraAtual] = useState(new Date());
    const [cpf, setCpf] = useState(''); 
    const [pin, setPin] = useState('');
    const [loadingPonto, setLoadingPonto] = useState(false);
    const [mensagemPonto, setMensagemPonto] = useState({ tipo: '', texto: '' });
    const [localizacao, setLocalizacao] = useState(null);
    const [chatOpen, setChatOpen] = useState(false);
    const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0);

    // Relógio rodando apenas quando o modal está aberto
    useEffect(() => {
        let timer;
        if (modalPontoOpen) {
            timer = setInterval(() => setHoraAtual(new Date()), 1000);
        }
        return () => clearInterval(timer);
    }, [modalPontoOpen]);

    const handleAbrirModalPonto = () => {
        setModalPontoOpen(true);
        setMensagemPonto({ tipo: 'info', texto: 'Buscando localização...' }); // Feedback visual melhor
        
        // Pode iniciar o CPF já preenchido se o objeto user tiver essa info
        if (user && user.cpf) setCpf(user.cpf);
        
        let gpsResolvido = false;

        // 1. O "Freio de Emergência" - Dispara após 6 segundos se o navegador travar
        const fallbackTimeout = setTimeout(() => {
            if (!gpsResolvido) {
                gpsResolvido = true;
                setMensagemPonto({ 
                    tipo: 'error', 
                    texto: 'Tempo esgotado para achar o GPS. Verifique a permissão no ícone de cadeado ao lado da URL.' 
                });
            }
        }, 6000);

        // 2. Busca nativa do navegador
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    if (gpsResolvido) return; // Ignora se o timeout já disparou
                    gpsResolvido = true;
                    clearTimeout(fallbackTimeout);
                    setLocalizacao({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
                    setMensagemPonto({ tipo: '', texto: '' }); // Limpa a mensagem
                },
                (err) => {
                    if (gpsResolvido) return;
                    gpsResolvido = true;
                    clearTimeout(fallbackTimeout);
                    setMensagemPonto({ tipo: 'error', texto: 'Permissão de localização negada ou indisponível.' });
                },
                { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 } // <--- NOVO CÓDIGO AQUI
            );
        } else {
            gpsResolvido = true;
            clearTimeout(fallbackTimeout);
            setMensagemPonto({ tipo: 'error', texto: 'Geolocalização não suportada.' });
        }
    };

    const handleBaterPonto = async (tipo_batida) => {
        if (!cpf || !pin) {
            setMensagemPonto({ tipo: 'warning', texto: 'Preencha CPF e PIN.' });
            return;
        }
        
        setLoadingPonto(true);
        try {
            // Usando o apiClient para garantir que aponte para a URL correta (Local ou Vercel)
            const response = await apiClient.post('/usuarios/ponto/bater/', {
                cpf: cpf.replace(/\D/g, ''),
                pin: pin,
                tipo: tipo_batida,
                // Envia as coordenadas se tiver, ou null se for PC
                latitude: localizacao ? localizacao.latitude : null,
                longitude: localizacao ? localizacao.longitude : null
            });
            setMensagemPonto({ tipo: 'success', texto: `${response.data.detail} (${response.data.tipo})` });
            setPin(''); 
            setTimeout(() => setModalPontoOpen(false), 2000); 
        } catch (error) {
            setMensagemPonto({ tipo: 'error', texto: error.response?.data?.detail || "Erro ao conectar." });
        } finally {
            setLoadingPonto(false);
        }
    };

    const renderPrincipalLink = () => {
        if (user.isRecepcao || user.isAdmin) {
            return (<NavLink to="/painel"><FaTachometerAlt /> <span>Painel</span></NavLink>);
        }
        if (user.isMedico) {
            return (<NavLink to="/" end><FaStethoscope /> <span>Atendimento</span></NavLink>);
        }
        return null;
    };

    const formatarSaudacao = (user) => {
        if (user.isMedico) return user.genero === 'F' ? 'Dra.' : 'Dr.';
        return '';
    };

    return (
        <>
            <header className="main-header">
                <div className="nav-left">
                    <img src={logoImage} alt="Clínica Limalé" className="logo-image" />
                    {user && (
                        <nav className="main-nav">
                            {renderPrincipalLink()}
                            <NavLink to="/telemedicina"><FaVideo /> <span>Telemedicina</span></NavLink>
                            <NavLink to="/laudos"><FaFileMedical /> <span>Laudos</span></NavLink>
                            <NavLink to="/pacientes"><FaUserFriends /> <span>Pacientes</span></NavLink>
                            <NavLink to="/chat"><FaComments /> <span>Chat</span></NavLink>
                            {user.isAdmin && (
                                <>
                                    <NavLink to="/financeiro"><FaFileInvoiceDollar /> <span>Financeiro</span></NavLink>
                                    <NavLink to="/crm/kanban"><FaUserFriends /> <span>Funil CRM</span></NavLink>
                                </>
                            )}
                        </nav>
                    )}
                </div>

                {user && (
                    <div className="nav-right">
                        <StatusRobo /> 
                        <span className="user-greeting">Olá, {formatarSaudacao(user)} {user.first_name || ''}</span>
                        <div className="user-actions">
                            <IconButton onClick={() => setChatOpen(true)} className="icon-button" sx={{ color: '#4caf50' }} title="Chat"></IconButton>
                            <IconButton onClick={handleAbrirModalPonto} className="icon-button" sx={{ color: '#4caf50' }} title="Bater Ponto">
                                <FaClock />
                            </IconButton>

                            <IconButton component={Link} to="/configuracoes" className="icon-button" sx={{ color: '#ffffff' }}>
                                <FaCog />
                            </IconButton>
                            <IconButton onClick={logout} className="icon-button" sx={{ color: '#ffffff' }}>
                                <FaSignOutAlt />
                            </IconButton>
                        </div>
                    </div>
                )}
            </header>

            {/* --- MODAL DO PONTO ELETRÔNICO --- */}
            <Dialog open={modalPontoOpen} onClose={() => setModalPontoOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogContent sx={{ p: 4, textAlign: 'center' }}>
                    
                    <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2, color: '#1a233b' }}>Registro de Ponto</Typography>
                    
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

                    <TextField fullWidth label="Seu CPF" variant="outlined" margin="dense" value={cpf} onChange={(e) => setCpf(e.target.value)} />
                    <TextField fullWidth label="PIN (Senha)" type="password" variant="outlined" margin="dense" value={pin} onChange={(e) => setPin(e.target.value)} inputProps={{ maxLength: 6 }} sx={{ mb: 3, mt: 1 }} />

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
                    
                    <Button onClick={() => setModalPontoOpen(false)} sx={{ mt: 3, color: 'text.secondary' }}>Cancelar</Button>
                </DialogContent>
            </Dialog>
            {/* 4. RENDERIZAÇÃO DO CHAT */}
            {chatOpen && (
                <ChatInterno 
                    onClose={() => setChatOpen(false)} 
                    token={token || localStorage.getItem('token')} // Passe o token aqui
                />
            )}
        </>
    );
};

export default Navbar;