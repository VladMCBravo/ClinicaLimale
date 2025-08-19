import React from 'react';
import { Drawer, Toolbar, List, ListItem, Divider, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

const drawerWidth = 240;

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
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddIcon />}
            fullWidth
            onClick={onOpenNewModal} // Usa a função que veio como propriedade
          >
            Novo Paciente
          </Button>
        </ListItem>
      </List>
    </Drawer>
  );
}