// src/components/prontuario/especialidades/AnamneseCardiologia.jsx - VERSÃO "LIMPA" (SÓ HISTÓRICO)

import React, { useState, useEffect, useCallback } from 'react';
import { Paper, Typography, Grid, FormGroup, FormControlLabel, Checkbox, TextField, Divider } from '@mui/material';

// 1. 'sintomasOpcoes' e 'sintomaTemplates' FORAM REMOVIDOS DAQUI

const fatoresRiscoOpcoes = [
    { id: 'has', label: 'HAS' },
    { id: 'dm', label: 'DM' },
    { id: 'dislipidemia', label: 'Dislipidemia' },
    { id: 'tabagismo', label: 'Tabagismo' },
    { id: 'sedentarismo', label: 'Sedentarismo' },
    { id: 'historia_familiar_dac', label: 'Hist. Familiar de DAC' },
    { id: 'obesidade', label: 'Obesidade' },
];

export default function AnamneseCardiologia({ formData, onChange }) {
  const cardiologicaData = formData.cardiologica || {};
  
  // 2. State 'sintomas' e 'handleSintomasChange' REMOVIDOS
  const [fatoresRisco, setFatoresRisco] = useState(cardiologicaData.fatores_risco || {});

  const handleGenericChange = (name, value) => {
    onChange({
      target: {
        name: 'cardiologica',
        value: { ...cardiologicaData, [name]: value },
      },
    });
  };

  const handleFatoresRiscoChange = (event) => {
    const { name, checked } = event.target;
    setFatoresRisco(prev => ({ ...prev, [name]: checked }));
  };
  
  // 3. 'generateHda' REMOVIDO
  //    'useEffect' foi simplificado
  useEffect(() => {
    const fatoresRiscoSelecionados = Object.keys(fatoresRisco).filter(key => fatoresRisco[key]);

    onChange({
      target: {
        name: 'cardiologica',
        value: {
          ...cardiologicaData,
          fatores_risco: fatoresRisco,
          // Removemos 'sintomas' e 'hda' daqui
          fatores_risco_selecionados: fatoresRiscoSelecionados,
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fatoresRisco]);

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 2, borderColor: 'primary.main' }}>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
        Anamnese Cardiológica (Dados de Histórico)
      </Typography>
      
      {/* 4. Seção 'Sintomas Atuais' REMOVIDA */}
      
      <Divider sx={{ my: 2 }} />

      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Fatores de Risco (Histórico)</Typography>
      <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {fatoresRiscoOpcoes.map(opcao => (
          <FormControlLabel
            key={opcao.id}
            control={<Checkbox checked={fatoresRisco[opcao.id] || false} onChange={handleFatoresRiscoChange} name={opcao.id} />}
            label={opcao.label}
          />
        ))}
      </FormGroup>

      {/* 5. Seção 'Exame Físico' (PA, FC, etc.) REMOVIDA, pois é feita na Evolução */}
      <Divider sx={{ my: 2 }} />

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
            <TextField 
                label="Medicamentos em Uso (Contínuo)"
                name="medicamentos_em_uso"
                value={cardiologicaData.medicamentos_em_uso || ''}
                onChange={(e) => handleGenericChange('medicamentos_em_uso', e.target.value)}
                multiline
                rows={4}
                fullWidth
            />
        </Grid>
        <Grid item xs={12} sm={6}>
            <TextField 
                label="Histórico Familiar Relevante"
                name="historico_familiar"
                value={cardiologicaData.historico_familiar || ''}
                onChange={(e) => handleGenericChange('historico_familiar', e.target.value)}
                multiline
                rows={4}
                fullWidth
                placeholder="Ex: Pai teve infarto aos 50 anos."
            />
        </Grid>
      </Grid>
    </Paper>
  );
}