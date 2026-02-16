// src/components/painel/VerificadorDisponibilidade.jsx
import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, TextField, Button, CircularProgress, 
    Divider, Alert, Autocomplete, Chip, Stack 
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// --- CORREÇÃO DO IMPORT AQUI ---
// Em versões novas do date-fns, importamos assim:
import { ptBR } from 'date-fns/locale'; 

import SearchIcon from '@mui/icons-material/Search';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

import apiClient from '../../api/axiosConfig';
import { agendamentoService } from '../../services/agendamentoService';

export default function VerificadorDisponibilidade({ onSlotSelect }) {
    // ESTADOS
    const [dataSelecionada, setDataSelecionada] = useState(new Date());
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

    // --- A MÁGICA: CALCULA HORÁRIOS LIVRES NO FRONTEND ---
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

            // 2. Filtra agendamentos DO DIA escolhido (ignorando cancelados)
            const diaAlvoStr = dataSelecionada.toISOString().split('T')[0]; // YYYY-MM-DD
            
            const ocupados = agendamentos.filter(ag => {
                const dataAg = ag.data_hora_inicio.split('T')[0];
                return dataAg === diaAlvoStr && ag.status !== 'Cancelado';
            });

            // 3. Gera slots de 30 em 30 min (das 08:00 às 18:00)
            const slotsLivres = [];
            let hora = 8; 
            let min = 0;
            const fimHora = 18; // Até as 18:00

            while (hora < fimHora) {
                // Cria objeto Date para esse slot
                const slotDate = new Date(dataSelecionada);
                slotDate.setHours(hora, min, 0, 0);

                // Verifica se colide com algum agendamento existente
                // (Colisão simples: se o horário de inicio é igual)
                const isOcupado = ocupados.some(ag => {
                    const agDate = new Date(ag.data_hora_inicio);
                    return agDate.getHours() === hora && agDate.getMinutes() === min;
                });

                if (!isOcupado) {
                    const horaFormatada = `${String(hora).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
                    slotsLivres.push({
                        label: horaFormatada,
                        date: slotDate
                    });
                }

                // Incrementa 30 min
                min += 30;
                if (min === 60) { min = 0; hora++; }
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
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
                
                {/* Título */}
                <Typography variant="h6" sx={{ color: '#1C2E4A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SearchIcon /> Buscar Horário
                </Typography>
                <Divider />

                {/* Formulário Compacto (Vertical) */}
                <Stack spacing={2}>
                    <DatePicker
                        label="Data"
                        value={dataSelecionada}
                        onChange={(d) => { setDataSelecionada(d); setHorariosLivres([]); setFeedback("Clique em buscar."); }}
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

                {/* Área de Resultados (Chips) */}
                <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                    {horariosLivres.length > 0 ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {horariosLivres.map((slot, idx) => (
                                <Chip
                                    key={idx}
                                    label={slot.label}
                                    icon={<AccessTimeIcon fontSize="small"/>}
                                    onClick={() => onSlotSelect({
                                        data_hora_inicio: { toDate: () => slot.date }, // Formato compatível com o modal
                                        medico: medicoSelecionado,
                                        especialidade: null // Opcional
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