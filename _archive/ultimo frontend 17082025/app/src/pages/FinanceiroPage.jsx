import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout'; // Importe o PageLayout

// Importando nossas sub-telas
import PagamentosPendentesView from '../components/financeiro/PagamentosPendentesView';
import DespesasView from '../components/financeiro/DespesasView';
import RelatoriosView from '../components/financeiro/RelatoriosView';

export default function FinanceiroPage() {
  return (
    <PageLayout title="Gestão Financeira">
      <Routes>
        <Route path="/" element={<Navigate to="pendentes" replace />} />
        <Route path="pendentes" element={<PagamentosPendentesView />} />
        <Route path="despesas" element={<DespesasView />} />
        <Route path="relatorios" element={<RelatoriosView />} />
      </Routes>
    </PageLayout>
  );
}