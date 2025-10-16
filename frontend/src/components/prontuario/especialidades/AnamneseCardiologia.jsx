// src/components/prontuario/especialidades/AnamneseCardiologia.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Paper, Typography, Grid, FormGroup, FormControlLabel, Checkbox, TextField, Divider } from '@mui/material';

const sintomasOpcoes = [
  { id: 'dor_toracica', label: 'Dor torácica' },
  { id: 'dispneia', label: 'Dispneia' },
  { id: 'palpitacoes', label: 'Palpitações' },
  { id: 'sincope_tontura', label: 'Síncope / Tontura' },
  { id: 'edema_membros', label: 'Edema de MMII' },
  { id: 'claudicacao', label: 'Claudicação' },
  { id: 'fadiga', label: 'Fadiga' },
];

const fatoresRiscoOpcoes = [
    { id: 'has', label: 'HAS' },
    { id: 'dm', label: 'DM' },
    { id: 'dislipidemia', label: 'Dislipidemia' },
    { id: 'tabagismo', label: 'Tabagismo' },
    { id: 'sedentarismo', label: 'Sedentarismo' },
    { id: 'historia_familiar_dac', label: 'Hist. Familiar de DAC' },
    { id: 'obesidade', label: 'Obesidade' },
];

const sintomaTemplates = {
  dor_toracica: `Dor torácica:
- Localização e irradiação:
- Tipo/Caráter (aperto, pontada, queimação):
- Intensidade (0-10):
- Duração e frequência:
- Fatores desencadeantes (esforço, repouso, posição):
- Fatores de alívio (repouso, medicação):
- Sintomas associados (sudorese, náuseas, dispneia, palpitações):
`,
  dispneia: `Dispneia:
- Relação com esforço (grandes, médios, pequenos esforços - Classe Funcional I-IV):
- Relação com decúbito (ortopneia, dispneia paroxística noturna):
- Duração e frequência:
- Sintomas associados (tosse, sibilância, edema):
`,
  palpitacoes: `Palpitações:
- Início e término (súbito ou gradual):
- Ritmo (rápido, lento, regular, irregular):
- Duração e frequência:
- Fatores desencadeantes (esforço, emoção, repouso):
- Sintomas associados (tontura, síncope, dor torácica):
`,
  sincope_tontura: `Síncope / Tontura:
- Descrição do evento (perda de consciência, sensação de desmaio):
- Pródromos (náuseas, sudorese, visão turva):
- Duração e recuperação:
- Posição no momento do evento (em pé, sentado, deitado):
- Fatores desencadeantes (mudança de postura, emoção, esforço):
`,
  edema_membros: `Edema de membros inferiores:
- Localização (bilateral, unilateral):
- Período do dia (matutino, vespertino):
- Intensidade (Cacifo/Godet: + a ++++):
- Relação com posição (melhora ao elevar MMII):
- Sintomas associados (dispneia, dor, alteração de cor da pele):
`,
  claudicacao: `Claudicação intermitente:
- Localização da dor (panturrilha, coxa, glúteo):
- Distância/esforço que desencadeia a dor:
- Tempo de repouso para alívio:
- Evolução (distância diminuindo):
`,
  fadiga: `Fadiga / Cansaço excessivo:
- Relação com esforço:
- Limitação nas atividades diárias:
- Período do dia em que é mais intensa:
`
};

