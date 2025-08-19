// src/components/PacienteModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Box, Autocomplete
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
  const [medicos, setMedicos] = useState([]); // <-- NOVO ESTADO para a lista de médicos

// Busca a lista de médicos quando o modal abre
  useEffect(() => {
    if (open) {
      apiClient.get('/usuarios/usuarios/?cargo=medico')
        .then(response => {
          setMedicos(response.data);
        })
        .catch(err => console.error("Erro ao buscar médicos", err));
    }
  }, [open]);

  useEffect(() => {
    if (pacienteParaEditar) {
      setFormData({
        nome_completo: pacienteParaEditar.nome_completo || '',
        data_nascimento: pacienteParaEditar.data_nascimento || '',
        email: pacienteParaEditar.email || '',
        telefone_celular: pacienteParaEditar.telefone_celular || '', // <-- ATUALIZE AQUI TAMBÉM
        cpf: pacienteParaEditar.cpf || '',
        medico_responsavel: pacienteParaEditar.medico_responsavel || null, // <-- ADICIONE
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
    // Garante que estamos enviando apenas o ID do médico
    const dataToSend = { ...formData, medico_responsavel: formData.medico_responsavel?.id || formData.medico_responsavel };
    try {
      if (pacienteParaEditar) {
        // Modo Edição (PUT)
        await apiClient.put(`/pacientes/${pacienteParaEditar.id}/`, dataToSend);
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

// Encontra o objeto do médico para o valor do Autocomplete
  const medicoValue = medicos.find(m => m.id === formData.medico_responsavel) || null;

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
            {/* NOVO CAMPO DE SELEÇÃO DE MÉDICO */}
            <Autocomplete
              options={medicos}
              getOptionLabel={(option) => option.first_name + ' ' + option.last_name}
              value={medicoValue}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onChange={(event, newValue) => {
                setFormData({ ...formData, medico_responsavel: newValue ? newValue.id : null });
              }}
              renderInput={(params) => (
                <TextField {...params} label="Médico Responsável" variant="outlined" />
              )}
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