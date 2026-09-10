// src/components/configuracoes/JornadasTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, CircularProgress, Button, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    MenuItem, FormControl, InputLabel, Select, Switch, FormControlLabel, 
    Grid, OutlinedInput, Checkbox, ListItemText, Typography
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker'; 
import dayjs from 'dayjs';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { configuracoesService } from '../../services/configuracoesService';

import '../../atendimento.css';

const diasDaSemana = [
    { value: 0, label: 'Segunda-feira' }, { value: 1, label: 'Terça-feira' }, { value: 2, label: 'Quarta-feira' },
    { value: 3, label: 'Quinta-feira' }, { value: 4, label: 'Sexta-feira' }, { value: 5, label: 'Sábado' }, { value: 6, label: 'Domingo' },
];

const semanasOpcoes = [
    { value: 1, label: '1ª Semana do Mês' }, { value: 2, label: '2ª Semana do Mês' }, { value: 3, label: '3ª Semana do Mês' },
    { value: 4, label: '4ª Semana do Mês' }, { value: 5, label: '5ª Semana do Mês' },
];

const initialState = { medico: '', dia_da_semana: '', hora_inicio: null, hora_fim: null, intervalo_consulta: 30, ativo: true, semanas_do_mes: [] };

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
            setJornadas(response.data.results || response.data || []);
        } catch (error) { showSnackbar('Erro ao carregar jornadas.', 'error'); } 
        finally { setIsLoading(false); }
    }, [showSnackbar, filtroMedico]);

    const fetchMedicos = useCallback(async () => {
        try {
            const response = await configuracoesService.getMedicos();
            setMedicos(response.data.results || response.data || []);
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
                medico: item.medico, dia_da_semana: item.dia_da_semana,
                hora_inicio: parseTime(item.hora_inicio), hora_fim: parseTime(item.hora_fim),
                intervalo_consulta: item.intervalo_consulta, ativo: item.ativo, semanas_do_mes: item.semanas_do_mes || [], 
            });
        } else { setFormData(initialState); }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            const dataToSend = { ...formData, hora_inicio: formatTime(formData.hora_inicio), hora_fim: formatTime(formData.hora_fim) };
            if (!dataToSend.medico || dataToSend.dia_da_semana === '' || !dataToSend.hora_inicio || !dataToSend.hora_fim) {
                 showSnackbar('Preencha os campos obrigatórios.', 'warning'); setIsSubmitting(false); return;
            }
            if (formData.hora_inicio && formData.hora_fim && (formData.hora_fim.isBefore(formData.hora_inicio) || formData.hora_fim.isSame(formData.hora_inicio))) {
                showSnackbar('A hora final deve ser maior que a hora inicial.', 'warning'); setIsSubmitting(false); return;
            }

            if (itemParaEditar) await configuracoesService.updateJornada(itemParaEditar.id, dataToSend);
            else await configuracoesService.createJornada(dataToSend);
            
            showSnackbar('Jornada salva!', 'success');
            setIsModalOpen(false); fetchJornadas();
        } catch (error) { showSnackbar('Erro ao salvar.', 'error'); } 
        finally { setIsSubmitting(false); }
    };
    
    const handleDelete = async (id) => {
        if (window.confirm('Deletar este horário?')) {
            try { await configuracoesService.deleteJornada(id); showSnackbar('Jornada deletada!', 'success'); fetchJornadas(); } 
            catch (error) { showSnackbar('Erro ao deletar.', 'error'); }
        }
    };

    const thStyle = { fontWeight: 600, bgcolor: '#f8f9fa', color: '#495057', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #e9ecef' };

    return (
        <Box className="tasy-flat-panel tasy-workspace" sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#f1f3f5' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid #e9ecef', bgcolor: '#fff' }}>
                <Typography sx={{ fontWeight: 600, color: '#495057', fontSize: '13px', textTransform: 'uppercase' }}>
                    Gestão de Jornadas (Agendas)
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 250 }} className="tasy-compact-input">
                        <InputLabel>Filtrar por Médico</InputLabel>
                        <Select value={filtroMedico} label="Filtrar por Médico" onChange={(e) => setFiltroMedico(e.target.value)}>
                            <MenuItem value=""><em>Todos os Médicos</em></MenuItem>
                            {medicos.map((m) => <MenuItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <Button variant="contained" disableElevation size="small" startIcon={<AddIcon sx={{ fontSize: '16px' }}/>} onClick={() => handleOpenModal()} sx={{ bgcolor: '#1c7ed6', fontSize: '12px', fontWeight: 600 }}>
                        Nova Jornada
                    </Button>
                </Box>
            </Box>

            <Box sx={{ flexGrow: 1, overflowY: 'auto', bgcolor: '#ffffff' }}>
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                ) : (
                    <TableContainer>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={thStyle}>Médico</TableCell>
                                    <TableCell sx={thStyle}>Dia da Semana</TableCell>
                                    <TableCell sx={thStyle}>Horário</TableCell>
                                    <TableCell sx={thStyle}>Intervalo</TableCell>
                                    <TableCell sx={thStyle}>Status</TableCell>
                                    <TableCell align="right" sx={thStyle}>Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {jornadas.map((item) => (
                                    <TableRow key={item.id} hover sx={{ '& td': { borderBottom: '1px solid #f8f9fa' } }}>
                                        <TableCell sx={{ fontSize: '13px', fontWeight: 600, color: '#343a40' }}>{item.medico_nome}</TableCell>
                                        <TableCell sx={{ fontSize: '12px', color: '#495057' }}>{item.dia_da_semana_display}</TableCell>
                                        <TableCell sx={{ fontSize: '12px', color: '#495057' }}>{formatTime(parseTime(item.hora_inicio))} às {formatTime(parseTime(item.hora_fim))}</TableCell>
                                        <TableCell sx={{ fontSize: '12px', color: '#495057' }}>{item.intervalo_consulta} min</TableCell>
                                        <TableCell sx={{ fontSize: '12px', color: item.ativo ? '#2b8a3e' : '#e03131', fontWeight: 600 }}>{item.ativo ? "Ativo" : "Inativo"}</TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small" sx={{ color: '#868e96', '&:hover': { color: '#1c7ed6' } }} onClick={() => handleOpenModal(item)}><EditIcon fontSize="small"/></IconButton>
                                            <IconButton size="small" sx={{ color: '#868e96', '&:hover': { color: '#e03131' } }} onClick={() => handleDelete(item.id)}><DeleteIcon fontSize="small"/></IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>

            <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} fullWidth maxWidth="sm" PaperProps={{ className: 'tasy-flat-panel' }}>
                <DialogTitle sx={{ p: 0, bgcolor: '#f8f9fa', borderBottom: '1px solid #e9ecef', px: 2, py: 1.5 }}>
                    <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#495057', textTransform: 'uppercase' }}>
                        {itemParaEditar ? 'Editar Jornada' : 'Nova Jornada'}
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ bgcolor: '#f4f6f8', p: 3 }}>
                    <div className="tasy-panel theme-blue">
                        <div className="tasy-panel-body">
                            <div className="tasy-section-header">Profissional e Data</div>
                            <Grid container spacing={2} sx={{ mt: 0.5 }}>
                                <Grid item xs={12}>
                                    <FormControl fullWidth className="tasy-compact-input" size="small">
                                        <InputLabel>Médico *</InputLabel>
                                        <Select value={formData.medico} label="Médico *" onChange={(e) => setFormData({...formData, medico: e.target.value})} disabled={!!itemParaEditar}>
                                            {medicos.map((m) => <MenuItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth className="tasy-compact-input" size="small">
                                        <InputLabel>Dia da Semana *</InputLabel>
                                        <Select value={formData.dia_da_semana} label="Dia da Semana *" onChange={(e) => setFormData({...formData, dia_da_semana: e.target.value})}>
                                            {diasDaSemana.map((d) => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth className="tasy-compact-input" size="small">
                                        <InputLabel>Semanas do Mês (Opcional)</InputLabel>
                                        <Select
                                            multiple
                                            value={formData.semanas_do_mes}
                                            onChange={(e) => setFormData({...formData, semanas_do_mes: e.target.value})}
                                            input={<OutlinedInput label="Semanas do Mês (Opcional)" />}
                                            renderValue={(selected) => selected.length === 0 ? "Todas as semanas" : selected.map(val => semanasOpcoes.find(opt => opt.value === val)?.label).join(', ')}
                                        >
                                            {semanasOpcoes.map((semana) => (
                                                <MenuItem key={semana.value} value={semana.value} sx={{ py: 0, minHeight: 32 }}>
                                                    <Checkbox size="small" checked={formData.semanas_do_mes.indexOf(semana.value) > -1} />
                                                    <ListItemText primaryTypographyProps={{ fontSize: '13px' }} primary={semana.label} />
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>
                        </div>
                    </div>

                    <div className="tasy-panel theme-blue">
                        <div className="tasy-panel-body">
                            <div className="tasy-section-header">Horários de Atendimento</div>
                            <Grid container spacing={2} sx={{ mt: 0.5 }}>
                                <Grid item xs={6}>
                                    <TimePicker label="Início do Expediente" value={formData.hora_inicio} onChange={(v) => setFormData({...formData, hora_inicio: v})} renderInput={(params) => <TextField {...params} fullWidth size="small" className="tasy-compact-input" />} />
                                </Grid>
                                <Grid item xs={6}>
                                    <TimePicker label="Fim do Expediente" value={formData.hora_fim} onChange={(v) => setFormData({...formData, hora_fim: v})} renderInput={(params) => <TextField {...params} fullWidth size="small" className="tasy-compact-input" />} />
                                </Grid>
                                <Grid item xs={6}>
                                     <TextField label="Intervalo por Consulta (min)" type="number" fullWidth size="small" className="tasy-compact-input" value={formData.intervalo_consulta} onChange={(e) => setFormData({...formData, intervalo_consulta: e.target.value})} />
                                </Grid>
                                <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center' }}>
                                    <FormControlLabel 
                                        control={<Switch size="small" checked={formData.ativo} onChange={(e) => setFormData({...formData, ativo: e.target.checked})} color="primary" />} 
                                        label={<Typography sx={{ fontSize: '13px', color: '#495057', fontWeight: 500 }}>Agenda Ativa</Typography>} 
                                    />
                                </Grid>
                            </Grid>
                        </div>
                    </div>
                </DialogContent>
                <DialogActions sx={{ p: 1.5, borderTop: '1px solid #e9ecef', bgcolor: '#f8f9fa' }}>
                    <Button onClick={() => setIsModalOpen(false)} sx={{ color: '#868e96', fontSize: '12px', fontWeight: 600 }}>Cancelar</Button>
                    <Button onClick={handleSave} variant="contained" disableElevation disabled={isSubmitting} sx={{ bgcolor: '#1c7ed6', fontSize: '12px', fontWeight: 600 }}>
                        {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Salvar Jornada'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}