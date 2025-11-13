// src/components/PacienteModal.jsx - VERSÃO COM MÁSCARAS, GRID e VIACEP

import React, { useState, useEffect, useCallback } from 'react'; // 1. Adicionado useCallback
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Box, Autocomplete, Typography, Divider,
  FormControl, InputLabel, Select, MenuItem,
  Grid, InputAdornment // 2. Adicionado Grid e InputAdornment
} from '@mui/material';
import apiClient from '../api/axiosConfig';
import { useSnackbar } from '../contexts/SnackbarContext';
// 3. Importar as máscaras que já criamos
import { TextMaskCPF, TextMaskTelefone, TextMaskCEP } from '../common/MaskedInput';

const initialState = {
  nome_completo: '',
  data_nascimento: '',
  email: '',
  telefone_celular: '',
  cpf: '',
  genero: '',
  peso: '',
  altura: '',
  medico_responsavel: null,
  plano_convenio: null,
  numero_carteirinha: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  nome_responsavel: '',
  cpf_responsavel: '',
  telefone_responsavel: '',
};

export default function PacienteModal({ open, onClose, onSave, pacienteParaEditar }) {
  const { showSnackbar } = useSnackbar();
  const [formData, setFormData] = useState(initialState);
  const [isLoading, setIsLoading] = useState(false);
  const [medicos, setMedicos] = useState([]);
  const [convenios, setConvenios] = useState([]);
  const [convenioSelecionado, setConvenioSelecionado] = useState(null);
  const [planosFiltrados, setPlanosFiltrados] = useState([]);

  // 4. Novo estado para o loading do CEP
  const [isCepLoading, setIsCepLoading] = useState(false);

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
          genero: pacienteParaEditar.genero || '',
          peso: pacienteParaEditar.peso || '',
          altura: pacienteParaEditar.altura || '',
          medico_responsavel: pacienteParaEditar.medico_responsavel || null,
          plano_convenio: pacienteParaEditar.plano_convenio || null,
          numero_carteirinha: pacienteParaEditar.numero_carteirinha || '',
          cep: pacienteParaEditar.cep || '',
          endereco: pacienteParaEditar.endereco || '',
          numero: pacienteParaEditar.numero || '',
          complemento: pacienteParaEditar.complemento || '',
          bairro: pacienteParaEditar.bairro || '',
          cidade: pacienteParaEditar.cidade || '',
          estado: pacienteParaEditar.estado || '',
          nome_responsavel: pacienteParaEditar.nome_responsavel || '',
          cpf_responsavel: pacienteParaEditar.cpf_responsavel || '',
          telefone_responsavel: pacienteParaEditar.telefone_responsavel || '',
        });
      } else {
        setFormData(initialState);
        setConvenioSelecionado(null);
        setPlanosFiltrados([]);
        setIsCepLoading(false); // Reseta o loading do CEP
      }
    }
  }, [pacienteParaEditar, open]);

  // Lógica de convênios (já estava correta)
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
  
  // 5. Novo handler para campos com máscara
  const handleMaskedChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  // 6. Nova função de busca do VIACEP
  const handleCepBlur = useCallback(async () => {
    const cep = formData.cep?.replace(/[^0-9]/g, ''); // Limpa a máscara
    if (cep && cep.length === 8) {
      setIsCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (!response.ok) throw new Error('CEP não encontrado');
        const data = await response.json();
        if (data.erro) { throw new Error('CEP não localizado'); }

        setFormData(prev => ({
          ...prev,
          endereco: data.logradouro, // Mapeia logradouro -> endereco
          bairro: data.bairro,
          cidade: data.localidade, // Mapeia localidade -> cidade
          estado: data.uf,         // Mapeia uf -> estado
          complemento: data.complemento || '',
        }));
        showSnackbar('Endereço preenchido!', 'success');
      } catch (error) {
        showSnackbar(error.message || 'Erro ao buscar CEP.', 'error');
      } finally {
        setIsCepLoading(false);
      }
    }
  }, [formData.cep, showSnackbar]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
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
      const errorData = error.response?.data;
      // O serializer agora envia erros amigáveis
      const errorMsg = typeof errorData === 'object' ? Object.values(errorData).flat()[0] : 'Erro ao salvar paciente.';
      showSnackbar(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const medicoValue = medicos.find(m => m.id === formData.medico_responsavel) || null;
  const planoValue = planosFiltrados.find(p => p.id === formData.plano_convenio) || null;

  return (
    // 7. Aumentar a largura do modal
    <Dialog open={open} onClose={() => { onClose(); setConvenioSelecionado(null); }} fullWidth maxWidth="lg">
      <DialogTitle>{pacienteParaEditar ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {/* 8. Reestruturação total com Grid */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            
            <Typography variant="h6" sx={{ color: 'text.secondary' }}>Dados Pessoais</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><TextField name="nome_completo" label="Nome Completo" value={formData.nome_completo} onChange={handleChange} required fullWidth /></Grid>
              <Grid item xs={12} sm={6}><TextField name="data_nascimento" label="Data de Nascimento" type="date" value={formData.data_nascimento} onChange={handleChange} InputLabelProps={{ shrink: true }} fullWidth /></Grid>
              <Grid item xs={12} sm={4}>
                <TextField name="cpf" label="CPF (do paciente)" value={formData.cpf} onChange={handleMaskedChange} fullWidth
                  InputProps={{ inputComponent: TextMaskCPF }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                    <InputLabel id="genero-select-label">Gênero</InputLabel>
                    <Select labelId="genero-select-label" name="genero" value={formData.genero || ''} label="Gênero" onChange={handleChange}>
                        <MenuItem value="Masculino">Masculino</MenuItem>
                        <MenuItem value="Feminino">Feminino</MenuItem>
                        <MenuItem value="Outro">Outro</MenuItem>
                    </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField name="telefone_celular" label="Telefone Celular (Contato)" value={formData.telefone_celular} onChange={handleMaskedChange} fullWidth
                  InputProps={{ inputComponent: TextMaskTelefone }}
                />
              </Grid>
              <Grid item xs={12} sm={6}><TextField name="email" label="Email" type="email" value={formData.email} onChange={handleChange} fullWidth /></Grid>
            </Grid>
            
            <Typography variant="h6" sx={{ color: 'text.secondary', mt: 2 }}>Endereço (Opcional)</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <TextField name="cep" label="CEP" value={formData.cep} onChange={handleMaskedChange} onBlur={handleCepBlur} fullWidth
                  InputProps={{ 
                    inputComponent: TextMaskCEP,
                    endAdornment: (
                      <InputAdornment position="end">
                        {isCepLoading && <CircularProgress size={20} />}
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={7}><TextField name="endereco" label="Endereço" value={formData.endereco} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={2}><TextField name="numero" label="Número" value={formData.numero} onChange={handleChange} fullWidth /></Grid>
              <Grid item xs={12} sm={4}><TextField name="complemento" label="Complemento" value={formData.complemento} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={4}><TextField name="bairro" label="Bairro" value={formData.bairro} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={3}><TextField name="cidade" label="Cidade" value={formData.cidade} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={1}><TextField name="estado" label="UF" value={formData.estado} onChange={handleChange} fullWidth inputProps={{ maxLength: 2 }} InputLabelProps={{ shrink: true }} /></Grid>
            </Grid>

            <Typography variant="h6" sx={{ color: 'text.secondary', mt: 2 }}>Responsável (Opcional)</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><TextField name="nome_responsavel" label="Nome do Responsável" value={formData.nome_responsavel} onChange={handleChange} fullWidth /></Grid>
              <Grid item xs={12} sm={3}>
                <TextField name="cpf_responsavel" label="CPF do Responsável" value={formData.cpf_responsavel} onChange={handleMaskedChange} fullWidth
                  InputProps={{ inputComponent: TextMaskCPF }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField name="telefone_responsavel" label="Telefone do Responsável" value={formData.telefone_responsavel} onChange={handleMaskedChange} fullWidth
                  InputProps={{ inputComponent: TextMaskTelefone }}
                />
              </Grid>
            </Grid>

            <Typography variant="h6" sx={{ color: 'text.secondary', mt: 2 }}>Dados Clínicos e Convênio</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}><TextField name="peso" label="Peso (kg)" type="number" value={formData.peso} onChange={handleChange} fullWidth /></Grid>
              <Grid item xs={6} sm={3}><TextField name="altura" label="Altura (cm)" type="number" value={formData.altura} onChange={handleChange} fullWidth /></Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={medicos}
                  getOptionLabel={(option) => `${option.first_name} ${option.last_name}`}
                  value={medicoValue}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  onChange={(event, newValue) => setFormData({ ...formData, medico_responsavel: newValue ? newValue.id : null })}
                  renderInput={(params) => <TextField {...params} label="Médico Responsável" />}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Autocomplete
                  options={convenios}
                  getOptionLabel={(option) => option.nome || ''}
                  value={convenioSelecionado}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  onChange={handleConvenioChange}
                  renderInput={(params) => <TextField {...params} label="Convênio" />}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Autocomplete
                  options={planosFiltrados}
                  getOptionLabel={(option) => option.nome || ''}
                  value={planoValue}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  onChange={(event, newValue) => setFormData({ ...formData, plano_convenio: newValue ? newValue.id : null })}
                  disabled={!convenioSelecionado} 
                  renderInput={(params) => <TextField {...params} label="Plano" />}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  name="numero_carteirinha"
                  label="Número da Carteirinha"
                  value={formData.numero_carteirinha}
                  onChange={handleChange}
                  disabled={!formData.plano_convenio}
                  fullWidth
                />
              </Grid>
            </Grid>
            
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          {/* 9. Botão de salvar atualizado */}
          <Button type="submit" variant="contained" disabled={isLoading || isCepLoading}>
            {(isLoading || isCepLoading) ? <CircularProgress size={24} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}