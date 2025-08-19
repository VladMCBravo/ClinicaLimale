// src/contexts/PacienteModalContext.jsx

import React, { createContext, useState, useContext, useCallback } from 'react';
import PacienteModal from '../components/PacienteModal';

const PacienteModalContext = createContext();

export function PacienteModalProvider({ children, onSave }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pacienteParaEditar, setPacienteParaEditar] = useState(null);

  const openModal = useCallback((paciente = null) => {
    setPacienteParaEditar(paciente);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setPacienteParaEditar(null);
  }, []);

  const value = { openModal, closeModal };

  return (
    <PacienteModalContext.Provider value={value}>
      {children}
      <PacienteModal
        open={isModalOpen}
        onClose={closeModal}
        onSave={() => {
          closeModal();
          if (onSave) onSave(); // Chama a função de recarregar a lista
        }}
        pacienteParaEditar={pacienteParaEditar}
      />
    </PacienteModalContext.Provider>
  );
}

export function usePacienteModal() {
  return useContext(PacienteModalContext);
}