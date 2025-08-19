import React from 'react';
import { Drawer, Toolbar, Divider } from '@mui/material';

const drawerWidth = 240;

export default function DefaultSidebar() {
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
      {/* Vazio de propósito */}
    </Drawer>
  );
}