// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SnackbarProvider } from './contexts/SnackbarContext';

// --- CONFIGURAÇÃO DE TEMA E DATA ---
import { ThemeProvider } from '@mui/material/styles'; // Importação do ThemeProvider
import CssBaseline from '@mui/material/CssBaseline'; // Normaliza o CSS
import theme from './theme'; // Importa o tema que acabámos de criar

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/pt-br';

// Componentes de Layout e Proteção
import AdminRoute from './components/AdminRoute'; // <--- Importe aqui
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';

// Importe suas páginas PRINCIPAIS
import LoginPage from './pages/LoginPage';
import PainelMedicoPage from './pages/PainelMedico/PainelMedicoPage'; 
import PainelRecepcaoPage from './pages/PainelRecepcaoPage';
import PacientesPage from './pages/PacientesPage';
import ProntuarioPage from './pages/ProntuarioPage';
import FinanceiroPage from './pages/FinanceiroPage';
import LaudosPage from './pages/LaudosPage';
import PortalResultados from './pages/PortalResultados';
import VincularExames from './pages/VincularExames';
import TelemedicinaPage from './pages/TelemedicinaPage';
import ConfiguracoesPage from './pages/ConfiguracoesPage'; 

// Páginas CRM
import CRMKanbanPage from './pages/CRM/CRMKanbanPage';
import DashboardExecutivoPage from './pages/CRM/DashboardExecutivoPage';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
          <Router>
            <Routes>
              {/* Rota Pública */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/resultados" element={<PortalResultados />} />
              
              {/* Rotas Protegidas (Requer Login) */}
              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  
                  /* --- ACESSO GERAL (Médicos, Recepção, Admin) --- */
                  <Route path="/" element={<PainelMedicoPage />} />
                  <Route path="/painel" element={<PainelRecepcaoPage />} /> 

                  <Route path="/laudos" element={<LaudosPage />} />
                  <Route path="/vincular" element={<VincularExames />} />

                  <Route path="/pacientes" element={<PacientesPage />} />
                  <Route path="/pacientes/:pacienteId/prontuario" element={<ProntuarioPage />} />

                  <Route path="/telemedicina" element={<TelemedicinaPage />} />
                  
                  {/* MOVA A LINHA ABAIXO PARA CÁ (FORA DO ADMINROUTE) */}
                  <Route path="/configuracoes" element={<ConfiguracoesPage />} />

                  /* --- ÁREA RESTRITA (ADMINISTRADOR) --- */
                  <Route element={<AdminRoute />}>
                      <Route path="/financeiro/*" element={<FinanceiroPage />} />
                      {/* REMOVA A LINHA DE CONFIGURAÇÕES DAQUI */}
                      <Route path="/crm/kanban" element={<CRMKanbanPage />} />
                      <Route path="/crm/executivo" element={<DashboardExecutivoPage />} />
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