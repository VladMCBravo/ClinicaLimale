// src/components/prontuario/ortopedia/HistoricoOrtopedia.jsx
// NOVO COMPONENTE (Aba 2)

import React, { useState, useEffect, useCallback } from 'react';
import {
    Paper, Typography, TextField, Box, Button, CircularProgress
} from '@mui/material';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import apiClient from '../../../api/axiosConfig';

export default function HistoricoOrtopedia({ pacienteId }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [anamneseData, setAnamneseData] = useState({});

    // 1. FUNÇÃO DE CARREGAMENTO
    const fetchAnamnese = useCallback(async () => {
        if (!pacienteId) return;
        setIsLoading(true);
        try {
            const res = await apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`);
            if (res.data && res.data.ortopedica) {
                setAnamneseData(res.data.ortopedica);
            } else {
                setAnamneseData({});
            }
        } catch (err) { /* ... (tratamento de erro) ... */ }
        finally { setIsLoading(false); }
    }, [pacienteId, showSnackbar]);

    useEffect(() => { fetchAnamnese(); }, [fetchAnamnese]);

    // 2. HANDLER
    const handleChange = (e) => {
        setAnamneseData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // 3. FUNÇÃO DE SALVAR
    const handleSaveAnamnese = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/anamnese/`, {
                ortopedica: anamneseData
            });
            showSnackbar('Histórico ortopédico salvo com sucesso!', 'success');
        } catch (error) { /* ... (tratamento de erro) ... */ }
        finally { setIsSubmitting(false); }
    };

    if (isLoading) {
         return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    // 4. JSX (Formulário do Histórico)
    return (
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, borderColor: 'grey.400' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Histórico Ortopédico (Anamnese)
            </Typography>
            
            <TextField label="Antecedentes Ortopédicos (Cirurgias, fraturas prévias, etc.)" name="antecedentes" multiline rows={4} fullWidth size="small" sx={{mt: 1.5}}
                value={anamneseData.antecedentes || ''}
                onChange={handleChange} />
            
            {/* Adicione outros campos de histórico ortopédico aqui se necessário */}

            {/* Botão Salvar */}
            <Box sx={{ textAlign: 'right', mt: 3 }}>
                <Button onClick={handleSaveAnamnese} variant="contained" color="primary" disabled={isSubmitting}>
                    {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Histórico'}
                </Button>
            </Box>
        </Paper>
    );
}