export default function AnamneseCardiologia({ formData, onChange }) {
  const cardiologicaData = formData.cardiologica || {};
  const [sintomas, setSintomas] = useState(cardiologicaData.sintomas || {});
  const [fatoresRisco, setFatoresRisco] = useState(cardiologicaData.fatores_risco || {});

  const handleGenericChange = (name, value) => {
    onChange({
      target: {
        name: 'cardiologica',
        value: { ...cardiologicaData, [name]: value },
      },
    });
  };

  const handleSintomasChange = (event) => {
    const { name, checked } = event.target;
    setSintomas(prev => ({ ...prev, [name]: checked }));
  };

  const handleFatoresRiscoChange = (event) => {
    const { name, checked } = event.target;
    setFatoresRisco(prev => ({ ...prev, [name]: checked }));
  };

  const generateHda = useCallback(() => {
    const hdaText = sintomasOpcoes
      .filter(opt => sintomas[opt.id])
      .map(opt => sintomaTemplates[opt.id])
      .join('\n');
    return hdaText;
  }, [sintomas]);

  useEffect(() => {
    const hda = generateHda();
    const fatoresRiscoSelecionados = Object.keys(fatoresRisco).filter(key => fatoresRisco[key]);

    onChange({
      target: {
        name: 'cardiologica',
        value: {
          ...cardiologicaData,
          sintomas,
          fatores_risco: fatoresRisco,
          hda: hda || cardiologicaData.hda || '', // Mantém texto digitado se desmarcar tudo
          fatores_risco_selecionados: fatoresRiscoSelecionados,
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sintomas, fatoresRisco]);

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 2, borderColor: 'primary.main' }}>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
        Anamnese Cardiológica
      </Typography>
      
      <Typography variant="body1" sx={{ mt: 2, fontWeight: 'medium' }}>Sintomas Atuais</Typography>
      <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {sintomasOpcoes.map(opcao => (
          <FormControlLabel
            key={opcao.id}
            control={<Checkbox checked={sintomas[opcao.id] || false} onChange={handleSintomasChange} name={opcao.id} />}
            label={opcao.label}
          />
        ))}
      </FormGroup>
      
      <TextField
        label="História da Doença Atual (HDA)"
        name="hda"
        value={cardiologicaData.hda || ''}
        onChange={(e) => handleGenericChange('hda', e.target.value)}
        multiline
        rows={10}
        fullWidth
        sx={{ mb: 2 }}
      />

      <Divider sx={{ my: 2 }} />

      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Fatores de Risco</Typography>
      <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {fatoresRiscoOpcoes.map(opcao => (
          <FormControlLabel
            key={opcao.id}
            control={<Checkbox checked={fatoresRisco[opcao.id] || false} onChange={handleFatoresRiscoChange} name={opcao.id} />}
            label={opcao.label}
          />
        ))}
      </FormGroup>

      <Divider sx={{ my: 2 }} />

      <Typography variant="body1" sx={{ mt: 2, mb: 2, fontWeight: 'medium' }}>Exame Físico Cardiológico</Typography>
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}><TextField label="PA (mmHg)" name="pa" value={cardiologicaData.pa || ''} onChange={(e) => handleGenericChange('pa', e.target.value)} fullWidth /></Grid>
        <Grid item xs={6} sm={3}><TextField label="FC (bpm)" name="fc" value={cardiologicaData.fc || ''} onChange={(e) => handleGenericChange('fc', e.target.value)} fullWidth /></Grid>
        <Grid item xs={12} sm={6}><TextField label="Ictus Cordis" name="ictus_cordis" value={cardiologicaData.ictus_cordis || ''} onChange={(e) => handleGenericChange('ictus_cordis', e.target.value)} fullWidth placeholder="Ex: Visível, palpável em 5º EIC..." /></Grid>
        <Grid item xs={12}><TextField label="Ausculta Cardíaca" name="ausculta_cardiaca" value={cardiologicaData.ausculta_cardiaca || ''} onChange={(e) => handleGenericChange('ausculta_cardiaca', e.target.value)} fullWidth placeholder="Ex: BRNF em 2T, sem sopros..." /></Grid>
        <Grid item xs={12}><TextField label="Pulsos Periféricos" name="pulsos" value={cardiologicaData.pulsos || ''} onChange={(e) => handleGenericChange('pulsos', e.target.value)} fullWidth placeholder="Ex: Simétricos, cheios, sem déficits..."/></Grid>
        <Grid item xs={12}><TextField label="Outros achados" name="exame_fisico_outros" value={cardiologicaData.exame_fisico_outros || ''} onChange={(e) => handleGenericChange('exame_fisico_outros', e.target.value)} multiline rows={2} fullWidth /></Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
            <TextField 
                label="Medicamentos em Uso"
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