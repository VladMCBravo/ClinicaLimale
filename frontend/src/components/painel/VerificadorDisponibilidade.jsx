// src/components/painel/VerificadorDisponibilidade.jsx
import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, TextField, Button, CircularProgress, 
    Divider, Alert, Autocomplete, Chip, Stack 
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
// MUDANÇA: Usando AdapterDayjs para evitar erros de versão do date-fns
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/pt-br'; // Importação do idioma é simples e direta
import dayjs from 'dayjs';

import SearchIcon from '@mui/icons-material/Search';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

import apiClient from '../../api/axiosConfig';
import { agendamentoService } from '../../services/agendamentoService';

export default function VerificadorDisponibilidade({ onSlotSelect }) {
    // ESTADOS
    // Inicializa com dayjs() em vez de new Date()
    const [dataSelecionada, setDataSelecionada] = useState(dayjs());
    const [medicos, setMedicos] = useState([]);
    const [medicoSelecionado, setMedicoSelecionado] = useState(null);
    
    // RESULTADOS
    const [horariosLivres, setHorariosLivres] = useState([]);
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState('Selecione Data e Médico para buscar.');

    // Carrega médicos ao abrir
    useEffect(() => {
        apiClient.get('/usuarios/usuarios/?cargo=medico')
            .then(res => setMedicos(res.data.results || res.data || []))
            .catch(err => console.error("Erro médicos", err));
    }, []);

    const buscarDisponibilidade = async () => {
        if (!medicoSelecionado) {
            setFeedback("Por favor, selecione um médico.");
            return;
        }

        setLoading(true);
        setHorariosLivres([]);
        setFeedback("Buscando agenda...");

        try {
            // 1. Pega todos os agendamentos do médico
            const res = await agendamentoService.getAgendamentos(medicoSelecionado.id, '');
            const agendamentos = res.data || [];

            // 2. Filtra agendamentos DO DIA escolhido
            // dayjs facilita a formatação: YYYY-MM-DD
            const diaAlvoStr = dataSelecionada.format('YYYY-MM-DD'); 
            
            const ocupados = agendamentos.filter(ag => {
                // A API geralmente retorna YYYY-MM-DDTHH:mm:ss
                const dataAg = ag.data_hora_inicio.split('T')[0];
                return dataAg === diaAlvoStr && ag.status !== 'Cancelado';
            });

            // 3. Gera slots de 30 em 30 min (das 08:00 às 18:00)
            const slotsLivres = [];
            let hora = 8; 
            let min = 0;
            const fimHora = 18; 

            // Vamos manipular um objeto dayjs para calcular os slots
            // .startOf('day') zera a hora para 00:00, depois setamos 8h
            let currentSlot = dataSelecionada.hour(8).minute(0).second(0);

            while (hora < fimHora) {
                // Verifica colisão
                const isOcupado = ocupados.some(ag => {
                    // Converte string da API para objeto Date para pegar hora/min
                    const agDate = new Date(ag.data_hora_inicio);
                    // Como estamos em fuso local, cuidado. Mas assumindo consistência:
                    return agDate.getHours() === hora && agDate.getMinutes() === min;
                });

                if (!isOcupado) {
                    slotsLivres.push({
                        label: currentSlot.format('HH:mm'), // Ex: "08:30"
                        // .toDate() converte para JS Date padrão para passar pro onSlotSelect
                        date: currentSlot.toDate() 
                    });
                }

                // Incrementa 30 min
                currentSlot = currentSlot.add(30, 'minute');
                hora = currentSlot.hour();
                min = currentSlot.minute();
            }

            setHorariosLivres(slotsLivres);
            if (slotsLivres.length === 0) setFeedback("Agenda cheia para este dia.");
            else setFeedback("");

        } catch (error) {
            console.error(error);
            setFeedback("Erro ao carregar agenda.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
                
                <Typography variant="h6" sx={{ color: '#1C2E4A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SearchIcon /> Buscar Horário
                </Typography>
                <Divider />

                <Stack spacing={2}>
                    <DatePicker
                        label="Data"
                        value={dataSelecionada}
                        onChange={(newValue) => { 
                            setDataSelecionada(newValue); 
                            setHorariosLivres([]); 
                            setFeedback("Clique em buscar."); 
                        }}
                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                    />

                    <Autocomplete
                        size="small"
                        options={medicos}
                        getOptionLabel={(o) => o.first_name ? `${o.first_name} ${o.last_name}` : o.username}
                        value={medicoSelecionado}
                        onChange={(e, v) => { setMedicoSelecionado(v); setHorariosLivres([]); }}
                        renderInput={(params) => <TextField {...params} label="Selecione o Médico" />}
                    />

                    <Button 
                        variant="contained" 
                        onClick={buscarDisponibilidade}
                        disabled={loading}
                        fullWidth
                        sx={{ bgcolor: '#1C2E4A', fontWeight: 'bold' }}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Ver Disponibilidade'}
                    </Button>
                </Stack>

                <Divider sx={{ my: 1 }} />

                <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                    {horariosLivres.length > 0 ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {horariosLivres.map((slot, idx) => (
                                <Chip
                                    key={idx}
                                    label={slot.label}
                                    icon={<AccessTimeIcon fontSize="small"/>}
                                    onClick={() => onSlotSelect({
                                        // Mock para compatibilidade com o formato do modal existente
                                        data_hora_inicio: { toDate: () => slot.date }, 
                                        medico: medicoSelecionado,
                                        especialidade: null 
                                    })}
                                    color="primary"
                                    variant="outlined"
                                    sx={{ cursor: 'pointer', fontWeight: 'bold', '&:hover': { bgcolor: '#e3f2fd' } }}
                                />
                            ))}
                        </Box>
                    ) : (
                        <Alert severity="info" sx={{ mt: 1 }}>{feedback}</Alert>
                    )}
                </Box>

            </Box>
        </LocalizationProvider>
    );
}