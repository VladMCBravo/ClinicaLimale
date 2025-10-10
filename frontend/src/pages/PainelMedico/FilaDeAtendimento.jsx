// src/pages/PainelMedico/FilaDeAtendimento.jsx

import React, { useState, useEffect } from 'react';
import { Typography, Paper, List, ListItem, ListItemText, CircularProgress, ListItemButton } from '@mui/material';
import { agendamentoService } from '../../services/agendamentoService'; // Importamos nosso service

export default function FilaDeAtendimento({ onPacienteSelect }) {
    const [agendamentos, setAgendamentos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Função para buscar os dados da API
        const fetchAgenda = async () => {
            setIsLoading(true);
            try {
                // Usando a nova função do service que criamos no Passo 2
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
    }, []); // O array vazio faz com que isso rode apenas uma vez, quando o componente é montado.

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
                                    secondary={new Date(ag.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                />
                            </ListItemButton>
                        </ListItem>
                    )) : (
                        <ListItem><ListItemText primary="Nenhum agendamento para hoje." /></ListItem>
                    )}
                </List>
            )}
        </Paper>
    );
}