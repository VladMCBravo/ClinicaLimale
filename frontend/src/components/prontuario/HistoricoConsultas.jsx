import React, { useState, useEffect } from 'react';
import { Paper, Typography, Box, List, ListItem, ListItemText, CircularProgress, Divider } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext'; // 1. IMPORTE O SNACKBAR

export default function HistoricoConsultas({ pacienteId }) {
    const [evolucoes, setEvolucoes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showSnackbar } = useSnackbar(); // 2. INICIALIZE O HOOK

    useEffect(() => {
        if (pacienteId) {
            apiClient.get(`/prontuario/pacientes/${pacienteId}/evolucoes/`)
                .then(res => setEvolucoes(res.data))
                .catch(err => {
                    // MUDANÇA AQUI
                    showSnackbar('Erro ao buscar histórico de consultas.', 'error');
                    console.error("Erro ao buscar histórico", err)
                })
                .finally(() => setIsLoading(false));
        }
    }, [pacienteId, showSnackbar]); // 3. ADICIONE A DEPENDÊNCIA

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
    <HistoryIcon color="action" />
    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}> {/* <-- MUDANÇA AQUI */}
        Histórico de Consultas
    </Typography>
</Box>
            <Divider />
            {isLoading ? <CircularProgress size={24} sx={{ my: 2 }} /> : (
                <List dense>{evolucoes.length > 0 ? evolucoes.map(ev => (<ListItem key={ev.id}><ListItemText 
    primary={`Em ${new Date(ev.data_atendimento).toLocaleDateString('pt-BR')}`}
    secondary={`com Dr(a). ${ev.medico_nome || 'Não informado'}`} 
/></ListItem>)) : <Typography variant="body2" sx={{ mt: 2 }}>Nenhum registro anterior.</Typography>}</List>
            )}
        </Paper>
    );
}