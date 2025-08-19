// src/components/PacienteModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Box
} from '@mui/material';
import apiClient from '../api/axiosConfig';

const initialState = {
  nome_completo: '',
  data_nascimento: '',
  email: '',
  telefone_celular: '', // <-- ALTERADO DE 'telefone' PARA 'telefone_celular'
  cpf: ''
};

export default function PacienteModal({ open, onClose, onSave, pacienteParaEditar }) {
  const [formData, setFormData] = useState(initialState);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (pacienteParaEditar) {
      setFormData({
        nome_completo: pacienteParaEditar.nome_completo || '',
        data_nascimento: pacienteParaEditar.data_nascimento || '',
        email: pacienteParaEditar.email || '',
        telefone_celular: pacienteParaEditar.telefone_celular || '', // <-- ATUALIZE AQUI TAMBÉM
        cpf: pacienteParaEditar.cpf || ''
      });
    } else {
      setFormData(initialState);
    }
  }, [pacienteParaEditar, open]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (pacienteParaEditar) {
        // Modo Edição (PUT)
        await apiClient.put(`/pacientes/${pacienteParaEditar.id}/`, formData);
      } else {
        // Modo Criação (POST)
        await apiClient.post('/pacientes/', formData);
      }
      onSave(); // Avisa a página principal para recarregar a lista
      onClose(); // Fecha o modal
    } catch (error) {
      console.error("Erro ao salvar paciente:", error.response?.data);
      // Adicionar notificação de erro aqui
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{pacienteParaEditar ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField name="nome_completo" label="Nome Completo" value={formData.nome_completo} onChange={handleChange} required />
            <TextField name="email" label="Email" type="email" value={formData.email} onChange={handleChange} required />
            <TextField name="cpf" label="CPF" value={formData.cpf} onChange={handleChange} />
            <TextField 
              name="telefone_celular" // <-- ALTERADO DE 'telefone'
              label="Telefone Celular" // <-- Label atualizada para clareza
              value={formData.telefone_celular} 
              onChange={handleChange} 
            />
            <TextField name="data_nascimento" label="Data de Nascimento" type="date" value={formData.data_nascimento} onChange={handleChange} InputLabelProps={{ shrink: true }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? <CircularProgress size={24} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}