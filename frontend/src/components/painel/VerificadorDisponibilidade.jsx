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

export default React.memo(function VerificadorDisponibilidade({ onSlotSelect }) {
    const [medicos, setMedicos] = useState([]);
    const [especialidades, setEspecialidades] = useState([]);
    
    const [dataSelecionada, setDataSelecionada] = useState(dayjs());
    const [medicoSelecionado, setMedicoSelecionado] = useState('');
    const [especialidadeSelecionada, setEspecialidadeSelecionada] = useState('');
    
    const [horarios, setHorarios] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const { showSnackbar } = useSnackbar();
    const [mensagemRetorno, setMensagemRetorno] = useState('');

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
        setMensagemRetorno('Buscando...'); 
        try {
            const response = await agendamentoService.verificarDisponibilidade({
                data: dataSelecionada.format('YYYY-MM-DD'),
                medicoId: medicoSelecionado,
                especialidadeId: especialidadeSelecionada,
            });

            if (response.data && response.data.status === 'sucesso') {
                setHorarios(response.data.horarios);
                if (response.data.horarios.length === 0) {
                    setMensagemRetorno('Não há horários disponíveis para esta seleção.');
                }
            } else {
                setHorarios([]);
                setMensagemRetorno(response.data.motivo || 'Nenhum horário disponível para a seleção.');
            }
        } catch (error) {
            showSnackbar('Erro ao buscar horários disponíveis.', 'error');
            setMensagemRetorno('Ocorreu um erro ao conectar com o servidor.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSlotClick = (horario) => {
        const [hora, minuto] = horario.split(':');
        const dataHoraInicio = dataSelecionada.hour(hora).minute(minuto);
        const medicoObj = medicos.find(m => m.id === medicoSelecionado) || null;
        const especialidadeObj = especialidades.find(e => e.id === especialidadeSelecionada) || null;

        onSlotSelect({
            medico: medicoObj,
            especialidade: especialidadeObj,
            data_hora_inicio: dataHoraInicio,
        });
    };

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Verificar Disponibilidade</Typography>
            
            {/* O Grid principal agora divide o espaço em duas grandes colunas */}
            <Grid container spacing={2}>

                {/* --- Coluna de Filtros (7/12 do espaço) --- */}
                <Grid item xs={12} md={7}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={4}>
                            <DatePicker label="Data" value={dataSelecionada} onChange={setDataSelecionada} sx={{ width: '100%' }} slotProps={{ textField: { size: 'small' } }} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Especialidade</InputLabel>
                                <Select value={especialidadeSelecionada} label="Especialidade" onChange={(e) => setEspecialidadeSelecionada(e.target.value)}>
                                    {especialidades.map((esp) => (<MenuItem key={esp.id} value={esp.id}>{esp.nome}</MenuItem>))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth required size="small">
                                <InputLabel>Médico</InputLabel>
                                <Select value={medicoSelecionado} label="Médico" onChange={(e) => setMedicoSelecionado(e.target.value)}>
                                    {medicos.map((med) => (<MenuItem key={med.id} value={med.id}>{med.first_name} {med.last_name}</MenuItem>))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <Button onClick={handleSearch} variant="contained" disabled={isLoading} fullWidth>
                                {isLoading ? <CircularProgress size={24} /> : 'Buscar'}
                            </Button>
                        </Grid>
                    </Grid>
                </Grid>

                {/* --- Coluna de Resultados (5/12 do espaço) --- */}
                <Grid item xs={12} md={5}>
                    <Box sx={{ height: '100%' }}>
                        <Typography variant="overline">Horários Disponíveis</Typography>
                        <Paper variant="outlined" sx={{ p: 1, mt: 1, height: 'calc(100% - 24px)', overflowY: 'auto', backgroundColor: '#fdfdfd' }}>
                            {isLoading ? <CircularProgress size={24} /> : 
                                horarios.length > 0 ? (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {horarios.map((horario, index) => (
                                            <Chip 
                                                key={index} 
                                                label={horario} 
                                                onClick={() => handleSlotClick(horario)} 
                                                color="primary" 
                                                size="small" // <-- Chips menores
                                                sx={{ cursor: 'pointer' }}
                                            />
                                        ))}
                                    </Box>
                                ) : (
                                    <Typography color="text.secondary" variant="body2">{mensagemRetorno}</Typography>
                                )
                            }
                        </Paper>
                    </Box>
                </Grid>
            </Grid>
        </Paper>
    );
});