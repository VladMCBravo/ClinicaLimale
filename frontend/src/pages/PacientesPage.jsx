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
import LinkIcon from '@mui/icons-material/Link';
import WhatsAppIcon from '@mui/icons-material/WhatsApp'; // Opcional: ícone visual
import { useSnackbar } from '../contexts/SnackbarContext';
import ModalVincularExame from '../components/prontuario/ModalVincularExame';

// Função auxiliar para formatar data (YYYY-MM-DD -> DD/MM/YYYY)
const formatData = (dataString) => {
    if (!dataString) return '-';
    // Evita problemas de timezone fazendo split direto na string
    const partes = dataString.split('-'); 
    if(partes.length < 3) return dataString;
    return `${partes[2]}/${partes[1]}/${partes[0]}`; 
};

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
  const [modalVincularOpen, setModalVincularOpen] = useState(false);
  const [pacienteParaVincular, setPacienteParaVincular] = useState(null);

  const handleOpenVincular = (paciente) => {
      setPacienteParaVincular(paciente);
      setModalVincularOpen(true);
  };

  const fetchPacientes = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/pacientes/');
      
      const dadosOrdenados = response.data.sort((a, b) => 
        a.nome_completo.localeCompare(b.nome_completo, 'pt-BR', { sensitivity: 'base' })
      );

      setPacientes(dadosOrdenados);
      setFilteredPacientes(dadosOrdenados); 
    } catch (error) {
      console.error("Erro ao buscar pacientes:", error);
    } finally {
      setIsLoading(false);
    }
  }, []); 
  
  useEffect(() => {
    fetchPacientes();
  }, [fetchPacientes]);

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

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{fontWeight: 'bold'}}>Nome Completo</TableCell>
                <TableCell sx={{fontWeight: 'bold'}}>Telefone / WhatsApp</TableCell> {/* NOVA COLUNA */}
                <TableCell sx={{fontWeight: 'bold'}}>Nascimento</TableCell> {/* NOVA COLUNA */}
                <TableCell sx={{fontWeight: 'bold'}}>Email</TableCell>
                <TableCell align="right" sx={{fontWeight: 'bold'}}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPacientes.map((paciente) => (
                <TableRow key={paciente.id} hover>
                  <TableCell>{paciente.nome_completo}</TableCell>
                  
                  {/* --- NOVAS COLUNAS --- */}
                  <TableCell>
                      {paciente.telefone_celular ? (
                          <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5}}>
                              <WhatsAppIcon sx={{fontSize: 16, color: '#25D366'}} />
                              {paciente.telefone_celular}
                          </Box>
                      ) : '-'}
                  </TableCell>
                  <TableCell>{formatData(paciente.data_nascimento)}</TableCell>
                  
                  <TableCell>{paciente.email || '-'}</TableCell>
                  
                  <TableCell align="right">
                    <IconButton onClick={() => handleOpenVincular(paciente)} title="Vincular Exame Solto"><LinkIcon color="primary" /></IconButton>
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
                  <TableCell colSpan={5} align="center">Nenhum paciente encontrado.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      <PacienteModal 
        open={isModalOpen}
        onClose={handleCloseModal}
        onSave={fetchPacientes}
        pacienteParaEditar={pacienteParaEditar}
      />
      <ModalVincularExame 
        open={modalVincularOpen}
        onClose={() => setModalVincularOpen(false)}
        paciente={pacienteParaVincular}
        onSuccess={() => showSnackbar('Exame vinculado com sucesso!', 'success')}
      />
    </Paper>
  );
}