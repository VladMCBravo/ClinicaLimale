// src/pages/PainelMedico/FilaDeAtendimento.jsx - VERSÃO CORRIGIDA

import React, { useState, useEffect } from 'react';
import { Typography, Paper, List, ListItem, ListItemText, CircularProgress, ListItemButton } from '@mui/material';
import { agendamentoService } from '../../services/agendamentoService';

export default function FilaDeAtendimento({ onPacienteSelect }) {
    const [agendamentos, setAgendamentos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAgenda = async () => {
            setIsLoading(true);
            try {
                const response = await agendamentoService.getMinhaAgenda();
                setAgendamentos(response.data);
            } catch (error) {
                console.error("Erro ao buscar a agenda do médico:", error);
                setAgendamentos([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAgenda();
    }, []);

    return (
        <Paper variant="outlined" sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
            <Typography variant="h6" gutterBottom>Fila de Atendimento</Typography>
            {isLoading ? (
                <CircularProgress size={24} sx={{ display: 'block', margin: 'auto', mt: 2 }} />
            ) : (
                <List dense>
                    {agendamentos.length > 0 ? agendamentos.map(ag => (
                        <ListItem key={ag.id} disablePadding>
                            <ListItemButton onClick={() => onPacienteSelect(ag)}>
                                <ListItemText 
                                    primary={ag.paciente_nome}
                                    secondary={
                                        <>
                                            {new Date(ag.data_hora_inicio).toLocaleDateString('pt-BR')}
                                            {' - '}
                                            {new Date(ag.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            <br />
                                            <Typography component="span" variant="body2" color="text.secondary">
                                                {ag.tipo_visita || 'Consulta'}
                                            </Typography>
                                        </>
                                    }
                                />
                            </ListItemButton>
                        </ListItem>
                    )) : (
                        <ListItem>
                            <ListItemText primary="Nenhum agendamento para hoje." />
                        </ListItem>
                    )}
                </List>
            )}
        </Paper>
    );
}