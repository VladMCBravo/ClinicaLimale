// src/components/pacientes/FormularioPaciente.jsx
import React, { useState } from 'react';
import {
    Paper, Typography, Box, Grid, TextField, Button, CircularProgress
} from '@mui/material';
import { pacienteService } from '../../services/pacienteService';
import { useSnackbar } from '../../contexts/SnackbarContext';

// Este componente recebe uma função 'onClose' para avisar o painel que ele deve ser fechado
export default function FormularioPaciente({ onClose }) {
    const [formData, setFormData] = useState({
        nome_completo: '',
        cpf: '',
        data_nascimento: '',
        telefone: '',
        // Adicione outros campos que seu modelo Paciente necessita
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showSnackbar } = useSnackbar();

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            await pacienteService.createPaciente(formData);
            showSnackbar('Paciente cadastrado com sucesso!', 'success');
            onClose(true); // Chama a função onClose com 'true' para indicar sucesso
        } catch (error) {
            console.error("Erro ao cadastrar paciente:", error);
            showSnackbar('Erro ao cadastrar paciente.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Novo Paciente</Typography>
                <Button onClick={() => onClose(false)} color="secondary">
                    Voltar para Agenda
                </Button>
            </Box>
            <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            name="nome_completo"
                            label="Nome Completo"
                            required
                            fullWidth
                            size="small"
                            value={formData.nome_completo}
                            onChange={handleChange}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            name="cpf"
                            label="CPF"
                            fullWidth
                            size="small"
                            value={formData.cpf}
                            onChange={handleChange}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            name="data_nascimento"
                            label="Data de Nascimento"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                            size="small"
                            value={formData.data_nascimento}
                            onChange={handleChange}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            name="telefone"
                            label="Telefone"
                            fullWidth
                            size="small"
                            value={formData.telefone}
                            onChange={handleChange}
                        />
                    </Grid>
                    {/* Adicione mais campos aqui conforme necessário */}
                </Grid>
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <Button onClick={() => onClose(false)} color="secondary">
                        Cancelar
                    </Button>
                    <Button type="submit" variant="contained" disabled={isSubmitting}>
                        {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Paciente'}
                    </Button>
                </Box>
            </Box>
        </Paper>
    );
}