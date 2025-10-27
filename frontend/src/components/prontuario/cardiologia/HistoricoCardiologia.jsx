// src/components/prontuario/cardiologia/HistoricoCardiologia.jsx
// NOVO COMPONENTE (Aba 2)

import React, { useState, useEffect, useCallback } from 'react';
import {
    Paper, Typography, FormGroup, FormControlLabel, Checkbox, TextField,
    Box, Button, CircularProgress, Grid, Divider
} from '@mui/material';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import apiClient from '../../../api/axiosConfig';

// Opções de Fatores de Risco (Expandido com base na pesquisa)
const fatoresRiscoOpcoes = [
    { id: 'has', label: 'HAS' }, { id: 'dm', label: 'DM' }, { id: 'dislipidemia', label: 'Dislipidemia' },
    { id: 'tabagismo', label: 'Tabagismo' }, { id: 'sedentarismo', label: 'Sedentarismo' },
    { id: 'historia_familiar_dac', label: 'Hist. Familiar DAC' }, { id: 'obesidade', label: 'Obesidade' },
    { id: 'sahos', label: 'Apneia do Sono (SAHOS)' }, { id: 'drc', label: 'Doença Renal Crônica (DRC)' },
    { id: 'autoimune', label: 'Doença Autoimune (Ex: AR)' }, { id: 'estresse', label: 'Estresse Psicossocial' },
];

export default function HistoricoCardiologia({ pacienteId }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    // Estado para guardar os dados da anamnese
    const [anamneseData, setAnamneseData] = useState({});
    // Estado separado para os checkboxes de fatores de risco
    const [fatoresRisco, setFatoresRisco] = useState({});

    // 1. FUNÇÃO DE CARREGAMENTO
    const fetchAnamnese = useCallback(async () => {
        if (!pacienteId) return;
        setIsLoading(true);
        try {
            const res = await apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`);
            // Seção 'cardiologica' pode não existir (404 ou null)
            if (res.data && res.data.cardiologica) {
                setAnamneseData(res.data.cardiologica);
                setFatoresRisco(res.data.cardiologica.fatores_risco || {});
            } else {
                setAnamneseData({});
                setFatoresRisco({});
            }
        } catch (err) {
            if (err.response && err.response.status !== 404) {
                showSnackbar('Erro ao carregar histórico cardiológico.', 'error');
            }
        } finally {
            setIsLoading(false);
        }
    }, [pacienteId, showSnackbar]);

    useEffect(() => {
        fetchAnamnese();
    }, [fetchAnamnese]);

    // 2. HANDLERS
    const handleChange = (e) => {
        setAnamneseData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleFatoresRiscoChange = (e) => {
        setFatoresRisco(prev => ({ ...prev, [e.target.name]: e.target.checked }));
    };

    // 3. FUNÇÃO DE SALVAR
    const handleSaveAnamnese = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);

        const payload = {
            ...anamneseData,
            fatores_risco: fatoresRisco, // Combina os fatores de risco ao payload
        };

        try {
            // A view de anamnese (POST) lida com criação ou atualização
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/anamnese/`, {
                cardiologica: payload
            });
            showSnackbar('Histórico cardiológico salvo com sucesso!', 'success');
        } catch (error) {
            console.error("Erro ao salvar anamnese:", error.response?.data);
            showSnackbar('Erro ao salvar histórico.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    // 4. JSX (Formulário do Histórico)
    return (
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, borderColor: 'grey.400' }}>
            {/* ... (Título e Fatores de Risco - sem alterações) ... */}
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Histórico Cardiológico (Anamnese)
            </Typography>

            {/* Fatores de Risco */}
            <Typography variant="body1" sx={{ mt: 2, fontWeight: 'medium' }}>Fatores de Risco Cardiovascular</Typography>
            <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                {fatoresRiscoOpcoes.map(opt => (
                    <FormControlLabel
                        key={opt.id}
                        control={<Checkbox checked={fatoresRisco[opt.id] || false} onChange={handleFatoresRiscoChange} name={opt.id} />}
                        label={opt.label}
                    />
                ))}
            </FormGroup>

            <Divider sx={{ my: 2 }} />

            {/* --- CORREÇÃO DE LAYOUT AQUI --- */}
            {/* Usamos Grid container ainda, mas cada item ocupa 12 colunas (largura total) */}
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Histórico Detalhado</Typography>
            <Grid container spacing={2} sx={{mt: 0.5}}>
                {/* Cada Grid item agora tem apenas xs={12} */}
                <Grid item xs={12}>
                    <TextField label="Medicamentos Cardiológicos em Uso" name="medicamentos_em_uso" multiline rows={3} fullWidth size="small"
                        value={anamneseData.medicamentos_em_uso || ''} onChange={handleChange} />
                </Grid>
                <Grid item xs={12}>
                    <TextField label="Histórico Familiar Relevante" name="historico_familiar" multiline rows={3} fullWidth size="small"
                        value={anamneseData.historico_familiar || ''} onChange={handleChange} placeholder="Ex: Pai IAM aos 50a" />
                </Grid>
                <Grid item xs={12}>
                    <TextField label="Cirurgias Prévias / Intervenções" name="cirurgias_cardiacas_previas" multiline rows={3} fullWidth size="small"
                        value={anamneseData.cirurgias_cardiacas_previas || ''} onChange={handleChange} placeholder="Ex: Angioplastia com stent 2020" />
                </Grid>
                <Grid item xs={12}>
                    <TextField label="Outras Comorbidades" name="comorbidades_outras" multiline rows={3} fullWidth size="small"
                        value={anamneseData.comorbidades_outras || ''} onChange={handleChange} placeholder="Ex: DRC estágio 3, DPOC" />
                </Grid>
            </Grid>
            {/* --- FIM DA CORREÇÃO --- */}

            <Divider sx={{ my: 2 }} />

            {/* Hábitos de Vida (já estavam corretos, mas mantidos para contexto) */}
            <Typography variant="body1" sx={{ mt: 2, fontWeight: 'medium' }}>Hábitos de Vida</Typography>
            <Grid container spacing={2} sx={{mt: 0.5}}>
                <Grid item xs={12} md={4}>
                    <TextField label="Tabagismo" name="habito_tabagismo" fullWidth size="small"
                        value={anamneseData.habito_tabagismo || ''} onChange={handleChange} placeholder="Ex: 20 maços-ano" />
                </Grid>
                <Grid item xs={12} md={4}>
                    <TextField label="Etilismo" name="habito_etilismo" fullWidth size="small"
                        value={anamneseData.habito_etilismo || ''} onChange={handleChange} placeholder="Ex: Social, fins de semana" />
                </Grid>
                <Grid item xs={12} md={4}>
                    <TextField label="Atividade Física" name="habito_atividade_fisica" fullWidth size="small"
                        value={anamneseData.habito_atividade_fisica || ''} onChange={handleChange} placeholder="Ex: Caminhada 3x/semana" />
                </Grid>
            </Grid>

            {/* Botão Salvar */}
            <Box sx={{ textAlign: 'right', mt: 3 }}>
                <Button onClick={handleSaveAnamnese} variant="contained" color="primary" disabled={isSubmitting}>
                    {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Histórico'}
                </Button>
            </Box>
        </Paper>
    );
}