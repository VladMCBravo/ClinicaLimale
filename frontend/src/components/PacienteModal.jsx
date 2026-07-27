// src/components/PacienteModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Box, Autocomplete, 
  FormControl, InputLabel, Select, MenuItem,
  Grid, InputAdornment, Tabs, Tab, Paper, Divider, IconButton,
  Typography
} from '@mui/material';
import { 
    Person, Home, MedicalServices, SupervisorAccount, Close 
} from '@mui/icons-material';
import { IMaskInput } from 'react-imask';

import apiClient from '../api/axiosConfig';
import { useSnackbar } from '../contexts/SnackbarContext';
import { TextMaskCPF, TextMaskTelefone, TextMaskCEP } from './common/MaskedInput';

// 🛑 CORREÇÃO CRÍTICA: initialState agora é uma FUNÇÃO.
// Isso impede o vazamento de memória (State Leak) entre pacientes.
// Cada vez que é chamada, devolve um objeto 100% limpo e desvinculado.
const getInitialState = () => ({
  nome_completo: '', data_nascimento: '', email: '', telefone_celular: '', cpf: '', genero: '',
  peso: '', altura: '', dum: '', medico_responsavel: null,
  plano_convenio: null, numero_carteirinha: '',
  cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  nome_responsavel: '', cpf_responsavel: '', telefone_responsavel: '',
  contato_emergencia_nome: '', contato_emergencia_telefone: '', contato_emergencia_parentesco: '',
});

const TextMaskData = React.forwardRef(function TextMaskData(props, ref) {
  const { onChange, ...other } = props;
  return (
    <IMaskInput
      {...other}
      mask="00/00/0000"
      definitions={{ '0': /[0-9]/ }}
      inputRef={ref}
      onAccept={(value) => onChange({ target: { name: props.name, value } })}
      overwrite
    />
  );
});

