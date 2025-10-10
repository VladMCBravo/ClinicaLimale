// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SnackbarProvider } from './contexts/SnackbarContext';

// --- 1. IMPORTE OS COMPONENTES NECESSÁRIOS ---
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/pt-br'; // Importa a localidade para o português

// Importe os novos componentes de layout e proteção
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';

// Importe suas páginas
import LoginPage from './pages/LoginPage';
import PainelMedicoPage from './pages/PainelMedicoPage'; // ERA AgendaPage
import PainelRecepcaoPage from './pages/PainelRecepcaoPage'; // <-- ADICIONE ESTA LINHA
import PacientesPage from './pages/PacientesPage';
import ProntuarioPage from './pages/ProntuarioPage';
import FinanceiroPage from './pages/FinanceiroPage';
import ConfiguracoesPage from './pages/ConfiguracoesPage';
import CategoriasDespesaPage from './pages/CategoriasDespesaPage';
import ConveniosPage from './pages/ConveniosPage';
import EspecialidadesPage from './pages/EspecialidadesPage';
import TelemedicinaPage from './pages/TelemedicinaPage';

function App() {
  return (
    <SnackbarProvider>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
        <Router>
          <Routes>
            {/* Rota de Login (Pública) */}
            <Route path="/login" element={<LoginPage />} />

            {/* Rotas Protegidas */}
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                {/* A ROTA PRINCIPAL AGORA APONTA PARA O PAINEL DO MÉDICO */}
                <Route path="/" element={<PainelMedicoPage />} />
                {/* A ROTA /painel CONTINUA CORRETA PARA A RECEPÇÃO */}
                <Route path="/painel" element={<PainelRecepcaoPage />} /> 
                <Route path="/pacientes" element={<PacientesPage />} />
                <Route path="/pacientes/:pacienteId/prontuario" element={<ProntuarioPage />} />
                <Route path="/telemedicina" element={<TelemedicinaPage />} />
                <Route path="/financeiro/*" element={<FinanceiroPage />} />
                <Route path="/configuracoes" element={<ConfiguracoesPage />} />
                <Route path="/configuracoes/categorias-despesa" element={<CategoriasDespesaPage />} />
                <Route path="/configuracoes/convenios" element={<ConveniosPage />} />
                <Route path="/configuracoes/especialidades" element={<EspecialidadesPage />} />
              </Route>
            </Route>
          </Routes>
        </Router>
      </LocalizationProvider>
    </SnackbarProvider>
  );
}

export default App;