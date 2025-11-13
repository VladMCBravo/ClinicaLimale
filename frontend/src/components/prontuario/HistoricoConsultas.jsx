// src/components/prontuario/HistoricoConsultas.jsx - VERSÃO ATUALIZADA COM PDF

import React, { useState, useEffect } from 'react';
import { 
    Paper, Typography, Box, List, ListItemText, CircularProgress, 
    Divider, ListItemButton, 
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
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

    // 3. NOVA FUNÇÃO (CORRIGIDA) para o botão de PDF
    const handleDownloadPdf = async (evolucaoId, event) => {
        event.stopPropagation(); // Impede que o clique no botão abra o modal
        
        try {
            // 1. Use o apiClient para fazer a requisição (ele envia o token de auth)
            //    O apiClient já deve ter a baseURL '/api'
            const response = await apiClient.get(
                `/pdf/evolucao/${evolucaoId}/`, 
                { responseType: 'blob' } // MUITO IMPORTANTE: pedir um 'blob'
            );

            // 2. Crie um Blob com o tipo PDF
            const pdfBlob = new Blob([response.data], { type: 'application/pdf' });

            // 3. Crie uma URL temporária para o Blob
            const url = window.URL.createObjectURL(pdfBlob);
            
            // 4. Abra essa URL na nova aba
            window.open(url, '_blank');
            
            // 5. Opcional: revogue a URL depois para liberar memória
            // window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Erro ao baixar o PDF:", error);
            // Verifique se o erro é 404
            if (error.response && error.response.status === 404) {
                showSnackbar('Erro: Rota do PDF não encontrada no servidor.', 'error');
            } else {
                showSnackbar('Erro ao gerar o PDF.', 'error');
            }
        }
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