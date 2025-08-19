// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SnackbarProvider } from './contexts/SnackbarContext'; // <-- 1. IMPORTE

// Nossos componentes principais e de página
import LoginPage from './pages/LoginPage'; // <-- Importe a página real
import Navbar from './components/Navbar';
import AgendaPage from './pages/AgendaPage'; // Renomeie o antigo Agenda.js
import PacientesPage from './pages/PacientesPage'; // Vamos criar este
import ProntuarioPage from './pages/ProntuarioPage'; // E este também
import FinanceiroPage from './pages/FinanceiroPage'; // APENAS O IMPORT
import ConfiguracoesPage from './pages/ConfiguracoesPage';

function App() {
  return (
    <SnackbarProvider>
    <Router>
      <Navbar />
      <main className="content">
        <Routes>
          <Route path="/" element={<AgendaPage />} />
          
          {/* Rota para a lista de pacientes */}
          <Route path="/pacientes" element={<PacientesPage />} />
          
          {/* Rota dinâmica para o prontuário de um paciente específico */}
          <Route path="/pacientes/:pacienteId/prontuario" element={<ProntuarioPage />} />

          <Route path="/financeiro/*" element={<FinanceiroPage />} />
          <Route path="/login" element={<LoginPage />} /> {/* <-- Use o componente real */}
          <Route path="/configuracoes" element={<ConfiguracoesPage />} />
    </Routes>
      </main>
    </Router>
  </SnackbarProvider>
  );
}

export default App;