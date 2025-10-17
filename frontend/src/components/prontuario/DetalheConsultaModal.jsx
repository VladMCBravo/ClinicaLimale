// src/components/prontuario/DetalheConsultaModal.jsx

import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Paper, Divider } from '@mui/material';
import apiClient from '../../api/axiosConfig';

export default function DetalheConsultaModal({ pacienteId, evolucaoId }) {
    const [evolucao, setEvolucao] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (pacienteId && evolucaoId) {
            setIsLoading(true);
            // ATENÇÃO: A API precisa suportar buscar uma evolução específica.
            // Se o endpoint for diferente, ajuste aqui.
            apiClient.get(`/prontuario/pacientes/${pacienteId}/evolucoes/${evolucaoId}/`)
                .then(res => setEvolucao(res.data))
                .catch(err => console.error("Erro ao buscar detalhe da evolução", err))
                .finally(() => setIsLoading(false));
        }
    }, [pacienteId, evolucaoId]);

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    if (!evolucao) {
        return <Typography>Não foi possível carregar os detalhes desta consulta.</Typography>;
    }

    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                Detalhes da Consulta
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>
                Realizada em {new Date(evolucao.data_atendimento).toLocaleDateString('pt-BR')} com Dr(a). {evolucao.medico_nome}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>Subjetivo:</Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{evolucao.notas_subjetivas || 'Não informado'}</Typography>
            </Paper>
            
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>Objetivo:</Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{evolucao.notas_objetivas || 'Não informado'}</Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>Avaliação:</Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{evolucao.avaliacao || 'Não informado'}</Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>Plano:</Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{evolucao.plano || 'Não informado'}</Typography>
            </Paper>
        </Box>
    );
}