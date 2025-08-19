// ARQUIVO: src/App.jsx

import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Seus Context Providers
import { DailyAppointmentsProvider } from './contexts/DailyAppointmentsContext';
import { SnackbarProvider } from './contexts/SnackbarContext'; 

// Layout e Componentes de Rota
import MainLayout from './components/layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Suas Páginas
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PacientesPage from './pages/PacientesPage';
import AgendaPage from './pages/AgendaPage';
import ProntuarioPage from './pages/ProntuarioPage';
import FinanceiroPage from './pages/FinanceiroPage';
import ConfiguracoesPage from './pages/ConfiguracoesPage';

function App() {
  // Este estado guarda a função que abre o modal. Começa como uma função vazia.
  const [openNewPatientModalFunc, setOpenNewPatientModalFunc] = React.useState(() => () => {});

  return (
    <SnackbarProvider>
      <DailyAppointmentsProvider>
        <Routes>
          {/* Rota de Login (fora do layout principal) */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rota "pai" que usa o MainLayout para todas as rotas internas */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                {/* O App passa a função de abrir o modal para o MainLayout */}
                <MainLayout onOpenNewPatientModalFunc={openNewPatientModalFunc} />
              </ProtectedRoute>
            }
          >
            {/* Rotas "filhas" que serão renderizadas dentro do MainLayout */}
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route 
              path="pacientes" 
              // A PacientesPage recebe a função para ATUALIZAR o estado no App
              element={<PacientesPage setOpenNewModalFunc={setOpenNewPatientModalFunc} />} 
            />
            <Route path="pacientes/:pacienteId/prontuario" element={<ProntuarioPage />} />
            <Route path="agenda" element={<AgendaPage />} />
            <Route path="financeiro/*" element={<FinanceiroPage />} />
            <Route path="configuracoes" element={<ConfiguracoesPage />} />
            <Route path="*" element={<DashboardPage />} />
          </Route>
        </Routes>
      </DailyAppointmentsProvider>
    </SnackbarProvider>
  );
}

export default App;