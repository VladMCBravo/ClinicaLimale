// src/components/prontuario/AtendimentoGenerico.jsx - LAYOUT COM BOX

import React, { useState, useEffect } from 'react'; // Adicione useEffect
import { Box, Button, CircularProgress, TextField, Typography, Paper } from '@mui/material'; // Remova Grid
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

export default function AtendimentoGenerico({ pacienteId, especialidade, onEvolucaoSalva }) {
    const [formData, setFormData] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showSnackbar } = useSnackbar();

    // Limpa o form ao trocar de paciente
    useEffect(() => {
        setFormData({});
    }, [pacienteId]);

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
    
    const preencherNormalidade = () => { /* ... (igual) ... */ };

    // Botão Limpar
    const handleLimparConsultaAtual = () => { 
        setFormData({});
        showSnackbar('Campos da consulta atual limpos.', 'info');
    };

    return (
        <Paper component="form" onSubmit={handleSubmit} sx={{ p: 2, mb: 2 }}>
            {/* Cabeçalho */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Evolução do Dia ({especialidade || 'Clínica Geral'})
                </Typography>
                 <Button variant="outlined" size="small" onClick={preencherNormalidade}>
                    Preencher Normalidade
                </Button>
            </Box>
            
            {/* Campos SOAP com Box */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField name="notas_subjetivas" label="Subjetivo (Queixas, HDA)" multiline rows={4} fullWidth value={formData.notas_subjetivas || ''} onChange={handleChange} size="small" />
                <TextField name="notas_objetivas" label="Objetivo (Exame Físico)" multiline rows={4} fullWidth value={formData.notas_objetivas || ''} onChange={handleChange} size="small" />
                <TextField name="avaliacao" label="Avaliação / Hipóteses Diagnósticas" multiline rows={3} fullWidth value={formData.avaliacao || ''} onChange={handleChange} size="small" />
                <TextField name="plano" label="Plano / Conduta" multiline rows={3} fullWidth value={formData.plano || ''} onChange={handleChange} size="small" />
                
                {/* Botões */}
                <Box sx={{ textAlign: 'right', mt: 1, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                     <Button onClick={handleLimparConsultaAtual} variant="outlined" disabled={isSubmitting}>
                         Limpar Consulta
                     </Button>
                     <Button type="submit" variant="contained" disabled={isSubmitting}>
                        {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Evolução'}
                    </Button>
                </Box>
            </Box>
        </Paper>
    );
}