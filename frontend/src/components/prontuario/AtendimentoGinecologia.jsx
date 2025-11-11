// src/components/prontuario/AtendimentoGinecologia.jsx
// CORRIGIDO: Removidos useEffects automáticos que causavam loop

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import {
    Paper, Typography, TextField, Box, Button, CircularProgress, Tabs, Tab,
    Grid, FormGroup, FormControlLabel, Checkbox, Divider
} from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

const HistoricoGinecologia = lazy(() => import('./ginecologia/HistoricoGinecologia'));

// --- OPÇÕES E TEMPLATES (Consulta Atual Ginecológica) ---
const sintomasGinecoOptions = [
    { id: 'dor_pelvica', label: 'Dor Pélvica' }, { id: 'sua', label: 'SUA' },
    { id: 'corrimento', label: 'Corrimento Vaginal' }, { id: 'prurido', label: 'Prurido Vulvovaginal' },
    { id: 'dispareunia', label: 'Dispareunia' }, { id: 'sintomas_climaterio', label: 'Sintomas Climatério' },
    { id: 'infertilidade', label: 'Infertilidade' }, { id: 'nodulo_mama', label: 'Nódulo/Dor Mamária' },
];
const sintomaTemplates = {
  corrimento: "Corrimento: Início/Cor/Aspecto/Odor/Volume/Sintomas associados.",
  sua: "SUA: Padrão/Relação com ciclo/Pós-coito/Pós-menopausa/Sintomas associados.",
  dor_pelvica: "Dor Pélvica: Tipo/Local/Intensidade/Relação com ciclo/Fatores/Sintomas associados.",
  nodulo_mama: "Queixa Mamária: Tipo/Local/Variação com ciclo/Descarga papilar.",
};
const exameFisicoGinecoOptions = [
    { id: 'mamas_normais', label: 'Mamas s/ Alterações', group: 'mamas', template: "Mamas: Simétricas, sem nódulos ou retrações. Axilas livres." },
    { id: 'mamas_nodulo', label: 'Nódulo Mama', group: 'mamas', template: "Mamas: Nódulo palpável em ___, de ___ cm, consistência ___, mobilidade ___." },
    { id: 'abd_normal', label: 'Abdome Normal', group: 'abdome', template: "Abdome: Plano, flácido, indolor, RHA+." },
    { id: 'abd_doloroso', label: 'Abdome Doloroso', group: 'abdome', template: "Abdome: Doloroso à palpação em ___." },
    { id: 'gen_ext_normal', label: 'Gen Ext Normal', group: 'genitalia', template: "Genitália Externa: Trófica, sem lesões." },
    { id: 'gen_ext_lesao', label: 'Lesão Externa', group: 'genitalia', template: "Genitália Externa: Lesão ___ em ___." },
    { id: 'especular_normal', label: 'Especular Normal', group: 'especular', template: "Especular: Colo visualizado, sem lesões. Conteúdo vaginal fisiológico." },
    { id: 'especular_corrimento', label: 'Corrimento Especular', group: 'especular', template: "Especular: Colo ___. Conteúdo vaginal ___ (cor, odor, bolhas)." },
    { id: 'toque_normal', label: 'Toque Normal', group: 'toque', template: "Toque: Útero AVF/RVF, tamanho normal, móvel, indolor. Anexos não palpáveis/dolorosos." },
    { id: 'toque_alterado', label: 'Toque Alterado', group: 'toque', template: "Toque: Útero ___, tamanho ___, mobilidade ___, dor ___. Anexos ___." },
];

// Helper TabPanel
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} id={`gineco-tabpanel-${index}`} {...other}>
            {value === index && (<Box sx={{ p: { xs: 1, sm: 2 } }}>{children}</Box>)}
        </div>
    );
}

