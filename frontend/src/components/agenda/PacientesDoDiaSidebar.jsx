import React, { useState, useEffect, useCallback } from 'react';
import { 
    Typography, Paper, List, ListItem, CircularProgress, 
    Tooltip, Box, IconButton, Divider, Chip
} from '@mui/material';
import { agendamentoService } from '../../services/agendamentoService';

// Ícones
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import StarIcon from '@mui/icons-material/Star';
import DoneIcon from '@mui/icons-material/Done';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import PrintIcon from '@mui/icons-material/Print';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MedicalInformationIcon from '@mui/icons-material/MedicalInformation';

const statusMap = {
    'Agendado': { icon: <AccessTimeIcon />, color: '#1976d2', title: 'Agendado' },
    'Aguardando Pagamento': { icon: <HourglassEmptyIcon />, color: '#ed6c02', title: 'Aguardando Pagamento' },
    'Confirmado': { icon: <CheckCircleIcon />, color: '#2e7d32', title: 'Confirmado (WhatsApp/Tel)' },
    'Cancelado': { icon: <CancelIcon />, color: '#d32f2f', title: 'Cancelado' },
    'Realizado': { icon: <DoneIcon />, color: '#757575', title: 'Realizado/Atendido' },
    'Não Compareceu': { icon: <PersonOffIcon />, color: '#9e9e9e', title: 'Não Compareceu' }
};

function PacientesDoDiaSidebar({ refreshTrigger, medicoFiltro }) {
    const [pacientes, setPacientes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });

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

    // Função para gerar a impressão
    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        const dataFormatada = new Date().toLocaleDateString('pt-BR');
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Agenda do Dia - ${dataFormatada}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
                    .header { display: flex; align-items: center; border-bottom: 2px solid #1C2E4A; padding-bottom: 15px; margin-bottom: 20px; }
                    /* Substitua o src abaixo pelo caminho real da sua logo. Ex: /assets/logo.png ou uma URL */
                    .logo { height: 60px; margin-right: 20px; object-fit: contain; }
                    .title-box h2 { margin: 0; color: #1C2E4A; }
                    .title-box p { margin: 5px 0 0 0; color: #666; font-size: 14px; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                    th { background-color: #f4f6f8; color: #1C2E4A; font-weight: bold; }
                    tr:nth-child(even) { background-color: #fafafa; }
                    .status { font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="https://via.placeholder.com/150x60?text=Logo+Clinica" alt="Logo da Clínica" class="logo" />
                    <div class="title-box">
                        <h2>Relação de Pacientes do Dia</h2>
                        <p>Data: <strong>${dataFormatada}</strong> | Total: ${pacientes.length} pacientes</p>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th width="80">Horário</th>
                            <th>Paciente</th>
                            <th width="100">Tipo</th>
                            <th>Procedimento / Especialidade</th>
                            <th width="120">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pacientes.map(ag => `
                            <tr>
                                <td><strong>${new Date(ag.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong></td>
                                <td>${ag.paciente_nome}</td>
                                <td>${ag.primeira_consulta ? '1ª Vez' : (ag.tipo_visita || 'Retorno')}</td>
                                <td>${ag.procedimento || ag.especialidade || 'Consulta Padrão'}</td>
                                <td class="status">${ag.status}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        
        // Aguarda um instante para a imagem (logo) carregar antes de chamar o print
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    return (
        <Paper variant="outlined" sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#fdfdfd', border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            
            {/* CABEÇALHO FIXO */}
            <Box sx={{ p: 1.5, borderBottom: '1px solid #eee', bgcolor: '#fff', borderRadius: '8px 8px 0 0' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: '800', color: '#1C2E4A', lineHeight: 1.2 }}>
                            Agenda Hoje
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#666', textTransform: 'capitalize' }}>
                            {hoje} • {pacientes.length} agendamentos
                        </Typography>
                    </Box>
                    <Tooltip title="Imprimir Relação do Dia">
                        <IconButton size="small" onClick={handlePrint} sx={{ color: '#1976d2', bgcolor: '#f0f7ff' }}>
                            <PrintIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* LISTA ROLÁVEL */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
                {isLoading ? (
                    <CircularProgress size={24} sx={{ display: 'block', margin: '20px auto' }} />
                ) : (
                    <List disablePadding sx={{ width: '100%' }}>
                        {pacientes.length > 0 ? pacientes.map(ag => {
                            const isCancelado = ag.status === 'Cancelado';
                            const statusInfo = statusMap[ag.status] || { icon: <HelpOutlineIcon />, color: '#9e9e9e', title: ag.status };
                            const isRetorno = ag.tipo_visita === 'Retorno' || !ag.primeira_consulta;
                            const isDevendo = ag.pagamento_status === 'Pendente';

                            return (
                                <ListItem 
                                    key={ag.id} 
                                    sx={{ 
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'stretch',
                                        p: 1.2, 
                                        mb: 1, 
                                        bgcolor: isCancelado ? '#f9f9f9' : '#fff',
                                        borderRadius: 2,
                                        border: '1px solid #f0f0f0',
                                        borderLeft: `4px solid ${isCancelado ? '#e0e0e0' : statusInfo.color}`,
                                        opacity: isCancelado ? 0.6 : 1,
                                        transition: 'all 0.2s',
                                        '&:hover': { bgcolor: '#f8fbff', transform: 'translateY(-1px)', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }
                                    }}
                                >
                                    {/* LINHA 1: Horário, Nome e Ícone Status */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                            <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: isCancelado ? '#999' : '#1C2E4A' }}>
                                                {new Date(ag.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </Typography>
                                            <Typography sx={{ fontWeight: 600, fontSize: '0.8rem', color: isCancelado ? '#999' : '#333', noWrap: true, maxWidth: '140px' }}>
                                                {ag.paciente_nome}
                                            </Typography>
                                        </Box>
                                        <Tooltip title={statusInfo.title} placement="left">
                                            {React.cloneElement(statusInfo.icon, { sx: { color: statusInfo.color, fontSize: 18 } })}
                                        </Tooltip>
                                    </Box>

                                    {/* LINHA 2: Detalhes (Primeira Vez/Retorno, Procedimento) */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <MedicalInformationIcon sx={{ fontSize: 14, color: '#78909c' }} />
                                            <Typography sx={{ fontSize: '0.7rem', color: '#546e7a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '130px' }}>
                                                {ag.procedimento || ag.especialidade || 'Consulta'}
                                            </Typography>
                                        </Box>

                                        {/* Ícones de Alerta / Tags Menores */}
                                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                            {ag.primeira_consulta ? (
                                                <Chip label="1ª Vez" size="small" sx={{ height: '16px', fontSize: '0.6rem', bgcolor: '#fff8e1', color: '#f57f17', border: '1px solid #ffe082' }} />
                                            ) : (
                                                <Tooltip title="Retorno">
                                                    <AssignmentReturnIcon sx={{ color: '#90caf9', fontSize: 15 }} />
                                                </Tooltip>
                                            )}
                                            
                                            {isDevendo && !isCancelado && (
                                                <Tooltip title="Pagamento Pendente">
                                                    <MonetizationOnIcon sx={{ color: '#d32f2f', fontSize: 15 }} />
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </Box>
                                </ListItem>
                            );
                        }) : (
                            <Typography sx={{ color: '#999', textAlign: 'center', fontSize: '0.8rem', mt: 4 }}>
                                Nenhum agendamento para hoje.
                            </Typography>
                        )}
                    </List>
                )}
            </Box>
        </Paper>
    );
}

export default React.memo(PacientesDoDiaSidebar);