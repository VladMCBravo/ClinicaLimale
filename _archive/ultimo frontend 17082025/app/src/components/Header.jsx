import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Box, Button, Typography, IconButton, Avatar, Tooltip } from '@mui/material';
import logo from '../assets/logo.png'; // Verifique se o caminho e nome estão corretos

// Ícones
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import SettingsIcon from '@mui/icons-material/Settings';

const activeLinkStyle = { backgroundColor: 'rgba(255, 255, 255, 0.1)' };

export default function Header() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userDetails = sessionStorage.getItem('userDetails');
    if (userDetails) {
      setUser(JSON.parse(userDetails));
    }
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userDetails');
    navigate('/login');
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        // zIndex garante que o Header fique por cima da Sidebar
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar>
        {/* SEÇÃO ESQUERDA: LOGO */}
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <Box sx={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', p: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={logo} alt="Logo Clínica Limale" style={{ height: '32px' }} />
          </Box>
        </Box>

        {/* SEÇÃO CENTRAL: NAVEGAÇÃO */}
        <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
          <Button color="inherit" component={NavLink} to="/" startIcon={<DashboardIcon />} style={({ isActive }) => isActive ? activeLinkStyle : undefined}>Dashboard</Button>
          <Button color="inherit" component={NavLink} to="/pacientes" startIcon={<PeopleIcon />} style={({ isActive }) => isActive ? activeLinkStyle : undefined}>Pacientes</Button>
          <Button color="inherit" component={NavLink} to="/agenda" startIcon={<CalendarMonthIcon />} style={({ isActive }) => isActive ? activeLinkStyle : undefined}>Agenda</Button>
          <Button color="inherit" component={NavLink} to="/financeiro" startIcon={<MonetizationOnIcon />} style={({ isActive }) => isActive ? activeLinkStyle : undefined}>Financeiro</Button>
        </Box>

        {/* SEÇÃO DIREITA: USUÁRIO E AÇÕES */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {user && (
            <>
              <Typography sx={{ display: { xs: 'none', sm: 'block' } }}>Olá, {user.first_name}</Typography>
              <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32, ml: 1.5, fontSize: '1rem' }}>
                {user.first_name?.[0]}{user.last_name?.[0]}
              </Avatar>
            </>
          )}
          {user && user.cargo === 'admin' && (
            <Tooltip title="Configurações">
              <IconButton color="inherit" component={NavLink} to="/configuracoes" sx={{ ml: 1 }}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          )}
          <Button color="inherit" variant="outlined" onClick={handleLogout} sx={{ ml: 2, borderColor: 'rgba(255, 255, 255, 0.5)', '&:hover': { borderColor: '#FFFFFF' } }}>
            Sair
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}