// src/components/Navbar.js
import React from 'react';
// 1. Imports do react-router-dom combinados
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
    FaCalendarAlt,
    FaUserFriends,
    FaFileInvoiceDollar,
    FaCog,
    FaSignOutAlt
} from 'react-icons/fa';
// 2. Import do IconButton do Material-UI
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
                    <NavLink to="/" end>
                        <FaCalendarAlt /> <span>Agenda</span>
                    </NavLink>
                    <NavLink to="/pacientes">
                        <FaUserFriends /> <span>Pacientes</span>
                    </NavLink>
                    <NavLink to="/financeiro">
                        <FaFileInvoiceDollar /> <span>Financeiro</span>
                    </NavLink>
                </nav>
            </div>

            <div className="nav-right">
                <span className="user-greeting">Olá, {user ? user.name : ''}</span>
                <div className="user-actions">
                    {/* 3. Botão de configurações corrigido e no lugar certo */}
                    {user.isAdmin && (
                    <IconButton component={Link} to="/configuracoes" title="Configurações" className="icon-button">
                    <FaCog />
                    </IconButton>
                    )}
                    <IconButton onClick={logout} className="icon-button" title="Sair">
                        <FaSignOutAlt />
                    </IconButton>
                </div>
            </div>
        </header>
    );
};
// 4. O bloco de código duplicado que estava aqui foi removido.

export default Navbar;