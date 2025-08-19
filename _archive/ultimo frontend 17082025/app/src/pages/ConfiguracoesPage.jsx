// src/pages/ConfiguracoesPage.jsx

import React, { useState, useEffect } from 'react';
import PageLayout from '../components/PageLayout'; // Importe o PageLayout
import UsuarioModal from '../components/UsuarioModal';
import {
  Box, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, Switch, Button
} from '@mui/material';

export default function ConfiguracoesPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 2. Estado para controlar o modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchUsuarios = async () => {
    const token = sessionStorage.getItem('authToken');
    // Reinicia o loading apenas na primeira carga
    if (usuarios.length === 0) setIsLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/usuarios/', {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (!response.ok) throw new Error('Falha ao buscar usuários.');
      const data = await response.json();
      setUsuarios(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const handleToggleActive = async (usuario) => {
    const token = sessionStorage.getItem('authToken');
    const newStatus = !usuario.is_active;

    setUsuarios(usuarios.map(u => u.id === usuario.id ? { ...u, is_active: newStatus } : u));

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/usuarios/${usuario.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({ is_active: newStatus }),
      });

      if (!response.ok) {
        setUsuarios(usuarios.map(u => u.id === usuario.id ? { ...u, is_active: !newStatus } : u));
        throw new Error('Falha ao atualizar o status do usuário.');
      }
    } catch (err) {
      setError(err.message);
    }
  };
  
  // 3. Função para ser chamada após salvar um novo usuário
  const handleSaveUser = () => {
    setIsModalOpen(false);
    fetchUsuarios(); // Recarrega a lista
  };

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Typography color="error">Erro: {error}</Typography>;
  }

  return (
    // Envolvemos todo o conteúdo com o PageLayout
    <PageLayout title="Gerenciamento de Usuários">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        {/* O título agora vem do PageLayout, então podemos remover o Typography daqui se quisermos */}
        <Button variant="contained" color="primary" onClick={() => setIsModalOpen(true)}>
          Novo Usuário
        </Button>
      </Box>

      <TableContainer> {/* Não precisa mais do Paper, pois o PageLayout já tem um */}
        {/* ... (resto da sua tabela) ... */}
      </TableContainer>

      <UsuarioModal 
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveUser}
      />
    </PageLayout>
  );
}
