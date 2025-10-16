// src/components/prontuario/EvolucoesTab.jsx - VERSÃO REATORADA

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, CircularProgress, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';

// Importe os formulários de atendimento que ele vai usar
import AtendimentoGeral from './AtendimentoGeral';
import AtendimentoCardiologia from './AtendimentoCardiologia';
import AtendimentoPediatria from './AtendimentoPediatria'; 

export default function EvolucoesTab({ pacienteId }) {
    const { showSnackbar } = useSnackbar();
    const { user } = useAuth(); // Pega o usuário para saber a especialidade
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
            
            // ▼▼▼ ADICIONE O NOVO CASO AQUI ▼▼▼
            case 'Pediatria':
                return <AtendimentoPediatria pacienteId={pacienteId} onEvolucaoSalva={fetchEvolucoes} />;

            default:
                return <AtendimentoGeral pacienteId={pacienteId} onEvolucaoSalva={fetchEvolucoes} />;
        }
    };
    return (
        <Box>           
            <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                Histórico de Evoluções
            </Typography>
            {isLoading ? <CircularProgress /> : (
                evolucoes.length > 0 ? (
                    evolucoes.map(evolucao => (
                        <Accordion key={evolucao.id}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography sx={{ width: '33%', flexShrink: 0 }}>
                                    {new Date(evolucao.data_atendimento).toLocaleDateString('pt-BR')}
                                </Typography>
                                <Typography sx={{ color: 'text.secondary' }}>Dr(a). {evolucao.medico_nome}</Typography>
                            </AccordionSummary>
                             <AccordionDetails>
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Subjetivo (Queixa e HDA):</Typography>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>{evolucao.notas_subjetivas || 'Não informado'}</Typography>
                                    
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Objetivo (Exame Físico):</Typography>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>{evolucao.notas_objetivas || 'Não informado'}</Typography>
                                    
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Exames Complementares:</Typography>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>{evolucao.exames_complementares || 'Não informado'}</Typography>
                                    
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Avaliação / Hipóteses:</Typography>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>{evolucao.avaliacao || 'Não informado'}</Typography>
                                    
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Plano / Conduta:</Typography>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{evolucao.plano || 'Não informado'}</Typography>
                                </Box>
                            </AccordionDetails>
                        </Accordion>
                    ))
                ) : (
                    <Typography>Nenhuma evolução registrada para este paciente.</Typography>
                )
            )}
        </Box>
    );
}