// src/pages/JornadaTrabalhoPage.jsx - VERSÃO COMPLETAMENTE NOVA
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, CircularProgress, Button, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    MenuItem, FormControl, InputLabel, Select, Switch, FormControlLabel, Grid
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import dayjs from 'dayjs';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSnackbar } from '../contexts/SnackbarContext';
import { configuracoesService } from '../services/configuracoesService';

// Constante para os dias da semana (conforme models.py)
const diasDaSemana = [
    { value: 0, label: 'Segunda-feira' },
    { value: 1, label: 'Terça-feira' },
    { value: 2, label: 'Quarta-feira' },
    { value: 3, label: 'Quinta-feira' },
    { value: 4, label: 'Sexta-feira' },
    { value: 5, label: 'Sábado' },
    { value: 6, label: 'Domingo' },
];

const initialState = {
    medico: '',
    dia_da_semana: '',
    hora_inicio: null, // Usaremos null para o TimePicker
    hora_fim: null,
    intervalo_consulta: 30,
    ativo: true,
};

export default function JornadaTrabalhoPage() {
    const [jornadas, setJornadas] = useState([]);
    const [medicos, setMedicos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showSnackbar } = useSnackbar();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemParaEditar, setItemParaEditar] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState(initialState);
    
    // Estado para o filtro
    const [filtroMedico, setFiltroMedico] = useState('');

    const fetchJornadas = useCallback(async () => {
        setIsLoading(true);
        try {
            // Passa o ID do médico selecionado no filtro
            const response = await configuracoesService.getJornadas(filtroMedico);
            setJornadas(response.data);
        } catch (error) {
            showSnackbar('Erro ao carregar jornadas de trabalho.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showSnackbar, filtroMedico]); // Adiciona filtroMedico como dependência

    const fetchMedicos = useCallback(async () => {
        try {
            const response = await configuracoesService.getMedicos();
            setMedicos(response.data);
        } catch (error) {
            showSnackbar('Erro ao carregar médicos.', 'error');
        }
    }, [showSnackbar]);

    useEffect(() => {
        fetchJornadas();
    }, [fetchJornadas]); // fetchJornadas já depende do filtro

    useEffect(() => {
        fetchMedicos();
    }, [fetchMedicos]);

    // Função para converter HH:mm:ss para um objeto dayjs
    const parseTime = (timeStr) => {
        if (!timeStr) return null;
        return dayjs(`2000-01-01T${timeStr}`);
    };
    
    // Função para formatar dayjs para HH:mm
    const formatTime = (dateObj) => {
        if (!dateObj) return null;
        return dateObj.format('HH:mm');
    };

    const handleOpenModal = (item = null) => {
        setItemParaEditar(item);
        if (item) {
            setFormData({
                medico: item.medico, // ID do médico
                dia_da_semana: item.dia_da_semana,
                hora_inicio: parseTime(item.hora_inicio),
                hora_fim: parseTime(item.hora_fim),
                intervalo_consulta: item.intervalo_consulta,
                ativo: item.ativo,
            });
        } else {
            setFormData(initialState);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setItemParaEditar(null);
        setFormData(initialState);
    };

    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            const dataToSend = {
                ...formData,
                hora_inicio: formatTime(formData.hora_inicio),
                hora_fim: formatTime(formData.hora_fim),
            };

            if (!dataToSend.medico || dataToSend.dia_da_semana === '' || !dataToSend.hora_inicio || !dataToSend.hora_fim) {
                 showSnackbar('Preencha todos os campos obrigatórios (Médico, Dia, Horários).', 'warning');
                 setIsSubmitting(false);
                 return;
            }

            if (itemParaEditar) {
                await configuracoesService.updateJornada(itemParaEditar.id, dataToSend);
            } else {
                await configuracoesService.createJornada(dataToSend);
            }
            showSnackbar('Jornada salva com sucesso!', 'success');
            handleCloseModal();
            fetchJornadas(); // Recarrega a lista
        } catch (error) {
            showSnackbar('Erro ao salvar jornada.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja deletar este horário?')) {
            try {
                await configuracoesService.deleteJornada(id);
                showSnackbar('Jornada deletada com sucesso!', 'success');
                fetchJornadas();
            } catch (error) {
                showSnackbar('Erro ao deletar jornada.', 'error');
            }
        }
    };

    return (
        <Paper sx={{ p: 2, margin: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">Jornadas de Trabalho</Typography>
                <Button variant="contained" onClick={() => handleOpenModal()}>
                    Nova Jornada
                </Button>
            </Box>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Filtrar por Médico</InputLabel>
                <Select
                    value={filtroMedico}
                    label="Filtrar por Médico"
                    onChange={(e) => setFiltroMedico(e.target.value)}
                >
                    <MenuItem value="">
                        <em>Todos os Médicos</em>
                    </MenuItem>
                    {medicos.map((medico) => (
                        <MenuItem key={medico.id} value={medico.id}>
                            {medico.first_name} {medico.last_name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {isLoading ? <CircularProgress /> : (
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Médico</TableCell>
                                <TableCell>Dia da Semana</TableCell>
                                <TableCell>Início</TableCell>
                                <TableCell>Fim</TableCell>
                                <TableCell>Intervalo (min)</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {jornadas.map((item) => (
                                <TableRow key={item.id} hover>
                                    <TableCell>{item.medico_nome}</TableCell>
                                    <TableCell>{item.dia_da_semana_display}</TableCell>
                                    <TableCell>{formatTime(parseTime(item.hora_inicio))}</TableCell>
                                    <TableCell>{formatTime(parseTime(item.hora_fim))}</TableCell>
                                    <TableCell>{item.intervalo_consulta} min</TableCell>
                                    <TableCell>{item.ativo ? "Ativo" : "Inativo"}</TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" onClick={() => handleOpenModal(item)}><EditIcon /></IconButton>
                                        <IconButton size="small" onClick={() => handleDelete(item.id)}><DeleteIcon color="error" /></IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <Dialog open={isModalOpen} onClose={handleCloseModal} fullWidth maxWidth="sm">
                <DialogTitle>{itemParaEditar ? 'Editar Jornada' : 'Nova Jornada'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ pt: 1 }}>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel id="medico-label">Médico *</InputLabel>
                                <Select
                                    labelId="medico-label"
                                    value={formData.medico}
                                    label="Médico *"
                                    onChange={(e) => setFormData({...formData, medico: e.target.value})}
                                    disabled={!!itemParaEditar} // Não permite trocar o médico na edição
                                >
                                    {medicos.map((medico) => (
                                        <MenuItem key={medico.id} value={medico.id}>
                                            {medico.first_name} {medico.last_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel id="dia-label">Dia da Semana *</InputLabel>
                                <Select
                                    labelId="dia-label"
                                    value={formData.dia_da_semana}
                                    label="Dia da Semana *"
                                    onChange={(e) => setFormData({...formData, dia_da_semana: e.target.value})}
                                >
                                    {diasDaSemana.map((dia) => (
                                        <MenuItem key={dia.value} value={dia.value}>
                                            {dia.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                            <TimePicker
                                label="Hora Início *"
                                value={formData.hora_inicio}
                                onChange={(newValue) => setFormData({...formData, hora_inicio: newValue})}
                                renderInput={(params) => <TextField {...params} fullWidth />}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TimePicker
                                label="Hora Fim *"
                                value={formData.hora_fim}
                                onChange={(newValue) => setFormData({...formData, hora_fim: newValue})}
                                renderInput={(params) => <TextField {...params} fullWidth />}
                            />
                        </Grid>
                        <Grid item xs={6}>
                             <TextField
                                margin="dense"
                                label="Intervalo (minutos)"
                                type="number"
                                fullWidth
                                value={formData.intervalo_consulta}
                                onChange={(e) => setFormData({...formData, intervalo_consulta: e.target.value})}
                            />
                        </Grid>
                        <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={formData.ativo}
                                        onChange={(e) => setFormData({...formData, ativo: e.target.checked})}
                                        color="success"
                                    />
                                }
                                label="Jornada Ativa"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseModal}>Cancelar</Button>
                    <Button onClick={handleSave} variant="contained" disabled={isSubmitting}>
                        {isSubmitting ? <CircularProgress size={24} /> : 'Salvar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}