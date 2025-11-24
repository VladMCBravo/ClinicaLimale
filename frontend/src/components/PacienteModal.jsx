// src/components/PacienteModal.jsx
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

// Estado inicial movido para fora para evitar recriação desnecessária
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
  
  // Estados de dados auxiliares
  const [medicos, setMedicos] = useState([]);
  const [convenios, setConvenios] = useState([]);
  const [convenioSelecionado, setConvenioSelecionado] = useState(null);
  const [planosFiltrados, setPlanosFiltrados] = useState([]);
  
  // Estado de loading do CEP
  const [isCepLoading, setIsCepLoading] = useState(false);

  // --- 1. CARREGAMENTO DE DADOS (MÉDICOS E CONVÊNIOS) ---
  useEffect(() => {
    if (open) {
      // Usando Promise.all para carregar em paralelo e evitar re-renders picados
      Promise.all([
        apiClient.get('/usuarios/usuarios/?cargo=medico'),
        apiClient.get('/faturamento/convenios/')
      ]).then(([medicosRes, conveniosRes]) => {
        setMedicos(medicosRes.data);
        setConvenios(conveniosRes.data);
      }).catch(err => console.error("Erro ao carregar dados auxiliares:", err));
    }
  }, [open]);

  // --- 2. POPULAR FORMULÁRIO (EDIÇÃO OU NOVO) ---
  useEffect(() => {
    if (open) {
      if (pacienteParaEditar) {
        // Previne valores null/undefined que causam erro de "Uncontrolled Input"
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
        setIsCepLoading(false);
      }
    }
  }, [pacienteParaEditar, open]);

  // --- 3. LÓGICA DE CONVÊNIOS ---
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
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- 4. CORREÇÃO CRÍTICA DO CEP ---
  
  // A. UseMemo para InputProps: Impede que o campo seja recriado (pisque/suma) quando o loading aparece
  const cepInputProps = useMemo(() => ({
    inputComponent: TextMaskCEP,
    endAdornment: (
      <InputAdornment position="end">
        {isCepLoading && <CircularProgress size={20} />}
      </InputAdornment>
    )
  }), [isCepLoading]);

  // B. Bloqueio do Enter: Impede o Reload da página ao apertar Enter no CEP
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // MATA O RELOAD
      e.stopPropagation();
    }
  };

  const handleCepBlur = useCallback(async () => {
    // Remove caracteres não numéricos para verificar tamanho
    const cepLimpo = formData.cep?.replace(/[^0-9]/g, '');
    
    if (cepLimpo && cepLimpo.length === 8) {
      setIsCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        if (!response.ok) throw new Error('Erro na requisição');
        
        const data = await response.json();
        if (data.erro) {
          showSnackbar('CEP não localizado.', 'warning');
          return;
        }

        // Atualiza o form com os dados do ViaCEP
        setFormData(prev => ({
          ...prev,
          endereco: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          estado: data.uf || '',
          complemento: data.complemento || '', // Opcional, alguns CEPs retornam
        }));
        showSnackbar('Endereço encontrado!', 'success');
      } catch (error) {
        console.error(error);
        showSnackbar('Erro ao buscar CEP. Verifique a conexão.', 'error');
      } finally {
        setIsCepLoading(false);
      }
    }
  }, [formData.cep, showSnackbar]);


  // --- 5. SUBMIT SEGURO ---
  const handleSubmit = async (e) => {
    e.preventDefault(); // 1ª Linha Obrigatória
    e.stopPropagation(); // 2ª Linha de Segurança

    console.log("Tentando salvar...", formData); // DEBUG: Veja se aparece no console

    setIsLoading(true);
    
    // Tratamento de dados antes de enviar (evitar strings vazias em campos numéricos)
    const dataToSend = { 
      ...formData,
      peso: formData.peso === '' ? null : formData.peso,
      altura: formData.altura === '' ? null : formData.altura,
      cpf: formData.cpf === '' ? null : formData.cpf,
      email: formData.email === '' ? null : formData.email
    }; 

    try {
      let response;
      if (pacienteParaEditar) {
        response = await apiClient.put(`/pacientes/${pacienteParaEditar.id}/`, dataToSend);
        showSnackbar('Paciente atualizado com sucesso!', 'success');
      } else {
        response = await apiClient.post('/pacientes/', dataToSend);
        showSnackbar('Paciente criado com sucesso!', 'success');
      }
      
      console.log("Sucesso:", response.data); // DEBUG
      
      if (onSave) onSave(); // Atualiza a lista na página pai
      onClose(); // Fecha o modal
    } catch (error) {
      console.error("Erro no submit:", error); // DEBUG
      const errorData = error.response?.data;
      const errorMsg = typeof errorData === 'object' 
        ? JSON.stringify(Object.values(errorData).flat()) // Converte array de erros em string legível
        : 'Erro ao salvar paciente.';
      
      // Limpa caracteres feios do JSON se possível
      const msgLimpa = errorMsg.replace(/[\[\]"]/g, '').replace(/,/g, ', ');
      showSnackbar(msgLimpa, 'error');
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
      // Impede que clicar fora feche o modal acidentalmente enquanto carrega
      disableEscapeKeyDown={isLoading} 
    >
      <DialogTitle>{pacienteParaEditar ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle>
      
      {/* O "noValidate" remove validações nativas do HTML5 que as vezes conflitam com Material UI */}
      <form onSubmit={handleSubmit} noValidate>
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
                  onBlur={handleCepBlur} // Busca ao sair do campo
                  onKeyDown={handleKeyDown} // BLOQUEIA O ENTER
                  fullWidth
                  InputProps={cepInputProps} // PROPS ESTABILIZADAS
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

            <Typography variant="h6" sx={{ color: 'text.secondary', mt: 2 }}>Responsável (Opcional)</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField name="nome_responsavel" label="Nome do Responsável" value={formData.nome_responsavel} onChange={handleChange} fullWidth />
              </Grid>
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
              <Grid item xs={6} sm={3}>
                <TextField name="peso" label="Peso (kg)" type="number" value={formData.peso} onChange={handleChange} fullWidth />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField name="altura" label="Altura (cm)" type="number" value={formData.altura} onChange={handleChange} fullWidth />
              </Grid>
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
          {/* Botão Cancelar com type="button" para evitar submit acidental */}
          <Button onClick={onClose} color="inherit" type="button">Cancelar</Button>
          <Button type="submit" variant="contained" disabled={isLoading || isCepLoading}>
            {(isLoading || isCepLoading) ? <CircularProgress size={24} color="inherit" /> : 'Salvar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}