// src/components/prontuario/cardiologia/HistoricoCardiologia.jsx
// VERSÃO CORRIGIDA: Padrão forwardRef e caminhos de import corretos

import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import {
    Paper, Typography, TextField, Box, CircularProgress
} from '@mui/material';
// --- CORREÇÃO DE IMPORTAÇÃO (erro do deploy anterior) ---
import { useSnackbar } from '../../../contexts/SnackbarContext';
import apiClient from '../../../api/axiosConfig';

// 1. Envolver o componente em forwardRef
const HistoricoCardiologia = forwardRef(({ pacienteId }, ref) => {
    const { showSnackbar } = useSnackbar();
    const [isLoading, setIsLoading] = useState(true);
    const [anamneseData, setAnamneseData] = useState({}); 

    const showSnackbarRef = useRef(showSnackbar);
    useEffect(() => {
        showSnackbarRef.current = showSnackbar;
    }, [showSnackbar]);

    // 2. FUNÇÃO DE CARREGAMENTO
    const fetchAnamnese = useCallback(async () => {
        if (!pacienteId) return;
        setIsLoading(true);
        try {
            const res = await apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`);
            if (res.data && res.data.cardiologica) { // <-- Chave correta
                setAnamneseData(res.data.cardiologica);
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

    // 3. HANDLER
    const handleChange = (e) => {
        setAnamneseData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // 4. FUNÇÃO DE SALVAR (REATORADA)
    const saveData = async () => {
        try {
            await apiClient.patch(`/prontuario/pacientes/${pacienteId}/anamnese/`, {
                cardiologica: anamneseData 
            });
        } catch (error) { 
            console.error("Erro ao salvar histórico cardiológico:", error);
            showSnackbarRef.current('Erro ao salvar o histórico cardiológico.', 'error');
            throw error; // Lança o erro para o PAI
        }
    };
    
    // 5. EXPOR A FUNÇÃO 'saveData'
    useImperativeHandle(ref, () => ({
        saveData: saveData
    }));


    if (isLoading) {
         return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    // 6. JSX
    return (
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, borderColor: 'grey.400' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Histórico Cardiológico (Anamnese)
            </Typography>
            
            <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1.5 }}>
                <TextField 
                    label="Fatores de Risco Cardiovascular" 
                    name="fatores_risco" 
                    multiline 
                    rows={4} 
                    fullWidth 
                    size="small"
                    value={anamneseData.fatores_risco || ''}
                    onChange={handleChange} 
                    placeholder="Ex: HAS, DM, Dislipidemia, Tabagismo (carga), Etilismo, Obesidade, Sedentarismo..."
                />
                <TextField 
                    label="Histórico Familiar (Cardio)" 
                    name="hist_familiar_cardio" 
                    multiline 
                    rows={3} 
                    fullWidth 
                    size="small"
                    value={anamneseData.hist_familiar_cardio || ''}
                    onChange={handleChange}
                    placeholder="Ex: Mãe IAM aos 50 anos, Pai AVC..." 
                />
                 <TextField 
                    label="Cirurgias/Procedimentos Prévios" 
                    name="cirurgias_previas_cardio" 
                    multiline 
                    rows={3} 
                    fullWidth 
                    size="small"
                    value={anamneseData.cirurgias_previas_cardio || ''}
                    onChange={handleChange}
                    placeholder="Ex: CRM (data), Angioplastia (data, vaso)..." 
                />
            </Box>
            {/* O botão de salvar fica no componente PAI */}
        </Paper>
    );
}); // Fim do forwardRef

export default HistoricoCardiologia;