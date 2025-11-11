// src/components/prontuario/ModalHistoricoEvolucao.jsx
import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, Button, 
    Typography, Box, CircularProgress, Divider 
} from '@mui/material';
// --- CORREÇÃO DO ERRO DE BUILD: Adicionando extensões .js ---
import apiClient from '../../api/axiosConfig.js';
import { useSnackbar } from '../../contexts/SnackbarContext.js';

// --- CORREÇÃO 1: Adicione 'pacienteId' nas props ---
export default function ModalHistoricoEvolucao({ pacienteId, evolucaoId, onClose }) {
    const [evolucao, setEvolucao] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const { showSnackbar } = useSnackbar();

    useEffect(() => {
        // Verifica se temos os DOIS IDs antes de buscar
        if (pacienteId && evolucaoId) {
            setIsLoading(true);
            setEvolucao(null); 
            
            // --- CORREÇÃO AQUI ---
        // Remova o /api do início. O apiClient já tem.
        const urlCorreta = `/prontuario/pacientes/${pacienteId}/evolucoes/${evolucaoId}/`;

        apiClient.get(urlCorreta)
                .then(res => setEvolucao(res.data))
                .catch(err => {
                    // Este snackbar agora deve mostrar o erro 404
                    showSnackbar('Erro ao buscar detalhes da evolução.', 'error');
                    console.error("Erro ao buscar evolução:", err);
                    onClose();
                })
                .finally(() => setIsLoading(false));
        }
    // Adicione pacienteId nas dependências do useEffect
    }, [pacienteId, evolucaoId, onClose, showSnackbar]);
    
    // --- CORREÇÃO 3: Função de PDF ---
    // Estava usando window.open() direto, o que falha a autenticação.
    // Trocamos para o método async com apiClient + blob.
    const handleDownloadPdf = async () => {
        if (!evolucaoId) return;

        try {
            // --- CORREÇÃO AQUI ---
        // Remova o /api do início aqui também.
        const response = await apiClient.get(
            `/pdf/evolucao/${evolucaoId}/`,
            { responseType: 'blob' } 
        );

            const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(pdfBlob);
            window.open(url, '_blank');
            // window.URL.revokeObjectURL(url); // Opcional

        } catch (error) {
            console.error("Erro ao gerar PDF da evolução:", error);
            if (error.response && error.response.status === 404) {
                 showSnackbar('Erro 404: Rota do PDF de evolução não encontrada.', 'error');
            } else {
                 showSnackbar('Erro ao gerar PDF da evolução.', 'error');
            }
        }
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
                <Button onClick={handleDownloadPdf} variant="outlined" disabled={!evolucao || isLoading}>Gerar PDF</Button>
                <Button onClick={onClose} variant="contained">Fechar</Button>
            </DialogActions>
        </Dialog>
    );
}