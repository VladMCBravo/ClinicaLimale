// src/components/agenda/PacientesDoDiaSidebar.jsx - VERSÃO FINAL E COMPLETA
import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Paper, List, ListItem, ListItemIcon, ListItemText, CircularProgress, Tooltip } from '@mui/material';
import { agendamentoService } from '../../services/agendamentoService'; // <-- ADICIONADO

// --- IMPORTAÇÃO COMPLETA DE ÍCONES ---
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'; // <-- ADICIONE ESTA IMPORTAÇÃO
import CheckCircleIcon from '@mui/icons-material/CheckCircle';      // Confirmado
import CancelIcon from '@mui/icons-material/Cancel';                  // Cancelado
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';          // Status Desconhecido
import StarIcon from '@mui/icons-material/Star';                      // Primeira Consulta
import EventNoteIcon from '@mui/icons-material/EventNote';          // Agendado
import DoneIcon from '@mui/icons-material/Done';                      // Realizado
import PersonOffIcon from '@mui/icons-material/PersonOff';            // Não Compareceu

// --- MAPEAMENTO DE STATUS COMPLETO E CORRETO ---
const statusMap = {
    'Agendado': { icon: <EventNoteIcon />, color: 'info.main', title: 'Agendado' },
    'Aguardando Pagamento': { icon: <HourglassEmptyIcon />, color: 'warning.main', title: 'Aguardando Pagamento' }, // <-- ADICIONE ESTA LINHA
    'Confirmado': { icon: <CheckCircleIcon />, color: 'success.main', title: 'Confirmado' },
    'Cancelado': { icon: <CancelIcon />, color: 'error.main', title: 'Cancelado' },
    'Realizado': { icon: <DoneIcon />, color: 'action.active', title: 'Realizado' },
    'Não Compareceu': { icon: <PersonOffIcon />, color: 'text.secondary', title: 'Não Compareceu' }
};

export default function PacientesDoDiaSidebar({ refreshTrigger }) {
    const [pacientes, setPacientes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPacientesDoDia = useCallback(async () => {
    try {
        // USA A NOVA FUNÇÃO DO SERVIÇO
       const response = await agendamentoService.getAgendamentosHoje();
            
            // --- ALTERAÇÃO PRINCIPAL: ORDENAÇÃO DOS DADOS NO FRONTEND ---
            // Isso garante que o React renderize todos os itens na ordem cronológica correta.
            const dadosOrdenados = response.data.sort((a, b) => 
                new Date(a.data_hora_inicio) - new Date(b.data_hora_inicio)
            );
            setPacientes(dadosOrdenados);

        } catch (error) {
            console.error("Erro ao buscar pacientes do dia:", error);
            setPacientes([]); // Limpa a lista em caso de erro
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPacientesDoDia();
    }, [fetchPacientesDoDia, refreshTrigger]);

    return (
        <Paper elevation={2} sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
            <Typography variant="h6" gutterBottom>Pacientes do Dia</Typography>
            {isLoading ? <CircularProgress /> : (
                <List dense>
                    {pacientes.length > 0 ? pacientes.map(ag => {
                        const statusInfo = statusMap[ag.status] || { icon: <HelpOutlineIcon />, color: 'text.secondary', title: ag.status };
                        return (
                            <ListItem key={ag.id}>
                                <ListItemIcon>
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