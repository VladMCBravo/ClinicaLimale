// src/pages/ProntuarioPage.jsx - VERSÃO "SUPER PAINEL"
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import { Box, CircularProgress, Grid, Stack } from '@mui/material';

// Importe os novos componentes do painel
import PatientHeader from '../components/PatientHeader';
import AlertasClinicos from '../components/prontuario/AlertasClinicos';
import HistoricoConsultas from '../components/prontuario/HistoricoConsultas';
import AtendimentoTab from '../components/prontuario/AtendimentoTab';
import PainelAcoes from '../components/prontuario/PainelAcoes';

// (Futuramente, importaremos os modais aqui: PrescricaoModal, AtestadoModal, etc.)

export default function ProntuarioPage() {
    const { pacienteId } = useParams();
    const [paciente, setPaciente] = useState(null);
    const [anamnese, setAnamnese] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // (Futuramente, teremos os states para controlar os modais aqui)
    // const [isPrescricaoModalOpen, setIsPrescricaoModalOpen] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        const fetchPacienteData = apiClient.get(`/pacientes/${pacienteId}/`);
        const fetchAnamneseData = apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`);

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
        return <Typography>Paciente não encontrado.</Typography>;
    }

    return (
        <Box> 
            <PatientHeader paciente={paciente} />

            <Grid container spacing={2} sx={{ p: 2 }}>
                {/* === COLUNA DA ESQUERDA === */}
                <Grid item xs={12} md={3}>
                    <Stack spacing={2}>
                        <AlertasClinicos anamnese={anamnese} />
                        <HistoricoConsultas pacienteId={pacienteId} />
                    </Stack>
                </Grid>

                {/* === COLUNA CENTRAL === */}
                <Grid item xs={12} md={6}>
                    <AtendimentoTab pacienteId={pacienteId} />
                </Grid>

                {/* === COLUNA DA DIREITA === */}
                <Grid item xs={12} md={3}>
                    <PainelAcoes 
                        pacienteId={pacienteId}
                        // Futuramente: onNovaPrescricao={() => setIsPrescricaoModalOpen(true)}
                    />
                </Grid>
            </Grid>
            
            {/* Os modais de Ações serão renderizados aqui no futuro */}
            {/* <PrescricaoModal open={isPrescricaoModalOpen} onClose={...} /> */}
        </Box>
    );
}