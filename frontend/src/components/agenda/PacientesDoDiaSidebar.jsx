import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Paper, List, ListItem, ListItemIcon, ListItemText, CircularProgress, Tooltip, Box, Chip } from '@mui/material';
import { agendamentoService } from '../../services/agendamentoService';

import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import StarIcon from '@mui/icons-material/Star';
import EventNoteIcon from '@mui/icons-material/EventNote';
import DoneIcon from '@mui/icons-material/Done';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';

const statusMap = {
    'Agendado': { icon: <EventNoteIcon />, color: '#1976d2', title: 'Agendado' },
    'Aguardando Pagamento': { icon: <HourglassEmptyIcon />, color: '#ed6c02', title: 'Aguardando Pagamento' },
    'Confirmado': { icon: <CheckCircleIcon />, color: '#2e7d32', title: 'Confirmado (WhatsApp/Tel)' },
    'Cancelado': { icon: <CancelIcon />, color: '#d32f2f', title: 'Cancelado' },
    'Realizado': { icon: <DoneIcon />, color: '#757575', title: 'Realizado/Atendido' },
    'Não Compareceu': { icon: <PersonOffIcon />, color: '#9e9e9e', title: 'Não Compareceu' }
};

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
        <Paper variant="outlined" sx={{ p: 2, height: '100%', overflowY: 'auto', bgcolor: '#fafafa' }}>
            {/* CABEÇALHO COMPACTO: Título e Legenda na mesma linha */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, pb: 1, borderBottom: '1px solid #eee' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: '900', color: '#1C2E4A', lineHeight: 1 }}>
                    Hoje
                </Typography>
                {/* LEGENDA RÁPIDA */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip icon={<StarIcon sx={{ color: '#fbc02d' }}/>} label="1ª Vez" size="small" variant="outlined" sx={{ fontSize: '0.65rem' }}/>
                    <Chip icon={<AssignmentReturnIcon sx={{ color: '#1976d2' }}/>} label="Retorno" size="small" variant="outlined" sx={{ fontSize: '0.65rem' }}/>
                    <Chip icon={<MonetizationOnIcon sx={{ color: '#d32f2f' }}/>} label="Deve" size="small" variant="outlined" sx={{ fontSize: '0.65rem', borderColor: '#d32f2f' }}/>
                </Box>
            </Box>

            {isLoading ? <CircularProgress size={24} sx={{ display: 'block', margin: 'auto', mt: 2 }} /> : (
                <List dense sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 1 }}>
                    {pacientes.length > 0 ? pacientes.map(ag => {
                        const isCancelado = ag.status === 'Cancelado';
                        const statusInfo = statusMap[ag.status] || { icon: <HelpOutlineIcon />, color: '#9e9e9e', title: ag.status };
                        const isRetorno = ag.tipo_visita === 'Retorno';
                        const isDevendo = ag.pagamento_status === 'Pendente';

                        return (
                            <ListItem 
                                key={ag.id} 
                                sx={{ 
                                    py: 1, 
                                    mb: 1, 
                                    border: '1px solid #eee', 
                                    borderRadius: 1,
                                    opacity: isCancelado ? 0.5 : 1,
                                    bgcolor: isCancelado ? '#f5f5f5' : '#fff',
                                    transition: '0.2s',
                                    '&:hover': { bgcolor: '#f0f7ff', transform: 'translateX(2px)' }
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                    <Tooltip title={statusInfo.title} placement="top">
                                        {React.cloneElement(statusInfo.icon, { sx: { color: statusInfo.color, fontSize: 24 } })}
                                    </Tooltip>
                                </ListItemIcon>
                                
                                <ListItemText 
                                    primary={
                                        <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: isCancelado ? '#999' : '#333' }}>
                                            {ag.paciente_nome}
                                        </Typography>
                                    }
                                    secondary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                            <Typography component="span" sx={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#1976d2' }}>
                                                {new Date(ag.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </Typography>
                                            <Typography component="span" sx={{ fontSize: '0.7rem', color: '#666', noWrap: true, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                • {ag.procedimento || 'Consulta'}
                                            </Typography>
                                        </Box>
                                    }
                                />
                                
                                {/* ÍCONES DE STATUS DO PACIENTE */}
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-end' }}>
                                    {ag.primeira_consulta && (
                                        <Tooltip title="Primeira Consulta na Clínica">
                                            <StarIcon sx={{ color: '#fbc02d', fontSize: 18 }} />
                                        </Tooltip>
                                    )}
                                    {isRetorno && (
                                        <Tooltip title="Consulta de Retorno">
                                            <AssignmentReturnIcon sx={{ color: '#1976d2', fontSize: 16 }} />
                                        </Tooltip>
                                    )}
                                    {isDevendo && !isCancelado && (
                                        <Tooltip title="Pagamento Pendente">
                                            <MonetizationOnIcon sx={{ color: '#d32f2f', fontSize: 16 }} />
                                        </Tooltip>
                                    )}
                                </Box>
                            </ListItem>
                        );
                    }) : (
                        <ListItem><ListItemText primary="Nenhum agendamento para hoje." sx={{ color: '#999', textAlign: 'center' }} /></ListItem>
                    )}
                </List>
            )}
        </Paper>
    );
}

export default React.memo(PacientesDoDiaSidebar);