// src/components/prontuario/pediatria/HistoricoPediatrico.jsx
// NOVO COMPONENTE (Aba 2)

import React, { useState, useEffect, useCallback } from 'react';
import {
    Paper, Typography, Grid, FormGroup, FormControlLabel, Checkbox, TextField, Divider, RadioGroup, Radio,
    FormControl, InputLabel, Select, MenuItem, Box, Button, CircularProgress
} from '@mui/material';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import apiClient from '../../../api/axiosConfig';

// Estas são as opções de DNPM simples que você usava,
// Vamos mantê-las aqui por enquanto, antes de mover para a Aba 3.
const dnpmOptions = [
    { id: 'sustenta_cabeca', label: 'Sustenta a cabeça (~3m)' }, { id: 'sorri_social', label: 'Sorriso social (~3m)' },
    { id: 'senta_com_apoio', label: 'Senta com apoio (~6m)' }, { id: 'engatinha', label: 'Engatinha (~9m)' },
    { id: 'anda', label: 'Anda (~12-15m)' }, { id: 'primeiras_palavras', label: 'Primeiras palavras (~12m)' },
    { id: 'frases_simples', label: 'Frases simples (~24m)' }, { id: 'controle_esfincter', label: 'Controle de esfíncteres' },
];

export default function HistoricoPediatrico({ pacienteId }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [anamneseData, setAnamneseData] = useState({ pediatrica: {}, dnpm: {} });

    // 1. FUNÇÃO DE CARREGAMENTO (Movida do AtendimentoPediatria.jsx)
    const fetchAnamnese = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`);
            setAnamneseData({
                pediatrica: res.data.pediatrica || {},
                dnpm: res.data.pediatrica?.dnpm || {},
            });
        } catch (err) {
            if (err.response && err.response.status !== 404) {
                showSnackbar('Erro ao carregar histórico de anamnese.', 'error');
            }
            // Se for 404, apenas deixamos os campos vazios (normal)
        } finally {
            setIsLoading(false);
        }
    }, [pacienteId, showSnackbar]);

    useEffect(() => {
        fetchAnamnese();
    }, [fetchAnamnese]);

    // 2. HANDLERS (Movidos do AtendimentoPediatria.jsx)
    const handlePediatricaChange = (name, value) => {
        setAnamneseData(prev => ({ ...prev, pediatrica: { ...prev.pediatrica, [name]: value } }));
    };

    const handleDnpmChange = (event) => {
        const { name, checked } = event.target;
        setAnamneseData(prev => ({ ...prev, dnpm: { ...prev.dnpm, [name]: checked } }));
    };

    // 3. FUNÇÃO DE SALVAR (Modificada do AtendimentoPediatria.jsx)
    const handleSaveAnamnese = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);

        try {
            const anamnesePayload = {
                ...anamneseData.pediatrica,
                dnpm: anamneseData.dnpm,
            };

            // Usamos POST, pois a view de anamnese é RetrieveUpdate (ela lida com create/update)
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/anamnese/`, {
                pediatrica: anamnesePayload
            });
            showSnackbar('Histórico de anamnese salvo com sucesso!', 'success');
        } catch (error) {
            console.error("Erro ao salvar anamnese:", error.response?.data);
            showSnackbar('Erro ao salvar histórico de anamnese.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    // 4. JSX (Copiado do AtendimentoPediatria.jsx)
    return (
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, borderColor: 'grey.400' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Histórico Pediátrico (Anamnese)
                </Typography>
            </Box>

            {/* Histórico Gestacional */}
            <Typography variant="body1" sx={{ mt: 2, fontWeight: 'medium' }}>Histórico Gestacional e Nascimento</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1.5 }}>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                    <FormControl fullWidth size="small">
                        <InputLabel id="tipo-parto-label">Tipo de Parto</InputLabel>
                        <Select labelId="tipo-parto-label" label="Tipo de Parto" name="tipo_parto"
                            value={anamneseData.pediatrica.tipo_parto || ''}
                            onChange={(e) => handlePediatricaChange('tipo_parto', e.target.value)}>
                            <MenuItem value="Normal">Normal</MenuItem>
                            <MenuItem value="Cesárea">Cesárea</MenuItem>
                            <MenuItem value="Fórceps">Fórceps</MenuItem>
                            <MenuItem value="Não sabe">Não sabe</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl fullWidth size="small">
                        <InputLabel id="idade-gestacional-label">Idade Gestacional</InputLabel>
                        <Select
                            labelId="idade-gestacional-label"
                            label="Idade Gestacional"
                            name="idade_gestacional"
                            value={anamneseData.pediatrica.idade_gestacional || ''}
                            onChange={(e) => handlePediatricaChange('idade_gestacional', e.target.value)}
                        >
                            <MenuItem value="A termo">A termo ({'>='} 37 sem)</MenuItem>
                            <MenuItem value="Pré-termo tardio">Pré-termo tardio (34 a 36+6 sem)</MenuItem>
                            <MenuItem value="Pré-termo moderado">Pré-termo moderado (32 a 33+6 sem)</MenuItem>
                            <MenuItem value="Muito pré-termo">Muito pré-termo (28 a 31+6 sem)</MenuItem>
                            <MenuItem value="Pré-termo extremo">Pré-termo extremo ({'<'} 28 sem)</MenuItem>
                            <MenuItem value="Pós-termo">Pós-termo ({'>='} 42 sem)</MenuItem>
                            <MenuItem value="Não sabe">Não sabe</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                    <TextField label="Peso ao nascer" placeholder="gramas" name="peso_nascimento" type="number"
                        value={anamneseData.pediatrica.peso_nascimento || ''}
                        onChange={(e) => handlePediatricaChange('peso_nascimento', e.target.value)} fullWidth size="small" />
                    <TextField label="APGAR (1º/5º)" name="apgar"
                        value={anamneseData.pediatrica.apgar || ''}
                        onChange={(e) => handlePediatricaChange('apgar', e.target.value)} fullWidth size="small" />
                </Box>
                <TextField label="Intercorrências na gestação ou parto" name="intercorrencias_gestacao_parto"
                    value={anamneseData.pediatrica.intercorrencias_gestacao_parto || ''}
                    onChange={(e) => handlePediatricaChange('intercorrencias_gestacao_parto', e.target.value)} multiline rows={2} fullWidth size="small" />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Aleitamento e Vacinação */}
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Aleitamento</Typography>
                    <RadioGroup row name="aleitamento"
                        value={anamneseData.pediatrica.aleitamento || ''}
                        onChange={(e) => handlePediatricaChange('aleitamento', e.target.value)}>
                        <FormControlLabel value="SME" control={<Radio size="small" />} label="Materno Exclusivo" />
                        <FormControlLabel value="Formula" control={<Radio size="small" />} label="Fórmula" />
                        <FormControlLabel value="Misto" control={<Radio size="small" />} label="Misto" />
                    </RadioGroup>
                    <TextField label="Introdução Alimentar" name="introducao_alimentar"
                        value={anamneseData.pediatrica.introducao_alimentar || ''}
                        onChange={(e) => handlePediatricaChange('introducao_alimentar', e.target.value)} fullWidth size="small" sx={{ mt: 1 }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Vacinação (Resumo)</Typography>
                    <RadioGroup row name="vacinacao"
                        value={anamneseData.pediatrica.vacinacao || ''}
                        onChange={(e) => handlePediatricaChange('vacinacao', e.target.value)}>
                        <FormControlLabel value="Em dia" control={<Radio size="small" />} label="Em dia" />
                        <FormControlLabel value="Atrasada" control={<Radio size="small" />} label="Atrasada" />
                    </RadioGroup>
                    <TextField label="Observações sobre vacinação" name="vacinacao_obs"
                        value={anamneseData.pediatrica.vacinacao_obs || ''}
                        onChange={(e) => handlePediatricaChange('vacinacao_obs', e.target.value)} fullWidth size="small" sx={{ mt: 1 }} />
                </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* DNPM (Ainda o simples) */}
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Desenvolvimento Neuropsicomotor (Resumo)</Typography>
            <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                {dnpmOptions.map(opt => (
                    <FormControlLabel key={opt.id} control={<Checkbox checked={anamneseData.dnpm[opt.id] || false} onChange={handleDnpmChange} name={opt.id} />} label={opt.label} />
                ))}
            </FormGroup>

            <Box sx={{ textAlign: 'right', mt: 2 }}>
                <Button onClick={handleSaveAnamnese} variant="contained" color="primary" disabled={isSubmitting}>
                    {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Histórico'}
                </Button>
            </Box>
        </Paper>
    );
}