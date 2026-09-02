// src/components/Navbar.jsx
import React, { useState } from 'react';
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
    const { mensagensNaoLidas, isChatOpen, abrirChat, fecharChat } = useChat();

    // Estado limpo apenas para controlar se o modal está aberto ou fechado
    const [isPontoOpen, setIsPontoOpen] = useState(false);

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