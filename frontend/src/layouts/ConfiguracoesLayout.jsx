// src/layouts/ConfiguracoesLayout.jsx
import React from 'react';
import { Box, Paper, List, ListItemButton, ListItemIcon, ListItemText, ListSubheader, Typography } from '@mui/material';
import { Outlet, Link as RouterLink, useLocation } from 'react-router-dom';

// Importe os ícones que desejar
import PeopleIcon from '@mui/icons-material/People';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import CategoryIcon from '@mui/icons-material/Category';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';

const menuItems = [
    {
        subheader: 'Gestão de Usuários',
        items: [
            { text: 'Usuários', path: '/configuracoes/usuarios', icon: <PeopleIcon /> },
            { text: 'Especialidades', path: '/configuracoes/especialidades', icon: <MedicalServicesIcon /> },
            { text: 'Jornadas de Trabalho', path: '/configuracoes/jornadas', icon: <WorkHistoryIcon /> },
        ]
    },
    {
        subheader: 'Faturamento',
        items: [
            { text: 'Convênios e Planos', path: '/configuracoes/convenios', icon: <CreditCardIcon /> },
            { text: 'Categorias de Despesa', path: '/configuracoes/categorias-despesa', icon: <CategoryIcon /> },
            { text: 'Procedimentos', path: '/configuracoes/procedimentos', icon: <ReceiptLongIcon /> },
        ]
    },
    {
        subheader: 'Agendamentos',
        items: [
            { text: 'Salas', path: '/configuracoes/salas', icon: <MeetingRoomIcon /> },
        ]
    }
];

// Componente auxiliar para o item de menu
function NavItem({ item }) {
    const location = useLocation();
    const isSelected = location.pathname === item.path;

    return (
        <ListItemButton
            component={RouterLink}
            to={item.path}
            selected={isSelected}
            sx={{
                '&.Mui-selected': {
                    backgroundColor: 'action.selected',
                    borderRight: '3px solid',
                    borderColor: 'primary.main',
                },
            }}
        >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
        </ListItemButton>
    );
}

export default function ConfiguracoesLayout() {
    return (
        <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}> {/* Ajuste a altura conforme seu AppBar */}
            
            {/* --- BARRA LATERAL (SIDEBAR) --- */}
            <Paper 
                elevation={2}
                sx={{ 
                    width: 280, 
                    height: '100%',
                    overflowY: 'auto',
                    borderRight: '1px solid',
                    borderColor: 'divider'
                }}
            >
                <Box sx={{ p: 2 }}>
                    <Typography variant="h5" component="h1">
                        Configurações
                    </Typography>
                </Box>
                <List component="nav">
                    {menuItems.map((group, index) => (
                        <React.Fragment key={index}>
                            <ListSubheader>{group.subheader}</ListSubheader>
                            {group.items.map((item) => (
                                <NavItem key={item.path} item={item} />
                            ))}
                        </React.Fragment>
                    ))}
                </List>
            </Paper>

            {/* --- CONTEÚDO DA PÁGINA (Outlet) --- */}
            <Box 
                component="main" 
                sx={{ 
                    flexGrow: 1, 
                    p: 3, 
                    overflowY: 'auto', 
                    height: '100%' 
                }}
            >
                {/* O Outlet renderiza o componente da rota filha aqui */}
                <Outlet />
            </Box>
        </Box>
    );
}