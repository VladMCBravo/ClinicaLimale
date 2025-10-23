// Crie este arquivo em: src/components/prontuario/ModalHistoricoEvolucao.jsx

import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, Button, 
    Typography, Box, CircularProgress, Divider 
} from '@mui/material';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';

export default function ModalHistoricoEvolucao({ evolucaoId, onClose }) {
    const [evolucao, setEvolucao] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const { showSnackbar } = useSnackbar();

    useEffect(() => {
        if (evolucaoId) {
            setIsLoading(true);
            setEvolucao(null); // Limpa o estado anterior
            
            // Esta API busca os detalhes de UMA evolução
            // Ela depende da sua EvolucaoDetailAPIView
            // e da rota 'evolucoes/<int:pk>/'
            apiClient.get(`/prontuario/evolucoes/${evolucaoId}/`)
                .then(res => setEvolucao(res.data))
                .catch(err => {
                    showSnackbar('Erro ao buscar detalhes da evolução.', 'error');
                    console.error("Erro ao buscar evolução:", err);
                    onClose();
                })
                .finally(() => setIsLoading(false));
        }
    }, [evolucaoId, onClose, showSnackbar]);
    
    // Função para o botão de PDF
    const handleDownloadPdf = () => {
        // Esta é a rota que criamos no Passo 1
        window.open(`/api/pdf/evolucao/${evolucaoId}/`, '_blank');
    };

    return (
        <Dialog open={!!evolucaoId} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Detalhes da Evolução</DialogTitle>
            <DialogContent dividers>
                {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}
                {evolucao && (
                    <Box>
                        <Typography variant="body2" gutterBottom>
                            <strong>Data:</strong> {new Date(evolucao.data_atendimento).toLocaleString('pt-BR')}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                            <strong>Médico:</strong> {evolucao.medico_nome || 'Não informado'}
                        </Typography>
                        <Divider sx={{ my: 2 }} />
                        
                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Subjetivo (S)</Typography>
                        <Typography variant="body1" paragraph style={{ whiteSpace: 'pre-wrap' }}>{evolucao.notas_subjetivas || 'N/A'}</Typography>
                        
                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Objetivo (O)</Typography>
                        <Typography variant="body1" paragraph style={{ whiteSpace: 'pre-wrap' }}>{evolucao.notas_objetivas || 'N/A'}</Typography>
                        
                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Avaliação (A)</Typography>
                        <Typography variant="body1" paragraph style={{ whiteSpace: 'pre-wrap' }}>{evolucao.avaliacao || 'N/A'}</Typography>
                        
                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Plano (P)</Typography>
                        <Typography variant="body1" paragraph style={{ whiteSpace: 'pre-wrap' }}>{evolucao.plano || 'N/A'}</Typography>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleDownloadPdf} variant="outlined" disabled={!evolucao}>Gerar PDF</Button>
                <Button onClick={onClose} variant="contained">Fechar</Button>
            </DialogActions>
        </Dialog>
    );
}