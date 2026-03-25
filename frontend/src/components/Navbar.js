// src/components/Navbar.jsx
import React, { useState, useEffect } from 'react';
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
    FaFileMedical,
    FaRobot,         // <--- NOVO
    FaCheckCircle    // <--- NOVO
} from 'react-icons/fa';
import { 
    IconButton, 
    Badge,           // <--- NOVO
    Popover,         // <--- NOVO
    Box,             // <--- NOVO
    Typography,      // <--- NOVO
    List,            // <--- NOVO
    ListItem,        // <--- NOVO
    ListItemText,    // <--- NOVO
    Divider          // <--- NOVO
} from '@mui/material';
import StatusRobo from './StatusRobo'; // Importe o novo componente
import apiClient from '../api/axiosConfig'; // <--- NOVO (Para buscar dados do robô)
import logoImage from '../assets/logo.png';
import './Navbar.css';

const Navbar = () => {
    const { user, logout } = useAuth();
    // Já buscamos do sessionStorage via useAuth ou manualmente aqui:
    const token = sessionStorage.getItem('authToken');

    

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

                        {/* Itens Exclusivos de Admin */}
                        {user.isAdmin && (
                            <>
                                <NavLink to="/financeiro">
                                    <FaFileInvoiceDollar /> <span>Financeiro</span>
                                </NavLink>
                                
                                <NavLink to="/crm/kanban">
                                    <FaUserFriends /> <span>Funil CRM</span>
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
                    {/* Agora o robô é um componente limpo */}
                    <StatusRobo /> 

                    <span className="user-greeting">
                        Olá, {formatarSaudacao(user)} {user.first_name || ''}
                    </span>
                    
                    <div className="user-actions">
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
    );
};

export default Navbar;