// src/components/agenda/PacientesDoDiaSidebar.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Paper, List, ListItem, ListItemIcon, ListItemText, CircularProgress, Tooltip } from '@mui/material';
import apiClient from '../../api/axiosConfig';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CancelIcon from '@mui/icons-material/Cancel';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import StarIcon from '@mui/icons-material/Star';

// Mapeamento de status para ícones e cores
const statusMap = {
    'Confirmado': { icon: <CheckCircleIcon />, color: 'success.main', title: 'Confirmado' },
    'Aguardando': { icon: <HourglassEmptyIcon />, color: 'warning.main', title: 'Aguardando' },
    'Cancelado': { icon: <CancelIcon />, color: 'error.main', title: 'Cancelado' },
    'Pendente': { icon: <HelpOutlineIcon />, color: 'info.main', title: 'Pendente' }
};

export default function PacientesDoDiaSidebar({ refreshTrigger }) {
    const [pacientes, setPacientes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPacientesDoDia = useCallback(async () => {
        try {
            // Seu backend já tem esta rota pronta!
            const response = await apiClient.get('/agendamentos/hoje/');
            setPacientes(response.data);
        } catch (error) {
            console.error("Erro ao buscar pacientes do dia:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPacientesDoDia();
    }, [fetchPacientesDoDia, refreshTrigger]);

    return (
        <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Pacientes do Dia</Typography>
            {isLoading ? <CircularProgress /> : (
                <List dense>
                    {pacientes.length > 0 ? pacientes.map(ag => {
                        const statusInfo = statusMap[ag.status] || { icon: <HelpOutlineIcon />, color: 'text.secondary', title: 'Status Desconhecido' };
                        return (
                            <ListItem key={ag.id}>
                                <ListItemIcon>
                                    <Tooltip title={statusInfo.title}>
                                        {React.cloneElement(statusInfo.icon, { sx: { color: statusInfo.color } })}
                                    </Tooltip>
                                </ListItemIcon>
                                <ListItemText 
                                    primary={ag.paciente}
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