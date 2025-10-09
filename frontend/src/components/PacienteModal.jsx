// src/components/PacienteModal.jsx - VERSÃO FINAL E CORRIGIDA
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Box, Autocomplete, Typography, Divider,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import apiClient from '../api/axiosConfig';
import { useSnackbar } from '../contexts/SnackbarContext';

// <<-- 1. ADICIONADO 'genero' AO ESTADO INICIAL -->>
const initialState = {
  nome_completo: '',
  data_nascimento: '',
  email: '',
  telefone_celular: '',
  cpf: '',
  genero: '', // <-- ADICIONADO AQUI
  peso: '',
  altura: '',
  medico_responsavel: null,
  plano_convenio: null,
  numero_carteirinha: '',
};

export default function PacienteModal({ open, onClose, onSave, pacienteParaEditar }) {
  const { showSnackbar } = useSnackbar();
  const [formData, setFormData] = useState(initialState);
  const [isLoading, setIsLoading] = useState(false);
  const [medicos, setMedicos] = useState([]);
  const [convenios, setConvenios] = useState([]);
  const [convenioSelecionado, setConvenioSelecionado] = useState(null);
  const [planosFiltrados, setPlanosFiltrados] = useState([]);

  useEffect(() => {
    if (open) {
      apiClient.get('/usuarios/usuarios/?cargo=medico').then(response => setMedicos(response.data));
      apiClient.get('/faturamento/convenios/').then(response => setConvenios(response.data));
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      if (pacienteParaEditar) {
        setFormData({
          nome_completo: pacienteParaEditar.nome_completo || '',
          data_nascimento: pacienteParaEditar.data_nascimento || '',
          email: pacienteParaEditar.email || '',
          telefone_celular: pacienteParaEditar.telefone_celular || '',
          cpf: pacienteParaEditar.cpf || '',
          genero: pacienteParaEditar.genero || '', // <<-- 2. ADICIONADO AO PREENCHIMENTO DE EDIÇÃO
          peso: pacienteParaEditar.peso || '',
          altura: pacienteParaEditar.altura || '',
          medico_responsavel: pacienteParaEditar.medico_responsavel || null,
          plano_convenio: pacienteParaEditar.plano_convenio || null,
          numero_carteirinha: pacienteParaEditar.numero_carteirinha || '',
        });
      } else {
        setFormData(initialState);
        setConvenioSelecionado(null);
        setPlanosFiltrados([]);
      }
    }
  }, [pacienteParaEditar, open]);

  useEffect(() => {
    if (pacienteParaEditar && pacienteParaEditar.plano_convenio_detalhes && convenios.length > 0) {
      const planoDoPaciente = pacienteParaEditar.plano_convenio_detalhes;
      const convenioPai = convenios.find(c => c.planos.some(p => p.id === planoDoPaciente.id));
      if (convenioPai) {
        setConvenioSelecionado(convenioPai);
        setPlanosFiltrados(convenioPai.planos);
      }
    } else if (!pacienteParaEditar) {
      setConvenioSelecionado(null);
      setPlanosFiltrados([]);
    }
  }, [pacienteParaEditar, convenios]);

  const handleConvenioChange = (event, novoConvenio) => {
    setConvenioSelecionado(novoConvenio);
    setFormData({ ...formData, plano_convenio: null });
    setPlanosFiltrados(novoConvenio ? novoConvenio.planos || [] : []);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // O 'genero' já está em 'formData', então será enviado automaticamente
    const dataToSend = { 
      ...formData,
      peso: formData.peso || null,
      altura: formData.altura || null,
    }; 

    try {
      if (pacienteParaEditar) {
        await apiClient.put(`/pacientes/${pacienteParaEditar.id}/`, dataToSend);
        showSnackbar('Paciente atualizado com sucesso!', 'success');
      } else {
        await apiClient.post('/pacientes/', dataToSend);
        showSnackbar('Paciente criado com sucesso!', 'success');
      }
      onSave();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar paciente:", error.response?.data);
      showSnackbar('Erro ao salvar paciente.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const medicoValue = medicos.find(m => m.id === formData.medico_responsavel) || null;
  const planoValue = planosFiltrados.find(p => p.id === formData.plano_convenio) || null;

  return (
    <Dialog open={open} onClose={() => { onClose(); setConvenioSelecionado(null); }} fullWidth maxWidth="sm">
      <DialogTitle>{pacienteParaEditar ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            
            <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>DADOS PESSOAIS</Typography>
            <TextField name="nome_completo" label="Nome Completo" value={formData.nome_completo} onChange={handleChange} required />
            <TextField name="email" label="Email" type="email" value={formData.email} onChange={handleChange} />
            <TextField name="cpf" label="CPF" value={formData.cpf} onChange={handleChange} />
            <TextField name="telefone_celular" label="Telefone Celular" value={formData.telefone_celular} onChange={handleChange} />
            <TextField name="data_nascimento" label="Data de Nascimento" type="date" value={formData.data_nascimento} onChange={handleChange} InputLabelProps={{ shrink: true }} />

            {/* <<-- 3. CAMPO 'GÊNERO' ADICIONADO AO FORMULÁRIO -->> */}
            <FormControl fullWidth>
                <InputLabel id="genero-select-label">Gênero</InputLabel>
                <Select
                    labelId="genero-select-label"
                    name="genero"
                    value={formData.genero || ''}
                    label="Gênero"
                    onChange={handleChange}
                >
                    <MenuItem value="Masculino">Masculino</MenuItem>
                    <MenuItem value="Feminino">Feminino</MenuItem>
                    <MenuItem value="Outro">Outro</MenuItem>
                </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField name="peso" label="Peso (kg)" type="number" value={formData.peso} onChange={handleChange} fullWidth />
                <TextField name="altura" label="Altura (m)" type="number" value={formData.altura} onChange={handleChange} fullWidth />
            </Box>
            <Autocomplete
              options={medicos}
              getOptionLabel={(option) => `${option.first_name} ${option.last_name}`}
              value={medicoValue}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onChange={(event, newValue) => setFormData({ ...formData, medico_responsavel: newValue ? newValue.id : null })}
              renderInput={(params) => <TextField {...params} label="Médico Responsável" />}
            />

            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>DADOS DO CONVÊNIO</Typography>

            {/* Sua ótima lógica de convênios/planos continua aqui, intacta */}
            <Autocomplete
                options={convenios}
                getOptionLabel={(option) => option.nome || ''}
                value={convenioSelecionado}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onChange={handleConvenioChange}
                renderInput={(params) => <TextField {...params} label="Convênio" />}
            />
            <Autocomplete
                options={planosFiltrados}
                getOptionLabel={(option) => option.nome || ''}
                value={planoValue}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onChange={(event, newValue) => setFormData({ ...formData, plano_convenio: newValue ? newValue.id : null })}
                disabled={!convenioSelecionado} 
                renderInput={(params) => <TextField {...params} label="Plano" />}
            />
            <TextField
                name="numero_carteirinha"
                label="Número da Carteirinha"
                value={formData.numero_carteirinha}
                onChange={handleChange}
                disabled={!formData.plano_convenio}
            />
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