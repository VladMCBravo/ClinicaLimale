// src/pages/ProntuarioPage.jsx - VERSÃO COM IMPORT CORRIGIDO
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
// <<-- A CORREÇÃO ESTÁ AQUI: Adicionando 'Typography' -->>
import { Box, CircularProgress, Grid, Stack, Typography } from '@mui/material';

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

    // <<-- SUBSTITUA TODO O SEU useEffect POR ESTE -->>
    useEffect(() => {
        setIsLoading(true);
        
        // A busca dos dados do paciente continua a mesma
        const fetchPacienteData = apiClient.get(`/pacientes/${pacienteId}/`);

        // AQUI ESTÁ A MUDANÇA: Tornamos a busca da anamnese mais robusta
        const fetchAnamneseData = apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`)
            .catch(error => {
                // Se o erro for um 404 (Não Encontrado), nós o tratamos como um "sucesso"
                // e retornamos um objeto que simula uma resposta com dados nulos.
                if (error.response && error.response.status === 404) {
                    return { data: null }; // Isso evita que a página inteira quebre
                }
                // Se for qualquer outro erro, nós o relançamos para ser tratado abaixo
                throw error;
            });

        // O Promise.all agora não falhará mais por um 404 na anamnese
        Promise.all([fetchPacienteData, fetchAnamneseData])
            .then(([pacienteRes, anamneseRes]) => {
                setPaciente(pacienteRes.data);
                setAnamnese(anamneseRes.data); // Será os dados da anamnese ou 'null'
            })
            .catch(err => {
                console.error("Erro ao buscar dados do prontuário:", err);
                setPaciente(null); // Limpa o paciente em caso de erro real
            })
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