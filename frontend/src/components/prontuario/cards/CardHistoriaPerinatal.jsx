// src/components/prontuario/cards/CardHistoriaPerinatal.jsx

import React from 'react';
import { Grid, TextField, Typography, Box } from '@mui/material';

export default function CardHistoriaPerinatal({ formData, handleChange }) {
    return (
        <Box sx={{ my: 2 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>História Perinatal</Typography>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <TextField name="tipo_parto" label="Tipo de Parto" fullWidth value={formData.tipo_parto || ''} onChange={handleChange} size="small" />
                </Grid>
                <Grid item xs={6} sm={3}>
                    <TextField name="apgar_1" label="Apgar 1'" fullWidth value={formData.apgar_1 || ''} onChange={handleChange} size="small" />
                </Grid>
                <Grid item xs={6} sm={3}>
                    <TextField name="apgar_5" label="Apgar 5'" fullWidth value={formData.apgar_5 || ''} onChange={handleChange} size="small" />
                </Grid>
                 <Grid item xs={12}>
                    <TextField name="complicacoes_parto" label="Complicações no Parto" fullWidth multiline rows={2} value={formData.complicacoes_parto || ''} onChange={handleChange} size="small" />
                </Grid>
            </Grid>
        </Box>
    );
}