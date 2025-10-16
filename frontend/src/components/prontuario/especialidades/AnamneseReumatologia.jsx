// src/components/prontuario/especialidades/AnamneseReumatologia.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Paper, Typography, Grid, FormGroup, FormControlLabel, Checkbox, TextField, Divider, Tooltip } from '@mui/material';

const sintomasOptions = [
    { id: 'dorArticular', label: 'Dor Articular' },
    { id: 'rigidez', label: 'Rigidez Matinal' },
    { id: 'fadiga', label: 'Fadiga' },
    { id: 'raynaud', label: 'Fenômeno de Raynaud' },
    { id: 'manifExtraArticulares', label: 'Manifestações Extra-articulares' },
];

const sintomaTemplates = {
  dorArticular: `Dor Articular:
- Padrão (artrite, artralgia):
- Localização e distribuição (nº de articulações, simetria):
- Caráter (inflamatória vs mecânica):
- Intensidade (0-10):
- Início e duração:
- Fatores de melhora/piora:
- Sinais flogísticos (edema, calor, rubor):
`,
  rigidez: `Rigidez Matinal:
- Duração (em minutos/horas):
- Localização:
- Melhora com atividade?:
`,
  fadiga: `Fadiga:
- Intensidade (leve, moderada, incapacitante):
- Impacto nas atividades diárias:
- Período do dia em que é pior:
`,
  raynaud: `Fenômeno de Raynaud:
- Desencadeado por (frio, estresse):
- Coloração (palidez, cianose, rubor):
- Localização (mãos, pés, orelhas):
- Associado a dor ou parestesia:
`,
  manifExtraArticulares: `Manifestações Extra-articulares:
- Pele (lesões, fotossensibilidade, alopecia):
- Olhos (olho seco, vermelho, uveíte):
- Boca (boca seca, úlceras orais):
- Pulmonar (tosse seca, dispneia):
- Cardíaco (dor torácica):
- Renal:
- Outros:
`,
};

const exameFisicoInitialState = {
    geral: 'BEG, anictérico, acianótico. Fáscies atípica.',
    pele: 'Sem lesões cutâneas ativas.',
    olhos: 'Escleras anictéricas, conjuntivas coradas.',
    boca: 'Mucosas úmidas e coradas, sem ulcerações.',
    cardiopulmonar: 'AC: RCR, 2T, BNF, sem sopros. AP: MV presente globalmente, sem ruídos adventícios.',
    abdominal: 'Abdome plano, flácido, RHA+, indolor à palpação.',
    neuro: 'Sem déficits focais.',
    articular: 'Contagem articular (0-28 para articulações dolorosas/edemaciadas):\n- Mãos (MCF, IFP):\n- Punhos:\n- Cotovelos:\n- Ombros:\n- Joelhos:\n- Tornozelos/Pés:\nDeformidades (desvio ulnar, dedos em pescoço de cisne/botoeira):\nLimitação de ADM em:\nManobras especiais (Schober, etc):'
};

export default function AnamneseReumatologia({ formData, onChange }) {
  const reumatoData = formData.reumatologia || {};
  const [sintomas, setSintomas] = useState(reumatoData.sintomas || {});
  const [exameFisico, setExameFisico] = useState(reumatoData.exameFisico || exameFisicoInitialState);

  // Dispara o onChange para o componente pai (AnamneseTab)
  const handleChange = (name, value) => {
    // O componente pai espera um evento, então simulamos um
    onChange({ target: { name, value } });
  };

  const handleExameFisicoChange = (name, value) => {
    const updatedExame = { ...exameFisico, [name]: value };
    setExameFisico(updatedExame);
    handleChange('exameFisico', updatedExame);
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
    handleChange('sintomas', sintomas);
    const hda = generateHda();
    handleChange('hda', hda || reumatoData.hda || '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sintomas]);

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 2, borderColor: 'primary.main' }}>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Anamnese Reumatológica</Typography>

      <Typography variant="body1" sx={{ mt: 2, fontWeight: 'medium' }}>Queixa Principal / Sintomas</Typography>
      <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 1 }}>
        {sintomasOptions.map(opt => (
          <FormControlLabel key={opt.id} control={<Checkbox checked={sintomas[opt.id] || false} onChange={handleSintomasChange} name={opt.id} />} label={opt.label} />
        ))}
      </FormGroup>
      <TextField label="História da Doença Atual (HDA)" name="hda" value={reumatoData.hda || ''} onChange={(e) => handleChange('hda', e.target.value)} multiline rows={10} fullWidth />

      <Divider sx={{ my: 2 }} />

      <Typography variant="body1" sx={{ mb: 1, fontWeight: 'medium' }}>Antecedentes Reumatológicos</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}><TextField label="Diagnósticos prévios, história familiar de doença autoimune" name="antecedentes" value={reumatoData.antecedentes || ''} onChange={(e) => handleChange('antecedentes', e.target.value)} fullWidth size="small" /></Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      <Typography variant="body1" sx={{ mb: 1, fontWeight: 'medium' }}>Exame Físico Reumatológico</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}><TextField label="Geral" value={exameFisico.geral} onChange={(e) => handleExameFisicoChange('geral', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={12} sm={6}><TextField label="Pele e Fâneros" value={exameFisico.pele} onChange={(e) => handleExameFisicoChange('pele', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={12} sm={6}><TextField label="Olhos" value={exameFisico.olhos} onChange={(e) => handleExameFisicoChange('olhos', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={12} sm={6}><TextField label="Boca" value={exameFisico.boca} onChange={(e) => handleExameFisicoChange('boca', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={12}><TextField label="Cardiopulmonar" value={exameFisico.cardiopulmonar} onChange={(e) => handleExameFisicoChange('cardiopulmonar', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={12}><TextField label="Abdome" value={exameFisico.abdominal} onChange={(e) => handleExameFisicoChange('abdominal', e.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={12}><TextField label="Neurológico" value={exameFisico.neuro} onChange={(e) => handleExameFisicoChange('neuro',.target.value)} fullWidth size="small" /></Grid>
        <Grid item xs={12}>
            <Tooltip title="Descreva aqui o exame articular detalhado, incluindo contagem de articulações dolorosas e edemaciadas, deformidades e manobras.">
                <TextField 
                    label="Exame Articular e Musculoesquelético" 
                    value={exameFisico.articular} 
                    onChange={(e) => handleExameFisicoChange('articular', e.target.value)} 
                    multiline 
                    rows={8} 
                    fullWidth 
                />
            </Tooltip>
        </Grid>
      </Grid>
    </Paper>
  );
}