export default function PacienteModal({ open, onClose, onSave, pacienteParaEditar, nomeInicial }) {
  const { showSnackbar } = useSnackbar();
  
  // O estado inicia sempre com a fábrica limpa
  const [formData, setFormData] = useState(getInitialState());
  const [dataNascimentoVisual, setDataNascimentoVisual] = useState('');
  const [dumVisual, setDumVisual] = useState(''); 
  const [tabIndex, setTabIndex] = useState(0); 
  const [isLoading, setIsLoading] = useState(false);
  const [isCepLoading, setIsCepLoading] = useState(false);
  
  const [medicos, setMedicos] = useState([]);
  const [convenios, setConvenios] = useState([]);
  const [convenioSelecionado, setConvenioSelecionado] = useState(null);
  const [planosFiltrados, setPlanosFiltrados] = useState([]);

  useEffect(() => {
    if (open) {
      Promise.all([
        apiClient.get('/usuarios/usuarios/?cargo=medico&apenas_ativos=true'),
        apiClient.get('/faturamento/convenios/')
      ]).then(([medicosRes, conveniosRes]) => {
        setMedicos(medicosRes.data);
        setConvenios(conveniosRes.data);
      }).catch(err => console.error('Erro ao carregar auxiliares', err));
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setTabIndex(0);
      if (pacienteParaEditar && pacienteParaEditar.id) { // Trava de segurança extra
        let dataVisual = '';
        if (pacienteParaEditar.data_nascimento) {
            const [ano, mes, dia] = pacienteParaEditar.data_nascimento.split('-');
            dataVisual = `${dia}/${mes}/${ano}`;
        }
        setDataNascimentoVisual(dataVisual);

        let dumVisualValue = '';
        if (pacienteParaEditar.dum) {
            const [ano, mes, dia] = pacienteParaEditar.dum.split('-');
            dumVisualValue = `${dia}/${mes}/${ano}`;
        }
        setDumVisual(dumVisualValue);

        // Preenche com os dados do paciente existente, garantindo valores default vazios para nulls
        setFormData({
          nome_completo: pacienteParaEditar.nome_completo || '',
          data_nascimento: pacienteParaEditar.data_nascimento || '',
          email: pacienteParaEditar.email || '',
          telefone_celular: pacienteParaEditar.telefone_celular || '',
          cpf: pacienteParaEditar.cpf || '',
          genero: pacienteParaEditar.genero || '',
          peso: pacienteParaEditar.peso || '',
          altura: pacienteParaEditar.altura || '',
          dum: pacienteParaEditar.dum || '',
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
          contato_emergencia_nome: pacienteParaEditar.contato_emergencia_nome || '',
          contato_emergencia_telefone: pacienteParaEditar.contato_emergencia_telefone || '',
          contato_emergencia_parentesco: pacienteParaEditar.contato_emergencia_parentesco || '',
        });
      } else {
        // Se for NOVO PACIENTE, usamos a fábrica limpa e apenas anexamos o nome inicial
        setFormData({
            ...getInitialState(),
            nome_completo: nomeInicial || '' 
        });
        setConvenioSelecionado(null);
        setPlanosFiltrados([]);
        setDataNascimentoVisual('');
        setDumVisual('');
      }
    }
  }, [pacienteParaEditar, open, nomeInicial]);

  // ... (o resto das funções do useEffect, handleDataNascimentoChange, handleCepBlur ficam IGUAIS)
  
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

  const handleDataNascimentoChange = (e) => {
      const valorVisual = e.target.value;
      setDataNascimentoVisual(valorVisual);
      if (valorVisual.length === 10) {
          const [dia, mes, ano] = valorVisual.split('/');
          setFormData(prev => ({ ...prev, data_nascimento: `${ano}-${mes}-${dia}` }));
      } else {
          setFormData(prev => ({ ...prev, data_nascimento: '' }));
      }
  };

  const handleDumChange = (e) => {
      const valorVisual = e.target.value;
      setDumVisual(valorVisual);
      if (valorVisual.length === 10) {
          const [dia, mes, ano] = valorVisual.split('/');
          setFormData(prev => ({ ...prev, dum: `${ano}-${mes}-${dia}` }));
      } else {
          setFormData(prev => ({ ...prev, dum: '' }));
      }
  };

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
      dum: formData.dum === '' ? null : formData.dum, 
      cpf: formData.cpf === '' ? null : formData.cpf,
      email: formData.email === '' ? null : formData.email,
      data_nascimento: formData.data_nascimento === '' ? null : formData.data_nascimento,
    }; 

    // Coloque isso antes do axios/apiClient.put
    console.log("🛑 TRACER 1 - MODAL PACIENTE: O que estou mandando salvar no banco?");
    console.log("Payload:", dataToSend);

    try {
      if (pacienteParaEditar && pacienteParaEditar.id) { 
        await apiClient.put(`/pacientes/${pacienteParaEditar.id}/`, dataToSend);
        showSnackbar('Paciente atualizado!', 'success');
      } else {
        await apiClient.post('/pacientes/', dataToSend);
        showSnackbar('Paciente criado!', 'success');
      }
      
      // Limpeza brutal de TUDO logo após o sucesso
      setFormData(getInitialState());
      setDataNascimentoVisual('');
      setDumVisual('');
      setConvenioSelecionado(null);
      setPlanosFiltrados([]);
      
      if (onSave) onSave();
      onClose();
    } catch (error) {
      const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : 'Erro ao salvar.';
      showSnackbar(errorMsg.replace(/[\[\]"{}]/g, ''), 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Função de fechamento com reset garantido
  const handleClose = () => {
      setFormData(getInitialState()); // Mata os rastros do formulário principal
      
      // Limpe também os estados visuais e auxiliares!
      setDataNascimentoVisual('');
      setDumVisual('');
      setConvenioSelecionado(null);
      setPlanosFiltrados([]);
      
      setTabIndex(0);
      onClose();
  }

  // O bloco renderTabContent e o Return principal ficam exatamente iguais, só 
  // precisamos garantir que os botões chamem o novo handleClose.
  
  // ... (pulei a função renderTabContent pois ela é longa e não mudou nada)

  const renderTabContent = () => {
    switch (tabIndex) {
      case 0:
        return (
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={8}>
              <TextField name="nome_completo" label="Nome Completo" value={formData.nome_completo} onChange={handleChange} required fullWidth size="small" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField name="data_nascimento" label="Nascimento" value={dataNascimentoVisual} onChange={handleDataNascimentoChange} fullWidth size="small" placeholder="DD/MM/AAAA" InputProps={{ inputComponent: TextMaskData }} />
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
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
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
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
             <Grid item xs={12}>
                 <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: '#1C2E4A' }}>Dados Físicos & Obstétricos</Typography>
                 <Grid container spacing={2}>
                    <Grid item xs={4}><TextField name="peso" label="Peso (kg)" type="number" value={formData.peso} onChange={handleChange} fullWidth size="small" /></Grid>
                    <Grid item xs={4}><TextField name="altura" label="Altura (cm)" type="number" value={formData.altura} onChange={handleChange} fullWidth size="small" /></Grid>
                    <Grid item xs={4}><TextField name="dum" label="DUM" value={dumVisual} onChange={handleDumChange} fullWidth size="small" placeholder="DD/MM/AAAA" InputProps={{ inputComponent: TextMaskData }} /></Grid>
                 </Grid>
             </Grid>
             <Grid item xs={12}>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: '#1C2E4A' }}>Médico e Plano</Typography>
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
              <TextField name="numero_carteirinha" label="Carteirinha" value={formData.numero_carteirinha} disabled={!formData.plano_convenio} fullWidth size="small" />
            </Grid>
          </Grid>
        );
      case 3:
        return (
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
             <Grid item xs={12} md={6}>
                 <Paper variant="outlined" sx={{ p: 2, height: '100%', bgcolor: '#f8f9fa', borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 700, color: '#1C2E4A' }}>Responsável Legal</Typography>
                    <Typography variant="caption" display="block" sx={{ mb: 1.5, color: '#666' }}>
                        Preencha se o paciente for menor de idade.
                    </Typography>
                    <Grid container spacing={1.5}>
                        <Grid item xs={12}><TextField name="nome_responsavel" label="Nome do Responsável" value={formData.nome_responsavel} onChange={handleChange} fullWidth size="small" /></Grid>
                        <Grid item xs={12}><TextField name="cpf_responsavel" label="CPF Responsável" value={formData.cpf_responsavel} onChange={handleChange} fullWidth size="small" InputProps={{ inputComponent: TextMaskCPF }} /></Grid>
                        <Grid item xs={12}><TextField name="telefone_responsavel" label="Tel. Responsável" value={formData.telefone_responsavel} onChange={handleChange} fullWidth size="small" InputProps={{ inputComponent: TextMaskTelefone }} /></Grid>
                    </Grid>
                 </Paper>
             </Grid>

             <Grid item xs={12} md={6}>
                 <Paper variant="outlined" sx={{ p: 2, height: '100%', bgcolor: '#fff5f5', borderColor: '#ffcdd2', borderRadius: 2 }}>
                    <Typography variant="subtitle2" color="error" sx={{ mb: 0.5, fontWeight: 700 }}>Contato de Emergência</Typography>
                    <Typography variant="caption" display="block" sx={{ mb: 1.5, color: '#c62828' }}>
                        Em caso de urgências médicas na clínica.
                    </Typography>
                    <Grid container spacing={1.5}>
                        <Grid item xs={12}><TextField name="contato_emergencia_nome" label="Nome do Contato" value={formData.contato_emergencia_nome} onChange={handleChange} fullWidth size="small" /></Grid>
                        <Grid item xs={12}><TextField name="contato_emergencia_telefone" label="Telefone de Urgência" value={formData.contato_emergencia_telefone} onChange={handleChange} fullWidth size="small" InputProps={{ inputComponent: TextMaskTelefone }} /></Grid>
                        <Grid item xs={12}><TextField name="contato_emergencia_parentesco" label="Parentesco / Vínculo" placeholder="Ex: Cônjuge, Mãe" value={formData.contato_emergencia_parentesco} onChange={handleChange} fullWidth size="small" /></Grid>
                    </Grid>
                 </Paper>
             </Grid>
          </Grid>
        );
      default: return null;
    }
  };

  return (
    <Dialog 
      open={open} 
      // TROCADO AQUI: apontando para a nova função segura de fechar
      onClose={handleClose} 
      fullWidth 
      maxWidth="md" 
      disableEscapeKeyDown={isLoading}
      PaperProps={{
        sx: { borderRadius: 3, boxShadow: '0px 8px 24px rgba(0,0,0,0.15)' }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#1C2E4A', color: '#fff' }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
          {pacienteParaEditar ? 'Editar Cadastro do Paciente' : 'Cadastrar Novo Paciente'}
        </Typography>
        {/* TROCADO AQUI: também chamando a função segura no X do modal */}
        <IconButton onClick={handleClose} size="small" sx={{ color: '#fff' }}><Close /></IconButton>
      </DialogTitle>
      
      <Box component="div" sx={{ display: 'flex', flexDirection: 'column', bgcolor: '#fff' }}>
        <Paper elevation={0} square sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
                value={tabIndex} 
                onChange={handleTabChange} 
                variant="scrollable" 
                scrollButtons="auto" 
                textColor="primary"
                indicatorColor="primary"
                sx={{
                  '& .MuiTab-root': { fontSize: '0.85rem', fontWeight: 600, textTransform: 'none', minHeight: 48 },
                  '& .Mui-selected': { color: '#1C2E4A !important' },
                  '& .MuiTabs-indicator': { backgroundColor: '#1C2E4A' }
                }}
            >
                <Tab icon={<Person fontSize="small" />} iconPosition="start" label="Pessoais" />
                <Tab icon={<Home fontSize="small" />} iconPosition="start" label="Endereço" />
                <Tab icon={<MedicalServices fontSize="small" />} iconPosition="start" label="Clínicos & Convênio" />
                <Tab icon={<SupervisorAccount fontSize="small" />} iconPosition="start" label="Contatos de Apoio" />
            </Tabs>
        </Paper>
        
        <DialogContent sx={{ py: 2.5, px: 3, overflowY: 'hidden' }}>
            {renderTabContent()}
        </DialogContent>
        
        <DialogActions sx={{ p: 2, borderTop: '1px solid #e0e0e0', bgcolor: '#fafafa', gap: 1 }}>
          <Button onClick={handleClose} color="inherit" sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' }}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSaveClick} 
            variant="contained" 
            disabled={isLoading || isCepLoading} 
            sx={{ 
              px: 4, 
              textTransform: 'none', 
              fontWeight: 700, 
              fontSize: '0.85rem',
              bgcolor: '#1C2E4A', 
              '&:hover': { bgcolor: '#16233a' },
              borderRadius: 2
            }}
          >
            {(isLoading || isCepLoading) ? <CircularProgress size={22} color="inherit" /> : 'Salvar Registro'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}