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

      {/* --- ANTECEDENTES GINECOLÓGICOS (EXPANDIDO) --- */}
      <Typography variant="body1" sx={{ mt: 2, mb: 1, fontWeight: 'medium' }}>Antecedentes Ginecológicos</Typography>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={6} sm={3}><TextField label="Idade da Menarca" name="menarca_idade" type="number" value={ginecoData.menarca_idade || ''} onChange={(e) => handleGenericChange('menarca_idade', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={6} sm={3}><TextField label="DUM" name="dum" type="date" value={ginecoData.dum || ''} onChange={(e) => handleGenericChange('dum', e.target.value)} InputLabelProps={{ shrink: true }} fullWidth size="small" /></Grid>
        <Grid item xs={12} sm={6}>
            <Typography variant="body2">Ciclo Menstrual:</Typography>
            <RadioGroup row name="ciclo_regular" value={ginecoData.ciclo_regular || ''} onChange={(e) => handleGenericChange('ciclo_regular', e.target.value)}>
                <FormControlLabel value="regular" control={<Radio size="small" />} label="Regular" />
                <FormControlLabel value="irregular" control={<Radio size="small" />} label="Irregular" />
            </RadioGroup>
        </Grid>
        <Grid item xs={6} sm={3}><TextField label="Intervalo (dias)" name="ciclo_intervalo" value={ginecoData.ciclo_intervalo || ''} onChange={(e) => handleGenericChange('ciclo_intervalo', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={6} sm={3}><TextField label="Duração (dias)" name="ciclo_duracao" value={ginecoData.ciclo_duracao || ''} onChange={(e) => handleGenericChange('ciclo_duracao', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={12} sm={6}>
            <Typography variant="body2">Dismenorreia (cólica):</Typography>
            <RadioGroup row name="dismenorreia" value={ginecoData.dismenorreia || 'nao'} onChange={(e) => handleGenericChange('dismenorreia', e.target.value)}>
                <FormControlLabel value="sim" control={<Radio size="small" />} label="Sim" />
                <FormControlLabel value="nao" control={<Radio size="small" />} label="Não" />
            </RadioGroup>
        </Grid>
        <Grid item xs={12} sm={6}><TextField label="Último Preventivo (Data)" name="ultimo_preventivo_data" type="date" value={ginecoData.ultimo_preventivo_data || ''} onChange={(e) => handleGenericChange('ultimo_preventivo_data', e.target.value)} InputLabelProps={{ shrink: true }} fullWidth size="small" /></Grid>
        <Grid item xs={12} sm={6}><TextField label="Resultado" name="ultimo_preventivo_resultado" value={ginecoData.ultimo_preventivo_resultado || ''} onChange={(e) => handleGenericChange('ultimo_preventivo_resultado', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={12} sm={6}><TextField label="Última Mamografia (Data)" name="ultima_mamografia_data" type="date" value={ginecoData.ultima_mamografia_data || ''} onChange={(e) => handleGenericChange('ultima_mamografia_data', e.target.value)} InputLabelProps={{ shrink: true }} fullWidth size="small" /></Grid>
        <Grid item xs={12} sm={6}><TextField label="Resultado" name="ultima_mamografia_resultado" value={ginecoData.ultima_mamografia_resultado || ''} onChange={(e) => handleGenericChange('ultima_mamografia_resultado', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={12} sm={6}><TextField label="Método Contraceptivo" name="mac_atual" value={ginecoData.mac_atual || ''} onChange={(e) => handleGenericChange('mac_atual', e.target.value)} fullWidth size="small" /></Grid>
      </Grid>

      {/* --- ANTECEDENTES OBSTÉTRICOS --- */}
      <Divider sx={{ my: 2 }} />
      <Typography variant="body1" sx={{ mb: 1, fontWeight: 'medium' }}>Antecedentes Obstétricos</Typography>
      <Grid container spacing={2}>
        <Grid item xs={3}><TextField label="Gesta (G)" name="gesta" type="number" value={ginecoData.gesta || ''} onChange={(e) => handleGenericChange('gesta', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={3}><TextField label="Para (P)" name="para" type="number" value={ginecoData.para || ''} onChange={(e) => handleGenericChange('para', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={3}><TextField label="Cesáreas (C)" name="cesareas" type="number" value={ginecoData.cesareas || ''} onChange={(e) => handleGenericChange('cesareas', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={3}><TextField label="Abortos (A)" name="abortos" type="number" value={ginecoData.abortos || ''} onChange={(e) => handleGenericChange('abortos', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={12}><TextField label="Complicações obstétricas anteriores" name="complicacoes_obstetricas" value={ginecoData.complicacoes_obstetricas || ''} onChange={(e) => handleGenericChange('complicacoes_obstetricas', e.target.value)} fullWidth size="small" /></Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* Queixa Atual */}
      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Queixa Atual</Typography>
      <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 1 }}>
        {sintomasOptions.map(opt => (
          <FormControlLabel key={opt.id} control={<Checkbox checked={sintomas[opt.id] || false} onChange={handleSintomasChange} name={opt.id} />} label={opt.label} />
        ))}
      </FormGroup>
      <Divider sx={{ my: 2 }} />

      {/* --- EXAME FÍSICO (EXPANDIDO) --- */}
      <Typography variant="body1" sx={{ mb: 1, fontWeight: 'medium' }}>Exame Físico Ginecológico</Typography>
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}><TextField label="PA (mmHg)" name="pa" value={ginecoData.pa || ''} onChange={(e) => handleGenericChange('pa', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={6} sm={3}><TextField label="FC (bpm)" name="fc" value={ginecoData.fc || ''} onChange={(e) => handleGenericChange('fc', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={6} sm={3}><TextField label="Peso (kg)" name="peso" value={ginecoData.peso || ''} onChange={(e) => handleGenericChange('peso', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={6} sm={3}><TextField label="Altura (m)" name="altura" value={ginecoData.altura || ''} onChange={(e) => handleGenericChange('altura', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={12}><TextField label="Exame das Mamas" name="ex_mamas" value={ginecoData.ex_mamas || ''} onChange={(e) => handleGenericChange('ex_mamas', e.target.value)} fullWidth size="small" placeholder="Inspeção estática e dinâmica, palpação..."/></Grid>
        <Grid item xs={12}><TextField label="Abdome" name="ex_abdome" value={ginecoData.ex_abdome || ''} onChange={(e) => handleGenericChange('ex_abdome', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={12}><TextField label="Genitais Externos" name="ex_genitais_externos" value={ginecoData.ex_genitais_externos || ''} onChange={(e) => handleGenericChange('ex_genitais_externos', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={12}><TextField label="Exame Especular" name="ex_especular" value={ginecoData.ex_especular || ''} onChange={(e) => handleGenericChange('ex_especular', e.target.value)} fullWidth size="small" placeholder="Colo, paredes vaginais, conteúdo vaginal..."/></Grid>
        <Grid item xs={12}><TextField label="Toque Vaginal Bimanual" name="ex_toque" value={ginecoData.ex_toque || ''} onChange={(e) => handleGenericChange('ex_toque', e.target.value)} fullWidth size="small" placeholder="Útero (posição, volume, mobilidade), anexos..."/></Grid>
      </Grid>
    </Paper>
  );
}