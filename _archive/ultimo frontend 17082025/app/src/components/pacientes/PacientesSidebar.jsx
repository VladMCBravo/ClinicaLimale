// ARQUIVO: src/components/pacientes/PacientesSidebar.jsx

import React from 'react';
import { Drawer, Toolbar, List, ListItem, ListItemText, Divider, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

const drawerWidth = 240;

// A sidebar recebe a propriedade 'onOpenNewModal'
export default function PacientesSidebar({ onOpenNewModal }) {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
      }}
    >
      <Toolbar />
      <Divider />
      <List sx={{ p: 2 }}>
        <ListItem disablePadding>
          {/* Este botão chama a função recebida via props para abrir o modal */}
          <Button 
            variant="contained" 
            color="secondary"
            startIcon={<AddIcon />} 
            fullWidth
            onClick={onOpenNewModal}
          >
            Novo Paciente
          </Button>
        </ListItem>
        <Divider sx={{ my: 2 }} />
        <ListItem>
            <ListItemText primary="Filtros" secondary="(Em breve)" />
        </ListItem>
      </List>
    </Drawer>
  );
}