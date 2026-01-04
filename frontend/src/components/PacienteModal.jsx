// src/components/PacienteModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Box, Autocomplete, 
  FormControl, InputLabel, Select, MenuItem,
  Grid, InputAdornment, Tabs, Tab, Paper, Divider, IconButton,
  Typography // <--- O ERRO ESTAVA AQUI: Faltava importar o Typography
} from '@mui/material';
import { 
    Person, Home, MedicalServices, SupervisorAccount, Close 
} from '@mui/icons-material';

import apiClient from '../api/axiosConfig';
import { useSnackbar } from '../contexts/SnackbarContext';
import { TextMaskCPF, TextMaskTelefone, TextMaskCEP } from './common/MaskedInput';

const initialState = {
  nome_completo: '', data_nascimento: '', email: '', telefone_celular: '', cpf: '', genero: '',
  peso: '', altura: '', medico_responsavel: null,
  plano_convenio: null, numero_carteirinha: '',
  cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  nome_responsavel: '', cpf_responsavel: '', telefone_responsavel: '',
};

export default function PacienteModal({ open, onClose, onSave, pacienteParaEditar }) {
  const { showSnackbar } = useSnackbar();
  
  // --- Estados ---
  const [formData, setFormData] = useState(initialState);
  const [tabIndex, setTabIndex] = useState(0); 
  const [isLoading, setIsLoading] = useState(false);
  const [isCepLoading, setIsCepLoading] = useState(false);
  
  // --- Dados Auxiliares ---
  const [medicos, setMedicos] = useState([]);
  const [convenios, setConvenios] = useState([]);
  const [convenioSelecionado, setConvenioSelecionado] = useState(null);
  const [planosFiltrados, setPlanosFiltrados] = useState([]);

  // --- Carregamento Inicial ---
  useEffect(() => {
    if (open) {
      Promise.all([
        apiClient.get('/usuarios/usuarios/?cargo=medico'),
        apiClient.get('/faturamento/convenios/')
      ]).then(([medicosRes, conveniosRes]) => {
        setMedicos(medicosRes.data);
        setConvenios(conveniosRes.data);
      }).catch(err => console.error('Erro ao carregar auxiliares', err));
    }
  }, [open]);

  // --- Preenchimento do Form ---
  useEffect(() => {
    if (open) {
      setTabIndex(0);
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
      }
    }
  }, [pacienteParaEditar, open]);

  // --- Lógica de Convênios ---
  useEffect(() => {
    if (pacienteParaEditar && pacienteParaEditar.plano_convenio_detalhes && convenios.length > 0) {
      const planoDoPaciente = pacienteParaEditar.plano_convenio_detalhes;
      const convenioPai = convenios.find(c => c.planos.some(p => p.id === planoDoPaciente.id));
      if (convenioPai) {
        setConvenioSelecionado(convenioPai);
        setPlanosFiltrados(convenioPai.planos);
      }
    }
  }, [pacienteParaEditar, convenios]);

  const handleConvenioChange = (event, novoConvenio) => {
    setConvenioSelecionado(novoConvenio);
    setFormData(prev => ({ ...prev, plano_convenio: null }));
    setPlanosFiltrados(novoConvenio ? novoConvenio.planos || [] : []);
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  const handleCepBlur = useCallback(async () => {
    const cepLimpo = formData.cep?.replace(/[^0-9]/g, '');
    if (cepLimpo && cepLimpo.length === 8) {
      setIsCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            endereco: data.logradouro || '',
            bairro: data.bairro || '',
            cidade: data.localidade || '',
            estado: data.uf || '',
            complemento: data.complemento || '',
          }));
          showSnackbar('Endereço encontrado!', 'success');
        } else {
          showSnackbar('CEP não localizado.', 'warning');
        }
      } catch (error) {
        console.error('Erro CEP', error);
      } finally {
        setIsCepLoading(false);
      }
    }
  }, [formData.cep, showSnackbar]);

  const handleSaveClick = async () => {
    setIsLoading(true);
    const dataToSend = { 
      ...formData,
      peso: formData.peso === '' ? null : formData.peso,
      altura: formData.altura === '' ? null : formData.altura,
      cpf: formData.cpf === '' ? null : formData.cpf,
      email: formData.email === '' ? null : formData.email
    }; 

    try {
      if (pacienteParaEditar) {
        await apiClient.put(`/pacientes/${pacienteParaEditar.id}/`, dataToSend);
        showSnackbar('Paciente atualizado!', 'success');
      } else {
        await apiClient.post('/pacientes/', dataToSend);
        showSnackbar('Paciente criado!', 'success');
      }
      if (onSave) onSave();
      onClose();
    } catch (error) {
      const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : 'Erro ao salvar.';
      showSnackbar(errorMsg.replace(/[\[\]"{}]/g, ''), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (tabIndex) {
      case 0:
        return (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={8}>
              <TextField name="nome_completo" label="Nome Completo" value={formData.nome_completo} onChange={handleChange} required fullWidth size="small" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField name="data_nascimento" label="Nascimento" type="date" value={formData.data_nascimento} onChange={handleChange} InputLabelProps={{ shrink: true }} fullWidth size="small" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField name="cpf" label="CPF" value={formData.cpf} onChange={handleChange} fullWidth size="small" InputProps={{ inputComponent: TextMaskCPF }} />
            </Grid>
            <Grid item xs={12} sm={4}>
               <FormControl fullWidth size="small">
                  <InputLabel>Gênero</InputLabel>
                  <Select name="genero" value={formData.genero || ''} label="Gênero" onChange={handleChange}>
                      <MenuItem value="Masculino">Masculino</MenuItem>
                      <MenuItem value="Feminino">Feminino</MenuItem>
                      <MenuItem value="Outro">Outro</MenuItem>
                  </Select>
               </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField name="telefone_celular" label="Celular/WhatsApp" value={formData.telefone_celular} onChange={handleChange} fullWidth size="small" InputProps={{ inputComponent: TextMaskTelefone }} />
            </Grid>
            <Grid item xs={12}>
              <TextField name="email" label="Email" type="email" value={formData.email} onChange={handleChange} fullWidth size="small" />
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={4}>
              <TextField 
                name="cep" label="CEP" value={formData.cep} onChange={handleChange} onBlur={handleCepBlur} fullWidth size="small"
                InputProps={{ 
                  inputComponent: TextMaskCEP,
                  endAdornment: isCepLoading && <InputAdornment position="end"><CircularProgress size={20} /></InputAdornment> 
                }} 
              />
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField name="endereco" label="Logradouro" value={formData.endereco} onChange={handleChange} fullWidth size="small" InputLabelProps={{ shrink: !!formData.endereco }} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField name="numero" label="Número" value={formData.numero} onChange={handleChange} fullWidth size="small" />
            </Grid>
            <Grid item xs={12} sm={5}>
              <TextField name="complemento" label="Complemento" value={formData.complemento} onChange={handleChange} fullWidth size="small" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField name="bairro" label="Bairro" value={formData.bairro} onChange={handleChange} fullWidth size="small" InputLabelProps={{ shrink: !!formData.bairro }} />
            </Grid>
            <Grid item xs={12} sm={9}>
              <TextField name="cidade" label="Cidade" value={formData.cidade} onChange={handleChange} fullWidth size="small" InputLabelProps={{ shrink: !!formData.cidade }} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField name="estado" label="UF" value={formData.estado} onChange={handleChange} fullWidth size="small" inputProps={{ maxLength: 2 }} InputLabelProps={{ shrink: !!formData.estado }} />
            </Grid>
          </Grid>
        );
      case 2:
        return (
          <Grid container spacing={2} sx={{ mt: 1 }}>
             <Grid item xs={12}>
                 <Typography variant="subtitle2" color="primary" sx={{mb: 1}}>Dados Físicos</Typography>
                 <Grid container spacing={2}>
                    <Grid item xs={6}><TextField name="peso" label="Peso (kg)" type="number" value={formData.peso} onChange={handleChange} fullWidth size="small" /></Grid>
                    <Grid item xs={6}><TextField name="altura" label="Altura (cm)" type="number" value={formData.altura} onChange={handleChange} fullWidth size="small" /></Grid>
                 </Grid>
             </Grid>
             <Grid item xs={12}>
                <Divider sx={{my: 1}} />
                <Typography variant="subtitle2" color="primary" sx={{mb: 1}}>Médico e Plano</Typography>
             </Grid>
            <Grid item xs={12}>
              <Autocomplete
                options={medicos}
                getOptionLabel={(o) => `${o.first_name} ${o.last_name}`}
                value={medicos.find(m => m.id === formData.medico_responsavel) || null}
                onChange={(e, v) => setFormData(prev => ({ ...prev, medico_responsavel: v ? v.id : null }))}
                renderInput={(params) => <TextField {...params} label="Médico Responsável" size="small" />}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={convenios}
                getOptionLabel={(o) => o.nome || ''}
                value={convenioSelecionado}
                onChange={handleConvenioChange}
                renderInput={(params) => <TextField {...params} label="Convênio" size="small" />}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={planosFiltrados}
                getOptionLabel={(o) => o.nome || ''}
                value={planosFiltrados.find(p => p.id === formData.plano_convenio) || null}
                onChange={(e, v) => setFormData(prev => ({ ...prev, plano_convenio: v ? v.id : null }))}
                disabled={!convenioSelecionado}
                renderInput={(params) => <TextField {...params} label="Plano" size="small" />}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField name="numero_carteirinha" label="Carteirinha" value={formData.numero_carteirinha} onChange={handleChange} disabled={!formData.plano_convenio} fullWidth size="small" />
            </Grid>
          </Grid>
        );
      case 3:
        return (
          <Grid container spacing={2} sx={{ mt: 1 }}>
             <Grid item xs={12}>
                 <Paper variant="outlined" sx={{p: 2, bgcolor: '#f8f9fa'}}>
                    <Typography variant="caption" display="block" sx={{mb: 2}}>
                        Preencha apenas se o paciente for menor de idade ou necessitar de um responsável legal.
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12}><TextField name="nome_responsavel" label="Nome do Responsável" value={formData.nome_responsavel} onChange={handleChange} fullWidth size="small" /></Grid>
                        <Grid item xs={12} sm={6}><TextField name="cpf_responsavel" label="CPF Responsável" value={formData.cpf_responsavel} onChange={handleChange} fullWidth size="small" InputProps={{ inputComponent: TextMaskCPF }} /></Grid>
                        <Grid item xs={12} sm={6}><TextField name="telefone_responsavel" label="Tel. Responsável" value={formData.telefone_responsavel} onChange={handleChange} fullWidth size="small" InputProps={{ inputComponent: TextMaskTelefone }} /></Grid>
                    </Grid>
                 </Paper>
            </Grid>
          </Grid>
        );
      default: return null;
    }
  };

  return (
    <Dialog open={open} onClose={() => { onClose(); setTabIndex(0); }} fullWidth maxWidth="md" disableEscapeKeyDown={isLoading}>
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: '#333' }}>
          {pacienteParaEditar ? 'Editar Paciente' : 'Novo Paciente'}
        </Typography>
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>
      <Box component="div" sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Paper elevation={0} square sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
                value={tabIndex} 
                onChange={handleTabChange} 
                variant="scrollable" 
                scrollButtons="auto" 
                indicatorColor="primary" 
                textColor="primary"
            >
                <Tab icon={<Person />} iconPosition="start" label="Pessoais" sx={{ minHeight: '50px', textTransform: 'none', fontWeight: 600 }} />
                <Tab icon={<Home />} iconPosition="start" label="Endereço" sx={{ minHeight: '50px', textTransform: 'none', fontWeight: 600 }} />
                <Tab icon={<MedicalServices />} iconPosition="start" label="Convênio" sx={{ minHeight: '50px', textTransform: 'none', fontWeight: 600 }} />
                <Tab icon={<SupervisorAccount />} iconPosition="start" label="Responsável" sx={{ minHeight: '50px', textTransform: 'none', fontWeight: 600 }} />
            </Tabs>
        </Paper>
        <DialogContent sx={{ py: 2, px: 3, minHeight: '300px' }}>
            {renderTabContent()}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #e0e0e0', bgcolor: '#fafafa' }}>
          <Button onClick={onClose} color="inherit" sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button onClick={handleSaveClick} variant="contained" disabled={isLoading || isCepLoading} sx={{ px: 4, textTransform: 'none', fontWeight: 'bold' }}>
            {(isLoading || isCepLoading) ? <CircularProgress size={24} color="inherit" /> : 'Salvar Dados'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}