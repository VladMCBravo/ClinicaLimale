// src/components/prontuario/especialidades/AnamneseReumatologiaPediatrica.jsx
import React from 'react';
import { Typography, Paper } from '@mui/material';

export default function AnamneseReumatologiaPediatrica({ formData, onChange }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
        Anamnese de Reumatologia Pediátrica
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Campos específicos para Reumatologia Pediátrica aparecerão aqui.
      </Typography>
    </Paper>
  );
}
