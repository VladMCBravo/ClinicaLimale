// src/components/prontuario/especialidades/AnamneseOrtopedia.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Paper, Typography, Grid, FormGroup, FormControlLabel, Checkbox, TextField, Divider } from '@mui/material';

const sintomasOptions = [
    { id: 'dor', label: 'Dor' },
    { id: 'trauma', label: 'História de Trauma' },
    { id: 'limitacao', label: 'Limitação de Movimento' },
    { id: 'deformidade', label: 'Deformidade' },
    { id: 'instabilidade', label: 'Instabilidade / Falseio' },
];

const sintomaTemplates = {
  dor: `Dor:
- Localização (pedir para apontar com 1 dedo):
- Irradiação:
- Tipo/Caráter (pontada, queimação, cansaço, facada):
- Intensidade (0-10):
- Início (súbito, insidioso) e duração:
- Fatores de melhora:
- Fatores de piora:
- Sintomas associados (edema, parestesia, febre):
`,
  trauma: `História de Trauma:
- Mecanismo do trauma:
- Data e hora:
- Energia do trauma (alta, baixa):
- Primeiros socorros / Atendimento inicial:
`,
  limitacao: `Limitação de Movimento:
- Articulação(ões) afetada(s):
- Movimentos limitados (flexão, extensão, rotação, etc.):
- Rigidez matinal (duração em minutos):
- Impacto nas atividades diárias (vestir-se, caminhar, etc.):
`,
  deformidade: `Deformidade:
- Localização:
- Início (congênita, adquirida) e progressão:
- Associada a dor ou limitação funcional:
`,
  instabilidade: `Instabilidade / Falseio:
- Articulação afetada:
- Frequência dos episódios:
- Relação com atividades específicas ou movimentos:
- Sensação de "sair do lugar":
`,
};

export default function AnamneseOrtopedia({ formData, onChange }) {
  const ortoData = formData.ortopedica || {};
  const [sintomas, setSintomas] = useState(ortoData.sintomas || {});

  const handleGenericChange = (name, value) => {
    onChange({ target: { name: 'ortopedica', value: { ...ortoData, [name]: value } } });
  };

  const handleSintomasChange = (event) => {
    const { name, checked } = event.target;
    setSintomas(prev => ({ ...prev, [name]: checked }));
  };

  const generateHda = useCallback(() => {
    return sintomasOptions
      .filter(opt => sintomas[opt.id])
      .map(opt => sintomaTemplates[opt.id])
      .join('\n');
  }, [sintomas]);

  useEffect(() => {
    const hda = generateHda();
    onChange({
      target: {
        name: 'ortopedica',
        value: { ...ortoData, sintomas, hda: hda || ortoData.hda || '' }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sintomas]);

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 2, borderColor: 'success.main' }}>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Anamnese Ortopédica</Typography>

      {/* Queixa Atual */}
      <Typography variant="body1" sx={{ mt: 2, fontWeight: 'medium' }}>Queixa Principal</Typography>
      <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 1 }}>
        {sintomasOptions.map(opt => (
          <FormControlLabel key={opt.id} control={<Checkbox checked={sintomas[opt.id] || false} onChange={handleSintomasChange} name={opt.id} />} label={opt.label} />
        ))}
      </FormGroup>
      <Divider sx={{ my: 2 }} />

      {/* Antecedentes */}
      <Typography variant="body1" sx={{ mb: 1, fontWeight: 'medium' }}>Antecedentes Ortopédicos</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}><TextField label="Fraturas, Cirurgias ou Lesões Prévias" name="antecedentes" value={ortoData.antecedentes || ''} onChange={(e) => handleGenericChange('antecedentes', e.target.value)} fullWidth size="small" /></Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* Exame Físico */}
      <Typography variant="body1" sx={{ mb: 1, fontWeight: 'medium' }}>Exame Físico Ortopédico</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}><TextField label="Local Afetado / Articulação" name="ex_local" value={ortoData.ex_local || ''} onChange={(e) => handleGenericChange('ex_local', e.target.value)} fullWidth size="small" placeholder="Ex: Joelho Direito, Ombro Esquerdo, Coluna Lombar"/></Grid>
        <Grid item xs={12} sm={6}><TextField label="Inspeção" name="ex_inspecao" value={ortoData.ex_inspecao || ''} onChange={(e) => handleGenericChange('ex_inspecao', e.target.value)} fullWidth size="small" placeholder="Edema, equimose, deformidades, alinhamento..."/></Grid>
        <Grid item xs={12} sm={6}><TextField label="Palpação" name="ex_palpacao" value={ortoData.ex_palpacao || ''} onChange={(e) => handleGenericChange('ex_palpacao', e.target.value)} fullWidth size="small" placeholder="Dor à palpação em..., crepitações, temperatura..."/></Grid>
        <Grid item xs={12}><TextField label="Amplitude de Movimento (ADM)" name="ex_adm" value={ortoData.ex_adm || ''} onChange={(e) => handleGenericChange('ex_adm', e.target.value)} fullWidth size="small" placeholder="Ativa e passiva. Ex: Flexão 0-90°, Extensão 0°..."/></Grid>
        <Grid item xs={12}><TextField label="Força Muscular (0-5)" name="ex_forca" value={ortoData.ex_forca || ''} onChange={(e) => handleGenericChange('ex_forca', e.target.value)} fullWidth size="small" placeholder="Grupos musculares e grau de força. Ex: Quadríceps G5..."/></Grid>
        <Grid item xs={12}><TextField label="Exame Neurovascular" name="ex_neurovascular" value={ortoData.ex_neurovascular || ''} onChange={(e) => handleGenericChange('ex_neurovascular', e.target.value)} fullWidth size="small" placeholder="Pulsos, perfusão capilar, sensibilidade, motricidade..."/></Grid>
        <Grid item xs={12}><TextField label="Testes Especiais" name="ex_testes" value={ortoData.ex_testes || ''} onChange={(e) => handleGenericChange('ex_testes', e.target.value)} multiline rows={2} fullWidth size="small" placeholder="Ex: Lachman positivo, Neer negativo..."/></Grid>
      </Grid>

    </Paper>
  );
}
