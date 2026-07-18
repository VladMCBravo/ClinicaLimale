// src/components/painel/ListaEspera.jsx
import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, List, ListItem, ListItemButton,
    ListItemIcon, ListItemText, CircularProgress
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
        <Paper variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* CABEÇALHO — título e contagem na mesma linha, pra economizar espaço */}
            <Box sx={{ px: 1.5, py: 0.9, borderBottom: '1px solid #eee', bgcolor: '#fff', display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
                <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: '#1C2E4A', lineHeight: 1.3, whiteSpace: 'nowrap' }}>
                    Lista de Espera
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', color: '#666', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {lista.length} {lista.length === 1 ? 'paciente aguardando' : 'pacientes aguardando'}
                </Typography>
            </Box>
            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
                    <CircularProgress size={24} />
                </Box>
            ) : (
                <Box sx={{ overflowY: 'auto', flexGrow: 1, p: 1 }}>
                    {lista.length > 0 ? (
                        <List dense>
                            {lista.map(ag => (
                                <ListItem key={ag.id} disablePadding>
                                    <ListItemButton onClick={() => onAgendamentoSelect(ag)}>
                                        <ListItemIcon sx={{ minWidth: 32 }}>
                                            <EventBusyIcon color="warning" />
                                        </ListItemIcon>
                                        <ListItemText
    primary={<Typography variant="body2" sx={{ fontWeight: 600 }}>{ag.paciente_nome}</Typography>}
    secondary={
        <Typography variant="caption" display="block" color="text.secondary">
           {new Date(ag.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {ag.procedimento_descricao || 'Consulta'}
        </Typography>
    }
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