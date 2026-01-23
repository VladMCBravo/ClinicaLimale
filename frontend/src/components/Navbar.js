// src/components/Navbar.jsx
import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
    FaUserFriends,
    FaFileInvoiceDollar,
    FaCog,
    FaSignOutAlt,
    FaTachometerAlt,
    FaVideo,
    FaStethoscope,
    FaFileMedical
} from 'react-icons/fa';
import { IconButton } from '@mui/material';
import logoImage from '../assets/logo.png';
import './Navbar.css';

const Navbar = () => {
    const { user, logout } = useAuth();

    const renderPrincipalLink = () => {
        if (user.isRecepcao || user.isAdmin) {
            return (
                <NavLink to="/painel">
                    <FaTachometerAlt /> <span>Painel</span>
                </NavLink>
            );
        }
        if (user.isMedico) {
            return (
                <NavLink to="/" end>
                    <FaStethoscope /> <span>Atendimento</span>
                </NavLink>
            );
        }
        return null;
    };

    const formatarSaudacao = (user) => {
        if (user.isMedico) {
            if (user.genero === 'F') return 'Dra.';
            if (user.genero === 'M') return 'Dr.';
            return 'Dr(a).';
        }
        return '';
    };

    return (
        <header className="main-header">
            <div className="nav-left">
                <img src={logoImage} alt="Clínica Limalé" className="logo-image" />

                {user && (
                    <nav className="main-nav">
                        {renderPrincipalLink()}

                        <NavLink to="/telemedicina">
                            <FaVideo /> <span>Telemedicina</span>
                        </NavLink>
                        
                        <NavLink to="/laudos">
                            <FaFileMedical /> <span>Laudos</span>
                        </NavLink>
                        
                        <NavLink to="/pacientes">
                            <FaUserFriends /> <span>Pacientes</span>
                        </NavLink>

                        {/* CRM Operacional: Acessível para quem atende */}
                        <NavLink to="/crm/kanban">
                            <FaUserFriends /> <span>Funil CRM</span>
                        </NavLink>

                        {/* Itens Exclusivos de Admin */}
                        {user.isAdmin && (
                            <>
                                <NavLink to="/financeiro">
                                    <FaFileInvoiceDollar /> <span>Financeiro</span>
                                </NavLink>

                                <NavLink to="/crm/executivo">
                                    <FaTachometerAlt /> <span>Painel Executivo</span>
                                </NavLink>
                            </>
                        )}
                    </nav>
                )}
            </div>

            {user && (
                <div className="nav-right">
                    <span className="user-greeting">
                        Olá, {formatarSaudacao(user)} {user.first_name || ''}
                    </span>
                    <div className="user-actions">
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