// src/components/prontuario/HistoricoConsultas.jsx - VERSÃO ATUALIZADA COM PDF

import React, { useState, useEffect } from 'react';
import { 
    Paper, Typography, Box, List, ListItemText, CircularProgress, 
    Divider, ListItemButton, IconButton // 1. Importe IconButton
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'; // 2. Importe o ícone de PDF
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';

export default function HistoricoConsultas({ pacienteId, onConsultaClick }) {
    const [evolucoes, setEvolucoes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showSnackbar } = useSnackbar();

    useEffect(() => {
        // ... (Sua lógica de fetch continua a mesma) ...
        if (pacienteId) {
            setEvolucoes([]); 
            setIsLoading(true);
            apiClient.get(`/prontuario/pacientes/${pacienteId}/evolucoes/`)
                .then(res => setEvolucoes(res.data))
                .catch(err => showSnackbar('Erro ao buscar histórico.', 'error'))
                .finally(() => setIsLoading(false));
        }
    }, [pacienteId, showSnackbar]);

    // 3. NOVA FUNÇÃO para o botão de PDF
    const handleDownloadPdf = (evolucaoId, event) => {
        event.stopPropagation(); // Impede que o clique no botão abra o modal
        // Abre o PDF em nova aba (usa a rota que criamos no Passo 1)
        window.open(`/api/pdf/evolucao/${evolucaoId}/`, '_blank');
    };

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
                <List dense sx={{ overflowY: 'auto', flex: 1 }}>
                    {evolucoes.length > 0 ? evolucoes.map(ev => (
                        // 4. O ListItemButton agora contém o botão de PDF
                        <ListItemButton key={ev.id} onClick={() => onConsultaClick(ev.id)}>
                            <ListItemText 
                                primary={`Em ${new Date(ev.data_atendimento).toLocaleDateString('pt-BR')}`}
                                secondary={`com Dr(a). ${ev.medico_nome || 'Não informado'}`} 
                            />
                            {/* 5. NOVO BOTÃO DE PDF */}
                            <IconButton 
                                size="small" 
                                onClick={(e) => handleDownloadPdf(ev.id, e)}
                                title="Baixar Evolução em PDF"
                                edge="end" // Posiciona o botão à direita
                            >
                                <PictureAsPdfIcon fontSize="small" />
                            </IconButton>
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