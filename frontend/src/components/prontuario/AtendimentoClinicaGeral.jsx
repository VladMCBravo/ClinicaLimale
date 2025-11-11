// src/components/prontuario/AtendimentoClinicaGeral.jsx
// VERSÃO CORRIGIDA: Removidos useEffects que causavam loop

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import {
    Paper, Typography, TextField, Box, Button, CircularProgress, Tabs, Tab,
    Grid, FormGroup, FormControlLabel, Checkbox, Divider
} from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

const HistoricoClinicaGeral = lazy(() => import('./clinica_geral/HistoricoClinicaGeral'));

// --- (Constantes de Opções omitidas para brevidade) ---
const sintomasGeraisOptions = [
    { id: 'febre', label: 'Febre' }, { id: 'tosse', label: 'Tosse' }, { id: 'dor', label: 'Dor (geral)' },
    { id: 'cefaleia', label: 'Cefaleia' }, { id: 'fadiga', label: 'Fadiga/Astenia' }, { id: 'nauseas_vomitos', label: 'Náuseas/Vômitos' },
    { id: 'tontura', label: 'Tontura' }, { id: 'alteracao_sono', label: 'Alteração Sono' },
];
const exameFisicoGeralOptions = [
    { id: 'beg', label: 'BEG', group: 'geral', template: "Bom estado geral." }, { id: 'reg', label: 'REG', group: 'geral', template: "Regular estado geral." }, { id: 'meg', label: 'MEG', group: 'geral', template: "Mau estado geral." },
    { id: 'corado', label: 'Corado', group: 'geral', template: "Corado." }, { id: 'descorado', label: 'Descorado', group: 'geral', template: "Descorado (+/4+)." },
    { id: 'hidratado', label: 'Hidratado', group: 'geral', template: "Hidratado." }, { id: 'desidratado', label: 'Desidratado', group: 'geral', template: "Desidratado (+/4+)." },
    { id: 'eupneico', label: 'Eupneico', group: 'geral', template: "Eupneico." }, { id: 'dispneico', label: 'Dispneico', group: 'geral', template: "Dispneico." }, { id: 'taquipneico', label: 'Taquipneico', group: 'geral', template: "Taquipneico." },
    { id: 'acianotico', label: 'Acianótico', group: 'geral', template: "Acianótico." }, { id: 'cianotico', label: 'Cianótico', group: 'geral', template: "Cianótico (Central/Periférico)." },
    { id: 'anicterico', label: 'Anictérico', group: 'geral', template: "Anictérico." }, { id: 'icterico', label: 'Ictérico', group: 'geral', template: "Ictérico (+/4+)." },
    { id: 'afebril', label: 'Afebril', group: 'geral', template: "Afebril ao toque." }, { id: 'febril', label: 'Febril', group: 'geral', template: "Febril ao toque." },
    { id: 'orofaringe_normal', label: 'Orofaringe Normal', group: 'orl', template: "Orofaringe sem alterações." }, { id: 'orofaringe_hiperemia', label: 'Hiperemia Orofaringe', group: 'orl', template: "Hiperemia de orofaringe." },
    { id: 'linfonodos_ausentes', label: 'Linfonodos Ausentes', group: 'pescoco', template: "Linfonodos não palpáveis." }, { id: 'linfonodos_presentes', label: 'Linfonodos Palpáveis', group: 'pescoco', template: "Linfonodos palpáveis em ___." },
    { id: 'acv_brnf', label: 'ACV Normal', group: 'cardio', template: "ACV: BRNF em 2T, sem sopros." },
    { id: 'ar_mv_presente', label: 'AR Normal', group: 'resp', template: "AR: MV presente universalmente, sem ruídos adventícios." },
    { id: 'abdome_normal', label: 'Abdome Normal', group: 'abdome', template: "Abdome: Flácido, indolor à palpação, RHA+." },
    { id: 'mmii_normal', label: 'MMII Normais', group: 'mmii', template: "MMII: Sem edema, pulsos presentes, panturrilhas livres." },
];
// --- FIM OPÇÕES ---

// Helper TabPanel
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} id={`geral-tabpanel-${index}`} {...other}>
            {value === index && (<Box sx={{ p: { xs: 1, sm: 2 } }}>{children}</Box>)}
        </div>
    );
}

