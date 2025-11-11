// src/components/prontuario/clinica_geral/HistoricoClinicaGeral.jsx
// VERSÃO CORRIGIDA: Removida dependência 'showSnackbar'

import React, { useState, useEffect, useCallback } from 'react';
import {
    Paper, Typography, TextField, Box, Button, CircularProgress, Divider
} from '@mui/material';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import apiClient from '../../../api/axiosConfig';

export default function HistoricoClinicaGeral({ pacienteId }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [clinicaGeralData, setClinicaGeralData] = useState({});
    const [anamneseGeralData, setAnamneseGeralData] = useState({});

    // 1. FUNÇÃO DE CARREGAMENTO (CORRIGIDA)
    const fetchAnamnese = useCallback(async () => {
        if (!pacienteId) return;
        setIsLoading(true);
        try {
            const res = await apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`);
            if (res.data) {
                setClinicaGeralData(res.data.clinica_geral || {});
                setAnamneseGeralData({
                    alergias: res.data.alergias || '',
                    medicamentos_em_uso: res.data.medicamentos_em_uso || '',
                    historico_familiar: res.data.historico_familiar || '',
                });
            } else {
                setClinicaGeralData({});
                setAnamneseGeralData({});
            }
        } catch (err) { 
            if (err.response && err.response.status !== 404) {
                showSnackbar('Erro ao carregar histórico de clínica geral.', 'error');
            }
        }
        finally { setIsLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pacienteId]); // <-- CORREÇÃO: 'showSnackbar' removido

    useEffect(() => { fetchAnamnese(); }, [fetchAnamnese]);

    // 2. HANDLERS
    const handleClinicaChange = (e) => {
        setClinicaGeralData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    const handleGeralChange = (e) => {
        setAnamneseGeralData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // 3. FUNÇÃO DE SALVAR
    const handleSaveAnamnese = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            const anamnGeralPayload = { ...anamneseGeralData };
            const clinicaPayload = { ...clinicaGeralData };

            await apiClient.post(`/prontuario/pacientes/${pacienteId}/anamnese/`, {
                alergias: anamnGeralPayload.alergias,
                medicamentos_em_uso: anamnGeralPayload.medicamentos_em_uso,
                historico_familiar: anamnGeralPayload.historico_familiar,
                clinica_geral: clinicaPayload
            });
            showSnackbar('Histórico de Clínica Geral salvo!', 'success');
        } catch (error) { 
            showSnackbar('Erro ao salvar histórico de clínica geral.', 'error');
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
                Histórico de Clínica Geral (Anamnese)
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1.5 }}>
                <TextField label="Histórico Médico Pregresso" name="hmp" multiline rows={4} fullWidth size="small"
                    value={clinicaGeralData.hmp || ''} onChange={handleClinicaChange}
                    placeholder="Doenças crônicas, cirurgias prévias, internações relevantes..." />

                <TextField label="Alergias" name="alergias" multiline rows={2} fullWidth size="small"
                    value={anamneseGeralData.alergias || ''} onChange={handleGeralChange}
                    placeholder="Medicamentosas, alimentares, ambientais..." />

                <TextField label="Medicamentos em Uso Contínuo" name="medicamentos_em_uso" multiline rows={3} fullWidth size="small"
                    value={anamneseGeralData.medicamentos_em_uso || ''} onChange={handleGeralChange}
                    placeholder="Nome do medicamento, dosagem, frequência..." />

                <TextField label="Histórico Familiar Relevante" name="historico_familiar" multiline rows={3} fullWidth size="small"
                    value={anamneseGeralData.historico_familiar || ''} onChange={handleGeralChange}
                    placeholder="Doenças importantes em parentes de 1º grau (pais, irmãos, filhos)..." />

                 <TextField label="Hábitos e Histórico Social" name="habitos_sociais" multiline rows={3} fullWidth size="small"
                    value={clinicaGeralData.habitos_sociais || ''} onChange={handleClinicaChange}
                    placeholder="Tabagismo (carga), Etilismo (tipo/freq), Drogas ilícitas, Ocupação, Atividade física, Moradia..." />

                 <TextField label="Status Vacinal (Adulto)" name="vacina_adulto_status" multiline rows={2} fullWidth size="small"
                    value={clinicaGeralData.vacina_adulto_status || ''} onChange={handleClinicaChange}
                    placeholder="Ex: dT atualizada, Influenza anual, Anti-pneumocócica..." />
            </Box>

            <Box sx={{ textAlign: 'right', mt: 3 }}>
                <Button onClick={handleSaveAnamnese} variant="contained" color="primary" disabled={isSubmitting}>
                    {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Histórico'}
                </Button>
            </Box>
        </Paper>
    );
}