// src/components/Navbar.jsx - VERSÃO FINAL E CORRIGIDA

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

    return (
        <header className="main-header">
            <div className="nav-left">
                <img src={logoImage} alt="Clínica Limalé" className="logo-image" />

                <nav className="main-nav">
                    {/* Ordem das abas corrigida */}
                    <NavLink to="/" end>
                        <FaCalendarAlt /> <span>Agenda</span>
                    </NavLink>
                    <NavLink to="/pacientes">
                        <FaUserFriends /> <span>Pacientes</span>
                    </NavLink>
                    <NavLink to="/telemedicina">
                        <FaVideo /> <span>Telemedicina</span>
                    </NavLink>
                    <NavLink to="/financeiro">
                        <FaFileInvoiceDollar /> <span>Financeiro</span>
                    </NavLink>
                    {user && user.isAdmin && (
                        <NavLink to="/dashboard">
                            <FaTachometerAlt /> <span>Dashboard</span>
                        </NavLink>
                    )}
                </nav>
            </div>

            {/* --- SECÇÃO DA DIREITA (SAUDAÇÃO E BOTÕES) RESTAURADA --- */}
            <div className="nav-right">
                <span className="user-greeting">Olá, {user ? user.first_name : ''}</span>
                <div className="user-actions">
                    {user && user.isAdmin && (
                        <IconButton component={Link} to="/configuracoes" title="Configurações" className="icon-button" sx={{ color: '#ffffff' }}>
                            <FaCog />
                        </IconButton>
                    )}
                    <IconButton onClick={logout} className="icon-button" title="Sair" sx={{ color: '#ffffff' }}>
                        <FaSignOutAlt />
                    </IconButton>
                </div>
            </div>
        </header>
    );
};

export default Navbar;