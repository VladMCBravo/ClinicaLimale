// src/components/prontuario/FormularioEvolucaoBase.jsx

import React, { useState } from 'react';
import { Box, Button, CircularProgress, Typography, Paper } from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

export default function FormularioEvolucaoBase({ pacienteId, onEvolucaoSalva, titulo, children }) {
    const [formData, setFormData] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showSnackbar } = useSnackbar();

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes/`, formData);
            showSnackbar('Evolução salva com sucesso!', 'success');
            setFormData({}); 
            if(onEvolucaoSalva) onEvolucaoSalva();
        } catch (error) {
            showSnackbar('Erro ao salvar evolução.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Paper component="form" onSubmit={handleSubmit} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>{titulo || 'Evolução do Atendimento'}</Typography>
            
            {/* Mágica: Renderiza os "cards" que forem passados e injeta as props neles */}
            {React.Children.map(children, child =>
                React.cloneElement(child, { formData, handleChange })
            )}

            <Box sx={{ textAlign: 'right', mt: 2 }}>
                <Button type="submit" variant="contained" disabled={isSubmitting}>
                    {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Evolução'}
                </Button>
            </Box>
        </Paper>
    );
}