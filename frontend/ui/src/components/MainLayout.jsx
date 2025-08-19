// src/components/MainLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function MainLayout() {
  return (
    <>
      <Navbar />
      <main className="content">
        <Outlet /> {/* Aqui é onde as páginas (Agenda, Pacientes, etc.) serão renderizadas */}
      </main>
    </>
  );
}