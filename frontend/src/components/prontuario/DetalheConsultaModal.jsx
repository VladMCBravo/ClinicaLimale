// src/components/prontuario/DetalheConsultaModal.jsx - VERSÃO COM MELHOR DEBUG

import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Paper, Divider } from '@mui/material';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext'; // 1. Importar o Snackbar

export default function DetalheConsultaModal({ pacienteId, evolucaoId }) {
    const [evolucao, setEvolucao] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { showSnackbar } = useSnackbar(); // 2. Usar o hook do Snackbar

    useEffect(() => {
        if (pacienteId && evolucaoId) {
            setIsLoading(true);
            const apiUrl = `/prontuario/pacientes/${pacienteId}/evolucoes/${evolucaoId}/`;
            
            // ATENÇÃO: Verifique com seu backend se esta URL está correta.
            console.log(`Buscando detalhes da consulta em: ${apiUrl}`);

            apiClient.get(apiUrl)
                .then(res => setEvolucao(res.data))
                .catch(err => {
                    // 3. Log mais detalhado e notificação para o usuário
                    console.error("Erro ao buscar detalhe da evolução:", err.response?.data || err.message);
                    showSnackbar('Erro ao buscar detalhes da consulta.', 'error');
                    setEvolucao(null); // Garante que o estado fique nulo em caso de erro
                })
                .finally(() => setIsLoading(false));
        }
    }, [pacienteId, evolucaoId, showSnackbar]);

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    if (!evolucao) {
        return <Typography>Não foi possível carregar os detalhes desta consulta.</Typography>;
    }

    return (
        // O restante do seu componente JSX permanece o mesmo
        <Box>
            <Typography variant="h5" gutterBottom>
                Detalhes da Consulta
            </Typography>
            {/* ... o resto do seu JSX ... */}
        </Box>
    );
}