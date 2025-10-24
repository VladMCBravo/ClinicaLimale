// src/components/prontuario/AtendimentoObstetricia.jsx - VERSÃO COMPLETA UNIFICADA

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Paper, Typography, Grid, FormGroup, FormControlLabel, Checkbox, TextField, Divider, RadioGroup, Radio,
    FormControl, InputLabel, Select, MenuItem, Box, Button, CircularProgress 
} from '@mui/material';
import { useSnackbar } from '../../contextsSnackbarContext';
import apiClient from '../../api/axiosConfig';

// --- OPÇÕES (Obstetrícia - Exemplo) ---
const sintomasOBOptions = [
    { id: 'mov_fetal_presente', label: 'MF Presentes', group: 'subjetivo', template: 'Refere boa movimentação fetal.' },
    { id: 'sangramento', label: 'Sangramento', group: 'subjetivo', template: 'Refere sangramento vaginal (descrever).' },
    { id: 'perda_liquido', label: 'Perda Líquida', group: 'subjetivo', template: 'Refere perda líquida (descrever).' },
    { id: 'contracoes', label: 'Contrações', group: 'subjetivo', template: 'Refere contrações (frequência/intensidade).' },
    // Adicione outras queixas comuns (dor, edema, etc.)
];
const exameFisicoOBOptions = [
    { id: 'bcf_presente', label: 'BCF (+)', group: 'exame', template: 'BCF = ___ bpm (presente).' },
    { id: 'mf_presente', label: 'MF (+)', group: 'exame', template: 'Movimentação fetal presente.' },
    { id: 'colo_fechado', label: 'Colo Fechado', group: 'toque', template: 'Toque: Colo grosso, posterior, fechado.' },
    { id: 'colo_dilatado', label: 'Colo Dilatado', group: 'toque', template: 'Toque: Colo ___, ___, ___ cm de dilatação, bolsa ___, apresentação ___.' },
    // Adicione outras opções (dinâmica uterina, etc.)
];
// --- FIM OPÇÕES ---

