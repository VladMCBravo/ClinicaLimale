// src/components/Navbar.jsx - VERSÃO COM LÓGICA DE PERMISSÃO PRECISA

import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
    FaCalendarAlt,
    FaUserFriends,
    FaFileInvoiceDollar,
    FaCog,
    FaSignOutAlt,
    FaTachometerAlt,
    FaVideo,
    FaStethoscope // Adicionamos o novo ícone aqui
} from 'react-icons/fa';
import { IconButton } from '@mui/material';
import logoImage from '../assets/logo.png';
import './Navbar.css';

const Navbar = () => {
    const { user, logout } = useAuth();

    // Função auxiliar para criar o link principal dinâmico
    const renderPrincipalLink = () => {
        // Se for recepção ou admin, o link principal é "Painel"
        if (user.isRecepcao || user.isAdmin) {
            return (
                <NavLink to="/painel">
                    <FaTachometerAlt /> <span>Painel</span>
                </NavLink>
            );
        }
        // Se for médico, o link principal é "Atendimento"
        if (user.isMedico) {
            return (
                <NavLink to="/" end>
                    <FaStethoscope /> <span>Atendimento</span>
                </NavLink>
            );
        }
        // Fallback para outros cargos (se houver)
        return null;
    };

    return (
        <header className="main-header">
            <div className="nav-left">
                <img src={logoImage} alt="Clínica Limalé" className="logo-image" />

                {user && (
                    <nav className="main-nav">
                        {/* RENDERIZA O LINK PRINCIPAL DINAMICAMENTE */}
                        {renderPrincipalLink()}

                        {/* Telemedicina (Todos) */}
                        <NavLink to="/telemedicina">
                            <FaVideo /> <span>Telemedicina</span>
                        </NavLink>
                        
                        {/* Pacientes (Todos) */}
                        <NavLink to="/pacientes">
                            <FaUserFriends /> <span>Pacientes</span>
                        </NavLink>

                        {/* Financeiro (Apenas Admin e Recepção) */}
                        {(user.isAdmin || user.isRecepcao) && (
                            <NavLink to="/financeiro">
                                <FaFileInvoiceDollar /> <span>Financeiro</span>
                            </NavLink>
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