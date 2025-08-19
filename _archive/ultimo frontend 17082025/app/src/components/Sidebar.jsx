// src/components/Sidebar.jsx - CÓDIGO ATUALIZADO

import React from 'react';
// 1. Importe o useNavigate
import { Link, useNavigate } from 'react-router-dom'; 
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Divider } from '@mui/material';

// ... (resto das importações e código do logo) ...
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LogoutIcon from '@mui/icons-material/Logout';
import logo from '../assets/logo.png'; 

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Pacientes', icon: <PeopleIcon />, path: '/pacientes' },
  { text: 'Agenda', icon: <CalendarMonthIcon />, path: '/agenda' },
];

export default function Sidebar() {
  const navigate = useNavigate(); // 2. Inicialize o hook de navegação

  // 3. Crie a função de logout
  const handleLogout = () => {
    sessionStorage.removeItem('authToken'); // Remove o token
    navigate('/login'); // Redireciona para a página de login
  };

  return (
    <Box
      component="nav"
      sx={{ width: drawerWidth, flexShrink: 0, borderRight: '1px solid rgba(0, 0, 0, 0.12)' }}
    >
      {/* ... (código do logo e menuItems continua o mesmo) ... */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img 
          src={logo} 
          alt="Logo Clínica Limale" 
          style={{ width: '150px', height: 'auto' }} 
        />
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton component={Link} to={item.path}>
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List sx={{ marginTop: 'auto' }}>
         <ListItem disablePadding>
            {/* 4. Adicione o onClick ao botão de Sair */}
            <ListItemButton onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Sair" />
            </ListItemButton>
          </ListItem>
      </List>
    </Box>
  );
}