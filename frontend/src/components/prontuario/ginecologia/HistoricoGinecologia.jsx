// src/components/prontuario/ginecologia/HistoricoGinecologia.jsx
// NOVO COMPONENTE (Aba 2)

import React, { useState, useEffect, useCallback } from 'react';
import {
    Paper, Typography, TextField, Box, Button, CircularProgress, Grid, Divider,
    RadioGroup, FormControlLabel, Radio, FormControl, FormLabel // Adicionados para ciclo/dismenorreia
} from '@mui/material';
import { useSnackbar } from '../../../contexts/SnackbarContext'; // Usar ../../../
import apiClient from '../../../api/axiosConfig'; // Usar ../../../

export default function HistoricoGinecologia({ pacienteId }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [anamneseData, setAnamneseData] = useState({});

    // 1. FUNÇÃO DE CARREGAMENTO
    const fetchAnamnese = useCallback(async () => {
        if (!pacienteId) return;
        setIsLoading(true);
        try {
            const res = await apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`);
            if (res.data && res.data.ginecologica) {
                setAnamneseData(res.data.ginecologica);
            } else {
                setAnamneseData({});
            }
        } catch (err) { /* ... (tratamento de erro) ... */ }
        finally { setIsLoading(false); }
    }, [pacienteId, showSnackbar]);

    useEffect(() => { fetchAnamnese(); }, [fetchAnamnese]);

    // 2. HANDLERS
    const handleChange = (e) => {
        const { name, value, type } = e.target;
        // Trata campos de data vazios
        const finalValue = type === 'date' && value === '' ? null : value;
        setAnamneseData(prev => ({ ...prev, [name]: finalValue }));
    };

    // 3. FUNÇÃO DE SALVAR
    const handleSaveAnamnese = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/anamnese/`, {
                ginecologica: anamneseData
            });
            showSnackbar('Histórico ginecológico salvo com sucesso!', 'success');
        } catch (error) { /* ... (tratamento de erro) ... */ }
        finally { setIsSubmitting(false); }
    };

    if (isLoading) { /* ... Loading ... */ }

    // 4. JSX (Formulário do Histórico Ginecológico)
    return (
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, borderColor: 'grey.400' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Histórico Ginecológico (Anamnese)
            </Typography>

            {/* Histórico Menstrual */}
            <Typography variant="body1" sx={{ mt: 2, fontWeight: 'medium' }}>Histórico Menstrual</Typography>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={6} sm={3}>
                    <TextField label="DUM" name="dum" type="date" InputLabelProps={{ shrink: true }} fullWidth size="small"
                        value={anamneseData.dum || ''} onChange={handleChange} />
                </Grid>
                <Grid item xs={6} sm={3}>
                    <TextField label="Idade Menarca" name="menarca_idade" type="number" fullWidth size="small"
                        value={anamneseData.menarca_idade || ''} onChange={handleChange} />
                </Grid>
                 <Grid item xs={12} sm={6}>
                     <FormControl component="fieldset" size="small">
                        <FormLabel component="legend" sx={{fontSize: '0.8rem'}}>Ciclo Menstrual</FormLabel>
                        <RadioGroup row name="ciclo_regular" value={anamneseData.ciclo_regular || ''} onChange={handleChange}>
                            <FormControlLabel value="regular" control={<Radio size="small" />} label="Regular" />
                            <FormControlLabel value="irregular" control={<Radio size="small" />} label="Irregular" />
                        </RadioGroup>
                    </FormControl>
                 </Grid>
                 <Grid item xs={6} sm={4}>
                    <TextField label="Intervalo Ciclo" name="ciclo_intervalo" fullWidth size="small"
                        value={anamneseData.ciclo_intervalo || ''} onChange={handleChange} placeholder="Ex: 28 dias"/>
                </Grid>
                 <Grid item xs={6} sm={4}>
                    <TextField label="Duração Ciclo" name="ciclo_duracao" fullWidth size="small"
                        value={anamneseData.ciclo_duracao || ''} onChange={handleChange} placeholder="Ex: 5 dias"/>
                </Grid>
                 <Grid item xs={12} sm={4}>
                     <FormControl component="fieldset" size="small">
                        <FormLabel component="legend" sx={{fontSize: '0.8rem'}}>Dismenorreia</FormLabel>
                        <RadioGroup row name="dismenorreia" value={anamneseData.dismenorreia || 'nao'} onChange={handleChange}>
                            <FormControlLabel value="sim" control={<Radio size="small" />} label="Sim" />
                            <FormControlLabel value="nao" control={<Radio size="small" />} label="Não" />
                        </RadioGroup>
                    </FormControl>
                 </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* Histórico Obstétrico */}
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Histórico Obstétrico</Typography>
             <Grid container spacing={2} sx={{ mt: 0.5 }}>
                 <Grid item xs={3}><TextField label="Gesta (G)" name="gesta" type="number" fullWidth size="small" value={anamneseData.gesta || ''} onChange={handleChange} /></Grid>
                 <Grid item xs={3}><TextField label="Para (P)" name="para" type="number" fullWidth size="small" value={anamneseData.para || ''} onChange={handleChange} /></Grid>
                 <Grid item xs={3}><TextField label="Cesáreas (C)" name="cesareas" type="number" fullWidth size="small" value={anamneseData.cesareas || ''} onChange={handleChange} /></Grid>
                 <Grid item xs={3}><TextField label="Abortos (A)" name="abortos" type="number" fullWidth size="small" value={anamneseData.abortos || ''} onChange={handleChange} /></Grid>
                 <Grid item xs={12}>
                     <TextField label="Complicações Obstétricas Anteriores" name="complicacoes_obstetricas" multiline rows={2} fullWidth size="small"
                        value={anamneseData.complicacoes_obstetricas || ''} onChange={handleChange}/>
                </Grid>
             </Grid>

            <Divider sx={{ my: 2 }} />

            {/* Rastreamento, Contracepção, ISTs */}
            <Grid container spacing={2}>
                 <Grid item xs={12} md={6}>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Rastreamento</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField label="Último Preventivo (Data)" name="ultimo_preventivo_data" type="date" InputLabelProps={{ shrink: true }} fullWidth size="small" value={anamneseData.ultimo_preventivo_data || ''} onChange={handleChange} />
                        <TextField label="Resultado Preventivo" name="ultimo_preventivo_resultado" fullWidth size="small" value={anamneseData.ultimo_preventivo_resultado || ''} onChange={handleChange} />
                        <TextField label="Última Mamografia (Data)" name="ultima_mamografia_data" type="date" InputLabelProps={{ shrink: true }} fullWidth size="small" value={anamneseData.ultima_mamografia_data || ''} onChange={handleChange} />
                         <TextField label="Resultado Mamografia" name="ultima_mamografia_resultado" fullWidth size="small" value={anamneseData.ultima_mamografia_resultado || ''} onChange={handleChange} />
                    </Box>
                 </Grid>
                  <Grid item xs={12} md={6}>
                     <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Contracepção e ISTs</Typography>
                     <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField label="Método Contraceptivo Atual (MAC)" name="mac_atual" fullWidth size="small" value={anamneseData.mac_atual || ''} onChange={handleChange} />
                        <TextField label="Métodos Anteriores" name="mac_anterior" fullWidth size="small" value={anamneseData.mac_anterior || ''} onChange={handleChange} />
                        <TextField label="Histórico de ISTs" name="hists_ists" multiline rows={4} fullWidth size="small" value={anamneseData.hists_ists || ''} onChange={handleChange} />
                     </Box>
                 </Grid>
            </Grid>

            {/* Botão Salvar */}
            <Box sx={{ textAlign: 'right', mt: 3 }}>
                <Button onClick={handleSaveAnamnese} variant="contained" color="primary" disabled={isSubmitting}>
                    {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Histórico'}
                </Button>
            </Box>
        </Paper>
    );
}