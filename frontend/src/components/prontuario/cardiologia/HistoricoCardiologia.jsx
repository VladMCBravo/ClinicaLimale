// src/components/prontuario/cardiologia/HistoricoCardiologia.jsx
// VERSÃO CORRIGIDA: 'name' dos TextFields corrigidos

import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import {
    Paper, Typography, TextField, Box, CircularProgress
} from '@mui/material';
import { useSnackbar } from 'contexts/SnackbarContext';
import apiClient from 'api/axiosConfig';

const HistoricoCardiologia = forwardRef(({ pacienteId }, ref) => {
    const { showSnackbar } = useSnackbar();
    const [isLoading, setIsLoading] = useState(true);
    const [anamneseData, setAnamneseData] = useState({}); 

    const showSnackbarRef = useRef(showSnackbar);
    useEffect(() => {
        showSnackbarRef.current = showSnackbar;
    }, [showSnackbar]);

    const fetchAnamnese = useCallback(async () => {
        if (!pacienteId) return;
        setIsLoading(true);
        try {
            const res = await apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`);
            // ★★★ MUDANÇA AQUI (para garantir que dados nulos não quebrem) ★★★
            if (res.data && res.data.cardiologica) {
                setAnamneseData(res.data.cardiologica || {}); // Garante que seja um objeto
            } else {
                setAnamneseData({});
            }
        } catch (err) { 
            if (err.response && err.response.status !== 404) {
                showSnackbarRef.current('Erro ao carregar histórico cardiológico.', 'error');
            }
        }
        finally { setIsLoading(false); }
    }, [pacienteId]);

    useEffect(() => { fetchAnamnese(); }, [fetchAnamnese]);

    const handleChange = (e) => {
        setAnamneseData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const saveData = async () => {
        try {
            await apiClient.patch(`/prontuario/pacientes/${pacienteId}/anamnese/`, {
                cardiologica: anamneseData 
            });
        } catch (error) { 
            console.error("Erro ao salvar histórico cardiológico:", error);
            showSnackbarRef.current('Erro ao salvar o histórico cardiológico.', 'error');
            throw error;
        }
    };
    
    useImperativeHandle(ref, () => ({
        saveData: saveData
    }));


    if (isLoading) {
         return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, borderColor: 'grey.400' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Histórico Cardiológico (Anamnese)
            </Typography>
            
            <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1.5 }}>
                <TextField 
                    label="Fatores de Risco Cardiovascular" 
                    name="fatores_risco" // <-- Este estava correto
                    multiline 
                    rows={4} 
                    fullWidth 
                    size="small"
                    value={anamneseData.fatores_risco || ''}
                    onChange={handleChange} 
                    placeholder="Ex: HAS, DM, Dislipidemia, Tabagismo (carga), Etilismo, Obesidade, Sedentarismo..."
                />
                
                {/* ★★★ CORREÇÃO DE 'name' AQUI ★★★ */}
                <TextField 
                    label="Histórico Familiar (Cardio)" 
                    name="historico_familiar" // ANTES: hist_familiar_cardio
                    multiline 
                    rows={3} 
                    fullWidth 
                    size="small"
                    value={anamneseData.historico_familiar || ''} // <-- Corrigido
                    onChange={handleChange}
                    placeholder="Ex: Mãe IAM aos 50 anos, Pai AVC..." 
                />
                
                {/* ★★★ CORREÇÃO DE 'name' AQUI ★★★ */}
                 <TextField 
                    label="Cirurgias/Procedimentos Prévios" 
                    name="cirurgias_cardiacas_previas" // ANTES: cirurgias_previas_cardio
                    multiline 
                    rows={3} 
                    fullWidth 
                    size="small"
                    value={anamneseData.cirurgias_cardiacas_previas || ''} // <-- Corrigido
                    onChange={handleChange}
                    placeholder="Ex: CRM (data), Angioplastia (data, vaso)..." 
                />
            </Box>
        </Paper>
    );
});

export default HistoricoCardiologia;