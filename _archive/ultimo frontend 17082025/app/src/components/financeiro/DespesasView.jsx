// src/components/financeiro/DespesasView.jsx

import React, { useState, useEffect } from 'react';
import DespesaModal from './DespesaModal';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';

export default function DespesasView() {
  const [despesas, setDespesas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState(null);

  const fetchDespesas = async () => {
    setIsLoading(true);
    const token = sessionStorage.getItem('authToken');
    try {
      const response = await fetch('http://127.0.0.1:8000/api/despesas/', {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (!response.ok) throw new Error('Falha ao buscar despesas.');
      const data = await response.json();
      setDespesas(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDespesas();
  }, []);

  const handleOpenModal = (despesa = null) => {
    setEditingDespesa(despesa);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDespesa(null);
  };
  
  const handleSave = () => {
    handleCloseModal();
    fetchDespesas();
  };

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Typography color="error">Erro: {error}</Typography>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2">
          Registro de Despesas
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenModal()}>
          Nova Despesa
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell>Descrição</TableCell>
              <TableCell>Categoria</TableCell>
              <TableCell align="right">Valor (R$)</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {despesas.map((despesa) => (
              <TableRow key={despesa.id}>
                <TableCell>{new Date(despesa.data_despesa).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</TableCell>
                <TableCell>{despesa.descricao}</TableCell>
                <TableCell>{despesa.categoria_nome}</TableCell>
                <TableCell align="right">{parseFloat(despesa.valor).toFixed(2)}</TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={() => handleOpenModal(despesa)}>
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <DespesaModal
        open={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        editingDespesa={editingDespesa}
      />
    </Box>
  );
}