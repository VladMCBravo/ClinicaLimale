// src/components/prontuario/neonatologia/HistoricoNeonatologia.jsx
// NOVO COMPONENTE (Aba 2)

import React, { useState, useEffect, useCallback } from 'react';
import {
    Paper, Typography, TextField, Box, Button, CircularProgress, Grid, Divider,
    FormGroup, FormControlLabel, Checkbox // Para Sorologias e Triagens
} from '@mui/material';
// --- CORREÇÃO DOS CAMINHOS ---
import { useSnackbar } from '../../../contexts/SnackbarContext'; // Usar ../../../
import apiClient from '../../../api/axiosConfig'; // Usar ../../../
// --- FIM DA CORREÇÃO ---

// Opções para checkboxes (Exemplo)
const sorologiasOptions = [
    { id: 'hiv', label: 'HIV' }, { id: 'vdrl', label: 'VDRL' }, { id: 'hep_b', label: 'Hep B (HBsAg)' },
    { id: 'hep_c', label: 'Hep C' }, { id: 'toxo', label: 'Toxoplasmose' }, { id: 'cmv', label: 'CMV' },
    { id: 'strepto_b', label: 'Strepto B' },
];
const triagensOptions = [
    { id: 'pezinho', label: 'Pezinho' }, { id: 'orelhinha', label: 'Orelhinha' },
    { id: 'olhinho', label: 'Olhinho' }, { id: 'coracaozinho', label: 'Coraçãozinho' },
    { id: 'linguinha', label: 'Linguinha' },
];


