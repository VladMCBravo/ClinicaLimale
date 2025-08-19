import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PacienteModal from '../components/PacienteModal';
import { useSnackbar } from '../contexts/SnackbarContext';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, IconButton, TextField, Button
} from '@mui/material';
import PageLayout from '../components/PageLayout';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';

// A prop 'setOpenNewModalFunc' foi REMOVIDA, simplificando o componente
export default function PacientesPage() {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [pacientes, setPacientes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pacienteParaEditar, setPacienteParaEditar] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPacientes, setFilteredPacientes] = useState([]);
  
  const fetchPacientes = useCallback(async () => {
    // Apenas mostra o loading na primeira carga
    if (pacientes.length === 0) setIsLoading(true);
    setError(null);
    try {
      const token = sessionStorage.getItem('authToken');
      if (!token) throw new Error("Token de autenticação não encontrado.");
      const response = await fetch('http://127.0.0.1:8000/api/pacientes/', { headers: { 'Authorization': `Token ${token}` } });
      if (!response.ok) throw new Error(`Erro na API: ${response.statusText}`);
      const data = await response.json();
      setPacientes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [pacientes.length]);
  
  useEffect(() => {
    fetchPacientes();
  }, [fetchPacientes]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = pacientes.filter(item =>
      (item.nome_completo && item.nome_completo.toLowerCase().includes(lowercasedFilter)) ||
      (item.cpf && item.cpf.includes(searchTerm))
    );
    setFilteredPacientes(filteredData);
  }, [searchTerm, pacientes]);

  const handleEdit = (paciente) => {
    setPacienteParaEditar(paciente);
    setIsModalOpen(true);
  };
  
  const handleOpenNewModal = useCallback(() => {
    setPacienteParaEditar(null);
    setIsModalOpen(true);
  }, []);
  
  // O useEffect de comunicação complexa foi removido

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPacienteParaEditar(null);
  };

  const handleDelete = async (pacienteId) => {
    if (window.confirm('Tem certeza que deseja deletar este paciente?')) {
      const token = sessionStorage.getItem('authToken');
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/pacientes/${pacienteId}/`, {
          method: 'DELETE',
          headers: { 'Authorization': `Token ${token}` },
        });
        if (!response.ok) throw new Error('Falha ao deletar o paciente.');
        showSnackbar('Paciente deletado com sucesso!', 'success');
        fetchPacientes();
      } catch (err) {
        showSnackbar(`Erro ao deletar: ${err.message}`, 'error');
      }
    }
  };
  
  const handleOpenProntuario = (pacienteId) => {
    navigate(`/pacientes/${pacienteId}/prontuario`);
  };

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
  }
  
  if (error) {
     return <Typography color="error">Erro ao carregar pacientes: {error}</Typography>;
  }

  return (
    <PageLayout title="Gestão de Pacientes">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ width: '50%' }}>
            <TextField
                fullWidth
                variant="outlined"
                label="Buscar paciente por nome ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
            />
        </Box>
        {/* O BOTÃO VOLTOU PARA CÁ, COM CONTROLE DIRETO */}
        <Button variant="contained" color="secondary" onClick={handleOpenNewModal}>
            Novo Paciente
        </Button>
      </Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome Completo</TableCell>
              <TableCell align="center">Idade</TableCell>
              <TableCell>CPF</TableCell>
              <TableCell align="center">Consultas</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPacientes.map((paciente) => (
              <TableRow key={paciente.id}>
                <TableCell>{paciente.nome_completo}</TableCell>
                <TableCell align="center">{paciente.idade !== null ? `${paciente.idade} anos` : 'N/A'}</TableCell>
                <TableCell>{paciente.cpf}</TableCell>
                <TableCell align="center">{paciente.total_consultas}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleOpenProntuario(paciente.id)}><FolderOpenIcon /></IconButton>
                  <IconButton onClick={() => handleEdit(paciente)}><EditIcon /></IconButton>
                  <IconButton onClick={() => handleDelete(paciente.id)}><DeleteIcon color="error" /></IconButton>
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
    </PageLayout>
  );
}