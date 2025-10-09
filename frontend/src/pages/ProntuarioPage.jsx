// src/pages/ProntuarioPage.jsx - VERSÃO COM LAYOUT FLEXBOX
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import { Box, CircularProgress, Stack, Typography } from '@mui/material'; // Grid não é mais necessário aqui

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
        // ... (sua lógica de busca de dados continua a mesma)
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
        <Box> 
            <PatientHeader paciente={paciente} />

            {/* <<-- ESTRUTURA DE LAYOUT CORRIGIDA COM FLEXBOX -->> */}
            <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', lg: 'row' }, // Empilha em telas pequenas, fica lado a lado em telas grandes
                p: 2,
                gap: 2,
            }}>
                {/* === COLUNA DA ESQUERDA (25% da largura) === */}
                <Box sx={{ width: { xs: '100%', lg: '25%' }, flexShrink: 0 }}>
                    <Stack spacing={2}>
                        <AlertasClinicos anamnese={anamnese} />
                        <HistoricoConsultas pacienteId={pacienteId} />
                    </Stack>
                </Box>

                {/* === COLUNA CENTRAL (50% da largura) === */}
                <Box sx={{ width: { xs: '100%', lg: '50%' }, flexGrow: 1 }}>
                    <AtendimentoTab pacienteId={pacienteId} />
                </Box>

                {/* === COLUNA DA DIREITA (25% da largura) === */}
                <Box sx={{ width: { xs: '100%', lg: '25%' }, flexShrink: 0 }}>
                    <PainelAcoes 
                        pacienteId={pacienteId}
                        // Futuramente: onNovaPrescricao={() => setIsPrescricaoModalOpen(true)}
                    />
                </Box>
            </Box>
        </Box>
    );
}