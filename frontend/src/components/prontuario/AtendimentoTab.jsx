// src/components/prontuario/AtendimentoTab.jsx

import React, { useState, useEffect, useCallback } from 'react'; // Adicione useCallback
import { Box, Button, CircularProgress, Grid, TextField, Typography, Paper, FormGroup, FormControlLabel, Checkbox } from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

// Mantenha apenas o formulário da EVOLUÇÃO
export default function AtendimentoTab({ pacienteId, especialidade = 'Cardiologia', onEvolucaoSalva }) {
    const [formData, setFormData] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showSnackbar } = useSnackbar();
    const [opcoesHDA, setOpcoesHDA] = useState([]);
    const [selecoesHDA, setSelecoesHDA] = useState(new Set());

    // REMOVA o useEffect que buscava a Anamnese.
    // Vamos focar apenas em buscar as opções para a evolução atual.
    const fetchOpcoes = useCallback(async () => {
        try {
            const response = await apiClient.get(`/prontuario/opcoes-clinicas/`, {
                params: { especialidade: especialidade, area_clinica: 'HDA' }
            });
            setOpcoesHDA(response.data);
        } catch (err) {
            showSnackbar("Erro ao buscar opções clínicas.", 'error');
        }
    }, [especialidade, showSnackbar]);

    useEffect(() => {
        fetchOpcoes();
    }, [fetchOpcoes]);


    const handleHdaCheckboxChange = (event) => {
        const opcaoDescricao = event.target.name;
        const isChecked = event.target.checked;
        const newSelecoes = new Set(selecoesHDA);
        
        if (isChecked) {
            newSelecoes.add(opcaoDescricao);
        } else {
            newSelecoes.delete(opcaoDescricao);
        }
        setSelecoesHDA(newSelecoes);

        const textoNarrativo = Array.from(newSelecoes).join('. ') + (newSelecoes.size > 0 ? '.' : '');
        // Agora, ele apenas atualiza a parte da HDA no campo de notas subjetivas
        setFormData(prev => ({ ...prev, notas_subjetivas: `HDA: ${textoNarrativo}` }));
    };

    const handleChange = (event) => {
        setFormData({ ...formData, [event.target.name]: event.target.value });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes/`, formData);
            showSnackbar('Evolução salva com sucesso!', 'success');
            // Limpa o formulário após salvar
            setFormData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '', pressao_arterial: '', frequencia_cardiaca: '', peso: '', altura: '', exames_complementares: '' }); 
            setSelecoesHDA(new Set());
            if(onEvolucaoSalva) {
                onEvolucaoSalva(); // Notifica o painel principal que uma nova evolução foi salva
            }
        } catch (error) {
            showSnackbar('Erro ao salvar evolução.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Paper component="form" onSubmit={handleSubmit} sx={{ p: 2, height: '100%' }}>
            <Grid container spacing={2}> {/* Espaçamento reduzido */}
                <Grid item xs={12}>
                    {/* Fonte do Título Reduzida */}
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Queixa Principal e HDA</Typography>
                    <Paper variant="outlined" sx={{ p: 1.5, my: 1, backgroundColor: '#f9f9f9' }}>
                        <Typography variant="subtitle2" gutterBottom>Opções para História da Doença Atual (HDA)</Typography>
                        <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 0.5 }}>
                            {/* ... (lógica dos checkboxes) */}
                        </FormGroup>
                    </Paper>
                    <TextField name="notas_subjetivas" multiline rows={4} fullWidth value={formData.notas_subjetivas || ''} onChange={handleChange} size="small" />
                </Grid>
                
                <Grid item xs={12}><Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Exame Físico</Typography></Grid>
                <Grid item xs={6} sm={3}><TextField name="pressao_arterial" label="Pressão Arterial" fullWidth value={formData.pressao_arterial || ''} onChange={handleChange} size="small" /></Grid>
                <Grid item xs={6} sm={3}><TextField name="frequencia_cardiaca" label="FC" type="number" fullWidth value={formData.frequencia_cardiaca || ''} onChange={handleChange} size="small" /></Grid>
                <Grid item xs={6} sm={3}><TextField name="peso" label="Peso (kg)" type="number" fullWidth value={formData.peso || ''} onChange={handleChange} size="small" /></Grid>
                <Grid item xs={6} sm={3}><TextField name="altura" label="Altura (m)" type="number" fullWidth value={formData.altura || ''} onChange={handleChange} size="small" /></Grid>
                <Grid item xs={12}><TextField name="notas_objetivas" label="Ausculta, Sinais, etc." multiline rows={2} fullWidth value={formData.notas_objetivas || ''} onChange={handleChange} size="small" /></Grid>
                
                <Grid item xs={12}><Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Exames Complementares</Typography><TextField name="exames_complementares" label="ECG, Eco..." multiline rows={2} fullWidth value={formData.exames_complementares || ''} onChange={handleChange} size="small" /></Grid>
                <Grid item xs={12}><Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Diagnóstico / Hipóteses</Typography><TextField name="avaliacao" multiline rows={2} fullWidth value={formData.avaliacao || ''} onChange={handleChange} size="small" /></Grid>
                <Grid item xs={12}><Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Plano Terapêutico / Condutas</Typography><TextField name="plano" multiline rows={2} fullWidth value={formData.plano || ''} onChange={handleChange} size="small" /></Grid>
                
                <Grid item xs={12} sx={{ textAlign: 'right' }}>
                    {/* Botão Menor */}
                    <Button type="submit" variant="contained" disabled={isSubmitting} size="small">
                        {isSubmitting ? <CircularProgress size={20} /> : 'Salvar Evolução'}
                    </Button>
                </Grid>
            </Grid>
        </Paper>
    );
}