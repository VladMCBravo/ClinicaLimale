// src/components/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import {
    FaUserFriends, FaFileInvoiceDollar, FaCog, FaSignOutAlt, 
    FaTachometerAlt, FaVideo, FaStethoscope, FaFileMedical, 
    FaClock // <--- NOVO ÍCONE PARA O PONTO
} from 'react-icons/fa';
import { 
    IconButton, Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, TextField, Typography, Box, Alert, Grid, CircularProgress
} from '@mui/material';
import StatusRobo from './StatusRobo';
import logoImage from '../assets/logo.png';
import './Navbar.css';

const Navbar = () => {
    const { user, logout } = useAuth();
    
    // --- ESTADOS DO MODAL DE PONTO ---
    const [modalPontoOpen, setModalPontoOpen] = useState(false);
    const [cpf, setCpf] = useState(''); // Opcional: se você tiver o CPF no objeto `user`, pode iniciar com `user.cpf`
    const [pin, setPin] = useState('');
    const [loadingPonto, setLoadingPonto] = useState(false);
    const [mensagemPonto, setMensagemPonto] = useState({ tipo: '', texto: '' });
    const [localizacao, setLocalizacao] = useState(null);

    // Função para pegar GPS ao abrir o modal
    const handleAbrirModalPonto = () => {
        setModalPontoOpen(true);
        setMensagemPonto({ tipo: '', texto: '' });
        
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setLocalizacao({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                (err) => setMensagemPonto({ tipo: 'error', texto: 'Permita o acesso à localização para bater o ponto.' }),
                { enableHighAccuracy: true, timeout: 5000 }
            );
        } else {
            setMensagemPonto({ tipo: 'error', texto: 'Geolocalização não suportada.' });
        }
    };

    const handleBaterPonto = async (tipo_batida) => {
        if (!cpf || !pin) {
            setMensagemPonto({ tipo: 'warning', texto: 'Preencha CPF e PIN.' });
            return;
        }
        if (!localizacao) {
            setMensagemPonto({ tipo: 'error', texto: 'Aguardando sinal de GPS.' });
            return;
        }

        setLoadingPonto(true);
        try {
            // Ajuste a URL base do seu backend
            const response = await axios.post('http://localhost:8000/api/usuarios/ponto/bater/', {
                cpf: cpf.replace(/\D/g, ''),
                pin: pin,
                tipo: tipo_batida,
                latitude: localizacao.latitude,
                longitude: localizacao.longitude
            });
            setMensagemPonto({ tipo: 'success', texto: `${response.data.detail} (${response.data.tipo})` });
            setPin(''); // Limpa só o PIN por segurança
            setTimeout(() => setModalPontoOpen(false), 2000); // Fecha após sucesso
        } catch (error) {
            setMensagemPonto({ tipo: 'error', texto: error.response?.data?.detail || "Erro ao conectar." });
        } finally {
            setLoadingPonto(false);
        }
    };
    // --- FIM DOS ESTADOS DO PONTO ---

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
                            {user.isAdmin && (
                                <>
                                    <NavLink to="/financeiro"><FaFileInvoiceDollar /> <span>Financeiro</span></NavLink>
                                    <NavLink to="/crm/kanban"><FaUserFriends /> <span>Funil CRM</span></NavLink>
                                    <NavLink to="/crm/executivo"><FaTachometerAlt /> <span>Painel Executivo</span></NavLink>
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
                            
                            {/* --- BOTÃO DO PONTO ELETRÔNICO --- */}
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
            <Dialog open={modalPontoOpen} onClose={() => setModalPontoOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>Registro de Ponto</DialogTitle>
                <DialogContent>
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                        <Typography variant="h4" sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
                            {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                    </Box>
                    
                    {mensagemPonto.texto && (
                        <Alert severity={mensagemPonto.tipo} sx={{ mb: 2 }}>{mensagemPonto.texto}</Alert>
                    )}

                    <TextField fullWidth label="Seu CPF" variant="outlined" margin="dense" value={cpf} onChange={(e) => setCpf(e.target.value)} />
                    <TextField fullWidth label="PIN (Senha)" type="password" variant="outlined" margin="dense" value={pin} onChange={(e) => setPin(e.target.value)} inputProps={{ maxLength: 6 }} sx={{ mb: 2 }} />

                    {loadingPonto ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>
                    ) : (
                        <Grid container spacing={1}>
                            <Grid item xs={6}><Button fullWidth variant="contained" color="success" onClick={() => handleBaterPonto('entrada')}>Entrada</Button></Grid>
                            <Grid item xs={6}><Button fullWidth variant="outlined" color="warning" onClick={() => handleBaterPonto('saida_pausa')}>Pausa</Button></Grid>
                            <Grid item xs={6}><Button fullWidth variant="outlined" color="info" onClick={() => handleBaterPonto('retorno_pausa')}>Retorno</Button></Grid>
                            <Grid item xs={6}><Button fullWidth variant="contained" color="error" onClick={() => handleBaterPonto('saida')}>Saída</Button></Grid>
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setModalPontoOpen(false)}>Cancelar</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default Navbar;