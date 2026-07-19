// src/components/agendamento/SecaoDadosClinicos.jsx
// Tipo de agendamento, especialidade/médico, sala, procedimentos e o switch de Encaixe.
// Extraído do AgendamentoModal.jsx sem mudar visual ou comportamento.
import React from 'react';
import {
    Box, Paper, Typography, FormControl,
    Autocomplete, TextField, Chip, Alert, FormControlLabel, Switch,
    ToggleButtonGroup, ToggleButton
} from '@mui/material';
import MedicalInformationOutlinedIcon from '@mui/icons-material/MedicalInformationOutlined';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';

export default function SecaoDadosClinicos({
    tipoAgendamento, setTipoAgendamento,
    formData, setFormData,
    especialidades, medicos, salasFiltradas, procedimentos,
    onProcedimentosChange,
    editingEvent,
    bloqueioCapacidade, isEncaixe, setIsEncaixe
}) {
    return (
        <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, borderRadius: 2, borderColor: '#e0e0e0', bgcolor: '#fff' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: 'primary.main' }}>
                <MedicalInformationOutlinedIcon sx={{ mr: 1, fontSize: 20 }} />
                <Typography variant="subtitle2" fontWeight="bold">Dados Clínicos</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>

                {/* Tipo é o campo que mais muda o resto do formulário, então vira um toggle
                    em destaque em vez de um dropdown pequeno perdido entre os outros campos. */}
                <ToggleButtonGroup
                    value={tipoAgendamento}
                    exclusive
                    color="primary"
                    fullWidth
                    size="small"
                    onChange={(e, value) => { if (value) setTipoAgendamento(value); }}
                >
                    <ToggleButton value="Consulta" sx={{ fontWeight: 700, textTransform: 'none', gap: 0.75 }}>
                        <EventNoteIcon sx={{ fontSize: 18 }} /> Consulta
                    </ToggleButton>
                    <ToggleButton value="Procedimento" sx={{ fontWeight: 700, textTransform: 'none', gap: 0.75 }}>
                        <ScienceOutlinedIcon sx={{ fontSize: 18 }} /> Procedimento
                    </ToggleButton>
                </ToggleButtonGroup>

                {tipoAgendamento === 'Consulta' && (
                    <Autocomplete fullWidth options={especialidades} getOptionLabel={(e) => e.nome || ''} value={formData.especialidade} isOptionEqualToValue={(o, v) => o.id === v.id} onChange={(e, value) => setFormData({ ...formData, especialidade: value, medico: null })} renderInput={(params) => <TextField {...params} label="Especialidade *" size="small" />} />
                )}

                <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                    {tipoAgendamento === 'Consulta' ? (
                        <Autocomplete fullWidth options={medicos.filter(m => formData.especialidade ? m.especialidades.includes(formData.especialidade.id) : true)} getOptionLabel={(m) => m.first_name + ' ' + m.last_name} value={formData.medico} isOptionEqualToValue={(o, v) => o.id === v.id} onChange={(e, value) => setFormData({ ...formData, medico: value })} disabled={!formData.especialidade} renderInput={(params) => <TextField {...params} label="Médico *" size="small" />} />
                    ) : (
                        <Autocomplete fullWidth options={medicos} getOptionLabel={(m) => m.first_name + ' ' + m.last_name} value={formData.medico} isOptionEqualToValue={(o, v) => o.id === v.id} onChange={(e, value) => setFormData({ ...formData, medico: value })} renderInput={(params) => <TextField {...params} label="Médico Responsável *" size="small" error={!formData.medico} />} />
                    )}

                    <FormControl fullWidth>
                        <Autocomplete options={salasFiltradas} getOptionLabel={(s) => s.nome || ''} value={formData.sala} isOptionEqualToValue={(o, v) => o.id === v.id} onChange={(e, value) => setFormData(prev => ({ ...prev, sala: value }))} renderInput={(params) => (<TextField {...params} label="Sala *" size="small" error={!formData.sala} />)} noOptionsText="Nenhuma sala" />
                    </FormControl>
                </Box>

                {tipoAgendamento === 'Procedimento' && (
                    <Autocomplete multiple options={procedimentos} getOptionLabel={(p) => p.descricao || ''} value={formData.procedimentos} isOptionEqualToValue={(o, v) => o.id === v.id} onChange={onProcedimentosChange} disableCloseOnSelect renderInput={(params) => (<TextField {...params} label={editingEvent ? "Procedimento *" : "Procedimentos *"} size="small" placeholder={formData.procedimentos.length > 0 ? "" : "Selecione..."} />)} renderTags={(value, getTagProps) => value.map((option, index) => (<Chip variant="filled" color="primary" label={option.descricao} size="small" sx={{ color: '#fff', height: 20 }} {...getTagProps({ index })} />))} />
                )}

                {bloqueioCapacidade && (
                    <Alert
                        severity={bloqueioCapacidade ? "warning" : "info"}
                        sx={{ alignItems: 'center', py: 0, '& .MuiAlert-message': { py: 0 } }}
                    >
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={isEncaixe}
                                    onChange={(e) => setIsEncaixe(e.target.checked)}
                                    color={bloqueioCapacidade ? "warning" : "info"}
                                    size="small"
                                />
                            }
                            label={
                                <Typography variant="caption" fontWeight="bold">
                                    {bloqueioCapacidade ? "Forçar Encaixe (Lotado)" : "Marcar como Encaixe ⚡"}
                                </Typography>
                            }
                            sx={{ m: 0 }}
                        />
                    </Alert>
                )}
            </Box>
        </Paper>
    );
}