export default function HistoricoNeonatologia({ pacienteId }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [anamneseData, setAnamneseData] = useState({});
    // Estados separados para JSONFields
    const [sorologias, setSorologias] = useState({});
    const [triagens, setTriagens] = useState({});

    // 1. FUNÇÃO DE CARREGAMENTO
    const fetchAnamnese = useCallback(async () => {
        if (!pacienteId) return;
        setIsLoading(true);
        try {
            const res = await apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`);
            if (res.data && res.data.neonatologia) {
                setAnamneseData(res.data.neonatologia);
                setSorologias(res.data.neonatologia.sorologias || {});
                setTriagens(res.data.neonatologia.triagens || {});
            } else {
                setAnamneseData({});
                setSorologias({});
                setTriagens({});
            }
        } catch (err) {
            if (err.response && err.response.status !== 404) {
                showSnackbar('Erro ao carregar histórico neonatal.', 'error');
            }
        } finally {
            setIsLoading(false);
        }
    }, [pacienteId, showSnackbar]);

    useEffect(() => {
        fetchAnamnese();
    }, [fetchAnamnese]);

    // 2. HANDLERS
    const handleChange = (e) => {
        setAnamneseData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    const handleSorologiasChange = (e) => {
        setSorologias(prev => ({ ...prev, [e.target.name]: e.target.checked }));
    };
    const handleTriagensChange = (e) => {
        setTriagens(prev => ({ ...prev, [e.target.name]: e.target.checked }));
    };

    // 3. FUNÇÃO DE SALVAR
    const handleSaveAnamnese = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);

        const payload = {
            ...anamneseData,
            sorologias: sorologias,
            triagens: triagens,
        };

        try {
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/anamnese/`, {
                neonatologia: payload
            });
            showSnackbar('Histórico neonatal salvo com sucesso!', 'success');
        } catch (error) {
            console.error("Erro ao salvar anamnese neonatal:", error.response?.data);
            showSnackbar('Erro ao salvar histórico.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    // 4. JSX (Formulário do Histórico Neonatal)
    return (
        <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, borderColor: 'grey.400' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Histórico Neonatal (Anamnese)
            </Typography>

            {/* Dados Maternos */}
            <Typography variant="body1" sx={{ mt: 2, fontWeight: 'medium' }}>Histórico Materno</Typography>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={6} sm={3}>
                    <TextField label="Idade Materna" name="idade_materna" type="number" fullWidth size="small"
                        value={anamneseData.idade_materna || ''} onChange={handleChange} />
                </Grid>
                <Grid item xs={6} sm={3}>
                    <TextField label="G P A" name="gpa" fullWidth size="small"
                        value={anamneseData.gpa || ''} onChange={handleChange} placeholder="G_ P_ A_" />
                </Grid>
                <Grid item xs={6} sm={3}>
                    <TextField label="Tipagem Mãe" name="tipo_sanguineo_mae" fullWidth size="small"
                        value={anamneseData.tipo_sanguineo_mae || ''} onChange={handleChange} placeholder="Ex: O+" />
                </Grid>
                 <Grid item xs={6} sm={3}>
                    <TextField label="Coombs Ind." name="coombs_indireto" fullWidth size="small"
                        value={anamneseData.coombs_indireto || ''} onChange={handleChange} placeholder="Negativo/Positivo" />
                </Grid>
                <Grid item xs={12}>
                     <Typography variant="body2" sx={{ fontWeight: 'medium' }}>Sorologias Maternas:</Typography>
                     <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
                        {sorologiasOptions.map(opt => (
                            <FormControlLabel key={opt.id} control={<Checkbox size="small" checked={sorologias[opt.id] || false} onChange={handleSorologiasChange} name={opt.id} />} label={opt.label} />
                        ))}
                    </FormGroup>
                </Grid>
                <Grid item xs={12}>
                    <TextField label="Intercorrências na Gestação" name="intercorrencias_gestacao" multiline rows={2} fullWidth size="small"
                        value={anamneseData.intercorrencias_gestacao || ''} onChange={handleChange} placeholder="Ex: DMG, Pré-eclâmpsia"/>
                </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

             {/* Dados do Parto */}
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Dados do Parto</Typography>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
                 <Grid item xs={6} sm={3}>
                    <TextField label="Tipo de Parto" name="tipo_parto" fullWidth size="small"
                        value={anamneseData.tipo_parto || ''} onChange={handleChange} placeholder="Cesárea/Normal"/>
                </Grid>
                 <Grid item xs={6} sm={3}>
                    <TextField label="IG Parto" name="idade_gestacional" fullWidth size="small"
                        value={anamneseData.idade_gestacional || ''} onChange={handleChange} placeholder="Ex: 39s 2d"/>
                </Grid>
                 <Grid item xs={12} sm={6}>
                    <TextField label="Bolsa Rota" name="bolsa_rota" fullWidth size="small"
                        value={anamneseData.bolsa_rota || ''} onChange={handleChange} placeholder="Tempo / Aspecto"/>
                </Grid>
                 <Grid item xs={12}>
                    <TextField label="Líquido Amniótico" name="liquido_amniotico" fullWidth size="small"
                        value={anamneseData.liquido_amniotico || ''} onChange={handleChange} placeholder="Claro / Meconial"/>
                </Grid>
                 <Grid item xs={12}>
                    <TextField label="Reanimação em Sala de Parto" name="reanimacao" multiline rows={2} fullWidth size="small"
                        value={anamneseData.reanimacao || ''} onChange={handleChange} placeholder="Ex: VPP por 30s, Apgar 5->8"/>
                </Grid>
            </Grid>

             <Divider sx={{ my: 2 }} />

            {/* Dados do RN */}
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Dados do Recém-Nascido ao Nascer</Typography>
             <Grid container spacing={2} sx={{ mt: 0.5 }}>
                 <Grid item xs={6} sm={3}>
                    <TextField label="Peso (g)" name="peso_nascimento" type="number" fullWidth size="small"
                        value={anamneseData.peso_nascimento || ''} onChange={handleChange} />
                </Grid>
                <Grid item xs={6} sm={3}>
                    <TextField label="Comprimento (cm)" name="comprimento" type="number" step="0.1" fullWidth size="small"
                        value={anamneseData.comprimento || ''} onChange={handleChange} />
                </Grid>
                 <Grid item xs={6} sm={3}>
                    <TextField label="PC Nasc (cm)" name="pc_nascimento" type="number" step="0.1" fullWidth size="small"
                        value={anamneseData.pc_nascimento || ''} onChange={handleChange} />
                </Grid>
                <Grid item xs={6} sm={3}>
                    <TextField label="APGAR (1'/5')" name="apgar" fullWidth size="small"
                        value={anamneseData.apgar || ''} onChange={handleChange} placeholder="Ex: 8/9"/>
                </Grid>
                 <Grid item xs={12}>
                     <Typography variant="body2" sx={{ fontWeight: 'medium' }}>Triagens Neonatais Realizadas:</Typography>
                     <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
                        {triagensOptions.map(opt => (
                            <FormControlLabel key={opt.id} control={<Checkbox size="small" checked={triagens[opt.id] || false} onChange={handleTriagensChange} name={opt.id} />} label={opt.label} />
                        ))}
                    </FormGroup>
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