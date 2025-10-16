// src/components/prontuario/EvolucoesTab.jsx - VERSÃO FINAL E COMPLETA

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, CircularProgress, Accordion, AccordionSummary, AccordionDetails, Paper } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';

// --- IMPORTE TODOS OS SEUS FORMULÁRIOS DE ATENDIMENTO AQUI ---
import AtendimentoPediatria from './AtendimentoPediatria';
import AtendimentoNeonatologia from './AtendimentoNeonatologia';
import AtendimentoCardiologia from './AtendimentoCardiologia';
import AtendimentoGinecologia from './AtendimentoGinecologia';
import AtendimentoObstetricia from './AtendimentoObstetricia';
import AtendimentoOrtopedia from './AtendimentoOrtopedia';
import AtendimentoReumatologia from './AtendimentoReumatologia';

export default function EvolucoesTab({ pacienteId }) {
    const { showSnackbar } = useSnackbar();
    const { user } = useAuth();
    const [evolucoes, setEvolucoes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchEvolucoes = useCallback(async () => {
        if (!pacienteId) { setIsLoading(false); return; }
        setIsLoading(true);
       try {
            const response = await apiClient.get(`/prontuario/pacientes/${pacienteId}/evolucoes/`);
            
            // ▼▼▼ LINHA DE DEBUG ESSENCIAL ▼▼▼
            console.log('DEBUG [EvolucoesTab]: Dados recebidos da API de evoluções:', response.data);

            // Garante que o que estamos salvando é sempre um array.
            setEvolucoes(Array.isArray(response.data) ? response.data : []);
       } catch (error) { 
            showSnackbar('Erro ao carregar histórico.', 'error'); 
            setEvolucoes([]); // Em caso de erro, define um array vazio para não quebrar
        } 
        finally { setIsLoading(false); }
    }, [pacienteId, showSnackbar]);

    useEffect(() => { fetchEvolucoes(); }, [fetchEvolucoes]);

    // --- A LÓGICA DE DECISÃO AGORA ESTÁ COMPLETA ---
    const renderAtendimentoForm = () => {
        const especialidade = user?.especialidades_detalhes?.[0]?.nome;

        switch (especialidade) {
            case 'Pediatria':
                return <AtendimentoPediatria pacienteId={pacienteId} onEvolucaoSalva={fetchEvolucoes} />;
            
            case 'Neonatologia':
                return <AtendimentoNeonatologia pacienteId={pacienteId} onEvolucaoSalva={fetchEvolucoes} />;

            case 'Cardiologia':
                return <AtendimentoCardiologia pacienteId={pacienteId} onEvolucaoSalva={fetchEvolucoes} />;

            case 'Ginecologia':
                return <AtendimentoGinecologia pacienteId={pacienteId} onEvolucaoSalva={fetchEvolucoes} />;
            
            case 'Obstetricia':
                return <AtendimentoObstetricia pacienteId={pacienteId} onEvolucaoSalva={fetchEvolucoes} />;

            case 'Ortopedia':
                return <AtendimentoOrtopedia pacienteId={pacienteId} onEvolucaoSalva={fetchEvolucoes} />;
            
            case 'Reumatologia':
            case 'Reumatologia Pediátrica':
                return <AtendimentoReumatologia pacienteId={pacienteId} onEvolucaoSalva={fetchEvolucoes} />;

            default:
                return null;
        }
    };

    return (
        <Box sx={{mt: 2}}>
            {renderAtendimentoForm()}
            <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                <Typography variant="h6" gutterBottom>Histórico de Consultas Anteriores</Typography>
                {isLoading ? <CircularProgress /> : (
                    // ▼▼▼ MUDANÇA DE SEGURANÇA AQUI ▼▼▼
                    // O .filter(Boolean) remove quaisquer itens nulos ou indefinidos da lista antes de tentar renderizá-los.
                    // Isso impede o crash.
                    evolucoes && evolucoes.filter(Boolean).length > 0 ? (
                        evolucoes.filter(Boolean).map(evolucao => (
                            <Accordion key={evolucao.id} sx={{ mt: 1 }}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography sx={{ width: '40%', flexShrink: 0 }}>
                                        {new Date(evolucao.data_atendimento).toLocaleDateString('pt-BR')}
                                    </Typography>
                                    <Typography sx={{ color: 'text.secondary' }}>Dr(a). {evolucao.medico_nome}</Typography>
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
                    ) : ( <Typography>Nenhuma evolução anterior registrada.</Typography> )
                )}
            </Paper>
        </Box>
    );
}