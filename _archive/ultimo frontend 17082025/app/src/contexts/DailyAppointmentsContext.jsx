// src/contexts/DailyAppointmentsContext.jsx

import React, { createContext, useState, useCallback, useContext } from 'react';

// 1. Criamos o Contexto
const DailyAppointmentsContext = createContext();

// 2. Criamos o "Provedor" do Contexto. É um componente que vai gerenciar o estado.
export function DailyAppointmentsProvider({ children }) {
  const [dayPatients, setDayPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // A função de busca que antes estava na Sidebar, agora vive aqui.
  const fetchDayPatients = useCallback(async () => {
    setIsLoading(true);
    const token = sessionStorage.getItem('authToken');
    try {
      const response = await fetch('http://127.0.0.1:8000/api/agendamentos-hoje/', {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (!response.ok) {
        throw new Error('Não foi possível carregar os pacientes do dia.');
      }
      const data = await response.json();
      setDayPatients(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []); // useCallback com array vazio garante que a função não seja recriada

  // O valor que será compartilhado com todos os componentes "filhos"
  const value = {
    dayPatients,
    isLoading,
    error,
    fetchDayPatients // Também compartilhamos a própria função de busca
  };

  return (
    <DailyAppointmentsContext.Provider value={value}>
      {children}
    </DailyAppointmentsContext.Provider>
  );
}

// 3. Criamos um "hook" customizado para facilitar o uso do contexto em outros componentes
export function useDailyAppointments() {
  return useContext(DailyAppointmentsContext);
}