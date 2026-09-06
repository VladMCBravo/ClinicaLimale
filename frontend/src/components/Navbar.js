// src/components/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { useSnackbar } from '../contexts/SnackbarContext';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../contexts/ChatContext';
import { 
    FaUserFriends, FaFileInvoiceDollar, FaCog, FaSignOutAlt, 
    FaTachometerAlt, FaVideo, FaStethoscope, FaFileMedical, FaClock, FaComments 
} from 'react-icons/fa';

import { IconButton, Badge } from '@mui/material';
import ChatInterno from '../pages/ChatInterno/ChatInterno';
import StatusRobo from './StatusRobo';
import PontoModal from './PontoModal'; // <-- 1. IMPORTAMOS O MODAL AQUI
import logoImage from '../assets/logo.png';
import './Navbar.css';

const Navbar = () => {
    const { user, logout, token } = useAuth();
    const { showSnackbar } = useSnackbar(); // <-- 2. INICIE O SNACKBAR
    
    // 3. PUXE O SOCKET DO CONTEXTO
    const { mensagensNaoLidas, isChatOpen, abrirChat, fecharChat, socket } = useChat(); 
    const [isPontoOpen, setIsPontoOpen] = useState(false);

    // 4. ADICIONE O OUVINTE GLOBAL DE MENSAGENS E NOTIFICAÇÕES
    useEffect(() => {
        if (!socket || !user) return;

        const handleNotificacaoGlobal = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'chat_message' && data.message.sender_id !== user.id) {
                
                // Avisa o backend que a mensagem foi entregue à máquina
                socket.send(JSON.stringify({ 
                    action: 'update_status', 
                    message_id: data.message.id, 
                    status: 'delivered' 
                }));

                // Se o chat estiver fechado, dispara o som e o Toast
                if (!isChatOpen) {
                    // ✅ O .play() retorna uma Promise. Tratamos o erro assíncrono com .catch()
                    const audio = new Audio('/notificacao.mp3');
                    audio.play().catch(e => console.warn("Áudio ausente ou bloqueado", e));
                    
                    // Substitua o seu showSnackbar atual no Navbar.jsx por este:
                    const nomeOrigem = data.message.room_id ? 'Consultório' : (data.message.sender_nome || 'um colega');
                    showSnackbar(`Nova mensagem de ${nomeOrigem}!`, 'info');
                }
            }
        };

        socket.addEventListener('message', handleNotificacaoGlobal);
        return () => socket.removeEventListener('message', handleNotificacaoGlobal);
    }, [socket, isChatOpen, user, showSnackbar]);

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
                            <IconButton onClick={abrirChat} className="icon-button" sx={{ color: '#ffffff' }} title="Chat Interno">
                                <Badge badgeContent={mensagensNaoLidas} color="error">
                                    <FaComments />
                                </Badge>
                            </IconButton>

                            {/* 2. BOTÃO DO PONTO AGORA CHAMA O ESTADO */}
                            <IconButton onClick={() => setIsPontoOpen(true)} className="icon-button" sx={{ color: '#4caf50' }} title="Bater Ponto">
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

            {/* 3. O COMPONENTE MODAL TOTALMENTE SEPARADO */}
            <PontoModal open={isPontoOpen} onClose={() => setIsPontoOpen(false)} />

            {/* RENDERIZANDO O CHAT USANDO A LÓGICA DO CONTEXTO */}
            {isChatOpen && (
                <ChatInterno 
                    onClose={fecharChat} 
                    token={token || localStorage.getItem('token')}
                />
            )}
        </>
    );
};

export default Navbar;