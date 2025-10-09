// src/components/painel/ControlesAgenda.jsx - VERSÃO COM LÓGICA FUNCIONAL
import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Autocomplete, TextField,
    IconButton, Collapse
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { agendamentoService } from '../../services/agendamentoService';

export default function ControlesAgenda({ onNovoPacienteClick, onFiltroChange }) {
    // Estados para armazenar as listas vindas da API
    const [medicos, setMedicos] = useState([]);
    const [especialidades, setEspecialidades] = useState([]);
    
    // Estados para controlar os valores selecionados nos filtros
    const [especialidadeSelecionada, setEspecialidadeSelecionada] = useState(null);
    const [medicoSelecionado, setMedicoSelecionado] = useState(null);

    const [filtrosVisiveis, setFiltrosVisiveis] = useState(true);

    // Busca os dados para preencher os filtros quando o componente é montado
    useEffect(() => {
        agendamentoService.getModalData()
            .then(([pacientesRes, procedimentosRes, medicosRes, especialidadesRes]) => {
                setMedicos(medicosRes.data);
                setEspecialidades(especialidadesRes.data);
            })
            .catch(error => console.error("Erro ao carregar dados dos filtros:", error));
    }, []);

    // Efeito que dispara a mudança para o componente pai sempre que um filtro é alterado
    useEffect(() => {
        onFiltroChange({
            especialidadeId: especialidadeSelecionada ? especialidadeSelecionada.id : '',
            medicoId: medicoSelecionado ? medicoSelecionado.id : ''
        });
    }, [especialidadeSelecionada, medicoSelecionado, onFiltroChange]);

    // Filtra a lista de médicos com base na especialidade selecionada
    const medicosFiltrados = especialidadeSelecionada
        ? medicos.filter(m => m.especialidades.includes(especialidadeSelecionada.id))
        : medicos;

    const handleEspecialidadeChange = (event, newValue) => {
        setEspecialidadeSelecionada(newValue);
        // Limpa o filtro de médico se a especialidade mudar, pois o médico pode não pertencer à nova especialidade
        setMedicoSelecionado(null);
    };

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">Filtros da Agenda</Typography>
                <IconButton size="small" onClick={() => setFiltrosVisiveis(!filtrosVisiveis)}>
                    <CloseIcon />
                </IconButton>
            </Box>
            
            <Collapse in={filtrosVisiveis}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
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
            </Collapse>
        </Paper>
    );
}