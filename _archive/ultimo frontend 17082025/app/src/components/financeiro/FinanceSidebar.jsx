import React from 'react';
import { NavLink } from 'react-router-dom';
import { Drawer, Toolbar, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider } from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import AssessmentIcon from '@mui/icons-material/Assessment';

const drawerWidth = 240;

const activeLinkStyle = {
  backgroundColor: 'rgba(212, 175, 55, 0.1)', // Um fundo dourado bem sutil
  borderLeft: `4px solid #D4AF37`,
  borderColor: 'secondary.main',
  '& .MuiTypography-root': {
    fontWeight: 'bold',
  },
};

export default function FinanceSidebar() {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
      }}
    >
      {/* A Toolbar agora serve apenas como um espaçador para alinhar com o Header */}
      <Toolbar />
      <Divider />
      <List component="nav">
        <ListItem disablePadding>
          <ListItemButton component={NavLink} to="/financeiro/pendentes" sx={({ isActive }) => isActive ? activeLinkStyle : {}}>
            <ListItemIcon><PaymentIcon /></ListItemIcon>
            <ListItemText primary="Pagamentos Pendentes" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={NavLink} to="/financeiro/despesas" sx={({ isActive }) => isActive ? activeLinkStyle : {}}>
            <ListItemIcon><MoneyOffIcon /></ListItemIcon>
            <ListItemText primary="Despesas" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={NavLink} to="/financeiro/relatorios" sx={({ isActive }) => isActive ? activeLinkStyle : {}}>
            <ListItemIcon><AssessmentIcon /></ListItemIcon>
            <ListItemText primary="Relatórios" />
          </ListItemButton>
        </ListItem>
      </List>
    </Drawer>
  );
}