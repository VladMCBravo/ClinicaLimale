// src/components/prontuario/HistoricoConsultas.jsx

import React, { useState, useEffect } from 'react';
import { Paper, Typography, Box, List, ListItemText, CircularProgress, Divider, ListItemButton } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';

// 1. A prop 'onConsultaClick' já estava prevista, agora vamos usá-la.
export default function HistoricoConsultas({ pacienteId, onConsultaClick }) {
    const [evolucoes, setEvolucoes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showSnackbar } = useSnackbar();

    useEffect(() => {
        if (pacienteId) {
            // Limpa o estado anterior ao buscar novas evoluções
            setEvolucoes([]); 
            setIsLoading(true);
            apiClient.get(`/prontuario/pacientes/${pacienteId}/evolucoes/`)
                .then(res => setEvolucoes(res.data))
                .catch(err => showSnackbar('Erro ao buscar histórico.', 'error'))
                .finally(() => setIsLoading(false));
        }
    }, [pacienteId, showSnackbar]);

    return (
        <Paper variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <HistoryIcon color="action" />
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Histórico de Consultas</Typography>
            </Box>
            <Divider />
            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                    <CircularProgress size={24} />
                </Box>
            ) : (
                // A lista agora ocupará o espaço disponível com scroll
                <List dense sx={{ overflowY: 'auto', flex: 1 }}>
                    {evolucoes.length > 0 ? evolucoes.map(ev => (
                        // 2. Transformado em um botão clicável que chama a função recebida por prop
                        <ListItemButton key={ev.id} onClick={() => onConsultaClick(ev.id)}>
                            <ListItemText 
                                primary={`Em ${new Date(ev.data_atendimento).toLocaleDateString('pt-BR')}`}
                                secondary={`com Dr(a). ${ev.medico_nome || 'Não informado'}`} 
                            />
                        </ListItemButton>
                    )) : (
                        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
                            Nenhum registro anterior.
                        </Typography>
                    )}
                </List>
            )}
        </Paper>
    );
}