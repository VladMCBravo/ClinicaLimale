// src/components/prontuario/neurologia/HistoricoNeurologia.jsx
// VERSÃO CORRIGIDA: Removida dependência 'showSnackbar'

import React, { useState, useEffect, useCallback } from 'react';
import {
    Paper, Typography, TextField,
    Box, Button, CircularProgress, Divider
} from '@mui/material';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import apiClient from '../../../api/axiosConfig';

export default function HistoricoNeurologia({ pacienteId }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [anamneseData, setAnamneseData] = useState({});

    // 1. FUNÇÃO DE CARREGAMENTO (CORRIGIDA)
    const fetchAnamnese = useCallback(async () => {
        if (!pacienteId) return;
        setIsLoading(true);
        try {
            const res = await apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`);
            if (res.data && res.data.neurologica) {
                setAnamneseData(res.data.neurologica);
            } else {
                setAnamneseData({});
            }
        } catch (err) {
            if (err.response && err.response.status !== 404) {
                showSnackbar('Erro ao carregar histórico neurológico.', 'error');
            }
        } finally {
            setIsLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pacienteId]); // <-- CORREÇÃO: 'showSnackbar' removido

    useEffect(() => {
        fetchAnamnese();
    }, [fetchAnamnese]);

    // 2. HANDLER
    const handleChange = (e) => {
        setAnamneseData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // 3. FUNÇÃO DE SALVAR
    const handleSaveAnamnese = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            await apiClient.patch(`/prontuario/pacientes/${pacienteId}/anamnese/`, {
                neurologica: anamneseData // Chave correta para Neurologia
            });
            showSnackbar('Histórico neurológico salvo com sucesso!', 'success');
        } catch (error) { 
            showSnackbar('Erro ao salvar histórico neurológico.', 'error');
        }
        finally { setIsSubmitting(false); }
    };

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    // 4. JSX (Formulário do Histórico)
    return (
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, borderColor: 'grey.400' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Histórico Neurológico (Anamnese)
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1.5 }}>
                 
                 <TextField label="Antecedentes Neurológicos" name="antecedentes_neurologicos" multiline rows={4} fullWidth size="small"
                     value={anamneseData.antecedentes_neurologicos || ''} onChange={handleChange} 
                     placeholder="Ex: CVA/TIA (data), Epilepsia (tipo, data início), Cefaleia crônica, Trauma craniano, Doenças Degenerativas (Parkinson, Alzheimer, Esclerose Múltipla), Meningite/Encefalite..."
                 />

                 <TextField label="Histórico Familiar Neurológico" name="historico_familiar_neuro" multiline rows={3} fullWidth size="small"
                     value={anamneseData.historico_familiar_neuro || ''} onChange={handleChange} 
                     placeholder="Ex: Pai com Alzheimer, Mãe com Parkinson, Irmão com Epilepsia..."
                 />

                 <TextField label="Medicamentos Neurológicos em Uso" name="medicamentos_neuro_em_uso" multiline rows={3} fullWidth size="small"
                     value={anamneseData.medicamentos_neuro_em_uso || ''} onChange={handleChange} 
                     placeholder="Ex: Anticonvulsivantes (Carbamazepina), Antiparkinsonianos (Levodopa), Antidepressivos, Anticoagulantes..."
                 />
                 
                 <TextField label="Hábitos de Vida / Fatores de Risco" name="habitos_sociais_neuro" multiline rows={3} fullWidth size="small"
                     value={anamneseData.habitos_sociais_neuro || ''} onChange={handleChange} 
                     placeholder="Tabagismo, Etilismo (quantidade/frequência), Uso de drogas ilícitas, Exposição a toxinas, Qualidade do sono..."
                 />
            </Box>

            <Box sx={{ textAlign: 'right', mt: 3 }}>
                <Button onClick={handleSaveAnamnese} variant="contained" color="primary" disabled={isSubmitting}>
                    {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Histórico'}
                </Button>
            </Box>
        </Paper>
    );
}