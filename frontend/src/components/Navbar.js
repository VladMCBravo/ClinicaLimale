// src/components/Navbar.jsx - VERSÃO COM LÓGICA DE PERMISSÃO PRECISA

import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
    FaCalendarAlt, FaUserFriends, FaFileInvoiceDollar, FaCog, 
    FaSignOutAlt, FaTachometerAlt, FaVideo
} from 'react-icons/fa';
import { IconButton } from '@mui/material';
import logoImage from '../assets/logo.png';
import './Navbar.css';

const Navbar = () => {
    const { user, logout } = useAuth();

    // Não precisamos mais de variáveis locais, pois o hook useAuth já nos dá as flags.

    return (
        <header className="main-header">
            <div className="nav-left">
                <img src={logoImage} alt="Clínica Limalé" className="logo-image" />

                {/* A navegação só aparece se o usuário estiver logado */}
                {user && (
                    <nav className="main-nav">
                        {/* Links visíveis para TODOS */}
                        <NavLink to="/" end>
                            <FaCalendarAlt /> <span>Agenda</span>
                        </NavLink>
                        <NavLink to="/pacientes">
                            <FaUserFriends /> <span>Pacientes</span>
                        </NavLink>
                        <NavLink to="/telemedicina">
                            <FaVideo /> <span>Telemedicina</span>
                        </NavLink>

                        {/* Links visíveis para ADMIN e RECEPÇÃO */}
                        {(user.isAdmin || user.isRecepcao) && (
                            <>
                                <NavLink to="/financeiro">
                                    <FaFileInvoiceDollar /> <span>Financeiro</span>
                                </NavLink>
                                <NavLink to="/painel">
                                    <FaTachometerAlt /> <span>Painel</span>
                                </NavLink>
                            </>
                        )}
                    </nav>
                )}
            </div>

            {user && (
                <div className="nav-right">
                    <span className="user-greeting">Olá, {user.first_name || ''}</span>
                    <div className="user-actions">

                        {/* Ícone de Configurações visível APENAS PARA ADMIN */}
                        {user.isAdmin && (
                            <IconButton component={Link} to="/configuracoes" title="Configurações" className="icon-button" sx={{ color: '#ffffff' }}>
                                <FaCog />
                            </IconButton>
                        )}

                        <IconButton onClick={logout} className="icon-button" title="Sair" sx={{ color: '#ffffff' }}>
                            <FaSignOutAlt />
                        </IconButton>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Navbar;