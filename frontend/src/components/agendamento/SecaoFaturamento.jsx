// src/components/agendamento/SecaoFaturamento.jsx
// Tipo de atendimento, isenção, convênio/plano e o valor previsto. Extraído do
// AgendamentoModal.jsx sem mudar visual ou comportamento.
import React from 'react';
import {
    Box, Paper, Typography, FormControl, InputLabel, Select, MenuItem,
    Switch, FormControlLabel, TextField, Autocomplete, Alert
} from '@mui/material';
import AttachMoneyOutlinedIcon from '@mui/icons-material/AttachMoneyOutlined';

export default function SecaoFaturamento({
    formData, setFormData,
    convenios, convenioSelecionado, setConvenioSelecionado,
    planos, infoFinanceira
}) {
    return (
        <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2, borderColor: '#e0e0e0', bgcolor: '#fff' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.75, color: 'primary.main' }}>
                <AttachMoneyOutlinedIcon sx={{ mr: 1, fontSize: 20 }} />
                <Typography variant="subtitle2" fontWeight="bold">Faturamento</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>

                <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center' }}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Tipo</InputLabel>
                        <Select name="tipo_atendimento" value={formData.tipo_atendimento} label="Tipo" onChange={(e) => setFormData({ ...formData, tipo_atendimento: e.target.value })}>
                            <MenuItem value="Particular">Particular</MenuItem>
                            <MenuItem value="Convenio">Convênio</MenuItem>
                        </Select>
                    </FormControl>

                    <Box sx={{ p: 0.5, bgcolor: formData.isento_cobranca ? '#e8f5e9' : 'transparent', borderRadius: 1, whiteSpace: 'nowrap' }}>
                        <FormControlLabel control={<Switch checked={formData.isento_cobranca || false} onChange={(e) => setFormData({ ...formData, isento_cobranca: e.target.checked })} color="success" size="small" />} label={<Typography variant="body2" fontWeight="bold" color={formData.isento_cobranca ? 'success.dark' : 'text.primary'}>Isentar</Typography>} sx={{ m: 0 }} />
                    </Box>
                </Box>

                {formData.isento_cobranca && (<TextField label="Motivo da Isenção *" size="small" fullWidth value={formData.motivo_isencao || ''} onChange={(e) => setFormData({ ...formData, motivo_isencao: e.target.value })} required={formData.isento_cobranca} placeholder="Ex: Retorno..." sx={{ bgcolor: '#fff' }} />)}

                {formData.tipo_atendimento === 'Convenio' && (
                    <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                        <FormControl fullWidth size="small">
                            <Autocomplete options={convenios} getOptionLabel={(option) => option.nome || ''} value={convenioSelecionado} isOptionEqualToValue={(option, value) => option.id === value.id} onChange={(event, newValue) => { setConvenioSelecionado(newValue); setFormData({ ...formData, plano_utilizado: null }); }} renderInput={(params) => <TextField {...params} label="Empresa *" size="small" />} />
                        </FormControl>
                        <FormControl fullWidth size="small">
                            <Autocomplete options={convenioSelecionado ? planos.filter(p => p.convenio_nome === convenioSelecionado.nome) : []} getOptionLabel={(option) => option.nome || ''} value={formData.plano_utilizado} disabled={!convenioSelecionado} isOptionEqualToValue={(option, value) => option.id === value.id} onChange={(event, newValue) => setFormData({ ...formData, plano_utilizado: newValue })} renderInput={(params) => <TextField {...params} label="Plano *" error={!formData.plano_utilizado} size="small" />} noOptionsText={convenioSelecionado ? "Nenhum plano" : "Empresa..."} />
                        </FormControl>
                    </Box>
                )}

                {infoFinanceira && infoFinanceira.status === 'ok' && (
                    <Box sx={{ p: 1, bgcolor: '#fdf1e2', border: '1px solid #e8b374', borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ color: '#a35a1d' }}>Total Previsto:</Typography><Typography variant="body2" sx={{ color: '#a35a1d' }} fontWeight="bold">{infoFinanceira.texto}</Typography>
                    </Box>
                )}

                {infoFinanceira && infoFinanceira.status === 'erro' && (<Alert severity="error" sx={{ py: 0, '& .MuiAlert-message': { py: 0 } }}>{infoFinanceira.texto}</Alert>)}
            </Box>
        </Paper>
    );
}
