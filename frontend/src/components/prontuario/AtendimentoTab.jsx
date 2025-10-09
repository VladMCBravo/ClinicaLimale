import React, { useState, useEffect } from 'react';
import { Box, Button, CircularProgress, Grid, TextField, Typography, Paper, FormGroup, FormControlLabel, Checkbox } from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

export default function AtendimentoTab({ pacienteId, especialidade = 'Cardiologia' }) {
    const [anamnese, setAnamnese] = useState(null);
    const [formData, setFormData] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showSnackbar } = useSnackbar();
    const [opcoesHDA, setOpcoesHDA] = useState([]);
    const [selecoesHDA, setSelecoesHDA] = useState(new Set());

    useEffect(() => {
        apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`)
            .then(res => {
                setAnamnese(res.data);
                setFormData(prev => ({
                    ...prev,
                    notas_subjetivas: `Queixa Principal: ${res.data.queixa_principal || ''}\n\nHDA: ${res.data.historia_doenca_atual || ''}`
                }));
            }).catch(err => console.error("Anamnese não encontrada.", err));

        apiClient.get(`/prontuario/opcoes-clinicas/`, {
            params: { especialidade: especialidade, area_clinica: 'HDA' }
        }).then(res => setOpcoesHDA(res.data))
          .catch(err => console.error("Erro ao buscar opções clínicas:", err));
    }, [pacienteId, especialidade]);

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
        const queixaAtual = formData.notas_subjetivas?.split('\n\n')[0] || `Queixa Principal: ${anamnese?.queixa_principal || ''}`;
        setFormData(prev => ({ ...prev, notas_subjetivas: `${queixaAtual}\n\nHDA: ${textoNarrativo}` }));
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
            setFormData(prev => ({ ...prev, notas_objetivas: '', avaliacao: '', plano: '', pressao_arterial: '', frequencia_cardiaca: '', peso: '', altura: '', exames_complementares: '' })); 
            setSelecoesHDA(new Set());
        } catch (error) {
            showSnackbar('Erro ao salvar evolução.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Paper component="form" onSubmit={handleSubmit} sx={{ p: 2, height: '100%' }}>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Typography variant="h6">Queixa Principal e HDA</Typography>
                    <Paper variant="outlined" sx={{ p: 2, my: 1, backgroundColor: '#f9f9f9' }}>
                        <Typography variant="subtitle2" gutterBottom>Opções para História da Doença Atual (HDA)</Typography>
                        <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
                            {opcoesHDA.map((opcao) => (
                                <FormControlLabel
                                    key={opcao.id}
                                    control={<Checkbox onChange={handleHdaCheckboxChange} name={opcao.descricao} checked={selecoesHDA.has(opcao.descricao)} />}
                                    label={opcao.descricao}
                                />
                            ))}
                        </FormGroup>
                    </Paper>
                    <TextField name="notas_subjetivas" multiline rows={6} fullWidth value={formData.notas_subjetivas || ''} onChange={handleChange} />
                </Grid>
                <Grid item xs={12}><Typography variant="h6">Exame Físico</Typography></Grid>
                <Grid item xs={6} sm={3}><TextField name="pressao_arterial" label="Pressão Arterial" fullWidth value={formData.pressao_arterial || ''} onChange={handleChange} size="small" /></Grid>
                <Grid item xs={6} sm={3}><TextField name="frequencia_cardiaca" label="Freq. Cardíaca" type="number" fullWidth value={formData.frequencia_cardiaca || ''} onChange={handleChange} size="small" /></Grid>
                <Grid item xs={6} sm={3}><TextField name="peso" label="Peso (kg)" type="number" fullWidth value={formData.peso || ''} onChange={handleChange} size="small" /></Grid>
                <Grid item xs={6} sm={3}><TextField name="altura" label="Altura (m)" type="number" fullWidth value={formData.altura || ''} onChange={handleChange} size="small" /></Grid>
                <Grid item xs={12}><TextField name="notas_objetivas" label="Ausculta, Sinais de Congestão, etc." multiline rows={3} fullWidth value={formData.notas_objetivas || ''} onChange={handleChange} /></Grid>
                <Grid item xs={12}><Typography variant="h6">Exames Complementares</Typography><TextField name="exames_complementares" label="ECG, Ecocardiograma, Laboratoriais..." multiline rows={3} fullWidth value={formData.exames_complementares || ''} onChange={handleChange} /></Grid>
                <Grid item xs={12}><Typography variant="h6">Diagnóstico / Hipóteses</Typography><TextField name="avaliacao" multiline rows={3} fullWidth value={formData.avaliacao || ''} onChange={handleChange} /></Grid>
                <Grid item xs={12}><Typography variant="h6">Plano Terapêutico / Condutas</Typography><TextField name="plano" multiline rows={3} fullWidth value={formData.plano || ''} onChange={handleChange} /></Grid>
                <Grid item xs={12} sx={{ textAlign: 'right' }}><Button type="submit" variant="contained" disabled={isSubmitting}>{isSubmitting ? <CircularProgress size={24} /> : 'Salvar Evolução'}</Button></Grid>
            </Grid>
        </Paper>
    );
}