import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Paper, List, ListItem, ListItemIcon, ListItemText, CircularProgress, Tooltip } from '@mui/material';
import { agendamentoService } from '../../services/agendamentoService';

import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import StarIcon from '@mui/icons-material/Star';
import EventNoteIcon from '@mui/icons-material/EventNote';
import DoneIcon from '@mui/icons-material/Done';
import PersonOffIcon from '@mui/icons-material/PersonOff';

const statusMap = {
    'Agendado': { icon: <EventNoteIcon />, color: 'info.main', title: 'Agendado' },
    'Aguardando Pagamento': { icon: <HourglassEmptyIcon />, color: 'warning.main', title: 'Aguardando Pagamento' },
    'Confirmado': { icon: <CheckCircleIcon />, color: 'success.main', title: 'Confirmado' },
    'Cancelado': { icon: <CancelIcon />, color: 'error.main', title: 'Cancelado' },
    'Realizado': { icon: <DoneIcon />, color: 'action.active', title: 'Realizado' },
    'Não Compareceu': { icon: <PersonOffIcon />, color: 'text.secondary', title: 'Não Compareceu' }
};

// 1. Definimos a função do componente
function PacientesDoDiaSidebar({ refreshTrigger, medicoFiltro }) {
    const [pacientes, setPacientes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPacientesDoDia = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await agendamentoService.getAgendamentosHoje(medicoFiltro);
            const dadosOrdenados = response.data.sort((a, b) => 
                new Date(a.data_hora_inicio) - new Date(b.data_hora_inicio)
            );
            setPacientes(dadosOrdenados);
        } catch (error) {
            console.error("Erro ao buscar pacientes do dia:", error);
            setPacientes([]);
        } finally {
            setIsLoading(false);
        }
    }, [medicoFiltro]);

    useEffect(() => {
        fetchPacientesDoDia();
    }, [fetchPacientesDoDia, refreshTrigger, medicoFiltro]);

    return (
        <Paper variant="outlined" sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
            <Typography variant="h6" gutterBottom>Pacientes do Dia</Typography>
            {isLoading ? <CircularProgress size={24} sx={{ display: 'block', margin: 'auto', mt: 2 }} /> : (
                <List dense>
                    {pacientes.length > 0 ? pacientes.map(ag => {
                        const statusInfo = statusMap[ag.status] || { icon: <HelpOutlineIcon />, color: 'text.secondary', title: ag.status };
                        return (
                            <ListItem key={ag.id} sx={{ py: 0.5 }}>
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                    <Tooltip title={statusInfo.title}>
                                        {React.cloneElement(statusInfo.icon, { sx: { color: statusInfo.color } })}
                                    </Tooltip>
                                </ListItemIcon>
                                <ListItemText 
                                    primary={ag.paciente_nome}
                                    secondary={new Date(ag.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                />
                                {ag.primeira_consulta && (
                                    <Tooltip title="Primeira Consulta">
                                        <StarIcon sx={{ color: 'orange', fontSize: 18 }} />
                                    </Tooltip>
                                )}
                            </ListItem>
                        );
                    }) : (
                        <ListItem><ListItemText primary="Nenhum agendamento para hoje." /></ListItem>
                    )}
                </List>
            )}
        </Paper>
    );
}

// 2. Exportamos a versão "memorizada" do componente
export default React.memo(PacientesDoDiaSidebar);