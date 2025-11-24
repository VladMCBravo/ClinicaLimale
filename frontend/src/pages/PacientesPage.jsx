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
import { useSnackbar } from '../contexts/SnackbarContext';

export default function PacientesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  
  // --- ESTADOS ---
  const [pacientes, setPacientes] = useState([]);
  const [filteredPacientes, setFilteredPacientes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pacienteParaEditar, setPacienteParaEditar] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // UseCallback estabilizado: removemos showSnackbar da dependência para evitar loops
  const fetchPacientes = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/pacientes/');
      
      // --- ORDENAÇÃO ALFABÉTICA ADICIONADA AQUI ---
      const dadosOrdenados = response.data.sort((a, b) => 
        a.nome_completo.localeCompare(b.nome_completo, 'pt-BR', { sensitivity: 'base' })
      );

      setPacientes(dadosOrdenados);
      // Inicialmente, a lista filtrada é igual à completa (e já ordenada)
      setFilteredPacientes(dadosOrdenados); 
    } catch (error) {
      console.error("Erro ao buscar pacientes:", error);
      // showSnackbar('Erro ao carregar a lista.', 'error'); // Mantido comentado conforme ajuste anterior
    } finally {
      setIsLoading(false);
    }
  }, []); // Dependências vazias
  
  useEffect(() => {
    fetchPacientes();
  }, [fetchPacientes]);

  // Filtro local
  useEffect(() => {
    if (!pacientes) return;
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = pacientes.filter(item =>
      (item.nome_completo && item.nome_completo.toLowerCase().includes(lowercasedFilter)) ||
      (item.cpf && item.cpf.includes(lowercasedFilter))
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
    if (window.confirm('Tem certeza que deseja deletar este paciente?')) {
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

  return (
    <Paper sx={{ p: 2, margin: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Gestão de Pacientes</Typography>
        <Button variant="contained" color="primary" onClick={handleOpenNewModal}>
          Novo Paciente
        </Button>
      </Box>

      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          label="Buscar paciente por nome ou CPF..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Box>

      {/* CORREÇÃO CRÍTICA: O Loading agora é apenas visual na tabela, 
          NÃO desmonta a página inteira (o que matava o Modal) */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
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
              {filteredPacientes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center">Nenhum paciente encontrado.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* O MODAL AGORA ESTÁ FORA DO BLOCO DE LOADING, PORTANTO NUNCA É DESMONTADO */}
      <PacienteModal 
        open={isModalOpen}
        onClose={handleCloseModal}
        onSave={fetchPacientes}
        pacienteParaEditar={pacienteParaEditar}
      />
    </Paper>
  );
}