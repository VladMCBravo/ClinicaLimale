// src/components/prontuario/reumatologia/HistoricoReumatologia.jsx
// NOVO COMPONENTE (Aba 2 - Esqueleto)

import React, { useState, useEffect, useCallback } from 'react';
import {
    Paper, Typography, TextField, Box, Button, CircularProgress
} from '@mui/material';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import apiClient from '../../../api/axiosConfig';

export default function HistoricoReumatologia({ pacienteId }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    // Assume que os dados serão salvos em 'reumatologica'
    const [anamneseData, setAnamneseData] = useState({}); 

    // 1. FUNÇÃO DE CARREGAMENTO
    const fetchAnamnese = useCallback(async () => {
        if (!pacienteId) return;
        setIsLoading(true);
        try {
            const res = await apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`);
            if (res.data && res.data.reumatologica) {
                setAnamneseData(res.data.reumatologica);
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
                reumatologica: anamneseData
            });
            showSnackbar('Histórico reumatológico salvo com sucesso!', 'success');
        } catch (error) { /* ... (tratamento de erro) ... */ }
        finally { setIsSubmitting(false); }
    };

    if (isLoading) {
         return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    // 4. JSX (Formulário do Histórico - Esqueleto)
    return (
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, borderColor: 'grey.400' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Histórico Reumatológico (Anamnese)
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1.5 }}>
                <TextField 
                    label="Antecedentes Reumatológicos" 
                    name="antecedentes_reumato" 
                    multiline 
                    rows={4} 
                    fullWidth 
                    size="small"
                    value={anamneseData.antecedentes_reumato || ''}
                    onChange={handleChange} 
                    placeholder="Ex: Artrite Reumatoide (data, FAN, FR), Lúpus, Gota..."
                />
                <TextField 
                    label="Histórico Familiar (Autoimune)" 
                    name="hist_familiar_reumato" 
                    multiline 
                    rows={3} 
                    fullWidth 
                    size="small"
                    value={anamneseData.hist_familiar_reumato || ''}
                    onChange={handleChange}
                    placeholder="Ex: Mãe com AR, Irmã com Lúpus..." 
                />
            </Box>

            {/* Botão Salvar */}
            <Box sx={{ textAlign: 'right', mt: 3 }}>
                <Button onClick={handleSaveAnamnese} variant="contained" color="primary" disabled={isSubmitting}>
                    {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Histórico'}
                </Button>
            </Box>
        </Paper>
    );
}