// src/components/PacienteModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Box, Autocomplete, Typography, Divider
} from '@mui/material';
import apiClient from '../api/axiosConfig';
import { useSnackbar } from '../contexts/SnackbarContext'; // Usando seu snackbar para feedback

// Estado inicial com os novos campos
const initialState = {
  nome_completo: '',
  data_nascimento: '',
  email: '',
  telefone_celular: '',
  cpf: '',
  // NOVO: Adicionamos peso e altura ao estado inicial
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
  
  // --- NOVOS ESTADOS PARA GERENCIAR CONVÊNIOS ---
  const [convenios, setConvenios] = useState([]); // Guarda a lista completa de convênios e planos da API
  const [convenioSelecionado, setConvenioSelecionado] = useState(null); // Objeto do convênio escolhido no 1º Autocomplete
  const [planosFiltrados, setPlanosFiltrados] = useState([]); // Lista de planos filtrada para o 2º Autocomplete

  // Efeito para buscar médicos (seu código original, mantido)
  useEffect(() => {
    if (open) {
      apiClient.get('/usuarios/usuarios/?cargo=medico')
        .then(response => setMedicos(response.data))
        .catch(err => console.error("Erro ao buscar médicos", err));
    }
  }, [open]);

  // --- NOVO EFEITO PARA BUSCAR OS CONVÊNIOS ---
  useEffect(() => {
    if (open) {
      apiClient.get('/faturamento/convenios/')
        .then(response => {
          setConvenios(response.data);
        })
        .catch(err => console.error("Erro ao buscar convênios", err));
    }
  }, [open]);

  // Efeito para preencher o formulário (MODIFICADO)
useEffect(() => {
    if (open) {
      if (pacienteParaEditar) {
        setFormData({
          nome_completo: pacienteParaEditar.nome_completo || '',
          data_nascimento: pacienteParaEditar.data_nascimento || '',
          email: pacienteParaEditar.email || '',
          telefone_celular: pacienteParaEditar.telefone_celular || '',
          cpf: pacienteParaEditar.cpf || '',
          // NOVO: Preenchemos os campos de peso e altura no modo de edição
          peso: pacienteParaEditar.peso || '',
          altura: pacienteParaEditar.altura || '',
          medico_responsavel: pacienteParaEditar.medico_responsavel || null,
          plano_convenio: pacienteParaEditar.plano_convenio || null,
          numero_carteirinha: pacienteParaEditar.numero_carteirinha || '',
        });
        
        // --- LÓGICA ADICIONAL PARA PREENCHER OS AUTOCOMPLETES DE CONVÊNIO/PLANO ---
        if (pacienteParaEditar.plano_convenio_detalhes && convenios.length > 0) {
          const planoDoPaciente = pacienteParaEditar.plano_convenio_detalhes;
          // Encontra o convênio pai do plano do paciente
          const convenioPai = convenios.find(c => c.planos.some(p => p.id === planoDoPaciente.id));
          if (convenioPai) {
            setConvenioSelecionado(convenioPai);
            setPlanosFiltrados(convenioPai.planos);
          }
        } else {
           setConvenioSelecionado(null);
        }

      } else {
        // MODO CRIAÇÃO
        setFormData(initialState);
        setConvenioSelecionado(null);
      }
    }
  }, [pacienteParaEditar, open, convenios]); // Adicionado 'convenios' como dependência

  // --- NOVO HANDLER PARA QUANDO O CONVÊNIO MUDA ---
  const handleConvenioChange = (event, novoConvenio) => {
    setConvenioSelecionado(novoConvenio);
    // Se um novo convênio for selecionado, reseta o plano
    setFormData({ ...formData, plano_convenio: null }); 
    if (novoConvenio) {
      setPlanosFiltrados(novoConvenio.planos || []);
    } else {
      setPlanosFiltrados([]);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
     // ALTERADO: Garantimos que os novos campos sejam incluídos no envio para a API
    const dataToSend = { 
      ...formData,
      peso: formData.peso || null, // Envia 'null' se o campo estiver vazio
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

  // Lógica para encontrar o valor correto para os Autocompletes
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
             {/* NOVO: Adicionamos os campos de peso e altura em uma linha */}
            <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField name="peso" label="Peso (kg)" type="number" value={formData.peso} onChange={handleChange} fullWidth />
                <TextField name="altura" label="Altura (m)" type="number" value={formData.altura} onChange={handleChange} fullWidth />
            </Box>
            <Autocomplete
              options={medicos}
              getOptionLabel={(option) => `${option.first_name} ${option.last_name}`}
              value={medicoValue}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onChange={(event, newValue) => {
                setFormData({ ...formData, medico_responsavel: newValue ? newValue.id : null });
              }}
              renderInput={(params) => <TextField {...params} label="Médico Responsável" />}
            />

            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>DADOS DO CONVÊNIO</Typography>

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
                onChange={(event, newValue) => {
                    setFormData({ ...formData, plano_convenio: newValue ? newValue.id : null });
                }}
                // Desabilita o campo de plano se nenhum convênio for selecionado
                disabled={!convenioSelecionado} 
                renderInput={(params) => <TextField {...params} label="Plano" />}
            />
            <TextField
                name="numero_carteirinha"
                label="Número da Carteirinha"
                value={formData.numero_carteirinha}
                onChange={handleChange}
                // Desabilita o campo se não houver plano
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