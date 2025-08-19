// ARQUIVO: src/components/layouts/MainLayout.jsx

import React from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { Box, CssBaseline, Toolbar } from '@mui/material';

// Importando os seus componentes reais
import Header from '../Header';
import DayPatientsSidebar from '../DayPatientsSidebar';
import FinanceSidebar from '../financeiro/FinanceSidebar';
import PacientesSidebar from '../pacientes/PacientesSidebar';
import DefaultSidebar from '../DefaultSidebar';

export default function MainLayout({ onOpenNewPatientModalFunc }) {
  const location = useLocation();

  const getSidebar = () => {
    if (location.pathname.startsWith('/agenda')) {
      return <DayPatientsSidebar />;
    }
    if (location.pathname.startsWith('/financeiro')) {
      return <FinanceSidebar />;
    }
    if (location.pathname.startsWith('/pacientes')) {
      // O MainLayout passa a função que recebeu para a PacientesSidebar
      return <PacientesSidebar onOpenNewModal={onOpenNewPatientModalFunc} />;
    }
    return <DefaultSidebar />;
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <Header />
      {getSidebar()}
      <Box component="main" sx={{ flexGrow: 1, p: 3, height: '100vh', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <Toolbar />
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <Outlet key={location.pathname} />
        </Box>
      </Box>
    </Box>
  );
}