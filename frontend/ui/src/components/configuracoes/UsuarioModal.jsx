// src/components/configuracoes/UsuarioModal.jsx - VERSÃO ATUALIZADA COM ESPECIALIDADES

import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    Button, CircularProgress, Box, FormControl, InputLabel, Select,
    MenuItem, FormControlLabel, Switch, OutlinedInput, Chip
} from '@mui/material';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';
// 1. Importar o serviço que busca as especialidades
import { configuracoesService } from '../../services/configuracoesService';

const initialState = {
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    cargo: 'recepcao',
    is_active: true
};

export default function UsuarioModal({ open, onClose, onSave }) {
    const { showSnackbar } = useSnackbar();
    const [formData, setFormData] = useState(initialState);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 2. Novos estados para gerenciar as especialidades
    const [especialidadesDisponiveis, setEspecialidadesDisponiveis] = useState([]);
    const [selectedEspecialidades, setSelectedEspecialidades] = useState([]); // Guarda os IDs selecionados

    // 3. Efeito para buscar as especialidades quando o modal abrir
    useEffect(() => {
        if (open) {
            configuracoesService.getEspecialidades()
                .then(response => {
                    setEspecialidadesDisponiveis(response.data);
                })
                .catch(() => {
                    showSnackbar('Erro ao carregar a lista de especialidades.', 'error');
                });
        }
    }, [open, showSnackbar]);


    const handleClose = () => {
        setFormData(initialState);
        setSelectedEspecialidades([]); // Limpa as especialidades selecionadas ao fechar
        onClose();
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));
    };
    
    // Handler para o select múltiplo de especialidades
    const handleEspecialidadesChange = (event) => {
        const { target: { value } } = event;
        setSelectedEspecialidades(
            // O valor pode ser uma string (um item) ou um array (múltiplos)
            typeof value === 'string' ? value.split(',') : value,
        );
    };

    const handleSwitchChange = (e) => {
        setFormData(prevState => ({ ...prevState, is_active: e.target.checked }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const [firstName, ...lastNameParts] = formData.nome_completo.split(' ');
            const lastName = lastNameParts.join(' ');

            const dataToSend = {
                username: formData.username,
                password: formData.password,
                first_name: firstName,
                last_name: lastName,
                cargo: formData.cargo,
                is_active: formData.is_active,
                // 4. Adicionar os IDs das especialidades ao payload de envio
                // O backend espera um campo 'especialidades_ids'
                especialidades_ids: selectedEspecialidades,
            };
            
            await apiClient.post('/usuarios/usuarios/', dataToSend);
            showSnackbar('Usuário criado com sucesso!', 'success');
            onSave();
            handleClose();
        } catch (error) {
            console.error("Erro ao criar usuário:", error.response?.data);
            const errorMsg = error.response?.data?.username?.[0] || 'Erro ao criar usuário. Verifique os dados.';
            showSnackbar(errorMsg, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
            <DialogTitle>Criar Novo Usuário</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <TextField name="nome_completo" label="Nome Completo" onChange={handleChange} required />
                        <TextField name="username" label="Usuário (para login)" onChange={handleChange} required />
                        <TextField name="password" label="Senha" type="password" onChange={handleChange} required />
                        <FormControl fullWidth required>
                            <InputLabel id="cargo-select-label">Cargo</InputLabel>
                            <Select
                                labelId="cargo-select-label"
                                name="cargo"
                                value={formData.cargo}
                                label="Cargo"
                                onChange={handleChange}
                            >
                                <MenuItem value="recepcao">Recepção</MenuItem>
                                <MenuItem value="medico">Médico(a)</MenuItem>
                                <MenuItem value="admin">Administrador</MenuItem>
                            </Select>
                        </FormControl>
                        
                        {/* 5. Lógica para mostrar o campo de especialidades condicionalmente */}
                        {formData.cargo === 'medico' && (
                            <FormControl fullWidth>
                                <InputLabel id="especialidades-select-label">Especialidades</InputLabel>
                                <Select
                                    labelId="especialidades-select-label"
                                    multiple
                                    value={selectedEspecialidades}
                                    onChange={handleEspecialidadesChange}
                                    input={<OutlinedInput id="select-multiple-chip" label="Especialidades" />}
                                    renderValue={(selected) => (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {selected.map((value) => {
                                                const especialidade = especialidadesDisponiveis.find(e => e.id === value);
                                                return <Chip key={value} label={especialidade ? especialidade.nome : ''} />;
                                            })}
                                        </Box>
                                    )}
                                >
                                    {especialidadesDisponiveis.map((especialidade) => (
                                        <MenuItem key={especialidade.id} value={especialidade.id}>
                                            {especialidade.nome}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}

                        <FormControlLabel
                            control={<Switch checked={formData.is_active} onChange={handleSwitchChange} />}
                            label="Usuário Ativo"
                        />
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