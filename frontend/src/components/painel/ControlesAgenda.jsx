// src/components/painel/ControlesAgenda.jsx
import React, { useState, useEffect } from 'react';
import {
    Paper, Box, Button, Divider, Typography, FormControl,
    InputLabel, Select, MenuItem, IconButton
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AddCardIcon from '@mui/icons-material/AddCard';
import ClearIcon from '@mui/icons-material/Clear';
import apiClient from '../../api/axiosConfig';

function ControlesAgenda({ onNovoPacienteClick, onCaixaClick, onFiltroChange }) {
    // A LÓGICA DOS FILTROS AGORA VIVE AQUI DENTRO
    const [medicos, setMedicos] = useState([]);
    const [especialidades, setEspecialidades] = useState([]);
    const [medicoFiltro, setMedicoFiltro] = useState('');
    const [especialidadeFiltro, setEspecialidadeFiltro] = useState('');

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

    const handleMedicoChange = (event) => {
        const value = event.target.value;
        setMedicoFiltro(value);
        onFiltroChange({ medicoId: value, especialidadeId: especialidadeFiltro });
    };

    const handleEspecialidadeChange = (event) => {
        const value = event.target.value;
        setEspecialidadeFiltro(value);
        onFiltroChange({ medicoId: medicoFiltro, especialidadeId: value });
    };

    const limparFiltros = () => {
        setMedicoFiltro('');
        setEspecialidadeFiltro('');
        onFiltroChange({ medicoId: '', especialidadeId: '' });
    };

    return (
        <Paper sx={{ p: 2 }} variant="outlined">
            {/* Botões de Ação Rápida */}
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
                    <Typography variant="h6">Filtros da Agenda</Typography>
                    <IconButton onClick={limparFiltros} size="small" title="Limpar filtros">
                        <ClearIcon />
                    </IconButton>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Especialidade</InputLabel>
                        <Select value={especialidadeFiltro} label="Especialidade" onChange={handleEspecialidadeChange}>
                            <MenuItem value=""><em>Todas</em></MenuItem>
                            {especialidades.map((esp) => (
                                <MenuItem key={esp.id} value={esp.id}>{esp.nome}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth size="small">
                        <InputLabel>Médico</InputLabel>
                        <Select value={medicoFiltro} label="Médico" onChange={handleMedicoChange}>
                            <MenuItem value=""><em>Todos</em></MenuItem>
                            {medicos.map((med) => (
                                <MenuItem key={med.id} value={med.id}>{med.first_name} {med.last_name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            </Box>
        </Paper>
    );
}

export default React.memo(ControlesAgenda);