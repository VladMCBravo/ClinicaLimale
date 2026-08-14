// src/pages/PainelMedico/FilaDeAtendimento.jsx - VERSÃO CORRIGIDA

import React, { useState, useEffect } from 'react';
import { Typography, Paper, List, ListItem, ListItemText, CircularProgress, ListItemButton, Box, Chip } from '@mui/material';
import MedicalInformationIcon from '@mui/icons-material/MedicalInformation';
import { agendamentoService } from '../../services/agendamentoService';
import { formatarHoraTZ, formatarDataTZ } from '../../utils/format';

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

    // --- COLE ISTO ANTES DO return ---
    const agendamentosAgrupados = agendamentos.reduce((acc, ag) => {
        const dataStr = formatarDataTZ(ag.data_hora_inicio);
        if (!acc[dataStr]) acc[dataStr] = [];
        acc[dataStr].push(ag);
        return acc;
    }, {});
    const hojeStr = formatarDataTZ(new Date().toISOString());

    return (
        <Paper variant="outlined" sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
            <Typography variant="h6" gutterBottom>Fila de Atendimento</Typography>
            {isLoading ? (
                <CircularProgress size={24} sx={{ display: 'block', margin: 'auto', mt: 2 }} />
            ) : (
                <List disablePadding sx={{ px: 1 }}>
                    {Object.keys(agendamentosAgrupados).length > 0 ? (
                        Object.entries(agendamentosAgrupados).map(([dataStr, lista]) => (
                            <React.Fragment key={dataStr}>
                                {/* Cabeçalho da Data (Mantendo o seu CSS corporativo do Painel) */}
                                <Typography sx={{ 
                                    bgcolor: '#f8f9fa', px: 1.5, py: 0.75, mt: 1, mb: 0.5,
                                    fontSize: '0.75rem', fontWeight: 700, color: '#495057', 
                                    textTransform: 'uppercase', borderBottom: '1px solid #e9ecef', borderRadius: 1
                                }}>
                                    {dataStr === hojeStr ? `Hoje - ${dataStr}` : dataStr}
                                </Typography>

                                {/* Lista de pacientes daquele dia */}
                                {lista.map(ag => {
                                    const isRetorno = ag.tipo_visita === 'Retorno' || !ag.primeira_consulta;
                                    return (
                                        <ListItem key={ag.id} disablePadding sx={{ mb: 0.5, border: '1px solid #e9ecef', borderRadius: '4px', overflow: 'hidden', bgcolor: '#fff' }}>
                                            <ListItemButton onClick={() => onPacienteSelect(ag)} sx={{ py: 0.75, px: 1, borderLeft: '3px solid #1c7ed6', '&:hover': { bgcolor: '#f8fbff' } }}>
                                                <Box sx={{ width: '100%' }}>
                                                    {/* Primeira Linha: Hora, Nome e Badge */}
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#1C2E4A' }}>
                                                            {formatarHoraTZ(ag.data_hora_inicio)} - {ag.paciente_nome}
                                                        </Typography>
                                                        <Chip 
                                                            label={isRetorno ? "Retorno" : "1ª Vez"} 
                                                            size="small" 
                                                            sx={{ height: 16, fontSize: '0.55rem', fontWeight: 600, bgcolor: isRetorno ? '#e3f2fd' : '#fff8e1', color: isRetorno ? '#1565c0' : '#f57f17' }} 
                                                        />
                                                    </Box>
                                                    {/* Segunda Linha: Procedimento */}
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <MedicalInformationIcon sx={{ fontSize: 13, color: '#868e96' }} />
                                                        <Typography sx={{ fontSize: '0.65rem', color: '#495057', noWrap: true, textOverflow: 'ellipsis' }}>
                                                            {ag.procedimento_descricao || ag.especialidade_nome || ag.procedimento || 'Consulta'}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </ListItemButton>
                                        </ListItem>
                                    );
                                })}
                            </React.Fragment>
                        ))
                    ) : (
                        <ListItem>
                            <ListItemText primary="Nenhum agendamento para hoje ou próximos dias." primaryTypographyProps={{ fontSize: '0.8rem', color: '#666', textAlign: 'center' }} />
                        </ListItem>
                    )}
                </List>
            )}
        </Paper>
    );
}