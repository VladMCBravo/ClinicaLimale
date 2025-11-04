// src/components/prontuario/obstetricia/HistoricoObstetricia.jsx
// NOVO COMPONENTE (Aba 2 - Baseado no Hist. Gineco)

import React, { useState, useEffect, useCallback } from 'react';
import {
    Paper, Typography, TextField, Box, Button, CircularProgress
} from '@mui/material';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import apiClient from '../../../api/axiosConfig';

// Prop 'onIgCalculada' é opcional, usada para atualizar a Aba 1
export default function HistoricoObstetricia({ pacienteId, onIgCalculada }) { 
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    // Usamos o modelo 'ginecologica' para salvar os dados obstétricos
    const [anamneseData, setAnamneseData] = useState({});

    // 1. FUNÇÃO DE CARREGAMENTO
    const fetchAnamnese = useCallback(async () => {
        if (!pacienteId) return;
        setIsLoading(true);
        try {
            const res = await apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`);
            if (res.data && res.data.ginecologica) {
                setAnamneseData(res.data.ginecologica);
                // Informa o pai sobre a IG (se a função foi passada)
                if (onIgCalculada && res.data.ginecologica.ig_atual) {
                    onIgCalculada(res.data.ginecologica.ig_atual);
                }
            } else {
                setAnamneseData({});
            }
        } catch (err) { /* ... (tratamento de erro) ... */ }
        finally { setIsLoading(false); }
    }, [pacienteId, showSnackbar, onIgCalculada]);

    useEffect(() => { fetchAnamnese(); }, [fetchAnamnese]);

    // 2. HANDLERS
    const handleChange = (e) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'date' && value === '' ? null : value;
        setAnamneseData(prev => ({ ...prev, [name]: finalValue }));
    };

    // 3. FUNÇÃO DE SALVAR
    const handleSaveAnamnese = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            // Usamos o endpoint de anamnese geral, passando o objeto 'ginecologica'
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/anamnese/`, {
                ginecologica: anamneseData
            });
            showSnackbar('Histórico obstétrico salvo com sucesso!', 'success');
            // Informa o pai sobre a IG (se a função foi passada)
             if (onIgCalculada && anamneseData.ig_atual) {
                onIgCalculada(anamneseData.ig_atual);
            }
        } catch (error) { /* ... (tratamento de erro) ... */ }
        finally { setIsSubmitting(false); }
    };

    if (isLoading) {
         return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    // 4. JSX (Formulário do Histórico Obstétrico)
    return (
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, borderColor: 'grey.400' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Histórico Obstétrico (Anamnese)
            </Typography>
            
            {/* Campos Gesta, Para, Cesárea, Aborto, DUM, DPP, IG Atual */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1.5 }}>
               <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                   <TextField label="Gesta" name="gesta" type="number" size="small" value={anamneseData.gesta || ''} onChange={handleChange} />
                   <TextField label="Para" name="para" type="number" size="small" value={anamneseData.para || ''} onChange={handleChange} />
                   <TextField label="Cesáreas" name="cesareas" type="number" size="small" value={anamneseData.cesareas || ''} onChange={handleChange} />
                   <TextField label="Abortos" name="abortos" type="number" size="small" value={anamneseData.abortos || ''} onChange={handleChange} />
               </Box>
               <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                   <TextField label="DUM" name="dum" type="date" InputLabelProps={{ shrink: true }} size="small" value={anamneseData.dum || ''} onChange={handleChange} />
                   <TextField label="DPP" name="dpp" type="date" InputLabelProps={{ shrink: true }} size="small" value={anamneseData.dpp || ''} onChange={handleChange} />
                   <TextField label="IG Atual (semanas)" name="ig_atual" type="number" size="small" value={anamneseData.ig_atual || ''} onChange={handleChange} />
               </Box>
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