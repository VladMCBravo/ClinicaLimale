// src/pages/PacientesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import { useAuth } from '../hooks/useAuth';
import PacienteModal from '../components/PacienteModal';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, IconButton, Button, TextField
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSnackbar } from '../contexts/SnackbarContext'; // Apenas um '../' agora

export default function PacientesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  
  // --- ESTADOS ---
  const [pacientes, setPacientes] = useState([]); // Guarda a lista completa original
  const [filteredPacientes, setFilteredPacientes] = useState([]); // Guarda a lista filtrada para exibição
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pacienteParaEditar, setPacienteParaEditar] = useState(null);
  const [searchTerm, setSearchTerm] = useState(''); // Estado para o campo de busca

  const fetchPacientes = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/pacientes/');
      setPacientes(response.data);
      setFilteredPacientes(response.data); // Inicialmente, a lista filtrada é igual à completa
    } catch (error) {
      console.error("Erro ao buscar pacientes:", error);
      showSnackbar('Erro ao carregar a lista de pacientes.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showSnackbar]);
  
  useEffect(() => {
    fetchPacientes();
  }, [fetchPacientes]);

  // --- EFEITO PARA FILTRAR A LISTA QUANDO O TERMO DE BUSCA MUDA ---
  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = pacientes.filter(item =>
      (item.nome_completo && item.nome_completo.toLowerCase().includes(lowercasedFilter)) ||
      (item.cpf && item.cpf.includes(lowercasedFilter)) // Assumindo que CPF não precisa de toLowerCase
    );
    setFilteredPacientes(filteredData);
  }, [searchTerm, pacientes]);


  const handleOpenProntuario = (pacienteId) => {
    navigate(`/pacientes/${pacienteId}/prontuario`);
  };

  const handleEdit = (paciente) => {
    setPacienteParaEditar(paciente);
    setIsModalOpen(true);
  };

  const handleDelete = async (pacienteId) => {
    if (window.confirm('Tem certeza que deseja deletar este paciente? Esta ação não pode ser desfeita.')) {
      try {
        await apiClient.delete(`/pacientes/${pacienteId}/`);
        showSnackbar('Paciente deletado com sucesso!', 'success');
        fetchPacientes();
      } catch (error) {
        console.error("Erro ao deletar paciente:", error);
        showSnackbar('Erro ao deletar paciente.', 'error');
      }
    }
  };

  const handleOpenNewModal = () => {
    setPacienteParaEditar(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPacienteParaEditar(null);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 2, margin: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Gestão de Pacientes</Typography>
        <Button variant="contained" color="primary" onClick={handleOpenNewModal}>
          Novo Paciente
        </Button>
      </Box>

      {/* --- CAMPO DE BUSCA ADICIONADO --- */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          label="Buscar paciente por nome ou CPF..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome Completo</TableCell>
              <TableCell>Email</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* --- A TABELA AGORA USA A LISTA FILTRADA --- */}
            {filteredPacientes.map((paciente) => (
              <TableRow key={paciente.id}>
                <TableCell>{paciente.nome_completo}</TableCell>
                <TableCell>{paciente.email}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleOpenProntuario(paciente.id)} title="Abrir Prontuário"><FolderOpenIcon /></IconButton>
                  <IconButton onClick={() => handleEdit(paciente)} title="Editar Paciente"><EditIcon /></IconButton>
                  {user && user.isAdmin && (
                      <IconButton onClick={() => handleDelete(paciente.id)} title="Deletar Paciente">
                          <DeleteIcon color="error" />
                      </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      <PacienteModal 
        open={isModalOpen}
        onClose={handleCloseModal}
        onSave={fetchPacientes}
        pacienteParaEditar={pacienteParaEditar}
      />
    </Paper>
  );
}