// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SnackbarProvider } from './contexts/SnackbarContext';

// Importe os novos componentes de layout e proteção
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';

// Importe suas páginas
import LoginPage from './pages/LoginPage';
import AgendaPage from './pages/AgendaPage';
import DashboardPage from './pages/DashboardPage';
import PacientesPage from './pages/PacientesPage';
import ProntuarioPage from './pages/ProntuarioPage';
import FinanceiroPage from './pages/FinanceiroPage';
import ConfiguracoesPage from './pages/ConfiguracoesPage';
import CategoriasDespesaPage from './pages/CategoriasDespesaPage';
import ConveniosPage from './pages/ConveniosPage'; // Importe a nova página
import EspecialidadesPage from './pages/EspecialidadesPage'; // <-- 1. IMPORTE A NOVA PÁGINA
import TelemedicinaPage from './pages/TelemedicinaPage'; // <-- 1. Importe a nova página

function App() {
  return (
    <SnackbarProvider>
      <Router>
        <Routes>
          {/* Rota de Login (Pública) */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rotas Protegidas (Envolvidas pelo ProtectedRoute) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<AgendaPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/pacientes" element={<PacientesPage />} />
              <Route path="/pacientes/:pacienteId/prontuario" element={<ProntuarioPage />} />
               <Route path="/telemedicina" element={<TelemedicinaPage />} />
              <Route path="/financeiro/*" element={<FinanceiroPage />} />
              <Route path="/configuracoes" element={<ConfiguracoesPage />} />
              <Route path="/configuracoes/categorias-despesa" element={<CategoriasDespesaPage />} />
              <Route path="/configuracoes/convenios" element={<ConveniosPage />} />
              <Route path="/configuracoes/especialidades" element={<EspecialidadesPage />} /> {/* <-- 2. ADICIONE A NOVA ROTA */}
            </Route>
          </Route>
        </Routes>
      </Router>
    </SnackbarProvider>
  );
}

export default App;