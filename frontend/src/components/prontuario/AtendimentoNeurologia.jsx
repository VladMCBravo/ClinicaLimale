// src/components/prontuario/AtendimentoNeurologia.jsx
// CORRIGIDO: Removidos useEffects automáticos que causavam loop

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import {
    Paper, Typography, FormGroup, FormControlLabel, Checkbox, TextField, Divider,
    Box, Button, CircularProgress, Tabs, Tab
} from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

const HistoricoNeurologia = lazy(() => import('./neurologia/HistoricoNeurologia'));
const RelatoriosTab = lazy(() => import('./RelatoriosTab')); 

// --- OPÇÕES E TEMPLATES (Consulta Atual Neurológica) ---
const sintomasNeurologiaOptions = [
    { id: 'cefaleia', label: 'Cefaleia', template: 'Refere cefaleia (início, tipo, localização, irradiação, intensidade, fatores).' },
    { id: 'tontura_vertigem', label: 'Tontura / Vertigem', template: 'Refere tontura/vertigem (tipo, duração, fatores).' },
    { id: 'fraqueza_muscular', label: 'Fraqueza Muscular', template: 'Refere fraqueza muscular em ___.' },
    { id: 'alteracao_sensorial', label: 'Alteração Sensorial', template: 'Refere parestesia/dormência em ___.' },
    { id: 'convulsao', label: 'Convulsão / Síncope', template: 'Relato de episódio de ___ (descrever).' },
    { id: 'perda_memoria', label: 'Perda de Memória', template: 'Refere perda de memória / confusão.' },
    { id: 'tremor', label: 'Tremor', template: 'Refere tremor (repouso/ação) em ___.' },
];
const exameFisicoNeurologiaOptions = [
    { id: 'alerta_orientado', label: 'Alerta, Orientado (AOx3)', group: 'mental', template: "Estado Mental: Alerta, orientado em tempo, espaço e pessoa." },
    { id: 'confuso_desorientado', label: 'Confuso / Desorientado', group: 'mental', template: "Estado Mental: Confuso / Desorientado." },
    { id: 'linguagem_normal', label: 'Linguagem Normal', group: 'mental', template: "Linguagem preservada." },
    { id: 'afasia', label: 'Afasia (Expressão/Compreensão)', group: 'mental', template: "Linguagem: Afasia de ___." },
    { id: 'cn_normais', label: 'Pares Cranianos Normais', group: 'cranianos', template: "Pares Cranianos: Sem alterações." },
    { id: 'cn_alterados', label: 'Alteração Pares Cranianos', group: 'cranianos', template: "Pares Cranianos: Alteração em ___ (descrever)." },
    { id: 'forca_global_5', label: 'Força Global Grau 5/5', group: 'motor', template: "Motor: Força muscular global preservada (Grau 5/5)." },
    { id: 'hemiparesia', label: 'Hemiparesia (D/E)', group: 'motor', template: "Motor: Hemiparesia em ___." },
    { id: 'tonus_normal', label: 'Tônus Normal', group: 'motor', template: "Tônus normal." },
    { id: 'espasticidade_rigidez', label: 'Espasticidade / Rigidez', group: 'motor', template: "Tônus: Presença de ___." },
    { id: 'sem_mov_invol', label: 'Sem Mov. Involuntários', group: 'motor', template: "Sem movimentos involuntários." },
    { id: 'reflexos_normo', label: 'Reflexos Normoativos', group: 'reflexos', template: "Reflexos profundos normoativos e simétricos." },
    { id: 'reflexos_alterados', label: 'Hiper/Hiporreflexia', group: 'reflexos', template: "Reflexos profundos ___." },
    { id: 'babinski_ausente', label: 'Babinski Ausente (Flexor)', group: 'reflexos', template: "Reflexo cutâneo-plantar flexor bilateral." },
    { id: 'babinski_presente', label: 'Babinski Presente (Extensor)', group: 'reflexos', template: "Reflexo cutâneo-plantar extensor em ___." },
    { id: 'sensibilidade_normal', label: 'Sensibilidade Normal', group: 'sensorial', template: "Sensibilidade (tátil, dolorosa, vibratória) preservada." },
    { id: 'hipoestesia', label: 'Hipoestesia / Anestesia', group: 'sensorial', template: "Sensibilidade: Hipoestesia em ___." },
    { id: 'marcha_normal', label: 'Marcha Normal', group: 'marcha', template: "Marcha e equilíbrio: Eutáxica, Romberg negativo." },
    { id: 'marcha_ataxica', label: 'Marcha Atáxica', group: 'marcha', template: "Marcha atáxica." },
    { id: 'romberg_positivo', label: 'Romberg Positivo', group: 'marcha', template: "Sinal de Romberg positivo." },
    { id: 'sinais_meningeos_ausentes', label: 'Sinais Meníngeos Ausentes', group: 'marcha', template: "Sinais meníngeos (Rigidez Nucal, Kernig, Brudzinski) ausentes." },
];

