// src/components/configuracoes/UsuarioModal.jsx
import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    Button, CircularProgress, Box, FormControl, InputLabel, Select,
    MenuItem, FormControlLabel, Switch
} from '@mui/material';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';

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

    const handleClose = () => {
        setFormData(initialState); // Reseta o formulário ao fechar
        onClose();
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));
    };
    
    const handleSwitchChange = (e) => {
        setFormData(prevState => ({ ...prevState, is_active: e.target.checked }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Seu backend espera 'first_name' e 'last_name', vamos dividir 'nome_completo'
            const [firstName, ...lastNameParts] = formData.nome_completo.split(' ');
            const lastName = lastNameParts.join(' ');

            const dataToSend = {
                username: formData.username,
                password: formData.password,
                first_name: firstName,
                last_name: lastName,
                cargo: formData.cargo,
                is_active: formData.is_active
            };
            
            // Usamos a rota do seu UserViewSet
            await apiClient.post('/usuarios/usuarios/', dataToSend);
            showSnackbar('Usuário criado com sucesso!', 'success');
            onSave(); // Avisa a página principal para recarregar a lista
            handleClose(); // Fecha o modal
        } catch (error) {
            console.error("Erro ao criar usuário:", error.response?.data);
            showSnackbar('Erro ao criar usuário. Verifique os dados.', 'error');
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