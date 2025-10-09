// src/components/painel/ControlesAgenda.jsx - VERSÃO COM IMPORT CORRIGIDO
import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Autocomplete, TextField,
    Button, Divider, IconButton, Tooltip // <<-- Tooltip foi adicionado aqui
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AddCardIcon from '@mui/icons-material/AddCard';
import ClearIcon from '@mui/icons-material/Clear';
import { agendamentoService } from '../../services/agendamentoService';

export default function ControlesAgenda({ onNovoPacienteClick, onCaixaClick, onFiltroChange }) {
    const [medicos, setMedicos] = useState([]);
    const [especialidades, setEspecialidades] = useState([]);
    const [especialidadeSelecionada, setEspecialidadeSelecionada] = useState(null);
    const [medicoSelecionado, setMedicoSelecionado] = useState(null);

    useEffect(() => {
        agendamentoService.getModalData()
            .then(([pacientesRes, procedimentosRes, medicosRes, especialidadesRes]) => {
                setMedicos(medicosRes.data);
                setEspecialidades(especialidadesRes.data);
            })
            .catch(error => console.error("Erro ao carregar dados dos filtros:", error));
    }, []);

    useEffect(() => {
        onFiltroChange({
            especialidadeId: especialidadeSelecionada ? especialidadeSelecionada.id : '',
            medicoId: medicoSelecionado ? medicoSelecionado.id : ''
        });
    }, [especialidadeSelecionada, medicoSelecionado, onFiltroChange]);

    const medicosFiltrados = especialidadeSelecionada
        ? medicos.filter(m => m.especialidades.includes(especialidadeSelecionada.id))
        : medicos;

    const handleEspecialidadeChange = (event, newValue) => {
        setEspecialidadeSelecionada(newValue);
        setMedicoSelecionado(null);
    };
    
    const limparFiltros = () => {
        setEspecialidadeSelecionada(null);
        setMedicoSelecionado(null);
    };

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Button 
                    variant="contained" 
                    startIcon={<PersonAddIcon />}
                    onClick={onNovoPacienteClick}
                >
                    Novo Paciente
                </Button>
                <Button 
                    variant="outlined" 
                    startIcon={<AddCardIcon />} 
                    color="secondary"
                    onClick={onCaixaClick}
                >
                    Lançamento no Caixa
                </Button>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontSize: '1rem' }}>Filtros da Agenda</Typography>
                    <Tooltip title="Limpar filtros">
                        <IconButton onClick={limparFiltros} size="small">
                            <ClearIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Autocomplete
                        options={especialidades}
                        getOptionLabel={(option) => option.nome || ''}
                        value={especialidadeSelecionada}
                        onChange={handleEspecialidadeChange}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        renderInput={(params) => <TextField {...params} label="Especialidade" size="small" />}
                    />
                    <Autocomplete
                        options={medicosFiltrados}
                        getOptionLabel={(option) => `${option.first_name} ${option.last_name}` || ''}
                        value={medicoSelecionado}
                        onChange={(event, newValue) => setMedicoSelecionado(newValue)}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        renderInput={(params) => <TextField {...params} label="Médico" size="small" />}
                    />
                </Box>
            </Box>
        </Paper>
    );
}