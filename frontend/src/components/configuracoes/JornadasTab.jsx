// src/components/configuracoes/JornadasTab.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, CircularProgress, Button, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    MenuItem, FormControl, InputLabel, Select, Switch, FormControlLabel, 
    Grid, OutlinedInput, Checkbox, ListItemText, Typography, Collapse, Divider
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker'; 
import dayjs from 'dayjs';
import { 
    Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon,
    KeyboardArrowDown as KeyboardArrowDownIcon, KeyboardArrowUp as KeyboardArrowUpIcon,
    Person, Event, AccessTime, MedicalServices, FilterAlt
} from '@mui/icons-material';
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

// COMPONENTE DE LINHA AGRUPADA (COLAPSÁVEL)
function GrupoMedicoRow({ medicoNome, jornadasMedico, handleOpenModal, handleDelete, formatTime, parseTime }) {
    const [open, setOpen] = useState(false); // Mudado para false por padrão

    const thInnerStyle = { fontWeight: 600, color: '#868e96', fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid #dee2e6' };

    return (
        <React.Fragment>
            <TableRow hover onClick={() => setOpen(!open)} sx={{ cursor: 'pointer', '& > *': { borderBottom: 'unset' }, bgcolor: open ? '#f8f9fa' : 'transparent', transition: 'background-color 0.2s' }}>
                <TableCell sx={{ width: 50, py: 1 }}>
                    <IconButton aria-label="expand row" size="small" onClick={(e) => { e.stopPropagation(); setOpen(!open); }} sx={{ color: '#495057' }}>
                        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#343a40', fontSize: '14px', display: 'flex', alignItems: 'center', gap: 1.5, py: 2, borderBottom: 'none' }}>
                    <MedicalServices sx={{ color: '#1c7ed6', fontSize: '18px' }} />
                    {medicoNome}
                </TableCell>
                <TableCell align="right" sx={{ color: '#868e96', fontSize: '13px', fontWeight: 500, py: 1, borderBottom: 'none' }}>
                    {jornadasMedico.length} agenda(s) encontrada(s)
                </TableCell>
            </TableRow>
            
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0, border: 0 }} colSpan={3}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1, ml: 6, mb: 3, pl: 2, borderLeft: '3px solid #74c0fc' }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={thInnerStyle}>Dia da Semana</TableCell>
                                        <TableCell sx={thInnerStyle}>Semanas</TableCell>
                                        <TableCell sx={thInnerStyle}>Horário</TableCell>
                                        <TableCell sx={thInnerStyle}>Intervalo</TableCell>
                                        <TableCell sx={thInnerStyle}>Status</TableCell>
                                        <TableCell align="right" sx={thInnerStyle}>Ações</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {jornadasMedico.map((item) => (
                                        <TableRow key={item.id} hover>
                                            <TableCell sx={{ fontSize: '13px', color: '#495057', fontWeight: 500 }}>{item.dia_da_semana_display}</TableCell>
                                            <TableCell sx={{ fontSize: '12px', color: '#868e96' }}>
                                                {!item.semanas_do_mes || item.semanas_do_mes.length === 0 ? 'Todas' : item.semanas_do_mes.join('ª, ')}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '13px', color: '#495057' }}>{formatTime(parseTime(item.hora_inicio))} às {formatTime(parseTime(item.hora_fim))}</TableCell>
                                            <TableCell sx={{ fontSize: '13px', color: '#495057' }}>{item.intervalo_consulta} min</TableCell>
                                            <TableCell sx={{ fontSize: '12px', color: item.ativo ? '#2b8a3e' : '#e03131', fontWeight: 600 }}>{item.ativo ? "Ativo" : "Inativo"}</TableCell>
                                            <TableCell align="right">
                                                <IconButton size="small" sx={{ color: '#868e96', '&:hover': { color: '#1c7ed6' } }} onClick={() => handleOpenModal(item)}>
                                                    <EditIcon fontSize="small"/>
                                                </IconButton>
                                                <IconButton size="small" sx={{ color: '#868e96', '&:hover': { color: '#e03131' } }} onClick={() => handleDelete(item.id)}>
                                                    <DeleteIcon fontSize="small"/>
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
}


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
    const [filtroStatus, setFiltroStatus] = useState('ativos'); // Padrão: ativos

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

    // Aplica o filtro de status e agrupa
    const jornadasAgrupadas = useMemo(() => {
        const grupos = {};
        jornadas.forEach(j => {
            if (filtroStatus === 'ativos' && !j.ativo) return;
            if (filtroStatus === 'inativos' && j.ativo) return;

            if (!grupos[j.medico_nome]) grupos[j.medico_nome] = [];
            grupos[j.medico_nome].push(j);
        });
        
        Object.keys(grupos).forEach(medico => {
            grupos[medico].sort((a, b) => {
                if (a.dia_da_semana !== b.dia_da_semana) return a.dia_da_semana - b.dia_da_semana;
                return (a.hora_inicio || '').localeCompare(b.hora_inicio || '');
            });
        });

        return grupos;
    }, [jornadas, filtroStatus]);

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

    return (
        <Box className="tasy-flat-panel tasy-workspace" sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#f1f3f5' }}>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid #e9ecef', bgcolor: '#fff' }}>
                <Typography sx={{ fontWeight: 600, color: '#495057', fontSize: '13px', textTransform: 'uppercase' }}>
                    Gestão de Jornadas (Agendas)
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 150 }} className="tasy-compact-input">
                        <InputLabel>Status</InputLabel>
                        <Select value={filtroStatus} label="Status" onChange={(e) => setFiltroStatus(e.target.value)}>
                            <MenuItem value="ativos">Agendas Ativas</MenuItem>
                            <MenuItem value="inativos">Agendas Inativas</MenuItem>
                            <MenuItem value="todos">Todas as Agendas</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 200 }} className="tasy-compact-input">
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
                                    <TableCell sx={{ width: 50, bgcolor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }} />
                                    <TableCell sx={{ bgcolor: '#f8f9fa', fontWeight: 600, color: '#495057', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #dee2e6' }}>Profissional</TableCell>
                                    <TableCell sx={{ bgcolor: '#f8f9fa', fontWeight: 600, color: '#495057', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #dee2e6' }} align="right">Resumo</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Object.keys(jornadasAgrupadas).length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} align="center" sx={{ py: 4, color: '#868e96' }}>Nenhuma jornada encontrada.</TableCell>
                                    </TableRow>
                                ) : (
                                    Object.keys(jornadasAgrupadas).map(medicoNome => (
                                        <GrupoMedicoRow 
                                            key={medicoNome} 
                                            medicoNome={medicoNome} 
                                            jornadasMedico={jornadasAgrupadas[medicoNome]} 
                                            handleOpenModal={handleOpenModal} 
                                            handleDelete={handleDelete} 
                                            formatTime={formatTime} 
                                            parseTime={parseTime} 
                                        />
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>

            <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} fullWidth maxWidth="md" PaperProps={{ className: 'tasy-flat-panel', sx: { borderRadius: 2 } }}>
                <DialogTitle sx={{ p: 2, bgcolor: '#f8f9fa', borderBottom: '1px solid #e9ecef', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccessTime sx={{ color: '#1c7ed6' }} />
                    <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#495057', textTransform: 'uppercase' }}>
                        {itemParaEditar ? 'Editar Jornada de Trabalho' : 'Nova Jornada de Trabalho'}
                    </Typography>
                </DialogTitle>
                
                <DialogContent sx={{ bgcolor: '#fff', p: 4, overflowX: 'hidden' }}>
                    <Grid container spacing={5}>
                        
                        <Grid item xs={12} md={6}>
                            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#1c7ed6', mb: 2, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase' }}>
                                <Person fontSize="small" /> Vínculo Profissional
                            </Typography>
                            
                            <FormControl fullWidth className="tasy-compact-input" size="small" sx={{ mb: 1 }}>
                                <InputLabel>Médico Selecionado *</InputLabel>
                                <Select value={formData.medico} label="Médico Selecionado *" onChange={(e) => setFormData({...formData, medico: e.target.value})} disabled={!!itemParaEditar}>
                                    {/* 👇 MOSTRA APENAS MÉDICOS ATIVOS NO MODAL 👇 */}
                                    {medicos.filter(m => m.is_active !== false).map((m) => (
                                        <MenuItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <Divider sx={{ my: 4 }} />

                            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#1c7ed6', mb: 2, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase' }}>
                                <Event fontSize="small" /> Data e Repetição
                            </Typography>

                            <FormControl fullWidth className="tasy-compact-input" size="small" sx={{ mb: 3 }}>
                                <InputLabel>Dia da Semana *</InputLabel>
                                <Select value={formData.dia_da_semana} label="Dia da Semana *" onChange={(e) => setFormData({...formData, dia_da_semana: e.target.value})}>
                                    {diasDaSemana.map((d) => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
                                </Select>
                            </FormControl>

                            <FormControl fullWidth className="tasy-compact-input" size="small">
                                <InputLabel>Semanas do Mês (Opcional)</InputLabel>
                                <Select
                                    multiple
                                    value={formData.semanas_do_mes}
                                    onChange={(e) => setFormData({...formData, semanas_do_mes: e.target.value})}
                                    input={<OutlinedInput label="Semanas do Mês (Opcional)" />}
                                    renderValue={(selected) => selected.length === 0 ? "Todas as semanas do mês" : selected.map(val => semanasOpcoes.find(opt => opt.value === val)?.label).join(', ')}
                                >
                                    {semanasOpcoes.map((semana) => (
                                        <MenuItem key={semana.value} value={semana.value} sx={{ py: 0, minHeight: 32 }}>
                                            <Checkbox size="small" checked={formData.semanas_do_mes.indexOf(semana.value) > -1} />
                                            <ListItemText primaryTypographyProps={{ fontSize: '13px' }} primary={semana.label} />
                                        </MenuItem>
                                    ))}
                                </Select>
                                <Typography variant="caption" sx={{ color: '#868e96', mt: 0.5, ml: 1 }}>
                                    Deixe em branco para repetir toda semana.
                                </Typography>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#1c7ed6', mb: 2, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase' }}>
                                <AccessTime fontSize="small" /> Horários de Atendimento
                            </Typography>

                            <Box sx={{ p: 3, bgcolor: '#f8f9fa', borderRadius: 2, border: '1px solid #e9ecef' }}>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} sm={6}>
                                        <TimePicker 
                                            label="Início da Agenda" 
                                            value={formData.hora_inicio} 
                                            onChange={(v) => setFormData({...formData, hora_inicio: v})} 
                                            renderInput={(params) => <TextField {...params} fullWidth size="small" className="tasy-compact-input" />} 
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TimePicker 
                                            label="Fim da Agenda" 
                                            value={formData.hora_fim} 
                                            onChange={(v) => setFormData({...formData, hora_fim: v})} 
                                            renderInput={(params) => <TextField {...params} fullWidth size="small" className="tasy-compact-input" />} 
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField 
                                            label="Duração de cada Consulta (Minutos)" 
                                            type="number" 
                                            fullWidth 
                                            size="small" 
                                            className="tasy-compact-input" 
                                            value={formData.intervalo_consulta} 
                                            onChange={(e) => setFormData({...formData, intervalo_consulta: e.target.value})} 
                                        />
                                    </Grid>
                                </Grid>
                            </Box>

                            <Box sx={{ 
                                mt: 3, p: 2, 
                                bgcolor: formData.ativo ? '#e7f5ff' : '#fff5f5', 
                                borderRadius: 2, 
                                border: `1px solid ${formData.ativo ? '#74c0fc' : '#ffc9c9'}`, 
                                display: 'flex', alignItems: 'center' 
                            }}>
                                <FormControlLabel 
                                    control={<Switch size="small" checked={formData.ativo} onChange={(e) => setFormData({...formData, ativo: e.target.checked})} color="primary" />} 
                                    label={
                                        <Typography sx={{ fontSize: '14px', color: formData.ativo ? '#1864ab' : '#c92a2a', fontWeight: 600 }}>
                                            {formData.ativo ? 'Agenda Ativa (Aberta para marcações)' : 'Agenda Inativa (Bloqueada)'}
                                        </Typography>
                                    } 
                                />
                            </Box>
                        </Grid>
                    </Grid>
                </DialogContent>

                <DialogActions sx={{ p: 2, borderTop: '1px solid #e9ecef', bgcolor: '#f8f9fa' }}>
                    <Button onClick={() => setIsModalOpen(false)} sx={{ color: '#868e96', fontSize: '13px', fontWeight: 600, mr: 1 }}>Cancelar</Button>
                    <Button onClick={handleSave} variant="contained" disableElevation disabled={isSubmitting} sx={{ bgcolor: '#1c7ed6', fontSize: '13px', fontWeight: 600, minWidth: 140 }}>
                        {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Salvar Jornada'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}