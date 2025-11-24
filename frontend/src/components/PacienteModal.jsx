// src/components/PacienteModal.jsx - VERSÃO DEBUGGABLE
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Box, Autocomplete, Typography,
  FormControl, InputLabel, Select, MenuItem,
  Grid, InputAdornment
} from '@mui/material';
import apiClient from '../api/axiosConfig';
import { useSnackbar } from '../contexts/SnackbarContext';
import { TextMaskCPF, TextMaskTelefone, TextMaskCEP } from './common/MaskedInput';

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
  console.log('[DEBUG] RENDER: PacienteModal renderizou. Open:', open);

  const { showSnackbar } = useSnackbar();
  const [formData, setFormData] = useState(initialState);
  const [isLoading, setIsLoading] = useState(false);
  const [medicos, setMedicos] = useState([]);
  const [convenios, setConvenios] = useState([]);
  const [convenioSelecionado, setConvenioSelecionado] = useState(null);
  const [planosFiltrados, setPlanosFiltrados] = useState([]);
  const [isCepLoading, setIsCepLoading] = useState(false);

  useEffect(() => {
    if (open) {
      console.log('[DEBUG] EFFECT: Modal abriu. Buscando dados auxiliares...');
      Promise.all([
        apiClient.get('/usuarios/usuarios/?cargo=medico'),
        apiClient.get('/faturamento/convenios/')
      ]).then(([medicosRes, conveniosRes]) => {
        console.log('[DEBUG] DADOS: Médicos e convênios carregados.');
        setMedicos(medicosRes.data);
        setConvenios(conveniosRes.data);
      }).catch(err => console.error('[DEBUG] ERRO: Falha ao carregar auxiliares', err));
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      if (pacienteParaEditar) {
        console.log('[DEBUG] EFFECT: Modo Edição iniciada para ID:', pacienteParaEditar.id);
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
        console.log('[DEBUG] EFFECT: Modo Criação (Resetando form)');
        setFormData(initialState);
        setConvenioSelecionado(null);
        setPlanosFiltrados([]);
        setIsCepLoading(false);
      }
    }
  }, [pacienteParaEditar, open]);

  // Lógica de convênios
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
    // console.log(`[DEBUG] Change no campo: ${e.target.name} = ${e.target.value}`);
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  
  // LOGS ESPECÍFICOS PARA O CEP
  const handleCepKeyDown = (e) => {
    console.log('[DEBUG] CEP KeyDown:', e.key);
    if (e.key === 'Enter') {
      console.log('[DEBUG] CEP: Enter pressionado! Bloqueando default...');
      e.preventDefault();
      e.stopPropagation();
      // Opcional: chamar busca manual aqui se quiser
      // handleCepBlur();
    }
  };

  const handleCepBlur = useCallback(async () => {
    console.log('[DEBUG] CEP: Evento Blur disparado. Valor atual:', formData.cep);
    
    const cepLimpo = formData.cep?.replace(/[^0-9]/g, '');
    console.log('[DEBUG] CEP Limpo:', cepLimpo);

    if (cepLimpo && cepLimpo.length === 8) {
      console.log('[DEBUG] CEP: Iniciando fetch no ViaCEP...');
      setIsCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        if (!response.ok) throw new Error('Erro na requisição');
        
        const data = await response.json();
        console.log('[DEBUG] CEP: Resposta recebida:', data);
        
        if (data.erro) {
          console.warn('[DEBUG] CEP: Erro na API (CEP inexistente)');
          showSnackbar('CEP não localizado.', 'warning');
          return;
        }

        console.log('[DEBUG] CEP: Atualizando estado do formulário...');
        setFormData(prev => ({
          ...prev,
          endereco: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          estado: data.uf || '',
          complemento: data.complemento || '',
        }));
        showSnackbar('Endereço encontrado!', 'success');
      } catch (error) {
        console.error('[DEBUG] CEP CRITICAL ERROR:', error);
        showSnackbar('Erro ao buscar CEP.', 'error');
      } finally {
        setIsCepLoading(false);
        console.log('[DEBUG] CEP: Loading finalizado');
      }
    } else {
        console.log('[DEBUG] CEP: Ignorando busca (tamanho inválido ou vazio)');
    }
  }, [formData.cep, showSnackbar]);

  const cepInputProps = useMemo(() => {
    // console.log('[DEBUG] Recalculando InputProps do CEP. Loading:', isCepLoading);
    return {
      inputComponent: TextMaskCEP,
      endAdornment: (
        <InputAdornment position="end">
          {isCepLoading && <CircularProgress size={20} />}
        </InputAdornment>
      )
    };
  }, [isCepLoading]);

  // FUNÇÃO DE SALVAR ISOLADA
  const handleSaveClick = async () => {
    console.log('[DEBUG] SAVE: Botão Salvar clicado. Dados:', formData);
    
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
        console.log('[DEBUG] SAVE: Enviando PUT...');
        await apiClient.put(`/pacientes/${pacienteParaEditar.id}/`, dataToSend);
        showSnackbar('Paciente atualizado com sucesso!', 'success');
      } else {
        console.log('[DEBUG] SAVE: Enviando POST...');
        await apiClient.post('/pacientes/', dataToSend);
        showSnackbar('Paciente criado com sucesso!', 'success');
      }
      
      console.log('[DEBUG] SAVE: Sucesso API. Fechando modal.');
      if (onSave) onSave();
      onClose();
    } catch (error) {
      console.error("[DEBUG] SAVE ERROR:", error);
      const errorData = error.response?.data;
      const errorMsg = typeof errorData === 'object' 
        ? JSON.stringify(Object.values(errorData).flat()) 
        : 'Erro ao salvar paciente.';
      showSnackbar(errorMsg.replace(/[\[\]"]/g, ''), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const medicoValue = medicos.find(m => m.id === formData.medico_responsavel) || null;
  const planoValue = planosFiltrados.find(p => p.id === formData.plano_convenio) || null;

  return (
    <Dialog 
      open={open} 
      onClose={() => { onClose(); setConvenioSelecionado(null); }} 
      fullWidth 
      maxWidth="lg"
      disableEscapeKeyDown={isLoading} 
    >
      <DialogTitle>{pacienteParaEditar ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle>
      
      {/* IMPORTANTE: REMOVI A TAG <form> E SUBSTITUI POR <Box> 
         ISSO MATA O COMPORTAMENTO DE RELOAD DO NAVEGADOR.
         AGORA O "SALVAR" DEPENDE EXCLUSIVAMENTE DO onClick.
      */}
      <Box component="div" sx={{ display: 'flex', flexDirection: 'column' }}> 
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            
            <Typography variant="h6" sx={{ color: 'text.secondary' }}>Dados Pessoais</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField name="nome_completo" label="Nome Completo" value={formData.nome_completo} onChange={handleChange} required fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField name="data_nascimento" label="Data de Nascimento" type="date" value={formData.data_nascimento} onChange={handleChange} InputLabelProps={{ shrink: true }} fullWidth />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField name="cpf" label="CPF (do paciente)" value={formData.cpf} onChange={handleChange} fullWidth
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
                <TextField name="telefone_celular" label="Telefone Celular" value={formData.telefone_celular} onChange={handleChange} fullWidth
                  InputProps={{ inputComponent: TextMaskTelefone }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField name="email" label="Email" type="email" value={formData.email} onChange={handleChange} fullWidth />
              </Grid>
            </Grid>
            
            <Typography variant="h6" sx={{ color: 'text.secondary', mt: 2 }}>Endereço</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <TextField 
                  name="cep" 
                  label="CEP" 
                  value={formData.cep} 
                  onChange={handleChange} 
                  onBlur={handleCepBlur} 
                  onKeyDown={handleCepKeyDown} 
                  fullWidth
                  InputProps={cepInputProps} 
                />
              </Grid>
              <Grid item xs={12} sm={7}>
                <TextField name="endereco" label="Endereço" value={formData.endereco} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField name="numero" label="Número" value={formData.numero} onChange={handleChange} fullWidth />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField name="complemento" label="Complemento" value={formData.complemento} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField name="bairro" label="Bairro" value={formData.bairro} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField name="cidade" label="Cidade" value={formData.cidade} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={1}>
                <TextField name="estado" label="UF" value={formData.estado} onChange={handleChange} fullWidth inputProps={{ maxLength: 2 }} InputLabelProps={{ shrink: true }} />
              </Grid>
            </Grid>

            {/* Campos de Responsável e Dados Clínicos mantidos igual... */}
             <Typography variant="h6" sx={{ color: 'text.secondary', mt: 2 }}>Responsável (Opcional)</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><TextField name="nome_responsavel" label="Nome do Responsável" value={formData.nome_responsavel} onChange={handleChange} fullWidth /></Grid>
              <Grid item xs={12} sm={3}>
                <TextField name="cpf_responsavel" label="CPF do Responsável" value={formData.cpf_responsavel} onChange={handleChange} fullWidth
                  InputProps={{ inputComponent: TextMaskCPF }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField name="telefone_responsavel" label="Telefone do Responsável" value={formData.telefone_responsavel} onChange={handleChange} fullWidth
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
                  onChange={(event, newValue) => setFormData(prev => ({ ...prev, medico_responsavel: newValue ? newValue.id : null }))}
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
                  onChange={(event, newValue) => setFormData(prev => ({ ...prev, plano_convenio: newValue ? newValue.id : null }))}
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
          <Button onClick={onClose} color="inherit">Cancelar</Button>
          {/* Botão agora chama handleSaveClick diretamente, sem depender de submit de form */}
          <Button onClick={handleSaveClick} variant="contained" disabled={isLoading || isCepLoading}>
            {(isLoading || isCepLoading) ? <CircularProgress size={24} color="inherit" /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}