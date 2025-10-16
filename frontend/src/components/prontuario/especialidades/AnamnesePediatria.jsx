// src/components/prontuario/especialidades/AnamnesePediatria.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Paper, Typography, Grid, FormGroup, FormControlLabel, Checkbox, TextField, Divider, RadioGroup, Radio } from '@mui/material';

const dnpmOptions = [
  { id: 'sustenta_cabeca', label: 'Sustenta a cabeça (~3m)' },
  { id: 'sorri_social', label: 'Sorriso social (~3m)' },
  { id: 'senta_com_apoio', label: 'Senta com apoio (~6m)' },
  { id: 'engatinha', label: 'Engatinha (~9m)' },
  { id: 'anda', label: 'Anda (~12-15m)' },
  { id: 'primeiras_palavras', label: 'Primeiras palavras (~12m)' },
  { id: 'frases_simples', label: 'Frases simples (~24m)' },
  { id: 'controle_esfincter', label: 'Controle de esfíncteres' },
];

const sintomasOptions = [
    { id: 'febre', label: 'Febre' },
    { id: 'tosse', label: 'Tosse' },
    { id: 'coriza', label: 'Coriza' },
    { id: 'vomitos', label: 'Vômitos' },
    { id: 'diarreia', label: 'Diarreia' },
    { id: 'irritabilidade', label: 'Irritabilidade / Choro' },
    { id: 'prostracao', label: 'Prostração / Sonolência' },
    { id: 'exantema', label: 'Exantema (Manchas)' },
];

const sintomaTemplates = {
  febre: `Febre:
- Início e duração:
- Padrão (contínua, intermitente):
- Temperatura máxima aferida:
- Uso de antitérmicos e resposta:
- Sintomas associados (calafrios, prostração):
`,
  tosse: `Tosse:
- Início e duração:
- Tipo (seca, produtiva, "de cachorro"):
- Período predominante (diurna, noturna):
- Fatores de piora (esforço, decúbito):
- Sintomas associados (chiado, cansaço, febre):
`,
  vomitos: `Vômitos:
- Início, frequência e volume:
- Aspecto (alimentar, bilioso, aquoso):
- Relação com alimentação:
- Sintomas associados (náuseas, dor abdominal, diarreia):
`,
  diarreia: `Diarreia:
- Início, frequência e volume:
- Aspecto das fezes (líquidas, pastosas, com muco/sangue):
- Sintomas associados (dor abdominal, vômitos, febre):
- Sinais de desidratação (olhos fundos, boca seca, pouca urina):
`,
  exantema: `Exantema (Manchas na pele):
- Início e localização inicial:
- Progressão e distribuição pelo corpo:
- Aspecto da lesão (macular, papular, vesicular):
- Presença de prurido (coceira):
- Sintomas associados (febre, prurido, coriza):
`,
  irritabilidade: `Irritabilidade / Choro intenso:
- Início e padrão:
- Fatores de melhora ou piora:
- Relação com dor, fome ou sono:
`,
  prostracao: `Prostração / Sonolência:
- Nível de atividade comparado ao habitual:
- Aceitação de líquidos e alimentos:
- Interação com os pais e ambiente:
`,
  coriza: `Coriza:
- Início e duração:
- Aspecto da secreção (hialina, amarelada, esverdeada):
- Obstrução nasal associada:
- Sintomas associados (tosse, espirros, febre):
`,
};

