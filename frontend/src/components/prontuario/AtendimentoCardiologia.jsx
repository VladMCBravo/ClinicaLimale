// src/components/prontuario/AtendimentoCardiologia.jsx - VERSÃO FINAL COM LAYOUT DENSO

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Box, 
    Button, 
    CircularProgress, 
    Grid, 
    TextField, 
    Typography, 
    Paper, 
    FormGroup, 
    FormControlLabel, 
    Checkbox 
} from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

export default function AtendimentoCardiologia({ pacienteId, especialidade = 'Cardiologia', onEvolucaoSalva }) {
    const [formData, setFormData] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showSnackbar } = useSnackbar();
    
    // Estados separados para cada grupo de checkboxes
    const [opcoesQueixa, setOpcoesQueixa] = useState([]);
    const [selecoesQueixa, setSelecoesQueixa] = useState(new Set());
    const [opcoesHDA, setOpcoesHDA] = useState([]);
    const [selecoesHDA, setSelecoesHDA] = useState(new Set());

    // Busca as opções para ambas as seções (Queixa Atual e HDA)
    useEffect(() => {
        const fetchOpcoes = async () => {
            if (!especialidade) return;
            try {
                const queixaPromise = apiClient.get(`/prontuario/opcoes-clinicas/`, {
                    params: { especialidade, area_clinica: 'QUEIXA_ATUAL' }
                });
                const hdaPromise = apiClient.get(`/prontuario/opcoes-clinicas/`, {
                    params: { especialidade, area_clinica: 'HDA' }
                });

                const [queixaRes, hdaRes] = await Promise.all([queixaPromise, hdaPromise]);
                
                setOpcoesQueixa(queixaRes.data);
                setOpcoesHDA(hdaRes.data);

            } catch (err) {
                showSnackbar("Erro ao buscar opções clínicas.", 'error');
                console.error("Erro ao buscar opções clínicas:", err);
            }
        };
        fetchOpcoes();
    }, [especialidade, showSnackbar]);

    const handleFieldChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    // Handler para os checkboxes da Queixa Atual
    const handleQueixaCheckboxChange = (event) => {
        const opcaoDescricao = event.target.name;
        const newSelecoes = new Set(selecoesQueixa);
        if (event.target.checked) {
            newSelecoes.add(opcaoDescricao);
        } else {
            newSelecoes.delete(opcaoDescricao);
        }
        setSelecoesQueixa(newSelecoes);

        const textoQueixas = 'QP: ' + (Array.from(newSelecoes).join(', ') || '');
        const textoHDA = formData.notas_subjetivas?.split('\n\nHDA: ')[1] || '';
        setFormData(prev => ({ ...prev, notas_subjetivas: `${textoQueixas}\n\nHDA: ${textoHDA}` }));
    };

    // Handler para os checkboxes da HDA
    const handleHdaCheckboxChange = (event) => {
        const opcaoDescricao = event.target.name;
        const newSelecoes = new Set(selecoesHDA);
        if (event.target.checked) {
            newSelecoes.add(opcaoDescricao);
        } else {
            newSelecoes.delete(opcaoDescricao);
        }
        setSelecoesHDA(newSelecoes);

        const textoQP = formData.notas_subjetivas?.split('\n\nHDA: ')[0] || 'QP: ';
        const textoHDA = 'HDA: ' + (Array.from(newSelecoes).join('. ') || '');
        setFormData(prev => ({ ...prev, notas_subjetivas: `${textoQP}\n\n${textoHDA}` }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes/`, formData);
            showSnackbar('Evolução salva com sucesso!', 'success');
            setFormData({}); 
            setSelecoesQueixa(new Set());
            setSelecoesHDA(new Set());
            if(onEvolucaoSalva) onEvolucaoSalva();
        } catch (error) {
            showSnackbar('Erro ao salvar evolução.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Paper component="form" onSubmit={handleSubmit} sx={{ p: 2, height: '100%' }}>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Queixa Principal e HDA</Typography>
                    
                    {/* Bloco para os checkboxes da Queixa Atual */}
                    {opcoesQueixa.length > 0 && (
                        <Paper variant="outlined" sx={{ p: 1.5, my: 1, backgroundColor: '#f9f9f9' }}>
                            <Typography variant="subtitle2" gutterBottom>Queixa Atual (Opções Rápidas)</Typography>
                            <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
                                {opcoesQueixa.map(opcao => (
                                    <FormControlLabel
                                      key={opcao.id}
                                      sx={{ mr: 2 }}
                                      control={<Checkbox size="small" onChange={handleQueixaCheckboxChange} name={opcao.descricao} checked={selecoesQueixa.has(opcao.descricao)} />}
                                      label={<Typography variant="body2">{opcao.descricao}</Typography>}
                                    />
                                ))}
                            </FormGroup>
                        </Paper>
                    )}

                    {/* Bloco para os checkboxes da HDA */}
                    {opcoesHDA.length > 0 && (
                         <Paper variant="outlined" sx={{ p: 1.5, my: 1, backgroundColor: '#f9f9f9' }}>
                            <Typography variant="subtitle2" gutterBottom>Opções para História da Doença Atual (HDA)</Typography>
                            <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
                               {opcoesHDA.map(opcao => (
                                    <FormControlLabel
                                      key={opcao.id}
                                      sx={{ mr: 2 }}
                                      control={<Checkbox size="small" onChange={handleHdaCheckboxChange} name={opcao.descricao} checked={selecoesHDA.has(opcao.descricao)} />}
                                      label={<Typography variant="body2">{opcao.descricao}</Typography>}
                                    />
                                ))}
                            </FormGroup>
                        </Paper>
                    )}
                    
                    <TextField name="notas_subjetivas" label="Descrição Narrativa (QP e HDA)" multiline rows={4} fullWidth value={formData.notas_subjetivas || ''} onChange={handleFieldChange} size="small" />
                </Grid>
                
                <Grid item xs={12}><Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Exame Físico</Typography></Grid>
                <Grid item xs={6} sm={3}><TextField name="pressao_arterial" label="Pressão Arterial" fullWidth value={formData.pressao_arterial || ''} onChange={handleFieldChange} size="small" /></Grid>
                <Grid item xs={6} sm={3}><TextField name="frequencia_cardiaca" label="FC" type="number" fullWidth value={formData.frequencia_cardiaca || ''} onChange={handleFieldChange} size="small" /></Grid>
                <Grid item xs={6} sm={3}><TextField name="peso" label="Peso (kg)" type="number" fullWidth value={formData.peso || ''} onChange={handleFieldChange} size="small" /></Grid>
                <Grid item xs={6} sm={3}><TextField name="altura" label="Altura (m)" type="number" fullWidth value={formData.altura || ''} onChange={handleFieldChange} size="small" /></Grid>
                <Grid item xs={12}><TextField name="notas_objetivas" label="Descrição do Exame Físico (Ausculta, Sinais, etc.)" multiline rows={2} fullWidth value={formData.notas_objetivas || ''} onChange={handleFieldChange} size="small" /></Grid>
                
                <Grid item xs={12}><Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Exames Complementares</Typography><TextField name="exames_complementares" label="Resultados de ECG, Eco, etc." multiline rows={2} fullWidth value={formData.exames_complementares || ''} onChange={handleFieldChange} size="small" /></Grid>
                <Grid item xs={12}><Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Diagnóstico / Hipóteses</Typography><TextField name="avaliacao" multiline rows={2} fullWidth value={formData.avaliacao || ''} onChange={handleFieldChange} size="small" /></Grid>
                <Grid item xs={12}><Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Plano Terapêutico / Condutas</Typography><TextField name="plano" multiline rows={2} fullWidth value={formData.plano || ''} onChange={handleFieldChange} size="small" /></Grid>
                
                <Grid item xs={12} sx={{ textAlign: 'right' }}>
                    <Button type="submit" variant="contained" disabled={isSubmitting} size="small">
                        {isSubmitting ? <CircularProgress size={20} /> : 'Salvar Evolução'}
                    </Button>
                </Grid>
            </Grid>
        </Paper>
    );
}