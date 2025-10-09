// src/pages/ProntuarioPage.jsx - VERSÃO COM LAYOUT CORRIGIDO
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import { Box, CircularProgress, Grid, Stack, Typography } from '@mui/material';

import PatientHeader from '../components/PatientHeader';
import AlertasClinicos from '../components/prontuario/AlertasClinicos';
import HistoricoConsultas from '../components/prontuario/HistoricoConsultas';
import AtendimentoTab from '../components/prontuario/AtendimentoTab';
import PainelAcoes from '../components/prontuario/PainelAcoes';

export default function ProntuarioPage() {
    const { pacienteId } = useParams();
    const [paciente, setPaciente] = useState(null);
    const [anamnese, setAnamnese] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        setIsLoading(true);
        const fetchPacienteData = apiClient.get(`/pacientes/${pacienteId}/`);
        const fetchAnamneseData = apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`)
            .catch(err => (err.response && err.response.status === 404 ? { data: null } : Promise.reject(err)));

        Promise.all([fetchPacienteData, fetchAnamneseData])
            .then(([pacienteRes, anamneseRes]) => {
                setPaciente(pacienteRes.data);
                setAnamnese(anamneseRes.data);
            })
            .catch(err => console.error("Erro ao buscar dados do prontuário:", err))
            .finally(() => setIsLoading(false));
    }, [pacienteId]);

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    if (!paciente) {
        return <Typography sx={{ p: 3 }}>Paciente não encontrado.</Typography>;
    }

    return (
        <Box sx={{ flexGrow: 1 }}> 
            <PatientHeader paciente={paciente} />

            {/* O Grid container garante que os itens fiquem lado a lado em telas maiores */}
            <Grid container spacing={2} sx={{ p: 2 }}>
                {/* === COLUNA DA ESQUERDA === */}
                <Grid item xs={12} lg={3}> {/* Usando 'lg' para telas maiores */}
                    <Stack spacing={2}>
                        <AlertasClinicos anamnese={anamnese} />
                        <HistoricoConsultas pacienteId={pacienteId} />
                    </Stack>
                </Grid>

                {/* === COLUNA CENTRAL === */}
                <Grid item xs={12} lg={6}>
                    <AtendimentoTab pacienteId={pacienteId} />
                </Grid>

                {/* === COLUNA DA DIREITA === */}
                <Grid item xs={12} lg={3}>
                    <PainelAcoes 
                        pacienteId={pacienteId}
                        // Futuramente: onNovaPrescricao={() => setIsPrescricaoModalOpen(true)}
                    />
                </Grid>
            </Grid>
        </Box>
    );
}