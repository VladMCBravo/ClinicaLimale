// src/components/prontuario/especialidades/ExameFisicoNeonatologia.jsx (NOVO ARQUIVO)

import React from 'react';
import { Paper, Typography, Grid, TextField } from '@mui/material';

// Função auxiliar para simplificar a criação dos campos
const CampoTexto = ({ label, name, value, onChange }) => (
    <Grid item xs={12} sm={6} md={4}>
        <TextField label={label} name={name} value={value || ''} onChange={onChange} fullWidth size="small" />
    </Grid>
);

export default function ExameFisicoNeonatologia({ formData, onChange }) {
  const neoExameData = formData.exame_fisico_neo || {};

  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange({ target: { name: 'exame_fisico_neo', value: { ...neoExameData, [name]: value } } });
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Exame Físico do Recém-Nascido</Typography>
      <Grid container spacing={2}>
        <CampoTexto label="Atitude / Berço" name="atitude" value={neoExameData.atitude} onChange={handleChange} />
        <CampoTexto label="Pele (Cor, Lesões, Icterícia)" name="pele" value={neoExameData.pele} onChange={handleChange} />
        <CampoTexto label="Cabeça/Pescoço (Fontanela, Suturas)" name="cabeca_pescoco" value={neoExameData.cabeca_pescoco} onChange={handleChange} />
        <CampoTexto label="Aparelho Respiratório (FR, Ritmo, Silverman)" name="respiratorio" value={neoExameData.respiratorio} onChange={handleChange} />
        <CampoTexto label="Aparelho Cardiovascular (FC, Pulsos)" name="cardiovascular" value={neoExameData.cardiovascular} onChange={handleChange} />
        <CampoTexto label="Abdome (Mecônio, Fígado)" name="abdome" value={neoExameData.abdome} onChange={handleChange} />
        <CampoTexto label="Geniturinário" name="geniturinario" value={neoExameData.geniturinario} onChange={handleChange} />
        <CampoTexto label="Osteoarticular (Ortolani, Membros)" name="osteoarticular" value={neoExameData.osteoarticular} onChange={handleChange} />
        <CampoTexto label="Exame Neurológico (Reflexos, Tônus)" name="neurologico" value={neoExameData.neurologico} onChange={handleChange} />
      </Grid>
    </Paper>
  );
}