// src/components/configuracoes/JornadasTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, CircularProgress, Button, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    MenuItem, FormControl, InputLabel, Select, Switch, FormControlLabel, Grid, Paper, OutlinedInput, Checkbox, ListItemText
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker'; // Certifique-se de ter @mui/x-date-pickers instalado
import dayjs from 'dayjs';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { configuracoesService } from '../../services/configuracoesService';

// Constante para os dias da semana
const diasDaSemana = [
    { value: 0, label: 'Segunda-feira' },
    { value: 1, label: 'Terça-feira' },
    { value: 2, label: 'Quarta-feira' },
    { value: 3, label: 'Quinta-feira' },
    { value: 4, label: 'Sexta-feira' },
    { value: 5, label: 'Sábado' },
    { value: 6, label: 'Domingo' },
];

// Constante para as semanas
const semanasOpcoes = [
    { value: 1, label: '1ª Semana do Mês' },
    { value: 2, label: '2ª Semana do Mês' },
    { value: 3, label: '3ª Semana do Mês' },
    { value: 4, label: '4ª Semana do Mês' },
    { value: 5, label: '5ª Semana do Mês' },
];

const initialState = {
    medico: '', dia_da_semana: '', hora_inicio: null, hora_fim: null, intervalo_consulta: 30, ativo: true, semanas_do_mes: []
};

export default function JornadasTab() {
    const [jornadas, setJornadas] = useState([]);
    const [medicos, setMedicos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showSnackbar } = useSnackbar();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemParaEditar, setItemParaEditar] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState(initialState);
    const [filtroMedico, setFiltroMedico] = useState('');

    const fetchJornadas = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await configuracoesService.getJornadas(filtroMedico);
            setJornadas(response.data);
        } catch (error) { showSnackbar('Erro ao carregar jornadas.', 'error'); } 
        finally { setIsLoading(false); }
    }, [showSnackbar, filtroMedico]);

    const fetchMedicos = useCallback(async () => {
        try {
            const response = await configuracoesService.getMedicos();
            setMedicos(response.data);
        } catch (error) { showSnackbar('Erro ao carregar médicos.', 'error'); }
    }, [showSnackbar]);

    useEffect(() => { fetchJornadas(); }, [fetchJornadas]);
    useEffect(() => { fetchMedicos(); }, [fetchMedicos]);

    const parseTime = (timeStr) => timeStr ? dayjs(`2000-01-01T${timeStr}`) : null;
    const formatTime = (dateObj) => dateObj ? dateObj.format('HH:mm') : null;

    const handleOpenModal = (item = null) => {
        setItemParaEditar(item);
        if (item) {
            setFormData({
                medico: item.medico,
                dia_da_semana: item.dia_da_semana,
                hora_inicio: parseTime(item.hora_inicio),
                hora_fim: parseTime(item.hora_fim),
                intervalo_consulta: item.intervalo_consulta,
                ativo: item.ativo,
                semanas_do_mes: item.semanas_do_mes || [], 
            });
        } else { setFormData(initialState); }
        setIsModalOpen(true);
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
                 showSnackbar('Preencha os campos obrigatórios.', 'warning');
                 setIsSubmitting(false); return;
            }

            if (itemParaEditar) {
                await configuracoesService.updateJornada(itemParaEditar.id, dataToSend);
            } else {
                await configuracoesService.createJornada(dataToSend);
            }
            showSnackbar('Jornada salva!', 'success');
            setIsModalOpen(false);
            fetchJornadas();
        } catch (error) { showSnackbar('Erro ao salvar.', 'error'); } 
        finally { setIsSubmitting(false); }
    };
    
    const handleDelete = async (id) => {
        if (window.confirm('Deletar este horário?')) {
            try {
                await configuracoesService.deleteJornada(id);
                showSnackbar('Jornada deletada!', 'success');
                fetchJornadas();
            } catch (error) { showSnackbar('Erro ao deletar.', 'error'); }
        }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <FormControl size="small" sx={{ minWidth: 250 }}>
                    <InputLabel>Filtrar por Médico</InputLabel>
                    <Select value={filtroMedico} label="Filtrar por Médico" onChange={(e) => setFiltroMedico(e.target.value)}>
                        <MenuItem value=""><em>Todos</em></MenuItem>
                        {medicos.map((m) => <MenuItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</MenuItem>)}
                    </Select>
                </FormControl>
                <Button variant="contained" onClick={() => handleOpenModal()} sx={{ bgcolor: '#1a233b' }}>Nova Jornada</Button>
            </Box>

            {isLoading ? <CircularProgress /> : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                            <TableRow>
                                <TableCell>Médico</TableCell>
                                <TableCell>Dia</TableCell>
                                <TableCell>Início</TableCell>
                                <TableCell>Fim</TableCell>
                                <TableCell>Intervalo</TableCell>
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
                                        <IconButton size="small" onClick={() => handleOpenModal(item)}><EditIcon fontSize="small"/></IconButton>
                                        <IconButton size="small" onClick={() => handleDelete(item.id)}><DeleteIcon fontSize="small" color="error" /></IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>{itemParaEditar ? 'Editar Jornada' : 'Nova Jornada'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ pt: 1 }}>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Médico *</InputLabel>
                                <Select value={formData.medico} label="Médico *" onChange={(e) => setFormData({...formData, medico: e.target.value})} disabled={!!itemParaEditar}>
                                    {medicos.map((m) => <MenuItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Dia da Semana *</InputLabel>
                                <Select value={formData.dia_da_semana} label="Dia da Semana *" onChange={(e) => setFormData({...formData, dia_da_semana: e.target.value})}>
                                    {diasDaSemana.map((d) => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Semanas do Mês (Deixe vazio para TODAS)</InputLabel>
                                <Select
                                    multiple
                                    value={formData.semanas_do_mes}
                                    onChange={(e) => setFormData({...formData, semanas_do_mes: e.target.value})}
                                    input={<OutlinedInput label="Semanas do Mês (Deixe vazio para TODAS)" />}
                                    renderValue={(selected) => 
                                        selected.length === 0 ? "Todas as semanas" : selected.map(val => semanasOpcoes.find(opt => opt.value === val)?.label).join(', ')
                                    }
                                >
                                    {semanasOpcoes.map((semana) => (
                                        <MenuItem key={semana.value} value={semana.value}>
                                            <Checkbox checked={formData.semanas_do_mes.indexOf(semana.value) > -1} />
                                            <ListItemText primary={semana.label} />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                            <TimePicker label="Início" value={formData.hora_inicio} onChange={(v) => setFormData({...formData, hora_inicio: v})} renderInput={(params) => <TextField {...params} fullWidth />} />
                        </Grid>
                        <Grid item xs={6}>
                            <TimePicker label="Fim" value={formData.hora_fim} onChange={(v) => setFormData({...formData, hora_fim: v})} renderInput={(params) => <TextField {...params} fullWidth />} />
                        </Grid>
                        <Grid item xs={6}>
                             <TextField label="Intervalo (min)" type="number" fullWidth value={formData.intervalo_consulta} onChange={(e) => setFormData({...formData, intervalo_consulta: e.target.value})} />
                        </Grid>
                        <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center' }}>
                            <FormControlLabel control={<Switch checked={formData.ativo} onChange={(e) => setFormData({...formData, ativo: e.target.checked})} color="success" />} label="Ativo" />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSave} variant="contained" disabled={isSubmitting}>{isSubmitting ? <CircularProgress size={24} /> : 'Salvar'}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}