// --- Componente Principal ---
export default function AtendimentoClinicaGeral({ pacienteId, onEvolucaoSalva }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tabIndex, setTabIndex] = useState(0);

    const [sintomasConsulta, setSintomasConsulta] = useState({});
    const [exameFisicoData, setExameFisicoData] = useState({});
    const [vitalsData, setVitalsData] = useState({}); 
    const [soapData, setSoapData] = useState({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });

    // Reseta estados ao trocar de paciente
    useEffect(() => {
        setSoapData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
        setSintomasConsulta({});
        setExameFisicoData({});
        setVitalsData({});
        setTabIndex(0);
    }, [pacienteId]);

    // Geradores de texto (Atualizados para aceitar argumentos)
    const generateSubjetivo = useCallback((sintomas) => {
        const currentSintomas = sintomas || sintomasConsulta;
        const sintomasText = sintomasGeraisOptions
            .filter(opt => currentSintomas[opt.id])
            .map(opt => `${opt.label}: `) 
            .join('\n');
        return sintomasText;
     }, [sintomasConsulta]);

    const generateObjetivo = useCallback((vitals, exame) => {
         const currentVitals = vitals || vitalsData;
         const currentExame = exame || exameFisicoData;
         
         let texto = `Dados Vitais:\nPA: ${currentVitals.pa || '___'} mmHg\nFC: ${currentVitals.fc || '___'} bpm\nFR: ${currentVitals.fr || '___'} irpm\nT: ${currentVitals.temp || '___'} °C\nSpO2: ${currentVitals.spo2 || '___'} %\nPeso: ${currentVitals.peso || '___'} kg\n\nExame Físico:\n`;
         const achados = exameFisicoGeralOptions
            .filter(opt => currentExame[opt.id])
            .map(opt => opt.template).join(" ");
         
         if (currentExame.exame_livre) texto += `\n${currentExame.exame_livre}`;
         return texto + (achados || "Nenhuma observação selecionada.");
     }, [vitalsData, exameFisicoData]);

    // --- CORREÇÃO: useEffects que atualizam SOAP foram removidos ---
    // useEffect(() => { ... }, [sintomasConsulta, generateSubjetivo]);
    // useEffect(() => { ... }, [vitalsData, exameFisicoData, generateObjetivo]);

    // Handlers (Atualizados para controlar o SOAP)
    const handleTabChange = (event, newIndex) => { setTabIndex(newIndex); };
    const handleSoapChange = (e) => setSoapData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    
    const handleSintomasChange = (e) => {
        const newSintomas = { ...sintomasConsulta, [e.target.name]: e.target.checked };
        setSintomasConsulta(newSintomas);
        
        const hdaText = generateSubjetivo(newSintomas);
        setSoapData(prev => ({ ...prev, notas_subjetivas: hdaText }));
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

    // Botão Normalidade (Atualizado para ser auto-contido)
    const preencherNormalidade = () => {
        const dadosExameNormal = {
            ...vitalsData, // Mantém vitais
            beg: true, corado: true, hidratado: true, eupneico: true, acianotico: true, anicterico: true, afebril: true,
            orofaringe_normal: true, linfonodos_ausentes: true, acv_brnf: true, ar_mv_presente: true, abdome_normal: true, mmii_normal: true,
            reg: false, meg: false, descorado: false, desidratado: false, dispneico: false, taquipneico: false, cianotico: false, icterico: false, febril: false,
            orofaringe_hiperemia: false, linfonodos_presentes: false,
            exame_livre: '',
        };
        
        const textoExameNormal = `Dados Vitais:\nPA: ${dadosExameNormal.pa || '___'} mmHg\nFC: ${dadosExameNormal.fc || '___'} bpm\nFR: ${dadosExameNormal.fr || '___'} irpm\nT: ${dadosExameNormal.temp || '___'} °C\nSpO2: ${dadosExameNormal.spo2 || '___'} %\nPeso: ${dadosExameNormal.peso || '___'} kg\n\nExame Físico:\nBom estado geral. Corado. Hidratado. Eupneico. Acianótico. Anictérico. Afebril ao toque. Orofaringe sem alterações. Linfonodos não palpáveis. ACV: BRNF em 2T, sem sopros. AR: MV presente universalmente, sem ruídos adventícios. Abdome: Flácido, indolor à palpação, RHA+. MMII: Sem edema, pulsos presentes, panturrilhas livres.`;
        
        setSintomasConsulta({});
        setExameFisicoData(dadosExameNormal);
        setSoapData({
             notas_subjetivas: 'Paciente refere consulta de rotina, nega queixas.',
             notas_objetivas: textoExameNormal,
             avaliacao: 'Exame físico sem alterações.',
             plano: 'Manter acompanhamento regular. Orientações gerais de saúde.'
        });
     };

    // Botão Limpar (Atualizado)
    const handleLimparConsultaAtual = () => {
        setSintomasConsulta({});
        setExameFisicoData({});
        setVitalsData({});
        setSoapData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
        showSnackbar('Campos da consulta atual limpos.', 'info');
    };

    // handleSubmit (Salva apenas a Evolução SOAP)
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
             <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 0 }}>
                <Typography variant="h6" gutterBottom> Atendimento Clínica Geral </Typography>
                {tabIndex === 0 && (
                    <Button variant="outlined" size="small" onClick={preencherNormalidade}> Preencher Normalidade </Button>
                )}
            </Box>

             <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                <Tabs value={tabIndex} onChange={handleTabChange} aria-label="Abas prontuário clínica geral" variant="scrollable" scrollButtons="auto">
                    <Tab label="Consulta Atual" id="geral-tab-0" />
                    <Tab label="Histórico" id="geral-tab-1" />
                </Tabs>
            </Box>

            <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
                <TabPanel value={tabIndex} index={0}>
                     <Paper component="form" onSubmit={handleSubmit} variant="outlined" sx={{ p: 2, borderColor: 'primary.main' }}>
                         <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Consulta Atual (SOAP)</Typography>

                         <Typography variant="body1" sx={{ mt: 1, fontWeight: 'medium' }}>Queixa Atual (S)</Typography>
                          <FormGroup sx={{ flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 1, p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                            {sintomasGeraisOptions.map(opt => (
                                <FormControlLabel key={opt.id} control={<Checkbox size="small" checked={sintomasConsulta[opt.id] || false} onChange={handleSintomasChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                            ))}
                         </FormGroup>
                         <TextField name="notas_subjetivas" label="Subjetivo (HDA / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_subjetivas || ''} onChange={handleSoapChange} size="small" />

                        <Divider sx={{ my: 2 }} />

                         <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Exame Físico (O)</Typography>
                         <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, my: 1.5 }}>
                             <TextField label="PA (mmHg)" name="pa" value={vitalsData.pa || ''} onChange={handleVitalsChange} size="small" sx={{ width: 'auto', minWidth: '100px' }}/>
                             <TextField label="FC (bpm)" name="fc" type="number" value={vitalsData.fc || ''} onChange={handleVitalsChange} size="small" sx={{ width: 'auto', minWidth: '80px' }}/>
                             <TextField label="FR (irpm)" name="fr" type="number" value={vitalsData.fr || ''} onChange={handleVitalsChange} size="small" sx={{ width: 'auto', minWidth: '80px' }}/>
                             <TextField label="T (°C)" name="temp" type="number" step="0.1" value={vitalsData.temp || ''} onChange={handleVitalsChange} size="small" sx={{ width: 'auto', minWidth: '80px' }}/>
                             <TextField label="SpO2 (%)" name="spo2" type="number" value={vitalsData.spo2 || ''} onChange={handleVitalsChange} size="small" sx={{ width: 'auto', minWidth: '80px' }}/>
                             <TextField label="Peso (kg)" name="peso" type="number" step="0.1" value={vitalsData.peso || ''} onChange={handleVitalsChange} size="small" sx={{ width: 'auto', minWidth: '80px' }}/>
                         </Box>
                         <FormGroup sx={{ p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                             <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                               <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Geral:</Typography>
                               {exameFisicoGeralOptions.filter(o=>o.group === 'geral').map(opt => (
                                   <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                               ))}
                           </Box>
                            {/* TODO: Adicionar Box para ORL, Pescoço, Cardio, Resp, Abdome, MMII */}
                         </FormGroup>
                          <TextField label="Exame Físico (descrição livre)" name="exame_livre" multiline rows={3} fullWidth size="small" sx={{mt: 1}} value={exameFisicoData.exame_livre || ''} onChange={handleExameChange} />
                         <TextField name="notas_objetivas" label="Objetivo (Gerado / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_objetivas || ''} onChange={handleSoapChange} size="small" sx={{mt: 1.5}}/>

                        <Divider sx={{ my: 2 }} />

                         <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField name="avaliacao" label="Avaliação / Hipóteses Diagnósticas (A)" multiline rows={3} fullWidth value={soapData.avaliacao || ''} onChange={handleSoapChange} size="small" />
                            <TextField name="plano" label="Plano / Conduta (P)" multiline rows={3} fullWidth value={soapData.plano || ''} onChange={handleSoapChange} size="small" />
                             <Box sx={{ textAlign: 'right', mt: 1, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                <Button onClick={handleLimparConsultaAtual} variant="outlined" disabled={isSubmitting}> Limpar Consulta </Button>
                                <Button type="submit" variant="contained" disabled={isSubmitting}>
                                     {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Atendimento'}
                                 </Button>
                            </Box>
                        </Box>
                    </Paper>
                </TabPanel>

                <TabPanel value={tabIndex} index={1}>
                    <HistoricoClinicaGeral pacienteId={pacienteId} />
                </TabPanel>

            </Suspense>
        </Paper>
    );
}