// src/components/Navbar.js
import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
    FaCalendarAlt, FaUserFriends, FaFileInvoiceDollar, FaCog, FaSignOutAlt, FaTachometerAlt,
} from 'react-icons/fa';
import { IconButton } from '@mui/material';
import logoImage from '../assets/logo.png';
import './Navbar.css';

const Navbar = () => {
    const { user, logout } = useAuth(); // useAuth agora deve ler o 'userData' do sessionStorage

    return (
        <header className="main-header">
            <div className="nav-left">
                <img src={logoImage} alt="Clínica Limalé" className="logo-image" />

                <nav className="main-nav">
                    {/* Link do Dashboard para Admins */}
                    {user && user.isAdmin && (
                        <NavLink to="/dashboard">
                            <FaTachometerAlt /> <span>Dashboard</span>
                        </NavLink>
                    )}
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
                {/* Saudação corrigida para usar os dados do usuário logado */}
                <span className="user-greeting">Olá, {user ? user.first_name : ''}</span>
                <div className="user-actions">
                    {user && user.isAdmin && (
                        <IconButton component={Link} to="/configuracoes" title="Configurações" className="icon-button" sx={{ color: '#ffffff' }}>
                            <FaCog />
                        </IconButton>
                    )}
                    {/* Estilo de cor adicionado diretamente aqui */}
                    <IconButton onClick={logout} className="icon-button" title="Sair" sx={{ color: '#ffffff' }}>
                        <FaSignOutAlt />
                    </IconButton>
                </div>
            </div>
        </header>
    );
};

export default Navbar;