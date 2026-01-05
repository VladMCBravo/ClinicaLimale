// src/components/painel/ControlesAgenda.jsx
import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Autocomplete, TextField, Button, IconButton, Tooltip,
    Accordion, AccordionSummary, AccordionDetails, Typography
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AddCardIcon from '@mui/icons-material/AddCard';
import FilterListIcon from '@mui/icons-material/FilterList'; // Ícone para filtros
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EventAvailableIcon from '@mui/icons-material/EventAvailable'; // Ícone para disponibilidade
import ClearIcon from '@mui/icons-material/Clear';
import { agendamentoService } from '../../services/agendamentoService';

export default function ControlesAgenda({ onNovoPacienteClick, onCaixaClick, onFiltroChange, onVerificarDispoClick }) {
    const [medicos, setMedicos] = useState([]);
    const [especialidades, setEspecialidades] = useState([]);
    const [especialidadeSelecionada, setEspecialidadeSelecionada] = useState(null);
    const [medicoSelecionado, setMedicoSelecionado] = useState(null);
    const [expanded, setExpanded] = useState(false); // Controla se filtros estão abertos

    // ... (Mantenha seus useEffects de carga de dados aqui) ...
    // useEffect(() => { ... }, []);
    // useEffect(() => { onFiltroChange(...) }, [...]);

    // Use variáveis auxiliares se precisar filtrar a lista de médicos
    const medicosFiltrados = especialidadeSelecionada
        ? medicos.filter(m => m.especialidades.includes(especialidadeSelecionada.id))
        : medicos;

    const limparFiltros = (e) => {
        e.stopPropagation();
        setEspecialidadeSelecionada(null);
        setMedicoSelecionado(null);
    };

    return (
        <Paper variant="outlined" sx={{ p: 1, mb: 1 }}> {/* Padding reduzido */}
            {/* Botões de Ação Rápida em Grid Apertado */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 1 }}>
                <Button 
                    variant="contained" size="small" 
                    startIcon={<PersonAddIcon fontSize="small" />}
                    onClick={onNovoPacienteClick}
                    sx={{ fontSize: '0.75rem' }}
                >
                    Novo Paciente
                </Button>
                <Button 
                    variant="outlined" size="small" color="secondary"
                    startIcon={<AddCardIcon fontSize="small" />}
                    onClick={onCaixaClick}
                    sx={{ fontSize: '0.75rem' }}
                >
                    Caixa
                </Button>
            </Box>

            {/* Botão Extra: Verificar Disponibilidade (Muito Útil) */}
            <Button 
                fullWidth variant="outlined" size="small" color="info"
                startIcon={<EventAvailableIcon fontSize="small" />}
                onClick={onVerificarDispoClick}
                sx={{ mb: 1, fontSize: '0.75rem', justifyContent: 'flex-start' }}
            >
                Buscar Horário Vago
            </Button>

            {/* Filtros em Acordeão para economizar espaço */}
            <Accordion 
                disableGutters 
                elevation={0} 
                expanded={expanded} 
                onChange={() => setExpanded(!expanded)}
                sx={{ '&:before': { display: 'none' }, border: '1px solid #e0e0e0', borderRadius: 1 }}
            >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 32, height: 32 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                        <FilterListIcon fontSize="small" color="action" />
                        <Typography variant="caption" sx={{ flexGrow: 1 }}>
                            {(medicoSelecionado || especialidadeSelecionada) ? 'Filtros Ativos' : 'Filtrar Agenda'}
                        </Typography>
                        {(medicoSelecionado || especialidadeSelecionada) && (
                             <Tooltip title="Limpar">
                                <IconButton size="small" onClick={limparFiltros} sx={{ p: 0.5 }}>
                                    <ClearIcon fontSize="inherit" />
                                </IconButton>
                             </Tooltip>
                        )}
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Autocomplete
                        size="small"
                        options={especialidades}
                        getOptionLabel={(option) => option.nome || ''}
                        value={especialidadeSelecionada}
                        onChange={(e, v) => { setEspecialidadeSelecionada(v); setMedicoSelecionado(null); }}
                        renderInput={(params) => <TextField {...params} label="Especialidade" placeholder="Selecione..." sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' } }} />}
                    />
                    <Autocomplete
                        size="small"
                        options={medicosFiltrados}
                        getOptionLabel={(option) => `${option.first_name} ${option.last_name}` || ''}
                        value={medicoSelecionado}
                        onChange={(e, v) => setMedicoSelecionado(v)}
                        renderInput={(params) => <TextField {...params} label="Médico" placeholder="Selecione..." sx={{ '& .MuiInputBase-root': { fontSize: '0.8rem' } }} />}
                    />
                </AccordionDetails>
            </Accordion>
        </Paper>
    );
}