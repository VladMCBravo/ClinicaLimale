// src/components/prontuario/EvolucoesTab.jsx - VERSÃO RECONSTRUÍDA

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, CircularProgress, Accordion, AccordionSummary, AccordionDetails, Paper } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';

// Importe os formulários de atendimento que ele vai usar
import AtendimentoCardiologia from './AtendimentoCardiologia';
// Adicione aqui outros formulários de atendimento, como AtendimentoPediatria, etc.

export default function EvolucoesTab({ pacienteId }) {
    const { showSnackbar } = useSnackbar();
    const { user } = useAuth();
    const [evolucoes, setEvolucoes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchEvolucoes = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get(`/prontuario/pacientes/${pacienteId}/evolucoes/`);
            setEvolucoes(response.data);
        } catch (error) {
            showSnackbar('Erro ao carregar histórico de evoluções.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [pacienteId, showSnackbar]);

    useEffect(() => {
        fetchEvolucoes();
    }, [fetchEvolucoes]);

    // Função que decide qual formulário de atendimento renderizar
    const renderAtendimentoForm = () => {
        const especialidadePrincipal = user?.especialidades_detalhes?.[0]?.nome;

        switch (especialidadePrincipal) {
            case 'Cardiologia':
                return <AtendimentoCardiologia pacienteId={pacienteId} onEvolucaoSalva={fetchEvolucoes} especialidade={especialidadePrincipal} />;
            
            // case 'Pediatria':
            //     return <AtendimentoPediatria pacienteId={pacienteId} onEvolucaoSalva={fetchEvolucoes} />;

            default:
                // Se não houver um formulário específico, não renderiza nada ou um genérico
                return <Typography sx={{p: 2}}>Formulário de evolução para esta especialidade não implementado.</Typography>;
        }
    };

    return (
        <Box sx={{mt: 2}}>
            {/* 1. RENDERIZA O FORMULÁRIO PARA A CONSULTA DE HOJE */}
            {renderAtendimentoForm()}

            {/* 2. RENDERIZA O HISTÓRICO DE CONSULTAS PASSADAS */}
            <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                <Typography variant="h6" gutterBottom>Histórico de Evoluções Anteriores</Typography>
                {isLoading ? <CircularProgress /> : (
                    evolucoes.length > 0 ? (
                        evolucoes.map(evolucao => (
                            <Accordion key={evolucao.id} sx={{ mt: 1 }}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography sx={{ width: '40%', flexShrink: 0 }}>
                                        {new Date(evolucao.data_atendimento).toLocaleDateString('pt-BR')}
                                    </Typography>
                                    <Typography sx={{ color: 'text.secondary' }}>Dr(a). {evolucao.medico_nome}</Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{evolucao.notas_subjetivas}</Typography>
                                    {/* Adicione outros campos da evolução aqui se desejar */}
                                </AccordionDetails>
                            </Accordion>
                        ))
                    ) : (
                        <Typography>Nenhuma evolução registrada para este paciente.</Typography>
                    )
                )}
            </Paper>
        </Box>
    );
}