export default function AtendimentoObstetricia({ pacienteId, onEvolucaoSalva }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Usaremos a parte 'ginecologica' da anamnese para dados históricos
    const [anamneseData, setAnamneseData] = useState({ ginecologica: {}, sintomas: {} }); 
    // Estado para exame físico atual (inputs como AU, BCF e checkboxes)
    const [exameFisicoData, setExameFisicoData] = useState({});
    // Estado SOAP
    const [soapData, setSoapData] = useState({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });

    // Carrega anamnese histórica (usando dados ginecológicos como base)
    useEffect(() => {
        if (!pacienteId) return;
        apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`)
            .then(res => {
                setAnamneseData({
                    ginecologica: res.data.ginecologica || {}, // Carrega dados GO
                    sintomas: {}, // Sintomas sempre zerados
                });
                setExameFisicoData(res.data.ginecologica || {}); // Pré-preenche com PA, FC, etc. se houver
            })
            .catch(err => { /* ... */ });
    }, [pacienteId, showSnackbar]);

    // Geradores de texto
    const generateHda = useCallback(() => { 
        const ginecoHist = anamneseData.ginecologica;
        let texto = `IG: ${ginecoHist.ig_atual || '___'} semanas.\n`; // Exemplo: Pegar IG atual da anamnese
        const queixas = sintomasOBOptions
            .filter(opt => anamneseData.sintomas[opt.id])
            .map(opt => opt.template).join(" ");
        return texto + (queixas || "Nega queixas.");
     }, [anamneseData.sintomas, anamneseData.ginecologica]);

    const generateExameFisico = useCallback(() => {
        let texto = `Dados Vitais:\nPA: ${exameFisicoData.pa || '___x___'} mmHg\nFC: ${exameFisicoData.fc || '___'} bpm\n\nExame Obstétrico:\nAU = ${exameFisicoData.au || '___'} cm.\n`;
        const achados = exameFisicoOBOptions
            .filter(opt => exameFisicoData[opt.id])
            .map(opt => opt.template).join(" ");
         // Adiciona BCF manual se checkbox não marcado
         if (!exameFisicoData.bcf_presente && exameFisicoData.bcf_manual) texto += `BCF = ${exameFisicoData.bcf_manual} bpm.\n`;
         // Adiciona Toque manual se checkbox não marcado
         if (!exameFisicoData.colo_fechado && !exameFisicoData.colo_dilatado && exameFisicoData.toque_manual) texto += `Toque: ${exameFisicoData.toque_manual}\n`;
            
        return texto + (achados || "Nenhuma observação selecionada.");
    }, [exameFisicoData]);

    // Efeitos que atualizam SOAP
    useEffect(() => { /* ... (atualiza notas_subjetivas) ... */ }, [anamneseData.sintomas, anamneseData.ginecologica, generateHda]);
    useEffect(() => { /* ... (atualiza notas_objetivas) ... */ }, [exameFisicoData, generateExameFisico]);

    // Handlers
    const handleSoapChange = (e) => setSoapData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSintomasChange = (e) => setAnamneseData(prev => ({ ...prev, sintomas: { ...prev.sintomas, [e.target.name]: e.target.checked } }));
    const handleGinecoChange = (name, value) => setAnamneseData(prev => ({ ...prev, ginecologica: { ...prev.ginecologica, [name]: value } })); // Para histórico
    const handleExameChange = (event) => { // Para exame físico atual
        const { name, value, type, checked } = event.target;
        setExameFisicoData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    // Botão Normalidade (Exemplo Obstetrícia)
    const preencherNormalidade = () => { 
        setAnamneseData(prev => ({ ...prev, sintomas: { mov_fetal_presente: true } })); 
        setExameFisicoData(prev => ({
            ...prev, // Mantém PA/FC/AU etc. se preenchidos
            bcf_presente: true, mf_presente: true, colo_fechado: true, colo_dilatado: false, // Marca normais
            toque_manual: '', bcf_manual: '', // Limpa campos manuais
        }));
        setSoapData({
             notas_subjetivas: `IG: ${anamneseData.ginecologica.ig_atual || '___'} semanas.\nRefere boa movimentação fetal.`,
             notas_objetivas: `Dados Vitais:\nPA: ${exameFisicoData.pa || '___x___'} mmHg\nFC: ${exameFisicoData.fc || '___'} bpm\n\nExame Obstétrico:\nAU = ${exameFisicoData.au || '___'} cm.\nBCF = ___ bpm (presente). Movimentação fetal presente. Toque: Colo grosso, posterior, fechado.`,
             avaliacao: 'Gestação tópica, feto vivo, sem sinais de trabalho de parto.',
             plano: 'Manter acompanhamento pré-natal. Orientações gerais.'
        });
     };
    
    // Botão Limpar
    const handleLimparConsultaAtual = () => { /* ... (implementar) ... */ };
    
    // Submit (Salva Evolução e Anamnese GO)
    const handleSubmit = async (event) => { /* ... (adaptar payload anamnese) ... */ };

    // --- RETURN ---
    return (
        <Paper sx={{ p: 2, mb: 2 }}>
            {/* CABEÇALHO */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom> Atendimento Obstétrico </Typography>
                 <Button variant="outlined" size="small" onClick={preencherNormalidade}> Preencher Normalidade </Button>
            </Box>

            {/* ANAMNESE (HISTÓRICO) */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderColor: 'grey.400' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Histórico Obstétrico</Typography>
                {/* Campos Gesta, Para, Cesárea, Aborto, DUM, DPP, IG Atual */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1.5 }}>
                   <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                       <TextField label="Gesta" name="gesta" type="number" size="small" value={anamneseData.ginecologica.gesta || ''} onChange={(e) => handleGinecoChange('gesta', e.target.value)} />
                       <TextField label="Para" name="para" type="number" size="small" value={anamneseData.ginecologica.para || ''} onChange={(e) => handleGinecoChange('para', e.target.value)} />
                       <TextField label="Cesáreas" name="cesareas" type="number" size="small" value={anamneseData.ginecologica.cesareas || ''} onChange={(e) => handleGinecoChange('cesareas', e.target.value)} />
                       <TextField label="Abortos" name="abortos" type="number" size="small" value={anamneseData.ginecologica.abortos || ''} onChange={(e) => handleGinecoChange('abortos', e.target.value)} />
                   </Box>
                   <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                       <TextField label="DUM" name="dum" type="date" InputLabelProps={{ shrink: true }} size="small" value={anamneseData.ginecologica.dum || ''} onChange={(e) => handleGinecoChange('dum', e.target.value)} />
                       <TextField label="DPP" name="dpp" type="date" InputLabelProps={{ shrink: true }} size="small" value={anamneseData.ginecologica.dpp || ''} onChange={(e) => handleGinecoChange('dpp', e.target.value)} />
                       <TextField label="IG Atual (semanas)" name="ig_atual" type="number" size="small" value={anamneseData.ginecologica.ig_atual || ''} onChange={(e) => handleGinecoChange('ig_atual', e.target.value)} />
                   </Box>
                </Box>
            </Paper>

            {/* EVOLUÇÃO (CONSULTA ATUAL) */}
            <Paper variant="outlined" sx={{ p: 2, borderColor: 'primary.main' }}>
               <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Consulta Atual</Typography>
               
               {/* Queixa Atual (S) */}
               <Typography variant="body1" sx={{ mt: 1, fontWeight: 'medium' }}>Queixa Atual (S)</Typography>
               <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 1, p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                   {sintomasOBOptions.map(opt => ( 
                       <FormControlLabel key={opt.id} control={<Checkbox checked={anamneseData.sintomas[opt.id] || false} onChange={handleSintomasChange} name={opt.id} />} label={opt.label} />
                   ))}
               </FormGroup>
               <TextField name="notas_subjetivas" label="Subjetivo (Gerado / Anotações Livres)" multiline rows={3} fullWidth value={soapData.notas_subjetivas || ''} onChange={handleSoapChange} size="small" />
               
               <Divider sx={{ my: 2 }} />

               {/* Exame Físico (O) */}
               <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Exame Físico (O)</Typography>
               <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, my: 1.5 }}>
                   <TextField label="PA (mmHg)" name="pa" size="small" value={exameFisicoData.pa || ''} onChange={handleExameChange} sx={{ width: 'auto', minWidth: '100px' }}/>
                   <TextField label="FC (bpm)" name="fc" type="number" size="small" value={exameFisicoData.fc || ''} onChange={handleExameChange} sx={{ width: 'auto', minWidth: '80px' }}/>
                   <TextField label="AU (cm)" name="au" type="number" size="small" value={exameFisicoData.au || ''} onChange={handleExameChange} sx={{ width: 'auto', minWidth: '80px' }}/>
                   <TextField label="BCF (bpm)" name="bcf_manual" type="number" size="small" value={exameFisicoData.bcf_manual || ''} onChange={handleExameChange} sx={{ width: 'auto', minWidth: '80px' }} />
               </Box>
               <FormGroup sx={{ p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                  {/* Checkboxes Exame Obstétrico */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {exameFisicoOBOptions.filter(o => o.group === 'exame').map(opt => (
                       <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                    ))}
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                     <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Toque Vaginal:</Typography>
                     {exameFisicoOBOptions.filter(o => o.group === 'toque').map(opt => (
                        <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                     ))}
                  </Box>
               </FormGroup>
               <TextField label="Toque Vaginal (descrição livre)" name="toque_manual" multiline rows={2} fullWidth size="small" sx={{mt: 1}} value={exameFisicoData.toque_manual || ''} onChange={handleExameChange} />
               <TextField name="notas_objetivas" label="Objetivo (Gerado / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_objetivas || ''} onChange={handleSoapChange} size="small" sx={{mt: 1.5}}/>
               
               <Divider sx={{ my: 2 }} />

               {/* Campos Finais SOAP e Botões */}
               <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField name="avaliacao" label="Avaliação / Hipóteses Diagnósticas (A)" multiline rows={3} fullWidth value={soapData.avaliacao || ''} onChange={handleSoapChange} size="small" />
                  <TextField name="plano" label="Plano / Conduta (P)" multiline rows={3} fullWidth value={soapData.plano || ''} onChange={handleSoapChange} size="small" />
                  <Box sx={{ textAlign: 'right', mt: 1, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                     <Button onClick={handleLimparConsultaAtual} variant="outlined" disabled={isSubmitting}> Limpar Consulta </Button>
                     <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting}> Salvar Atendimento </Button>
                  </Box>
               </Box>
            </Paper>
        </Paper>
    );
}