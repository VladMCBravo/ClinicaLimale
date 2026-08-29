// src/components/agendamento/SecaoOrganizacao.jsx
// Horário de início/fim, modalidade e status. Extraído do AgendamentoModal.jsx sem
// mudar visual ou comportamento.
import React from 'react';
import { Box, Paper, Typography, Grid, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import { TextMaskDateTime } from './agendamentoHelpers';

export default function SecaoOrganizacao({
    dataInicioVisual = '', dataFimVisual = '', onDataInicioChange, onDataFimChange,
    formData, setFormData
}) {
    return (
        <Paper variant="outlined" sx={{ p: 1.25, mb: 1, borderRadius: 2, borderColor: '#e0e0e0', bgcolor: '#fff' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.75, color: 'primary.main' }}>
                <EventAvailableOutlinedIcon sx={{ mr: 1, fontSize: 20 }} />
                <Typography variant="subtitle2" fontWeight="bold">Organização</Typography>
            </Box>
            <Grid container spacing={1}>
                <Grid item xs={12} sm={6}>
                    <TextField
                        label="Início *"
                        value={dataInicioVisual || ''}
                        onChange={onDataInicioChange}
                        fullWidth
                        size="small"
                        placeholder="DD/MM/AAAA HH:MM"
                        InputProps={{ inputComponent: TextMaskDateTime }}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        label="Fim *"
                        value={dataFimVisual || ''}
                        onChange={onDataFimChange}
                        fullWidth
                        size="small"
                        placeholder="DD/MM/AAAA HH:MM"
                        InputProps={{ inputComponent: TextMaskDateTime }}
                    />
                </Grid>
            </Grid>

            <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' }, mt: 1 }}>
                <FormControl fullWidth size="small">
                    <InputLabel>Modalidade</InputLabel>
                    <Select
                        name="modalidade"
                        value={formData?.modalidade || 'Presencial'}
                        label="Modalidade"
                        onChange={(e) => setFormData({ ...formData, modalidade: e.target.value })}
                    >
                        <MenuItem value="Presencial">Presencial</MenuItem>
                        <MenuItem value="Telemedicina">Telemedicina</MenuItem>
                    </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                        name="status"
                        value={formData?.status || 'Agendado'}
                        label="Status"
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                        <MenuItem value="Agendado">Agendado</MenuItem>
                        <MenuItem value="Confirmado">Confirmado</MenuItem>
                        <MenuItem value="Aguardando">Aguardando (Check-in)</MenuItem>
                        <MenuItem value="Em Atendimento">Em Atendimento</MenuItem>
                        <MenuItem value="Realizado">Realizado</MenuItem>
                        <MenuItem value="Não Compareceu">Faltou / Não Compareceu</MenuItem>
                        <MenuItem value="Cancelado">Cancelado</MenuItem>
                    </Select>
                </FormControl>
            </Box>
        </Paper>
    );
}