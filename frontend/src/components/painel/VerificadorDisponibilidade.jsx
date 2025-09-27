// src/components/painel/VerificadorDisponibilidade.jsx
import React, { useState, useEffect } from 'react';
import {
    Paper, Typography, Box, Grid, FormControl, InputLabel, Select, MenuItem, Button, CircularProgress, Chip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import apiClient from '../../api/axiosConfig';
import { agendamentoService } from '../../services/agendamentoService';
import { useSnackbar } from '../../contexts/SnackbarContext';

export default function VerificadorDisponibilidade({ onSlotSelect, onClose }) {
    const [medicos, setMedicos] = useState([]);
    const [especialidades, setEspecialidades] = useState([]);
    
    const [dataSelecionada, setDataSelecionada] = useState(dayjs());
    const [medicoSelecionado, setMedicoSelecionado] = useState('');
    const [especialidadeSelecionada, setEspecialidadeSelecionada] = useState('');
    
    const [horarios, setHorarios] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const { showSnackbar } = useSnackbar();

    useEffect(() => {
        const fetchFiltroData = async () => {
            try {
                const [medicosRes, especialidadesRes] = await Promise.all([
                    apiClient.get('/usuarios/usuarios/?cargo=medico'),
                    apiClient.get('/usuarios/especialidades/')
                ]);
                setMedicos(medicosRes.data);
                setEspecialidades(especialidadesRes.data);
            } catch (error) {
                console.error("Erro ao buscar dados para filtros:", error);
            }
        };
        fetchFiltroData();
    }, []);

    const handleSearch = async () => {
        if (!dataSelecionada || !medicoSelecionado) {
            showSnackbar('Por favor, selecione uma data e um médico.', 'warning');
            return;
        }
        setIsLoading(true);
        setHorarios([]);
        try {
            const response = await agendamentoService.verificarDisponibilidade({
                data: dataSelecionada.format('YYYY-MM-DD'),
                medicoId: medicoSelecionado,
                especialidadeId: especialidadeSelecionada,
            });
            setHorarios(response.data);
        } catch (error) {
            showSnackbar('Erro ao buscar horários disponíveis.', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSlotClick = (horario) => {
        const [hora, minuto] = horario.split(':');
        const dataHoraInicio = dataSelecionada.hour(hora).minute(minuto);
        onSlotSelect({
            medico: medicos.find(m => m.id === medicoSelecionado),
            especialidade: especialidades.find(e => e.id === especialidadeSelecionada),
            data_hora_inicio: dataHoraInicio,
        });
    };

    return (
        <Paper variant="outlined" sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Verificar Disponibilidade de Horários</Typography>
                <Button onClick={onClose}>Voltar para Agenda</Button>
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                    <DatePicker label="Data" value={dataSelecionada} onChange={setDataSelecionada} sx={{ width: '100%' }} />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <FormControl fullWidth>
                        <InputLabel>Especialidade</InputLabel>
                        <Select value={especialidadeSelecionada} label="Especialidade" onChange={(e) => setEspecialidadeSelecionada(e.target.value)}>
                            {especialidades.map((esp) => (<MenuItem key={esp.id} value={esp.id}>{esp.nome}</MenuItem>))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                     <FormControl fullWidth required>
                        <InputLabel>Médico</InputLabel>
                        <Select value={medicoSelecionado} label="Médico" onChange={(e) => setMedicoSelecionado(e.target.value)}>
                            {medicos.map((med) => (<MenuItem key={med.id} value={med.id}>{med.first_name} {med.last_name}</MenuItem>))}
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>

            <Button onClick={handleSearch} variant="contained" disabled={isLoading} sx={{ mb: 3 }}>
                {isLoading ? <CircularProgress size={24} /> : 'Buscar Horários'}
            </Button>

            <Typography variant="overline">Horários Disponíveis</Typography>
            <Paper variant="outlined" sx={{ flexGrow: 1, p: 2, overflowY: 'auto' }}>
                {horarios.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {horarios.map((horario, index) => (
                            <Chip key={index} label={horario} onClick={() => handleSlotClick(horario)} color="primary" sx={{ cursor: 'pointer' }}/>
                        ))}
                    </Box>
                ) : (
                    <Typography color="text.secondary">Nenhum horário disponível para a seleção.</Typography>
                )}
            </Paper>
        </Paper>
    );
}