export default function AtendimentoGinecologia({ pacienteId, onEvolucaoSalva }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tabIndex, setTabIndex] = useState(0);

    const [sintomasConsulta, setSintomasConsulta] = useState({});
    const [exameFisicoData, setExameFisicoData] = useState({});
    const [vitalsData, setVitalsData] = useState({}); 
    const [soapData, setSoapData] = useState({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });

    useEffect(() => {
        setSoapData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
        setSintomasConsulta({});
        setExameFisicoData({});
        setVitalsData({});
        setTabIndex(0);
    }, [pacienteId]);

    // Geradores de texto (CORRIGIDOS)
    const generateSubjetivo = useCallback((sintomas) => {
        const currentSintomas = sintomas || sintomasConsulta;
        return sintomasGinecoOptions
            .filter(opt => currentSintomas[opt.id])
            .map(opt => sintomaTemplates[opt.id] || `${opt.label}: `)
            .join('\n');
     }, [sintomasConsulta]);

    const generateObjetivo = useCallback((vitals, exame) => {
         const currentVitals = vitals || vitalsData;
         const currentExame = exame || exameFisicoData;
         
         let texto = `Dados Vitais:\nPA: ${currentVitals.pa || '___x___'} mmHg\nFC: ${currentVitals.fc || '___'} bpm\nPeso: ${currentVitals.peso || '___'} kg\n\nExame Físico Ginecológico:\n`;
         const achados = exameFisicoGinecoOptions
            .filter(opt => currentExame[opt.id])
            .map(opt => opt.template).join(" ");
         
         if (currentExame.ex_mamas_livre) texto += `Mamas (livre): ${currentExame.ex_mamas_livre}\n`;
         if (currentExame.ex_abdome_livre) texto += `Abdome (livre): ${currentExame.ex_abdome_livre}\n`;
         if (currentExame.ex_gen_ext_livre) texto += `Gen Externa (livre): ${currentExame.ex_gen_ext_livre}\n`;
         if (currentExame.ex_especular_livre) texto += `Especular (livre): ${currentExame.ex_especular_livre}\n`;
         if (currentExame.ex_toque_livre) texto += `Toque (livre): ${currentExame.ex_toque_livre}\n`;

         return texto + (achados || "Nenhuma observação selecionada.");
     }, [vitalsData, exameFisicoData]);

    // --- CORREÇÃO: useEffects automáticos REMOVIDOS ---
    // useEffect(() => { ... }, [sintomasConsulta, generateSubjetivo]);
    // useEffect(() => { ... }, [vitalsData, exameFisicoData, generateObjetivo]);
    // --- FIM DA CORREÇÃO ---

    // Handlers (CORRIGIDOS)
    const handleTabChange = (event, newIndex) => { setTabIndex(newIndex); };
    const handleSoapChange = (e) => setSoapData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    
    const handleSintomasChange = (e) => {
        const newSintomas = { ...sintomasConsulta, [e.target.name]: e.target.checked };
        setSintomasConsulta(newSintomas);
        
        const hdaText = generateSubjetivo(newSintomas);
        setSoapData(prev => ({ ...prev, notas_subjetivas: hdaText || '' }));
    };
    
    const handleExameChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newExameData = { ...exameFisicoData, [name]: type === 'checkbox' ? checked : value };
        setExameFisicoData(newExameData);
        
        const exameText = generateObjetivo(vitalsData, newExameData);
        setSoapData(prev => ({ ...prev, notas_objetivas: exameText }));
    };
    
    const handleVitalsChange = (e) => {
        const newVitals = { ...vitalsData, [e.target.name]: e.target.value };
        setVitalsData(newVitals);
        
        const exameText = generateObjetivo(newVitals, exameFisicoData);
        setSoapData(prev => ({ ...prev, notas_objetivas: exameText }));
    };

    // Botão Normalidade (CORRIGIDO)
    const preencherNormalidade = () => {
        setSintomasConsulta({});
        
        const newExameData = {
             ...exameFisicoData, // Mantém vitais
             mamas_normais: true, mamas_nodulo: false,
             abd_normal: true, abd_doloroso: false,
             gen_ext_normal: true, gen_ext_lesao: false,
             especular_normal: true, especular_corrimento: false,
             toque_normal: true, toque_alterado: false,
             ex_mamas_livre: '', ex_abdome_livre: '', ex_gen_ext_livre: '',
             ex_especular_livre: '', ex_toque_livre: '',
        };
        setExameFisicoData(newExameData);

        const exameText = generateObjetivo(vitalsData, newExameData);
        
        setSoapData({
             notas_subjetivas: 'Paciente assintomática.',
             notas_objetivas: exameText,
             avaliacao: 'Exame ginecológico sem alterações.',
             plano: 'Manter acompanhamento de rotina.'
        });
     };

    // Botão Limpar (CORRIGIDO)
    const handleLimparConsultaAtual = () => {
        setSintomasConsulta({});
        setExameFisicoData({});
        setVitalsData({});
        
        const hdaText = generateSubjetivo({});
        const exameText = generateObjetivo({}, {});
        
        setSoapData({ notas_subjetivas: hdaText, notas_objetivas: exameText, avaliacao: '', plano: '' });
        showSnackbar('Campos da consulta atual limpos.', 'info');
    };

    // handleSubmit (Sem alterações)
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            const soapPayload = {
                ...soapData,
                pressao_arterial: vitalsData.pa || null,
                frequencia_cardiaca: vitalsData.fc || null,
                peso: vitalsData.peso || null,
            };
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes/`, soapPayload);
            showSnackbar('Evolução salva com sucesso!', 'success');
            if(onEvolucaoSalva) onEvolucaoSalva();
            handleLimparConsultaAtual();
        } catch (error) {
             console.error("Erro ao salvar evolução:", error.response?.data);
             showSnackbar(`Erro ao salvar evolução: ${error.response?.data?.detail || error.message}`, 'error');
        }
        finally { setIsSubmitting(false); }
    };

    // --- JSX (Sem alterações) ---
    return (
        <Paper sx={{ mb: 2, overflow: 'hidden' }}>
            {/* CABEÇALHO */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 0 }}>
                <Typography variant="h6" gutterBottom> Atendimento Ginecológico </Typography>
                {tabIndex === 0 && (
                     <Button variant="outlined" size="small" onClick={preencherNormalidade}> Preencher Normalidade </Button>
                )}
            </Box>

            {/* NAVEGAÇÃO DAS ABAS */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                <Tabs value={tabIndex} onChange={handleTabChange} aria-label="Abas prontuário ginecológico" variant="scrollable" scrollButtons="auto">
                    <Tab label="Consulta Atual" id="gineco-tab-0" />
                    <Tab label="Histórico" id="gineco-tab-1" />
                </Tabs>
            </Box>

            {/* CONTEÚDO DAS ABAS */}
            <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
                {/* ABA 1: CONSULTA ATUAL (SOAP) */}
                <TabPanel value={tabIndex} index={0}>
                    <Paper variant="outlined" sx={{ p: 2, borderColor: 'primary.main' }}>
                         <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Consulta Atual (SOAP)</Typography>

                         {/* Queixa Atual (S) */}
                         <Typography variant="body1" sx={{ mt: 1, fontWeight: 'medium' }}>Queixa Atual (S)</Typography>
                          <FormGroup sx={{ flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 1, p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                            {sintomasGinecoOptions.map(opt => (
                                <FormControlLabel key={opt.id} control={<Checkbox size="small" checked={sintomasConsulta[opt.id] || false} onChange={handleSintomasChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                            ))}
                         </FormGroup>
                         <TextField name="notas_subjetivas" label="Subjetivo (HDA gerada / Anotações Livres)" multiline rows={3} fullWidth value={soapData.notas_subjetivas || ''} onChange={handleSoapChange} size="small" />

                        <Divider sx={{ my: 2 }} />

                        {/* Exame Físico (O) */}
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Exame Físico (O)</Typography>
                         <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, my: 1.5 }}>
                            <TextField label="PA (mmHg)" name="pa" value={vitalsData.pa || ''} onChange={handleVitalsChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '100px' }}/>
                            <TextField label="FC (bpm)" name="fc" type="number" value={vitalsData.fc || ''} onChange={handleVitalsChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '80px' }}/>
                            <TextField label="Peso (kg)" name="peso" type="number" step="0.1" value={vitalsData.peso || ''} onChange={handleVitalsChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '80px' }}/>
                         </Box>
                         {/* Checkboxes Exame Físico GO */}
                         <FormGroup sx={{ p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                             <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                               <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Mamas:</Typography>
                               {exameFisicoGinecoOptions.filter(o=>o.group === 'mamas').map(opt => (
                                   <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                               ))}
                           </Box>
                             <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                               <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Abdome:</Typography>
                               {exameFisicoGinecoOptions.filter(o=>o.group === 'abdome').map(opt => (
                                   <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                               ))}
                           </Box>
                           <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                               <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Genitália Externa:</Typography>
                               {exameFisicoGinecoOptions.filter(o=>o.group === 'genitalia').map(opt => (
                                   <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                               ))}
                           </Box>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                               <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Especular:</Typography>
                               {exameFisicoGinecoOptions.filter(o=>o.group === 'especular').map(opt => (
                                   <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                               ))}
                           </Box>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                               <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Toque Vaginal:</Typography>
                               {exameFisicoGinecoOptions.filter(o=>o.group === 'toque').map(opt => (
                                   <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                               ))}
                           </Box>
                         </FormGroup>
                         {/* Campos de texto livres para exame */}
                         <TextField label="Exame das Mamas (descrição livre)" name="ex_mamas_livre" multiline rows={2} fullWidth size="small" sx={{mt: 1}} value={exameFisicoData.ex_mamas_livre || ''} onChange={handleExameChange} />
                         <TextField label="Exame Abdominal (descrição livre)" name="ex_abdome_livre" multiline rows={2} fullWidth size="small" sx={{mt: 1}} value={exameFisicoData.ex_abdome_livre || ''} onChange={handleExameChange} />
                         <TextField label="Genitália Externa (descrição livre)" name="ex_gen_ext_livre" multiline rows={2} fullWidth size="small" sx={{mt: 1}} value={exameFisicoData.ex_gen_ext_livre || ''} onChange={handleExameChange} />
                         <TextField label="Exame Especular (descrição livre)" name="ex_especular_livre" multiline rows={2} fullWidth size="small" sx={{mt: 1}} value={exameFisicoData.ex_especular_livre || ''} onChange={handleExameChange} />
                         <TextField label="Toque Vaginal (descrição livre)" name="ex_toque_livre" multiline rows={2} fullWidth size="small" sx={{mt: 1}} value={exameFisicoData.ex_toque_livre || ''} onChange={handleExameChange} />
                         <TextField name="notas_objetivas" label="Objetivo (Gerado / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_objetivas || ''} onChange={handleSoapChange} size="small" sx={{mt: 1.5}}/>

                        <Divider sx={{ my: 2 }} />

                        {/* Avaliação e Plano */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField name="avaliacao" label="Avaliação / Hipóteses Diagnósticas (A)" multiline rows={3} fullWidth value={soapData.avaliacao || ''} onChange={handleSoapChange} size="small" />
                            <TextField name="plano" label="Plano / Conduta (P)" multiline rows={3} fullWidth value={soapData.plano || ''} onChange={handleSoapChange} size="small" />
                             <Box sx={{ textAlign: 'right', mt: 1, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                <Button onClick={handleLimparConsultaAtual} variant="outlined" disabled={isSubmitting}> Limpar Consulta </Button>
                                <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting}>
                                     {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Atendimento'}
                                 </Button>
                            </Box>
                        </Box>
                    </Paper>
                </TabPanel>

                {/* ABA 2: HISTÓRICO GINECOLÓGICO */}
                <TabPanel value={tabIndex} index={1}>
                    <HistoricoGinecologia pacienteId={pacienteId} />
                </TabPanel>
            </Suspense>
        </Paper>
    );
}