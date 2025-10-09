// src/components/painel/ListaEspera.jsx
import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, List, ListItem, ListItemButton,
    ListItemIcon, ListItemText, CircularProgress, Divider
} from '@mui/material';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import { agendamentoService } from '../../services/agendamentoService';

export default function ListaEspera({ onAgendamentoSelect, refreshTrigger }) {
    const [lista, setLista] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        agendamentoService.getListaEspera()
            .then(response => {
                setLista(response.data);
            })
            .catch(error => {
                console.error("Erro ao buscar lista de espera:", error);
                setLista([]); // Limpa a lista em caso de erro
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [refreshTrigger]); // Atualiza a lista quando o refreshTrigger mudar

    return (
        <Paper variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>Lista de Espera</Typography>
            <Divider sx={{ mb: 1 }} />
            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
                    <CircularProgress size={24} />
                </Box>
            ) : (
                <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
                    {lista.length > 0 ? (
                        <List dense>
                            {lista.map(ag => (
                                <ListItem key={ag.id} disablePadding>
                                    <ListItemButton onClick={() => onAgendamentoSelect(ag)}>
                                        <ListItemIcon sx={{ minWidth: 32 }}>
                                            <EventBusyIcon color="warning" />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={ag.paciente_nome}
                                            secondary={`Para: ${new Date(ag.data_hora_inicio).toLocaleDateString('pt-BR')} às ${new Date(ag.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    ) : (
                        <Typography variant="body2" sx={{ textAlign: 'center', mt: 2, color: 'text.secondary' }}>
                            Nenhum paciente aguardando no momento.
                        </Typography>
                    )}
                </Box>
            )}
        </Paper>
    );
}