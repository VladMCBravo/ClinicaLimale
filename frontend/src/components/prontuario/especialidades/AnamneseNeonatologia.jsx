// src/components/prontuario/especialidades/AnamneseNeonatologia.jsx
import React from 'react';
import { Paper, Typography, Grid, TextField, Divider, FormGroup, FormControlLabel, Checkbox, RadioGroup, Radio } from '@mui/material';

const sorologiasOptions = [
  { id: 'vdrl', label: 'VDRL' },
  { id: 'hiv', label: 'HIV' },
  { id: 'hbsag', label: 'HBsAg' },
  { id: 'toxo', label: 'Toxoplasmose' },
  { id: 'zika', label: 'Zika' },
  { id: 'gbs', label: 'Strepto B' },
];

const triagemOptions = [
    { id: 'pezinho', label: 'Teste do Pezinho' },
    { id: 'olhinho', label: 'Teste do Olhinho' },
    { id: 'coracaozinho', label: 'Teste do Coraçãozinho' },
    { id: 'orelhinha', label: 'Teste da Orelhinha' },
    { id: 'linguinha', label: 'Teste da Linguinha' },
];

export default function AnamneseNeonatologia({ formData, onChange }) {
  const neoData = formData.neonatologia || {};

  const handleGenericChange = (name, value) => {
    onChange({ target: { name: 'neonatologia', value: { ...neoData, [name]: value } } });
  };

  const handleCheckboxChange = (group, name, checked) => {
    const currentGroupState = neoData[group] || {};
    const newGroupState = { ...currentGroupState, [name]: checked };
    handleGenericChange(group, newGroupState);
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 2, borderColor: 'primary.main' }}>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Anamnese Neonatal</Typography>

      {/* Histórico Materno e Gestacional */}
      <Typography variant="body1" sx={{ mt: 2, mb: 1, fontWeight: 'medium' }}>Histórico Materno e Gestacional</Typography>
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}><TextField label="Idade Materna" name="idade_materna" type="number" value={neoData.idade_materna || ''} onChange={(e) => handleGenericChange('idade_materna', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={6} sm={3}><TextField label="Gesta/Para/Aborto" name="gpa" value={neoData.gpa || ''} onChange={(e) => handleGenericChange('gpa', e.target.value)} fullWidth size="small" placeholder="G_P_A_"/></Grid>
        <Grid item xs={6} sm={3}><TextField label="Tipo Sanguíneo Mãe" name="tipo_sanguineo_mae" value={neoData.tipo_sanguineo_mae || ''} onChange={(e) => handleGenericChange('tipo_sanguineo_mae', e.target.value)} fullWidth size="small" placeholder="A+, O-, etc."/></Grid>
        <Grid item xs={6} sm={3}><TextField label="Coombs Indireto" name="coombs_indireto" value={neoData.coombs_indireto || ''} onChange={(e) => handleGenericChange('coombs_indireto', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={12}>
            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>Sorologias Maternas:</Typography>
            <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
                {sorologiasOptions.map(opt => (
                    <FormControlLabel key={opt.id} control={<Checkbox size="small" checked={neoData.sorologias?.[opt.id] || false} onChange={(e) => handleCheckboxChange('sorologias', opt.id, e.target.checked)} />} label={opt.label} />
                ))}
            </FormGroup>
        </Grid>
        <Grid item xs={12}><TextField label="Intercorrências na Gestação" name="intercorrencias_gestacao" value={neoData.intercorrencias_gestacao || ''} onChange={(e) => handleGenericChange('intercorrencias_gestacao', e.target.value)} multiline rows={2} fullWidth size="small" placeholder="Ex: DMG, Pré-eclâmpsia, Infecções..."/></Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* Dados do Parto */}
      <Typography variant="body1" sx={{ mb: 1, fontWeight: 'medium' }}>Dados do Parto</Typography>
      <Grid container spacing={2}>
        <Grid item xs={6} sm={4}><TextField label="Tipo de Parto" name="tipo_parto" value={neoData.tipo_parto || ''} onChange={(e) => handleGenericChange('tipo_parto', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={6} sm={4}><TextField label="Idade Gestacional" name="idade_gestacional" value={neoData.idade_gestacional || ''} onChange={(e) => handleGenericChange('idade_gestacional', e.target.value)} fullWidth size="small" placeholder="Ex: 39s 2d"/></Grid>
        <Grid item xs={12} sm={4}><TextField label="Bolsa Rota" name="bolsa_rota" value={neoData.bolsa_rota || ''} onChange={(e) => handleGenericChange('bolsa_rota', e.target.value)} fullWidth size="small" placeholder="Ex: 2h antes do parto"/></Grid>
        <Grid item xs={12}><TextField label="Líquido Amniótico" name="liquido_amniotico" value={neoData.liquido_amniotico || ''} onChange={(e) => handleGenericChange('liquido_amniotico', e.target.value)} fullWidth size="small" placeholder="Ex: Claro, Meconial (fluido, espesso)"/></Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* Dados do Recém-Nascido */}
      <Typography variant="body1" sx={{ mb: 1, fontWeight: 'medium' }}>Dados do Recém-Nascido (RN)</Typography>
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}><TextField label="Peso ao Nascer (g)" name="peso_nascimento" type="number" value={neoData.peso_nascimento || ''} onChange={(e) => handleGenericChange('peso_nascimento', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={6} sm={3}><TextField label="Comprimento (cm)" name="comprimento" type="number" value={neoData.comprimento || ''} onChange={(e) => handleGenericChange('comprimento', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={6} sm={3}><TextField label="PC (cm)" name="pc" type="number" value={neoData.pc || ''} onChange={(e) => handleGenericChange('pc', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={6} sm={3}><TextField label="APGAR (1º/5º)" name="apgar" value={neoData.apgar || ''} onChange={(e) => handleGenericChange('apgar', e.target.value)} fullWidth size="small" placeholder="Ex: 8/9"/></Grid>
        <Grid item xs={12}><TextField label="Reanimação em Sala de Parto" name="reanimacao" value={neoData.reanimacao || ''} onChange={(e) => handleGenericChange('reanimacao', e.target.value)} fullWidth size="small" placeholder="Ex: VPP por 30s, IOT..."/></Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* Triagens */}
      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Triagens Neonatais Realizadas</Typography>
      <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 1 }}>
        {triagemOptions.map(opt => (
            <FormControlLabel key={opt.id} control={<Checkbox size="small" checked={neoData.triagens?.[opt.id] || false} onChange={(e) => handleCheckboxChange('triagens', opt.id, e.target.checked)} />} label={opt.label} />
        ))}
      </FormGroup>

      <Divider sx={{ my: 2 }} />

      {/* Exame Físico */}
      <Typography variant="body1" sx={{ mb: 1, fontWeight: 'medium' }}>Exame Físico na Admissão</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}><TextField label="Estado Geral" name="ex_estado_geral" value={neoData.ex_estado_geral || ''} onChange={(e) => handleGenericChange('ex_estado_geral', e.target.value)} fullWidth size="small" placeholder="Ativo, reativo, hipoativo..."/></Grid>
        <Grid item xs={12}><TextField label="Pele" name="ex_pele" value={neoData.ex_pele || ''} onChange={(e) => handleGenericChange('ex_pele', e.target.value)} fullWidth size="small" placeholder="Anictérico, ictérico (+/4+), cianótico, pletórico..."/></Grid>
        <Grid item xs={12}><TextField label="Cabeça e Pescoço" name="ex_cabeca" value={neoData.ex_cabeca || ''} onChange={(e) => handleGenericChange('ex_cabeca', e.target.value)} fullWidth size="small" placeholder="Fontanelas normotensas, sem bossa/cefalohematoma..."/></Grid>
        <Grid item xs={12}><TextField label="Aparelho Respiratório" name="ex_resp" value={neoData.ex_resp || ''} onChange={(e) => handleGenericChange('ex_resp', e.target.value)} fullWidth size="small" placeholder="MV presente, sem RA, sem esforço respiratório..."/></Grid>
        <Grid item xs={12}><TextField label="Aparelho Cardiovascular" name="ex_cardio" value={neoData.ex_cardio || ''} onChange={(e) => handleGenericChange('ex_cardio', e.target.value)} fullWidth size="small" placeholder="BRNF 2T, sem sopros, pulsos cheios e simétricos..."/></Grid>
        <Grid item xs={12}><TextField label="Abdome" name="ex_abdome" value={neoData.ex_abdome || ''} onChange={(e) => handleGenericChange('ex_abdome', e.target.value)} fullWidth size="small" placeholder="Globoso, flácido, RHA+, coto umbilical em mumificação..."/></Grid>
        <Grid item xs={12}><TextField label="Genitália" name="ex_genitalia" value={neoData.ex_genitalia || ''} onChange={(e) => handleGenericChange('ex_genitalia', e.target.value)} fullWidth size="small" placeholder="Típica, testículos tópicos..."/></Grid>
        <Grid item xs={12}><TextField label="Exame Neurológico" name="ex_neuro" value={neoData.ex_neuro || ''} onChange={(e) => handleGenericChange('ex_neuro', e.target.value)} fullWidth size="small" placeholder="Reflexos primitivos presentes, normotônico..."/></Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* Evolução Inicial */}
      <Typography variant="body1" sx={{ mb: 1, fontWeight: 'medium' }}>Evolução Inicial</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
            <Typography variant="body2">Alimentação</Typography>
            <RadioGroup row name="alimentacao" value={neoData.alimentacao || ''} onChange={(e) => handleGenericChange('alimentacao', e.target.value)}>
                <FormControlLabel value="SM" control={<Radio size="small" />} label="Seio Materno" />
                <FormControlLabel value="Formula" control={<Radio size="small" />} label="Fórmula" />
            </RadioGroup>
        </Grid>
        <Grid item xs={6} sm={4}><TextField label="Diurese" name="diurese" value={neoData.diurese || ''} onChange={(e) => handleGenericChange('diurese', e.target.value)} fullWidth size="small" placeholder="Presente, ausente"/></Grid>
        <Grid item xs={6} sm={4}><TextField label="Evacuação" name="evacuacao" value={neoData.evacuacao || ''} onChange={(e) => handleGenericChange('evacuacao', e.target.value)} fullWidth size="small" placeholder="Mecônio, transição..."/></Grid>
        <Grid item xs={12}><TextField label="Plano e Observações" name="plano" value={neoData.plano || ''} onChange={(e) => handleGenericChange('plano', e.target.value)} multiline rows={3} fullWidth size="small" placeholder="Alojamento conjunto, fototerapia, etc..."/></Grid>
      </Grid>

    </Paper>
  );
}
