// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { SnackbarProvider } from './contexts/SnackbarContext';

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/pt-br';

import AdminRoute from './components/AdminRoute';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';

import LoginPage from './pages/LoginPage';
import PainelRecepcaoPage from './pages/PainelRecepcaoPage';
import PacientesPage from './pages/PacientesPage';
import FinanceiroPage from './pages/FinanceiroPage';
import LaudosPage from './pages/LaudosPage';
import LaudosPageV2 from './pages/LaudosPageV2';
import PortalResultados from './pages/PortalResultados';
import VincularExames from './pages/VincularExames';
import TelemedicinaPage from './pages/TelemedicinaPage';
import PontoKioskPage from './pages/PontoKioskPage'; // <-- NOVO IMPORT
import ConfiguracoesPage from './pages/ConfiguracoesPage'; 

import CRMKanbanPage from './pages/CRM/CRMKanbanPage';
import ProntuarioWorkspace from './pages/PainelMedico/ProntuarioWorkspace';

const RotaInicialDinamica = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (user.isAdmin || user.isRecepcao) {
    return <Navigate to="/painel" replace />;
  }
  
  if (user.isMedico) {
    return <ProntuarioWorkspace />;
  }

  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/resultados" element={<PortalResultados />} />
              {/* --- ROTA DO KIOSK DE PONTO (PÚBLICA) --- */}
              <Route path="/ponto" element={<PontoKioskPage />} />
              
              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  
                  {/* --- ACESSO GERAL (Médicos, Recepção, Admin) --- */}
                  <Route path="/" element={<RotaInicialDinamica />} />
                  <Route path="/painel" element={<PainelRecepcaoPage />} />
                  <Route path="/laudos" element={<LaudosPage />} />
                  {/* ROTA OCULTA DO TURING V2 */}
                  <Route path="/laudos-v2" element={<LaudosPageV2 />} />
                  <Route path="/vincular" element={<VincularExames />} />
                  <Route path="/pacientes" element={<PacientesPage />} />
                  
                  {/* ROTA DO WORKSPACE CENTRALIZADA */}
                  <Route path="/pacientes/:pacienteId/prontuario" element={<ProntuarioWorkspace />} />

                  <Route path="/telemedicina" element={<TelemedicinaPage />} />
                  <Route path="/configuracoes" element={<ConfiguracoesPage />} />

                  {/* --- ÁREA RESTRITA (ADMINISTRADOR) --- */}
                  <Route element={<AdminRoute />}>
                      <Route path="/financeiro/*" element={<FinanceiroPage />} />
                      <Route path="/crm/kanban" element={<CRMKanbanPage />} />
                  </Route>

                </Route>
              </Route>
            </Routes>
          </Router>
        </LocalizationProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;