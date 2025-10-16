// src/components/prontuario/AtendimentoCardiologia.jsx - RESTAURADO

import React, { useState, useEffect } from 'react';
import { Box, Button, CircularProgress, Grid, TextField, Typography, Paper, FormGroup, FormControlLabel, Checkbox } from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

export default function AtendimentoCardiologia({ pacienteId, especialidade = 'Cardiologia', onEvolucaoSalva }) {
    const [formData, setFormData] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showSnackbar } = useSnackbar();
    const [opcoesHDA, setOpcoesHDA] = useState([]);
    const [selecoesHDA, setSelecoesHDA] = useState(new Set());

    useEffect(() => {
        const fetchOpcoes = async () => {
            if (!especialidade) return;
            try {
                const hdaRes = await apiClient.get(`/prontuario/opcoes-clinicas/`, { params: { especialidade, area_clinica: 'HDA' } });
                setOpcoesHDA(hdaRes.data);
            } catch (err) {
                showSnackbar("Erro ao buscar opções clínicas.", 'error');
            }
        };
        fetchOpcoes();
    }, [especialidade, showSnackbar]);

    const handleFieldChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleHdaCheckboxChange = (event) => {
        const opcaoDescricao = event.target.name;
        const newSelecoes = new Set(selecoesHDA);
        if (event.target.checked) {
            newSelecoes.add(opcaoDescricao);
        } else {
            newSelecoes.delete(opcaoDescricao);
        }
        setSelecoesHDA(newSelecoes);
        const textoHDA = 'HDA: ' + (Array.from(newSelecoes).join('. ') || '');
        setFormData(prev => ({ ...prev, notas_subjetivas: textoHDA }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes/`, formData);
            showSnackbar('Evolução salva com sucesso!', 'success');
            setFormData({});
            setSelecoesHDA(new Set());
            if(onEvolucaoSalva) onEvolucaoSalva();
        } catch (error) {
            showSnackbar('Erro ao salvar evolução.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Paper component="form" onSubmit={handleSubmit} sx={{ p: 2, mb: 2 }}>
             <Typography variant="h6" gutterBottom>Evolução do Dia</Typography>
            <Grid container spacing={2}>
                 <Grid item xs={12}>
                    {opcoesHDA.length > 0 && (
                         <Paper variant="outlined" sx={{ p: 1.5, my: 1, backgroundColor: '#f9f9f9' }}>
                            <Typography variant="subtitle2" gutterBottom>Opções para HDA</Typography>
                            <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
                               {opcoesHDA.map(opcao => (
                                    <FormControlLabel key={opcao.id} sx={{ mr: 2 }} control={<Checkbox size="small" onChange={handleHdaCheckboxChange} name={opcao.descricao} checked={selecoesHDA.has(opcao.descricao)} />}
                                      label={<Typography variant="body2">{opcao.descricao}</Typography>} />
                                ))}
                            </FormGroup>
                        </Paper>
                    )}
                    <TextField name="notas_subjetivas" label="Subjetivo (Queixa e HDA)" multiline rows={4} fullWidth value={formData.notas_subjetivas || ''} onChange={handleFieldChange} size="small" />
                </Grid>
                <Grid item xs={12}><TextField name="notas_objetivas" label="Objetivo (Exame Físico)" multiline rows={3} fullWidth value={formData.notas_objetivas || ''} onChange={handleFieldChange} size="small" /></Grid>
                <Grid item xs={12}><TextField name="avaliacao" label="Avaliação / Hipóteses" multiline rows={2} fullWidth value={formData.avaliacao || ''} onChange={handleFieldChange} size="small" /></Grid>
                <Grid item xs={12}><TextField name="plano" label="Plano / Conduta" multiline rows={2} fullWidth value={formData.plano || ''} onChange={handleFieldChange} size="small" /></Grid>
                <Grid item xs={12} sx={{ textAlign: 'right' }}>
                    <Button type="submit" variant="contained" disabled={isSubmitting}>
                        {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Evolução'}
                    </Button>
                </Grid>
            </Grid>
        </Paper>
    );
}