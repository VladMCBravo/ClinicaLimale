// src/components/configuracoes/UsuarioModal.jsx - VERSÃO FINAL (CRIA E EDITA)

import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    Button, CircularProgress, Box, FormControl, InputLabel, Select,
    MenuItem, FormControlLabel, Switch, OutlinedInput, Chip
} from '@mui/material';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { configuracoesService } from '../../services/configuracoesService';

// 1. ATUALIZE O initialState
const initialState = {
    username: '', password: '', first_name: '', last_name: '',
    cargo: 'recepcao', is_active: true,
    
    // --- NOVOS CAMPOS AQUI ---
    genero: '',
    data_nascimento: '',
    telefone: '',
    cpf: '',
    crm: '',
    // --- FIM DOS NOVOS CAMPOS ---
};

export default function UsuarioModal({ open, onClose, onSave, usuarioParaEditar }) {
    const { showSnackbar } = useSnackbar();
    const [formData, setFormData] = useState(initialState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [especialidadesDisponiveis, setEspecialidadesDisponiveis] = useState([]);
    const [selectedEspecialidades, setSelectedEspecialidades] = useState([]);

    useEffect(() => {
        if (open) {
            configuracoesService.getEspecialidades()
                .then(response => setEspecialidadesDisponiveis(response.data))
                .catch(() => showSnackbar('Erro ao carregar especialidades.', 'error'));
        }
    }, [open, showSnackbar]);

    // 2. ATUALIZE O useEffect
    useEffect(() => {
        if (open && usuarioParaEditar) {
            setFormData({
                username: usuarioParaEditar.username || '',
                first_name: usuarioParaEditar.first_name || '',
                last_name: usuarioParaEditar.last_name || '',
                cargo: usuarioParaEditar.cargo || 'recepcao',
                is_active: usuarioParaEditar.is_active,
                
                // --- NOVOS CAMPOS AQUI ---
                genero: usuarioParaEditar.genero || '',
                data_nascimento: usuarioParaEditar.data_nascimento || '',
                telefone: usuarioParaEditar.telefone || '',
                cpf: usuarioParaEditar.cpf || '',
                crm: usuarioParaEditar.crm || '',
                // --- FIM DOS NOVOS CAMPOS ---
                
                password: '', // Senha fica vazia na edição
            });
            setSelectedEspecialidades(usuarioParaEditar.especialidades || []);
        } else {
            setFormData(initialState);
            setSelectedEspecialidades([]);
        }
    }, [usuarioParaEditar, open]);

    const handleClose = () => {
        onClose();
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));
    };
    
    const handleEspecialidadesChange = (event) => {
        const { target: { value } } = event;
        setSelectedEspecialidades(typeof value === 'string' ? value.split(',') : value);
    };

    const handleSwitchChange = (e) => {
        setFormData(prevState => ({ ...prevState, is_active: e.target.checked }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        const dataToSend = {
            ...formData,
            especialidades: selectedEspecialidades,
        };
        
        // Remove a senha se estiver vazia (para não alterar sem querer)
        if (!dataToSend.password) {
            delete dataToSend.password;
        }

        try {
            if (usuarioParaEditar) {
                await apiClient.patch(`/usuarios/usuarios/${usuarioParaEditar.id}/`, dataToSend);
                showSnackbar('Usuário atualizado com sucesso!', 'success');
            } else {
                await apiClient.post('/usuarios/usuarios/', dataToSend);
                showSnackbar('Usuário criado com sucesso!', 'success');
            }
            onSave();
            handleClose();
        } catch (error) {
            const errorData = error.response?.data;
            const errorMsg = typeof errorData === 'object' ? Object.values(errorData).flat()[0] : 'Erro ao salvar usuário.';
            showSnackbar(errorMsg, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 3. ATUALIZE O JSX (O FORMULÁRIO)
    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
            <DialogTitle>{usuarioParaEditar ? 'Editar Usuário' : 'Criar Novo Usuário'}</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        {/* --- DADOS PESSOAIS --- */}
                        <TextField name="first_name" label="Nome" value={formData.first_name} onChange={handleChange} required />
                        <TextField name="last_name" label="Sobrenome" value={formData.last_name} onChange={handleChange} required />
                        
                        {/* NOVO: Data de Nascimento */}
                        <TextField name="data_nascimento" label="Data de Nascimento" type="date"
                            value={formData.data_nascimento || ''} onChange={handleChange}
                            InputLabelProps={{ shrink: true }}
                        />
                        
                        {/* NOVO: Gênero */}
                        <FormControl fullWidth>
                            <InputLabel>Gênero</InputLabel>
                            <Select name="genero" value={formData.genero || ''} label="Gênero" onChange={handleChange}>
                                <MenuItem value=""><em>Não informar</em></MenuItem>
                                <MenuItem value="M">Masculino</MenuItem>
                                <MenuItem value="F">Feminino</MenuItem>
                            </Select>
                        </FormControl>
                        
                        {/* NOVO: Telefone e CPF */}
                        <TextField name="telefone" label="Telefone / Celular" value={formData.telefone || ''} onChange={handleChange} />
                        <TextField name="cpf" label="CPF" value={formData.cpf || ''} onChange={handleChange} />

                        <hr />

                        {/* --- DADOS DE ACESSO E CARGO --- */}
                        <TextField name="username" label="Usuário (login)" value={formData.username} onChange={handleChange} required />
                        <TextField name="password" label={usuarioParaEditar ? "Nova Senha (deixe em branco para não alterar)" : "Senha"} type="password" onChange={handleChange} required={!usuarioParaEditar} />
                        
                        <FormControl fullWidth required>
                            <InputLabel>Cargo</InputLabel>
                            <Select name="cargo" value={formData.cargo} label="Cargo" onChange={handleChange}>
                                <MenuItem value="recepcao">Recepção</MenuItem>
                                <MenuItem value="medico">Médico(a)</MenuItem>
                                <MenuItem value="admin">Administrador</MenuItem>
                            </Select>
                        </FormControl>
                        
                        {/* --- CAMPO CRM (JÁ EXISTIA NO MODELO) --- */}
                        {formData.cargo === 'medico' && (
                            <TextField name="crm" label="CRM" value={formData.crm || ''} onChange={handleChange} />
                        )}
                        
                        {formData.cargo === 'medico' && (
                            <FormControl fullWidth>
                                <InputLabel>Especialidades</InputLabel>
                                <Select multiple value={selectedEspecialidades} onChange={handleEspecialidadesChange}
                                    input={<OutlinedInput label="Especialidades" />}
                                    renderValue={(selected) => (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {selected.map((id) => {
                                                const esp = especialidadesDisponiveis.find(e => e.id === id);
                                                return <Chip key={id} label={esp ? esp.nome : ''} />;
                                            })}
                                        </Box>
                                    )}>
                                    {especialidadesDisponiveis.map((especialidade) => (
                                        <MenuItem key={especialidade.id} value={especialidade.id}>
                                            {especialidade.nome}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}

                        <FormControlLabel control={<Switch checked={formData.is_active} onChange={handleSwitchChange} />} label="Usuário Ativo" />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancelar</Button>
                    <Button type="submit" variant="contained" disabled={isSubmitting}>
                        {isSubmitting ? <CircularProgress size={24} /> : 'Salvar'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}