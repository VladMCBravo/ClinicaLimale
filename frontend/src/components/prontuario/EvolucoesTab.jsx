// src/components/prontuario/EvolucoesTab.jsx - VERSÃO CORRETA E FINAL

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, CircularProgress, Accordion, AccordionSummary, AccordionDetails, Paper } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';

export default function EvolucoesTab({ pacienteId }) {
    const { showSnackbar } = useSnackbar();
    const [evolucoes, setEvolucoes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchEvolucoes = useCallback(async () => {
        if (!pacienteId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const response = await apiClient.get(`/prontuario/pacientes/${pacienteId}/evolucoes/`);
            setEvolucoes(response.data);
        } catch (error) {
            showSnackbar('Erro ao carregar histórico de evoluções.', 'error');
            console.error("Erro ao buscar histórico de evoluções:", error);
        } finally {
            setIsLoading(false);
        }
    }, [pacienteId, showSnackbar]);

    useEffect(() => {
        fetchEvolucoes();
    }, [fetchEvolucoes]);

    return (
        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>
                Histórico de Evoluções
            </Typography>
            {isLoading ? <Box sx={{display: 'flex', justifyContent: 'center'}}><CircularProgress /></Box> : (
                evolucoes.length > 0 ? (
                    evolucoes.map(evolucao => (
                        <Accordion key={evolucao.id} sx={{ mt: 1 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography sx={{ width: '40%', flexShrink: 0 }}>
                                    {new Date(evolucao.data_atendimento).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric'})}
                                </Typography>
                                <Typography sx={{ color: 'text.secondary' }}>Dr(a). {evolucao.medico_nome || 'Não informado'}</Typography>
                            </AccordionSummary>
                             <AccordionDetails>
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Subjetivo:</Typography>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>{evolucao.notas_subjetivas || 'Não informado'}</Typography>
                                    
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Objetivo:</Typography>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>{evolucao.notas_objetivas || 'Não informado'}</Typography>
                                    
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Avaliação:</Typography>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>{evolucao.avaliacao || 'Não informado'}</Typography>
                                    
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Plano:</Typography>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{evolucao.plano || 'Não informado'}</Typography>
                                </Box>
                            </AccordionDetails>
                        </Accordion>
                    ))
                ) : (
                    <Typography variant="body2" sx={{mt: 2}}>Nenhuma evolução registrada para este paciente.</Typography>
                )
            )}
        </Paper>
    );
}