// Helper TabPanel
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} id={`neuro-tabpanel-${index}`} {...other}>
            {value === index && (<Box sx={{ p: { xs: 1, sm: 2 } }}>{children}</Box>)}
        </div>
    );
}

export default function AtendimentoNeurologia({ pacienteId, onEvolucaoSalva, agendamentoId }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tabIndex, setTabIndex] = useState(0);

    const [sintomasConsulta, setSintomasConsulta] = useState({});
    const [exameFisicoData, setExameFisicoData] = useState({});
    const [soapData, setSoapData] = useState({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
    const [consultaSalvaId, setConsultaSalvaId] = useState(null); 

    useEffect(() => {
        setSoapData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
        setSintomasConsulta({});
        setExameFisicoData({});
        setTabIndex(0);
        setConsultaSalvaId(null);
    }, [pacienteId]);

    // Geradores de texto
    const generateSubjetivo = useCallback((sintomas) => { 
        const currentSintomas = sintomas || sintomasConsulta;
        return sintomasNeurologiaOptions
            .filter(opt => currentSintomas[opt.id])
            .map(opt => opt.template || `${opt.label}: `)
            .join('\n');
     }, [sintomasConsulta]);

    const generateObjetivo = useCallback((exame) => {
        const currentExame = exame || exameFisicoData;
        let texto = `Dados Vitais:\nPA: ${currentExame.pa || '___x___'} mmHg\nFC: ${currentExame.fc || '___'} bpm\nPeso: ${currentExame.peso || '___'} kg\n\nExame Neurológico:\n`;
        const achados = exameFisicoNeurologiaOptions
            .filter(opt => currentExame[opt.id])
            .map(opt => opt.template).join(" ");
        return texto + (achados || "Nenhuma observação selecionada.");
    }, [exameFisicoData]);

    // Handlers
    const handleTabChange = (event, newIndex) => { setTabIndex(newIndex); };
    const handleSoapChange = (e) => setSoapData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    
    const handleSintomasChange = (e) => {
        const newSintomas = { ...sintomasConsulta, [e.target.name]: e.target.checked };
        setSintomasConsulta(newSintomas);
        
        const hdaText = generateSubjetivo(newSintomas);
        setSoapData(prev => ({ ...prev, notas_subjetivas: hdaText || '' }));
    };
    
    const handleExameChange = (event) => {
        const { name, value, type, checked } = event.target;
        const newExameData = { ...exameFisicoData, [name]: type === 'checkbox' ? checked : value };
        setExameFisicoData(newExameData);

        const exameText = generateObjetivo(newExameData);
        setSoapData(prev => ({ ...prev, notas_objetivas: exameText }));
    };

    // Botão Normalidade
    const preencherNormalidade = () => {
        setSintomasConsulta({}); 
        
        const newExameData = {
            ...exameFisicoData, // Mantém vitais (PA/FC/Peso)
            alerta_orientado: true,
            linguagem_normal: true,
            cn_normais: true,
            forca_global_5: true,
            tonus_normal: true,
            sem_mov_invol: true,
            reflexos_normo: true,
            babinski_ausente: true,
            sensibilidade_normal: true,
            marcha_normal: true,
            sinais_meningeos_ausentes: true,
            // Limpa os anormais
            confuso_desorientado: false, afasia: false, cn_alterados: false, hemiparesia: false,
            espasticidade_rigidez: false, reflexos_alterados: false, babinski_presente: false,
            hipoestesia: false, marcha_ataxica: false, romberg_positivo: false,
        };
        setExameFisicoData(newExameData);

        // Gera texto com os novos dados
        const exameText = generateObjetivo(newExameData);
        
        setSoapData(prev => ({
            ...prev,
            notas_subjetivas: 'Paciente nega queixas neurológicas.',
            notas_objetivas: exameText,
            avaliacao: 'Exame neurológico sem alterações.',
            plano: 'Manter acompanhamento de rotina.'
        }));
    };
    
    const handleLimparConsultaAtual = () => {
        setSintomasConsulta({}); 
        setExameFisicoData({});
        
        // Gera texto com dados vazios
        const hdaText = generateSubjetivo({});
        const exameText = generateObjetivo({});
        
        setSoapData({ notas_subjetivas: hdaText, notas_objetivas: exameText, avaliacao: '', plano: '' });
        showSnackbar('Campos da consulta atual limpos.', 'info');
    };

    // --- ★★★ handleSubmit (CORRIGIDO) ★★★ ---
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            const soapPayload = {
                ...soapData,
                pressao_arterial: exameFisicoData.pa || null,
                frequencia_cardiaca: exameFisicoData.fc || null,
                peso: exameFisicoData.peso || null,
                
                // 1. Adiciona o agendamentoId ao payload
                agendamento: agendamentoId || null,
            };

            // 2. A URL genérica '/evolucoes/' já está correta.
            const res = await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes/`, soapPayload);
            
            setConsultaSalvaId(res.data.id); 
            showSnackbar('Evolução salva com sucesso!', 'success');
            
            // 3. A prop 'onEvolucaoSalva' (singular) já está correta.
            if(onEvolucaoSalva) onEvolucaoSalva(res.data.id);

        } catch (error) {
            showSnackbar('Erro ao salvar evolução.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- JSX COM ABAS ---
    return (
        <Paper sx={{ mb: 2, overflow: 'hidden' }}>
            {/* CABEÇALHO */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 0 }}>
                <Typography variant="h6" gutterBottom> Atendimento Neurológico </Typography>
                {tabIndex === 0 && (
                    <Button variant="outlined" size="small" onClick={preencherNormalidade}> Preencher Normalidade </Button>
                )}
            </Box>

            {/* NAVEGAÇÃO DAS ABAS */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                <Tabs value={tabIndex} onChange={handleTabChange} aria-label="Abas prontuário neurológico" variant="scrollable" scrollButtons="auto">
                    <Tab label="Consulta Atual" id="neuro-tab-0" />
                    <Tab label="Histórico" id="neuro-tab-1" />
                    <Tab label="Relatórios" id="neuro-tab-2" />
                    <Tab label="Exames (EEG/Neuroimagem)" id="neuro-tab-3" />
                </Tabs>
            </Box>

            {/* CONTEÚDO DAS ABAS */}
            <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
                
                {/* ABA 1: CONSULTA ATUAL (SOAP) */}
                <TabPanel value={tabIndex} index={0}>
                    <Paper component="form" onSubmit={handleSubmit} variant="outlined" sx={{ p: 2, borderColor: 'primary.main' }}>
                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Consulta Atual (SOAP)</Typography>
                        
                        {/* Queixa Atual (S) */}
                        <Typography variant="body1" sx={{ mt: 1, fontWeight: 'medium' }}>Queixa Atual (S)</Typography>
                        <FormGroup sx={{ flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 1, p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                            {sintomasNeurologiaOptions.map(opt => ( 
                                <FormControlLabel key={opt.id} control={<Checkbox size="small" checked={sintomasConsulta[opt.id] || false} onChange={handleSintomasChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                            ))}
                        </FormGroup>
                        <TextField name="notas_subjetivas" label="Subjetivo (HDA gerada / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_subjetivas || ''} onChange={handleSoapChange} size="small" />
                        
                        <Divider sx={{ my: 2 }} />

                        {/* Exame Físico (O) */}
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Exame Físico (O)</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, my: 1.5 }}>
                            <TextField label="PA (mmHg)" name="pa" value={exameFisicoData.pa || ''} onChange={handleExameChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '100px' }}/>
                            <TextField label="FC (bpm)" name="fc" type="number" value={exameFisicoData.fc || ''} onChange={handleExameChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '80px' }}/>
                            <TextField label="Peso (kg)" name="peso" type="number" value={exameFisicoData.peso || ''} onChange={handleExameChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '80px' }}/>
                        </Box>
                        
                        {/* Checkboxes Exame Físico Agrupados */}
                        <FormGroup sx={{ p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Estado Mental:</Typography>
                                {exameFisicoNeurologiaOptions.filter(o=>o.group === 'mental').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                                ))}
                            </Box>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Pares Cranianos:</Typography>
                                {exameFisicoNeurologiaOptions.filter(o=>o.group === 'cranianos').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                                ))}
                            </Box>
                             <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Motor:</Typography>
                                {exameFisicoNeurologiaOptions.filter(o=>o.group === 'motor').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                                ))}
                            </Box>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Reflexos:</Typography>
                                {exameFisicoNeurologiaOptions.filter(o=>o.group === 'reflexos').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                                ))}
                            </Box>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Sensorial:</Typography>
                                {exameFisicoNeurologiaOptions.filter(o=>o.group === 'sensorial').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                                ))}
                            </Box>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Marcha e Sinais Meníngeos:</Typography>
                                {exameFisicoNeurologiaOptions.filter(o=>o.group === 'marcha').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                                ))}
                            </Box>
                        </FormGroup>

                        <TextField name="notas_objetivas" label="Objetivo (Gerado / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_objetivas || ''} onChange={handleSoapChange} size="small" sx={{mt: 1.5}}/>
                        
                        <Divider sx={{ my: 2 }} />

                        {/* Campos Finais (A, P) e Botões */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField name="avaliacao" label="Avaliação / Hipóteses Diagnósticas (A)" multiline rows={3} fullWidth value={soapData.avaliacao || ''} onChange={handleSoapChange} size="small" />
                            <TextField name="plano" label="Plano / Conduta (P)" multiline rows={3} fullWidth value={soapData.plano || ''} onChange={handleSoapChange} size="small" />
                            <Box sx={{ textAlign: 'right', mt: 1, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                <Button onClick={handleLimparConsultaAtual} variant="outlined" disabled={isSubmitting}>
                                    Limpar Consulta
                                </Button>
                                <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting}>
                                    {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Atendimento'}
                                </Button>
                            </Box>
                        </Box>
                    </Paper>
                </TabPanel>

                {/* ABA 2: HISTÓRICO NEUROLÓGICO */}
                <TabPanel value={tabIndex} index={1}>
                    <HistoricoNeurologia pacienteId={pacienteId} />
                </TabPanel>
                
                {/* ABA 3: RELATÓRIOS (Reutilizado) */}
                <TabPanel value={tabIndex} index={2}>
                    <RelatoriosTab 
                        pacienteId={pacienteId}
                        especialidade="neurologia" 
                        consultaAtualId={consultaSalvaId}
                    />
                </TabPanel>
                
                {/* ABA 4: EXAMES (Placeholder) */}
                <TabPanel value={tabIndex} index={3}>
                    <Typography>Em breve: Visualizador de Exames (TC, RM, EEG, Laudos).</Typography>
                </TabPanel>
            </Suspense>
        </Paper>
    );
}