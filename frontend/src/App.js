// src/App.js // Forçando o rebuild da Vercel
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import PainelMedicoPage from './pages/PainelMedico/PainelMedicoPage'; 
import PainelRecepcaoPage from './pages/PainelRecepcaoPage'; // <-- ADICIONE ESTA LINHA
import PacientesPage from './pages/PacientesPage';
import ProntuarioPage from './pages/ProntuarioPage';
import FinanceiroPage from './pages/FinanceiroPage';
import ConfiguracoesLayout from './layouts/ConfiguracoesLayout'; // Importe o novo layout
import ConfiguracoesPage from './pages/ConfiguracoesPage';
import CategoriasDespesaPage from './pages/CategoriasDespesaPage';
import ConveniosPage from './pages/ConveniosPage';
import EspecialidadesPage from './pages/EspecialidadesPage';
import TelemedicinaPage from './pages/TelemedicinaPage';
import JornadaTrabalhoPage from './pages/JornadaTrabalhoPage';
import ProcedimentosPage from './pages/ProcedimentosPage';
import SalasPage from './pages/SalasPage';
import LaudosPage from './pages/LaudosPage'; // <-- Adicione isso lá em cima
import PortalResultados from './pages/PortalResultados'; // <--- Adicione esta linha
import VincularExames from './pages/VincularExames';

function App() {
  return (
    <SnackbarProvider>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
        <Router>
          <Routes>
            {/* Rota de Login (Pública) */}
            <Route path="/login" element={<LoginPage />} />
            {/* --- NOVA ROTA DO PACIENTE (Pública) --- */}
            <Route path="/resultados" element={<PortalResultados />} />
            
            {/* Rotas Protegidas */}
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                {/* A ROTA PRINCIPAL AGORA APONTA PARA O PAINEL DO MÉDICO */}
                <Route path="/" element={<PainelMedicoPage />} />
                {/* A ROTA /painel CONTINUA CORRETA PARA A RECEPÇÃO */}
                <Route path="/painel" element={<PainelRecepcaoPage />} /> 
                {/* ADICIONE ESTA LINHA AQUI: */}
                <Route path="/laudos" element={<LaudosPage />} />
                <Route path="/vincular" element={<VincularExames />} />
                <Route path="/pacientes" element={<PacientesPage />} />
                <Route path="/pacientes/:pacienteId/prontuario" element={<ProntuarioPage />} />
                <Route path="/telemedicina" element={<TelemedicinaPage />} />
                <Route path="/financeiro/*" element={<FinanceiroPage />} />
                <Route path="/configuracoes" element={<ConfiguracoesLayout />}>
                {/* Redireciona /configuracoes para /configuracoes/usuarios */}
                <Route index element={<Navigate to="usuarios" replace />} /> 
                <Route path="usuarios" element={<ConfiguracoesPage />} />
                <Route path="especialidades" element={<EspecialidadesPage />} />
                <Route path="jornadas" element={<JornadaTrabalhoPage />} /> {/* <-- NOVO */}
                <Route path="convenios" element={<ConveniosPage />} />
                <Route path="categorias-despesa" element={<CategoriasDespesaPage />} />
                <Route path="procedimentos" element={<ProcedimentosPage />} /> {/* <-- NOVO */}
                <Route path="/recepcao/vincular" element={<VincularExames />} />
                <Route path="salas" element={<SalasPage />} /> {/* <-- NOVO */}
                </Route> {/* <-- Esta linha (60) fecha o </ProtectedRoute> */}
              </Route>
            </Route>
          </Routes>
        </Router>
      </LocalizationProvider>
    </SnackbarProvider>
  );
}

export default App;