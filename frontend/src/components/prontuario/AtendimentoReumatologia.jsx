// src/components/prontuario/AtendimentoReumatologia.jsx

import React, { useState } from 'react'; // <-- SINTAXE CORRIGIDA
import { Box, Button, CircularProgress, Grid, TextField, Typography, Paper } from '@mui/material'; // <-- SINTAXE CORRIGIDA
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

export default function AtendimentoReumatologia({ pacienteId, onEvolucaoSalva }) {
    const [formData, setFormData] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showSnackbar } = useSnackbar();
    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes/`, formData);
            showSnackbar('Evolução salva com sucesso!', 'success');
            setFormData({}); 
            if(onEvolucaoSalva) onEvolucaoSalva();
        } catch (error) { showSnackbar('Erro ao salvar evolução.', 'error'); }
        finally { setIsSubmitting(false); }
    };
    return (
        <Paper component="form" onSubmit={handleSubmit} sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Evolução do Dia (Reumatologia)</Typography>
            <Grid container spacing={2}>
                <Grid item xs={12}><TextField name="notas_subjetivas" label="Subjetivo (Padrão da dor, rigidez matinal, HDA)" multiline rows={4} fullWidth value={formData.notas_subjetivas || ''} onChange={handleChange} size="small" /></Grid>
                <Grid item xs={12}><TextField name="notas_objetivas" label="Objetivo (Contagem articular, sinais flogísticos)" multiline rows={4} fullWidth value={formData.notas_objetivas || ''} onChange={handleChange} size="small" /></Grid>
                <Grid item xs={12}><TextField name="avaliacao" label="Avaliação / Hipóteses" multiline rows={3} fullWidth value={formData.avaliacao || ''} onChange={handleChange} size="small" /></Grid>
                <Grid item xs={12}><TextField name="plano" label="Plano / Conduta" multiline rows={3} fullWidth value={formData.plano || ''} onChange={handleChange} size="small" /></Grid>
                <Grid item xs={12} sx={{ textAlign: 'right' }}><Button type="submit" variant="contained" disabled={isSubmitting}>{isSubmitting ? <CircularProgress size={24} /> : 'Salvar Evolução'}</Button></Grid>
            </Grid>
        </Paper>
    );
}