export default function AnamnesePediatria({ formData, onChange }) {
  const pediatricaData = formData.pediatrica || {};
  const [dnpm, setDnpm] = useState(pediatricaData.dnpm || {});
  const [sintomas, setSintomas] = useState(pediatricaData.sintomas || {});

  const handleGenericChange = (name, value) => {
    onChange({ target: { name: 'pediatrica', value: { ...pediatricaData, [name]: value } } });
  };

  const handleDnpmChange = (event) => {
    const { name, checked } = event.target;
    setDnpm(prev => ({ ...prev, [name]: checked }));
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
        name: 'pediatrica',
        value: {
          ...pediatricaData,
          dnpm,
          sintomas,
          hda: hda || pediatricaData.hda || '',
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dnpm, sintomas]);

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 2, borderColor: 'primary.main' }}>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Anamnese Pediátrica</Typography>

      {/* Histórico Gestacional e Nascimento */}
      <Typography variant="body1" sx={{ mt: 2, fontWeight: 'medium' }}>Histórico Gestacional e Nascimento</Typography>
      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        <Grid item xs={12} sm={6} md={3}><TextField label="Tipo de Parto" name="tipo_parto" value={pediatricaData.tipo_parto || ''} onChange={(e) => handleGenericChange('tipo_parto', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={12} sm={6} md={3}><TextField label="Idade Gestacional" name="idade_gestacional" placeholder="semanas" type="number" value={pediatricaData.idade_gestacional || ''} onChange={(e) => handleGenericChange('idade_gestacional', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={12} sm={6} md={3}><TextField label="Peso ao nascer" placeholder="gramas" name="peso_nascimento" type="number" value={pediatricaData.peso_nascimento || ''} onChange={(e) => handleGenericChange('peso_nascimento', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={12} sm={6} md={3}><TextField label="APGAR (1º/5º)" name="apgar" value={pediatricaData.apgar || ''} onChange={(e) => handleGenericChange('apgar', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={12}><TextField label="Intercorrências na gestação ou parto" name="intercorrencias_gestacao_parto" value={pediatricaData.intercorrencias_gestacao_parto || ''} onChange={(e) => handleGenericChange('intercorrencias_gestacao_parto', e.target.value)} multiline rows={2} fullWidth size="small" /></Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* Aleitamento e Vacinação */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Aleitamento</Typography>
            <RadioGroup row name="aleitamento" value={pediatricaData.aleitamento || ''} onChange={(e) => handleGenericChange('aleitamento', e.target.value)}>
                <FormControlLabel value="SME" control={<Radio size="small" />} label="Materno Exclusivo" />
                <FormControlLabel value="Formula" control={<Radio size="small" />} label="Fórmula" />
                <FormControlLabel value="Misto" control={<Radio size="small" />} label="Misto" />
            </RadioGroup>
            <TextField label="Introdução Alimentar" name="introducao_alimentar" value={pediatricaData.introducao_alimentar || ''} onChange={(e) => handleGenericChange('introducao_alimentar', e.target.value)} fullWidth size="small" sx={{mt: 1}}/>
        </Grid>
        <Grid item xs={12} sm={6}>
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Vacinação</Typography>
            <RadioGroup row name="vacinacao" value={pediatricaData.vacinacao || ''} onChange={(e) => handleGenericChange('vacinacao', e.target.value)}>
                <FormControlLabel value="Em dia" control={<Radio size="small" />} label="Em dia" />
                <FormControlLabel value="Atrasada" control={<Radio size="small" />} label="Atrasada" />
            </RadioGroup>
            <TextField label="Observações sobre vacinação" name="vacinacao_obs" value={pediatricaData.vacinacao_obs || ''} onChange={(e) => handleGenericChange('vacinacao_obs', e.target.value)} fullWidth size="small" sx={{mt: 1}}/>
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* DNPM */}
      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Desenvolvimento Neuropsicomotor (DNPM)</Typography>
      <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 1 }}>
        {dnpmOptions.map(opt => (
          <FormControlLabel key={opt.id} control={<Checkbox checked={dnpm[opt.id] || false} onChange={handleDnpmChange} name={opt.id} />} label={opt.label} />
        ))}
      </FormGroup>

      <Divider sx={{ my: 2 }} />

      {/* Sintomas */}
      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Queixa Atual</Typography>
      <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 1 }}>
        {sintomasOptions.map(opt => (
          <FormControlLabel key={opt.id} control={<Checkbox checked={sintomas[opt.id] || false} onChange={handleSintomasChange} name={opt.id} />} label={opt.label} />
        ))}
      </FormGroup>
      
      <Divider sx={{ my: 2 }} />

      {/* Exame Físico */}
      <Typography variant="body1" sx={{ mt: 2, mb: 1, fontWeight: 'medium' }}>Exame Físico</Typography>
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}><TextField label="Peso (kg)" name="peso" value={pediatricaData.peso || ''} onChange={(e) => handleGenericChange('peso', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={6} sm={3}><TextField label="Altura (cm)" name="altura" value={pediatricaData.altura || ''} onChange={(e) => handleGenericChange('altura', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={6} sm={3}><TextField label="PC (cm)" name="pc" value={pediatricaData.pc || ''} onChange={(e) => handleGenericChange('pc', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={6} sm={3}><TextField label="T (°C)" name="temperatura" value={pediatricaData.temperatura || ''} onChange={(e) => handleGenericChange('temperatura', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={12}><TextField label="Estado Geral / Nível de Consciência" name="estado_geral" value={pediatricaData.estado_geral || ''} onChange={(e) => handleGenericChange('estado_geral', e.target.value)} fullWidth size="small" placeholder="Ex: BEG, ativo, reativo, corado, hidratado..."/></Grid>
        <Grid item xs={12}><TextField label="Oroscopia" name="oroscopia" value={pediatricaData.oroscopia || ''} onChange={(e) => handleGenericChange('oroscopia', e.target.value)} fullWidth size="small" placeholder="Ex: Hiperemia, placas..."/></Grid>
        <Grid item xs={12}><TextField label="Ausculta Respiratória" name="ausculta_resp" value={pediatricaData.ausculta_resp || ''} onChange={(e) => handleGenericChange('ausculta_resp', e.target.value)} fullWidth size="small" placeholder="Ex: MVU presente, sem RA..."/></Grid>
        <Grid item xs={12}><TextField label="Ausculta Cardíaca" name="ausculta_card" value={pediatricaData.ausculta_card || ''} onChange={(e) => handleGenericChange('ausculta_card', e.target.value)} fullWidth size="small" placeholder="Ex: BRNF em 2T, sem sopros..."/></Grid>
        <Grid item xs={12}><TextField label="Abdome" name="abdome" value={pediatricaData.abdome || ''} onChange={(e) => handleGenericChange('abdome', e.target.value)} fullWidth size="small" placeholder="Ex: Flácido, indolor, RHA+..."/></Grid>
        <Grid item xs={12}><TextField label="Pele e fâneros" name="pele_faneros" value={pediatricaData.pele_faneros || ''} onChange={(e) => handleGenericChange('pele_faneros', e.target.value)} fullWidth size="small" placeholder="Ex: Presença de exantema, petéquias..."/></Grid>
      </Grid>

    </Paper>
  );
}