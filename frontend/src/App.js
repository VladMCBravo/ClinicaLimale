// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SnackbarProvider } from './contexts/SnackbarContext';

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/pt-br';

// Componentes de Layout e Proteção
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

// A NOVA PÁGINA DE CONFIGURAÇÕES (O Hub Central)
import ConfiguracoesPage from './pages/ConfiguracoesPage'; 

function App() {
  return (
    <SnackbarProvider>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
        <Router>
          <Routes>
            {/* Rota Pública */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/resultados" element={<PortalResultados />} />
            
            {/* Rotas Protegidas */}
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                
                <Route path="/" element={<PainelMedicoPage />} />
                <Route path="/painel" element={<PainelRecepcaoPage />} /> 
                
                <Route path="/laudos" element={<LaudosPage />} />
                <Route path="/vincular" element={<VincularExames />} />
                
                <Route path="/pacientes" element={<PacientesPage />} />
                <Route path="/pacientes/:pacienteId/prontuario" element={<ProntuarioPage />} />
                
                <Route path="/telemedicina" element={<TelemedicinaPage />} />
                
                {/* O Financeiro geralmente tem sub-rotas internas, então mantemos o /* */}
                <Route path="/financeiro/*" element={<FinanceiroPage />} />

                {/* --- A GRANDE MUDANÇA AQUI --- */}
                {/* Em vez de várias rotas filhas, temos apenas UMA rota para o painel de configurações. */}
                {/* A navegação entre Usuários, Salas, etc., agora é feita pelas ABAS dentro dessa página. */}
                <Route path="/configuracoes" element={<ConfiguracoesPage />} />

              </Route>
            </Route>
          </Routes>
        </Router>
      </LocalizationProvider>
    </SnackbarProvider>
  );
}

export default App;