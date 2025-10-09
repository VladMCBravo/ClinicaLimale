// src/components/painel/ControlesAgenda.jsx - VERSÃO FINAL UNIFICADA
import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Autocomplete, TextField,
    Button, Divider, IconButton
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AddCardIcon from '@mui/icons-material/AddCard';
import ClearIcon from '@mui/icons-material/Clear'; // Importado para o botão de limpar
import { agendamentoService } from '../../services/agendamentoService';

// <<-- A PROP 'onCaixaClick' FOI ADICIONADA DE VOLTA -->>
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
    
    // <<-- FUNÇÃO DE LIMPAR FILTROS ADICIONADA DE VOLTA -->>
    const limparFiltros = () => {
        setEspecialidadeSelecionada(null);
        setMedicoSelecionado(null);
        // O useEffect acima cuidará de notificar o componente pai
    };

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            {/* <<-- BOTÕES DE AÇÃO RÁPIDA ADICIONADOS DE VOLTA -->> */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Button 
                    variant="contained" 
                    startIcon={<PersonAddIcon />}
                    onClick={onNovoPacienteClick}
                    size="small"
                >
                    Novo Paciente
                </Button>
                <Button 
                    variant="outlined" 
                    startIcon={<AddCardIcon />} 
                    color="secondary"
                    onClick={onCaixaClick}
                    size="small"
                >
                    Lançamento no Caixa
                </Button>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Filtros da Agenda */}
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontSize: '1rem' }}>Filtros da Agenda</Typography>
                    {/* <<-- BOTÃO DE LIMPAR FILTROS ADICIONADO DE VOLTA -->> */}
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