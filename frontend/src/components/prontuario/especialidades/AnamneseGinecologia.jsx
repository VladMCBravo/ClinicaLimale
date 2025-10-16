// src/components/prontuario/especialidades/AnamneseGinecologia.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Paper, Typography, Grid, FormGroup, FormControlLabel, Checkbox, TextField, Divider } from '@mui/material';

const sintomasOptions = [
    { id: 'corrimento', label: 'Corrimento Vaginal' },
    { id: 'sua', label: 'Sangramento Uterino Anormal (SUA)' },
    { id: 'dor_pelvica', label: 'Dor Pélvica' },
    { id: 'queixa_mamaria', label: 'Queixas Mamárias' },
    { id: 'dismenorreia', label: 'Dismenorreia' },
    { id: 'tpm', label: 'Sintomas Pré-Menstruais (TPM)' },
];

const sintomaTemplates = {
  corrimento: `Corrimento Vaginal:
- Início e duração:
- Cor e aspecto (branco, amarelado, esverdeado, bolhoso):
- Odor (fétido, "de peixe"):
- Volume (pequeno, moderado, grande):
- Sintomas associados (prurido, ardência, dispareunia, sinusiorragia):
`,
  sua: `Sangramento Uterino Anormal (SUA):
- Padrão do sangramento (aumento do volume, duração, irregularidade):
- Relação com o ciclo (menorragia, metrorragia):
- Sangramento pós-coito ou pós-menopausa:
- Sintomas associados (cólica, fraqueza, tontura):
`,
  dor_pelvica: `Dor Pélvica:
- Tipo (cólica, pontada, queimação):
- Localização e irradiação:
- Intensidade (0-10):
- Relação com o ciclo menstrual:
- Fatores de melhora ou piora:
- Sintomas associados (febre, corrimento, sintomas urinários/intestinais):
`,
  queixa_mamaria: `Queixas Mamárias:
- Tipo (nódulo, dor, descarga papilar):
- Localização (quadrante):
- Variação com o ciclo menstrual:
- Descrição da descarga papilar (cor, uni ou bilateral, espontânea ou expressa):
`,
  dismenorreia: `Dismenorreia (Cólica Menstrual):
- Intensidade e impacto nas atividades diárias:
- Duração (início antes ou com o fluxo):
- Uso de medicação e resposta:
`,
  tpm: `Sintomas Pré-Menstruais (TPM):
- Descrição dos sintomas (irritabilidade, mastalgia, edema, cefaleia):
- Período de ocorrência e resolução com a menstruação:
`,
};

export default function AnamneseGinecologia({ formData, onChange }) {
  const ginecoData = formData.ginecologica || {};
  const [sintomas, setSintomas] = useState(ginecoData.sintomas || {});

  const handleGenericChange = (name, value) => {
    onChange({ target: { name: 'ginecologica', value: { ...ginecoData, [name]: value } } });
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
        name: 'ginecologica',
        value: { ...ginecoData, sintomas, hda: hda || ginecoData.hda || '' }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sintomas]);

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 2, borderColor: 'secondary.main' }}>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Anamnese Ginecológica e Obstétrica</Typography>

      {/* História Menstrual e Obstétrica */}
      <Typography variant="body1" sx={{ mt: 2, mb: 1, fontWeight: 'medium' }}>Histórico Menstrual e Obstétrico</Typography>
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}><TextField label="DUM" name="dum" type="date" value={ginecoData.dum || ''} onChange={(e) => handleGenericChange('dum', e.target.value)} InputLabelProps={{ shrink: true }} fullWidth size="small" /></Grid>
        <Grid item xs={6} sm={3}><TextField label="Idade da Menarca" name="menarca_idade" type="number" value={ginecoData.menarca_idade || ''} onChange={(e) => handleGenericChange('menarca_idade', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={12} sm={6}><TextField label="Ciclo Menstrual" name="ciclo_menstrual" value={ginecoData.ciclo_menstrual || ''} onChange={(e) => handleGenericChange('ciclo_menstrual', e.target.value)} fullWidth size="small" placeholder="Ex: 28/5, regular"/></Grid>
        <Grid item xs={4} sm={2}><TextField label="Gesta" name="gesta" type="number" value={ginecoData.gesta || ''} onChange={(e) => handleGenericChange('gesta', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={4} sm={2}><TextField label="Para" name="para" type="number" value={ginecoData.para || ''} onChange={(e) => handleGenericChange('para', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={4} sm={2}><TextField label="Abortos" name="abortos" type="number" value={ginecoData.abortos || ''} onChange={(e) => handleGenericChange('abortos', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={12} sm={6}><TextField label="Detalhes Obstétricos" name="detalhes_obstetricos" value={ginecoData.detalhes_obstetricos || ''} onChange={(e) => handleGenericChange('detalhes_obstetricos', e.target.value)} fullWidth size="small" placeholder="Ex: Parto vaginal a termo, 3.2kg..."/></Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* Vida Sexual e Contracepção */}
      <Typography variant="body1" sx={{ mb: 1, fontWeight: 'medium' }}>Vida Sexual e Contracepção</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}><TextField label="Método Contraceptivo Atual" name="mac_atual" value={ginecoData.mac_atual || ''} onChange={(e) => handleGenericChange('mac_atual', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={12} sm={6}><TextField label="Métodos Anteriores" name="mac_anterior" value={ginecoData.mac_anterior || ''} onChange={(e) => handleGenericChange('mac_anterior', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={12}><TextField label="Histórico de ISTs" name="hists_ists" value={ginecoData.hists_ists || ''} onChange={(e) => handleGenericChange('hists_ists', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={12} sm={6}><TextField label="Data e Resultado do Último Papanicolau" name="ultimo_papanicolau" value={ginecoData.ultimo_papanicolau || ''} onChange={(e) => handleGenericChange('ultimo_papanicolau', e.target.value)} fullWidth size="small" /></Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* Queixa Atual */}
      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Queixa Atual</Typography>
      <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 1 }}>
        {sintomasOptions.map(opt => (
          <FormControlLabel key={opt.id} control={<Checkbox checked={sintomas[opt.id] || false} onChange={handleSintomasChange} name={opt.id} />} label={opt.label} />
        ))}
      </FormGroup>
      <TextField label="História da Doença Atual (HDA)" name="hda" value={ginecoData.hda || ''} onChange={(e) => handleGenericChange('hda', e.target.value)} multiline rows={8} fullWidth />

      <Divider sx={{ my: 2 }} />

      {/* Exame Físico */}
      <Typography variant="body1" sx={{ mb: 1, fontWeight: 'medium' }}>Exame Físico Ginecológico</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}><TextField label="Exame das Mamas" name="ex_mamas" value={ginecoData.ex_mamas || ''} onChange={(e) => handleGenericChange('ex_mamas', e.target.value)} fullWidth size="small" placeholder="Inspeção estática e dinâmica, palpação..."/></Grid>
        <Grid item xs={12}><TextField label="Exame Especular" name="ex_especular" value={ginecoData.ex_especular || ''} onChange={(e) => handleGenericChange('ex_especular', e.target.value)} fullWidth size="small" placeholder="Colo, paredes vaginais, conteúdo vaginal..."/></Grid>
        <Grid item xs={12}><TextField label="Toque Vaginal Bimanual" name="ex_toque" value={ginecoData.ex_toque || ''} onChange={(e) => handleGenericChange('ex_toque', e.target.value)} fullWidth size="small" placeholder="Útero (posição, volume, mobilidade), anexos..."/></Grid>
      </Grid>

    </Paper>
  );
}
