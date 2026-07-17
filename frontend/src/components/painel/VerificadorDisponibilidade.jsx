// src/components/painel/VerificadorDisponibilidade.jsx
import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, TextField, Button, CircularProgress, 
    Divider, Alert, Autocomplete, Chip, Stack 
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/pt-br';
import dayjs from 'dayjs';

import SearchIcon from '@mui/icons-material/Search';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

import apiClient from '../../api/axiosConfig';

export default function VerificadorDisponibilidade({ onSlotSelect }) {
    // ESTADOS
    const [dataSelecionada, setDataSelecionada] = useState(dayjs());
    const [medicos, setMedicos] = useState([]);
    const [especialidades, setEspecialidades] = useState([]);
    
    const [medicoSelecionado, setMedicoSelecionado] = useState(null);
    const [especialidadeSelecionada, setEspecialidadeSelecionada] = useState(null);
    
    // RESULTADOS
    const [diasDisponiveis, setDiasDisponiveis] = useState([]);
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState('Selecione um médico e busque.');

    // Carrega médicos e especialidades ao abrir
    useEffect(() => {
        apiClient.get('/usuarios/usuarios/?cargo=medico&apenas_ativos=true')
            .then(res => setMedicos(res.data.results || res.data || []))
            .catch(err => console.error("Erro ao buscar médicos", err));
            
        // Ajuste a rota de especialidades conforme o seu backend
        apiClient.get('/usuarios/especialidades/')
            .then(res => setEspecialidades(res.data.results || res.data || []))
            .catch(err => console.error("Erro ao buscar especialidades", err));
    }, []);

    const buscarDisponibilidade = async () => {
        if (!medicoSelecionado) {
            setFeedback("Por favor, selecione um médico.");
            return;
        }

        setLoading(true);
        setDiasDisponiveis([]);
        setFeedback("Mapeando a agenda...");

        try {
            // Chama a API que construímos, passando o médico e o mês/dia inicial
            const res = await apiClient.get('/agendamentos/horarios-disponiveis/', {
                params: {
                    medico_id: medicoSelecionado.id,
                    data: dataSelecionada.format('YYYY-MM-DD')
                }
            });

            const dadosAPI = res.data || [];
            setDiasDisponiveis(dadosAPI);
            
            if (dadosAPI.length === 0) {
                setFeedback("Nenhum horário livre encontrado nas próximas semanas.");
            } else {
                setFeedback("");
            }

        } catch (error) {
            console.error(error);
            setFeedback("Erro ao carregar agenda.");
        } finally {
            setLoading(false);
        }
    };

    // Formatação de data visual Ex: "Segunda, 27/04"
    const formatarDataDia = (dataStr) => {
        return dayjs(dataStr, 'YYYY-MM-DD').format('dddd, DD/MM');
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%', p: 1 }}>
                
                <Typography variant="h6" sx={{ color: '#1C2E4A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SearchIcon /> Buscar Horário
                </Typography>
                <Divider />

                <Stack spacing={2}>
                    {/* Filtro 1: Médico (Obrigatório) */}
                    <Autocomplete
                        size="small"
                        options={medicos}
                        getOptionLabel={(o) => o.first_name ? `${o.first_name} ${o.last_name}` : o.username}
                        value={medicoSelecionado}
                        onChange={(e, v) => { setMedicoSelecionado(v); setDiasDisponiveis([]); }}
                        renderInput={(params) => <TextField {...params} label="Selecione o Médico *" />}
                    />

                    {/* Filtro 2: Especialidade (Opcional - Apenas visual) */}
                    <Autocomplete
                        size="small"
                        options={especialidades}
                        getOptionLabel={(o) => o.nome || ''}
                        value={especialidadeSelecionada}
                        onChange={(e, v) => setEspecialidadeSelecionada(v)}
                        renderInput={(params) => <TextField {...params} label="Especialidade (Opcional)" helperText="Não bloqueia a busca."/>}
                    />

                    {/* Filtro 3: Data Inicial */}
                    <DatePicker
                        label="Buscar a partir de:"
                        value={dataSelecionada}
                        onChange={(newValue) => { 
                            setDataSelecionada(newValue); 
                            setDiasDisponiveis([]); 
                        }}
                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                    />

                    <Button 
                        variant="contained" 
                        onClick={buscarDisponibilidade}
                        disabled={loading || !medicoSelecionado}
                        fullWidth
                        sx={{ bgcolor: '#1C2E4A', fontWeight: 'bold' }}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Ver Disponibilidade'}
                    </Button>
                </Stack>

                <Divider sx={{ my: 1 }} />

                {/* RESULTADOS DA BUSCA */}
                <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                    {feedback && <Alert severity="info" sx={{ mt: 1 }}>{feedback}</Alert>}

                    {diasDisponiveis.map((diaInfo, idx) => (
                        <Box key={idx} sx={{ mb: 3 }}>
                            <Typography variant="subtitle2" sx={{ color: '#37474f', fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5, textTransform: 'capitalize' }}>
                                <CalendarTodayIcon fontSize="inherit" color="primary" /> {formatarDataDia(diaInfo.data)}
                            </Typography>
                            
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {diaInfo.horarios_disponiveis.map((horario, hIdx) => (
                                    <Chip
                                        key={hIdx}
                                        label={horario}
                                        icon={<AccessTimeIcon fontSize="small"/>}
                                        onClick={() => {
                                            // Envia o payload exato que o AgendamentoModal entende no "initialData"
                                            const startString = `${diaInfo.data}T${horario}:00`;
                                            onSlotSelect({
                                                start: startString,
                                                medicoId: medicoSelecionado.id,
                                                especialidadeId: especialidadeSelecionada ? especialidadeSelecionada.id : null
                                            });
                                        }}
                                        color="primary"
                                        variant="outlined"
                                        sx={{ 
                                            cursor: 'pointer', fontWeight: 'bold', 
                                            '&:hover': { bgcolor: '#1976d2', color: '#fff' } 
                                        }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    ))}
                </Box>
            </Box>
        </LocalizationProvider>
    );
}