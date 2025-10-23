// Crie este arquivo em: src/components/prontuario/AtendimentoGenerico.jsx

import React, { useState } from 'react';
import { Box, Button, CircularProgress, Grid, TextField, Typography, Paper } from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

// Este é o mesmo formulário que você tem no AtendimentoPediatria.jsx,
// mas com os labels genéricos.
export default function AtendimentoGenerico({ pacienteId, especialidade, onEvolucaoSalva }) {
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
    
    // Botão de "Normalidade" genérico
    const preencherNormalidade = () => {
        setFormData({
            notas_subjetivas: 'Paciente refere bom estado geral, nega queixas.',
            notas_objetivas: 'BEG, corado, hidratado, eupneico. Sinais vitais estáveis. Exame físico sem alterações.',
            avaliacao: 'Paciente estável, sem intercorrências.',
            plano: 'Mantenho conduta. Sigo acompanhamento.'
        });
    };

    return (
        <Paper component="form" onSubmit={handleSubmit} sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Evolução do Dia ({especialidade || 'Clínica Geral'})
                </Typography>
                 <Button variant="outlined" size="small" onClick={preencherNormalidade}>
                    Preencher Normalidade
                </Button>
            </Box>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <TextField name="notas_subjetivas" label="Subjetivo (Queixas, HDA)" multiline rows={4} fullWidth value={formData.notas_subjetivas || ''} onChange={handleChange} size="small" />
                </Grid>
                <Grid item xs={12}>
                    <TextField name="notas_objetivas" label="Objetivo (Exame Físico)" multiline rows={4} fullWidth value={formData.notas_objetivas || ''} onChange={handleChange} size="small" />
                </Grid>
                <Grid item xs={12}>
                    <TextField name="avaliacao" label="Avaliação / Hipóteses Diagnósticas" multiline rows={3} fullWidth value={formData.avaliacao || ''} onChange={handleChange} size="small" />
                </Grid>
                <Grid item xs={12}>
                    <TextField name="plano" label="Plano / Conduta" multiline rows={3} fullWidth value={formData.plano || ''} onChange={handleChange} size="small" />
                </Grid>
                <Grid item xs={12} sx={{ textAlign: 'right' }}>
                    <Button type="submit" variant="contained" disabled={isSubmitting}>
                        {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Evolução'}
                    </Button>
                </Grid>
            </Grid>
        </Paper>
    );
}