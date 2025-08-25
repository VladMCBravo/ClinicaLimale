// src/components/Navbar.jsx - VERSÃO COM TELEMEDICINA
import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
    FaCalendarAlt, FaUserFriends, FaFileInvoiceDollar, FaCog, 
    FaSignOutAlt, FaTachometerAlt, FaVideo // <-- 1. Ícone novo
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
                    {/* --- 2. ORDEM DAS ABAS CORRIGIDA --- */}
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
            {/* O resto do seu componente (nav-right) continua igual */}
            {/* ... */}
        </header>
    );
};

export default Navbar;