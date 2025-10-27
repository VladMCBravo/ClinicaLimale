// src/components/prontuario/AtendimentoCardiologia.jsx
// VERSÃO REATORADA COM ABAS (Modelo Pediatria)

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import {
    Paper, Typography, FormGroup, FormControlLabel, Checkbox, TextField, Divider,
    Box, Button, CircularProgress, Tabs, Tab
} from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

// --- 1. IMPORTAR A NOVA ABA DE HISTÓRICO ---
const HistoricoCardiologia = lazy(() => import('./cardiologia/HistoricoCardiologia'));

// --- 2. OPÇÕES E TEMPLATES (APENAS DA CONSULTA ATUAL) ---
const sintomasOpcoes = [
  { id: 'dor_toracica', label: 'Dor torácica' }, { id: 'dispneia', label: 'Dispneia' },
  { id: 'palpitacoes', label: 'Palpitações' }, { id: 'sincope_tontura', label: 'Síncope/Tontura' },
  { id: 'edema_membros', label: 'Edema MMII' }, { id: 'claudicacao', label: 'Claudicação' }, { id: 'fadiga', label: 'Fadiga' },
];
const sintomaTemplates = {
  dor_toracica: "Dor torácica: Início/Tipo/Local/Irradiação/Intensidade/Fatores.",
  dispneia: "Dispneia: CF (I-IV)/Ortopneia(S/N)/DPN(S/N).",
  palpitacoes: "Palpitações: Início/Ritmo/Duração/Frequência/Fatores.",
  // ... (outros templates)
};
// EXAME FÍSICO EXPANDIDO (Baseado na pesquisa)
const exameFisicoQualitativoOptions = [
    { id: 'ictus_normal', label: 'Ictus Normo', group: 'inspecao', template: "Ictus cordis não visível/palpável ou em LHE 5º EIC." },
    { id: 'ictus_desviado', label: 'Ictus Desviado', group: 'inspecao', template: "Ictus cordis desviado para ___." },
    { id: 'tjp_negativa', label: 'TJP Negativa', group: 'pescoco', template: "Turgência Jugular Patológica negativa a 45º." },
    { id: 'tjp_positiva', label: 'TJP Positiva', group: 'pescoco', template: "Turgência Jugular Patológica positiva." },
    { id: 'brnf_2t', label: 'BRNF 2T s/ sopros', group: 'ausculta_card', template: "ACV: Ritmo regular, BRNF em 2T, sem sopros." },
    { id: 'bar_2t_sopros', label: 'Sopro', group: 'ausculta_card', template: "ACV: Ritmo ___, Sopro ___ /6+ em foco ___." },
    { id: 'b3', label: 'B3', group: 'ausculta_card', template: "Presença de B3." },
    { id: 'b4', label: 'B4', group: 'ausculta_card', template: "Presença de B4." },
    { id: 'mv_presente', label: 'AR: MV s/ RA', group: 'ausculta_pulm', template: "AR: MV presente universalmente, sem ruídos adventícios." },
    { id: 'estertores', label: 'AR: Estertores', group: 'ausculta_pulm', template: "AR: Estertores creptantes em bases." },
    { id: 'pulsos_cheios', label: 'Pulsos Cheios/Simétricos', group: 'vascular', template: "Pulsos periféricos cheios e simétricos." },
    { id: 'pulsos_diminuidos', label: 'Pulsos Diminuídos', group: 'vascular', template: "Pulsos ___ diminuídos." },
    { id: 'sem_edema', label: 'Sem Edema MMII', group: 'vascular', template: "MMII sem edema, panturrilhas livres." },
    { id: 'com_edema', label: 'Edema MMII', group: 'vascular', template: "MMII com edema ___ /4+." },
];

// --- FIM OPÇÕES ---

// Helper TabPanel
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} id={`cardio-tabpanel-${index}`} {...other}>
            {value === index && (<Box sx={{ p: { xs: 1, sm: 2 } }}>{children}</Box>)}
        </div>
    );
}

export default function AtendimentoCardiologia({ pacienteId, onEvolucaoSalva }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // 3. ESTADO DAS ABAS
    const [tabIndex, setTabIndex] = useState(0);

    // 4. ESTADOS APENAS DA CONSULTA ATUAL
    const [sintomasConsulta, setSintomasConsulta] = useState({}); // Sintomas de HOJE
    const [exameFisicoData, setExameFisicoData] = useState({}); // Exame de HOJE
    const [soapData, setSoapData] = useState({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });

    // 5. CARREGAMENTO DE DADOS (SIMPLIFICADO)
    // Não carrega mais a anamnese, apenas reseta os estados ao trocar de paciente
    useEffect(() => {
        // Reseta o SOAP e os sintomas da consulta atual ao trocar de paciente
        setSoapData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
        setSintomasConsulta({});
        setExameFisicoData({}); // Limpa exame físico anterior
        setTabIndex(0); // Volta para a primeira aba
    }, [pacienteId]);

    // 6. GERADORES DE TEXTO (Iguais, mas usam estados locais)
    const generateHda = useCallback(() => { 
        return sintomasOpcoes
            .filter(opt => sintomasConsulta[opt.id]) // Usa estado local
            .map(opt => sintomaTemplates[opt.id] || `${opt.label}: `)
            .join('\n');
     }, [sintomasConsulta]);

    const generateExameFisico = useCallback(() => {
        let texto = `Dados Vitais:\nPA: ${exameFisicoData.pa || '___x___'} mmHg\nFC: ${exameFisicoData.fc || '___'} bpm\n\nExame Físico:\n`;
        const achados = exameFisicoQualitativoOptions
            .filter(opt => exameFisicoData[opt.id])
            .map(opt => opt.template).join(" ");
        return texto + (achados || "Nenhuma observação selecionada.");
    }, [exameFisicoData]);

    // Efeitos que atualizam SOAP
    useEffect(() => { 
        const hdaText = generateHda();
        setSoapData(prev => ({ ...prev, notas_subjetivas: hdaText || (prev.notas_subjetivas || '') }));
     }, [sintomasConsulta, generateHda]);

    useEffect(() => { 
        const exameText = generateExameFisico();
        setSoapData(prev => ({ ...prev, notas_objetivas: exameText }));
     }, [exameFisicoData, generateExameFisico]);

    // 7. HANDLERS (Apenas da consulta atual)
    const handleTabChange = (event, newIndex) => { setTabIndex(newIndex); };
    const handleSoapChange = (e) => setSoapData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSintomasChange = (e) => setSintomasConsulta(prev => ({ ...prev, [e.target.name]: e.target.checked }));
    const handleExameChange = (event) => {
        const { name, value, type, checked } = event.target;
        setExameFisicoData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };
    // (Handlers de Anamnese/Fatores de Risco REMOVIDOS)

    // Botão Normalidade
    const preencherNormalidade = () => {
        setSintomasConsulta({}); 
        setExameFisicoData(prev => ({
            ...prev, // Mantém PA/FC digitados
            ictus_normal: true, ictus_desviado: false,
            tjp_negativa: true, tjp_positiva: false,
            brnf_2t: true, bar_2t_sopros: false, b3: false, b4: false,
            mv_presente: true, estertores: false,
            pulsos_cheios: true, pulsos_diminuidos: false,
            sem_edema: true, com_edema: false,
        }));
        setSoapData({
            notas_subjetivas: 'Paciente assintomático do ponto de vista cardiovascular.',
            notas_objetivas: `Dados Vitais:\nPA: ${exameFisicoData.pa || '___x___'} mmHg\nFC: ${exameFisicoData.fc || '___'} bpm\n\nExame Físico:\nIctus cordis não visível/palpável ou em LHE 5º EIC. Turgência Jugular Patológica negativa a 45º. ACV: Ritmo regular, BRNF em 2T, sem sopros. AR: MV presente universalmente, sem ruídos adventícios. Pulsos periféricos cheios e simétricos. MMII sem edema, panturrilhas livres.`,
            avaliacao: 'Exame cardiovascular sem alterações.',
            plano: 'Manter acompanhamento regular. Orientações gerais.'
        });
    };
    const handleLimparConsultaAtual = () => {
        setSintomasConsulta({}); 
        setExameFisicoData({}); // Limpa vitais e checkboxes
        setSoapData({ notas_subjetivas: '', notas_objetivas: 'PA: \nFC: \n', avaliacao: '', plano: '' });
        showSnackbar('Campos da consulta atual limpos.', 'info');
    };

    // 8. handleSubmit (SIMPLIFICADO)
    // Salva APENAS a Evolução (SOAP). O Histórico é salvo na Aba 2.
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        
        try {
            // Prepara o SOAP, incluindo os vitais da cardiologia
            const soapPayload = {
                ...soapData,
                pressao_arterial: exameFisicoData.pa || null,
                frequencia_cardiaca: exameFisicoData.fc || null,
            };

            await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes/`, soapPayload);
            showSnackbar('Evolução salva com sucesso!', 'success');
            
            if(onEvolucaoSalva) onEvolucoesSalva();
            handleLimparConsultaAtual(); // Limpa os campos após salvar

        } catch (error) {
            console.error("Erro ao salvar evolução:", error.response?.data);
            showSnackbar(`Erro ao salvar evolução: ${error.response?.data?.detail || error.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    // --- FIM handleSubmit ---

    // --- 9. JSX COM ABAS ---
    return (
        <Paper sx={{ mb: 2, overflow: 'hidden' }}>
            {/* CABEÇALHO */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 0 }}>
                <Typography variant="h6" gutterBottom> Atendimento Cardiológico </Typography>
                {tabIndex === 0 && (
                    <Button variant="outlined" size="small" onClick={preencherNormalidade}> Preencher Normalidade </Button>
                )}
            </Box>

            {/* NAVEGAÇÃO DAS ABAS */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                <Tabs value={tabIndex} onChange={handleTabChange} aria-label="Abas do prontuário cardiológico" variant="scrollable" scrollButtons="auto">
                    <Tab label="Consulta Atual" id="cardio-tab-0" />
                    <Tab label="Histórico" id="cardio-tab-1" />
                    <Tab label="Exames (ECG/ECO)" id="cardio-tab-2" />
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
                        <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 1, p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                            {sintomasOpcoes.map(opt => ( 
                                <FormControlLabel key={opt.id} control={<Checkbox checked={sintomasConsulta[opt.id] || false} onChange={handleSintomasChange} name={opt.id} />} label={opt.label} />
                            ))}
                        </FormGroup>
                        <TextField name="notas_subjetivas" label="Subjetivo (HDA gerada / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_subjetivas || ''} onChange={handleSoapChange} size="small" />
                        
                        <Divider sx={{ my: 2 }} />

                        {/* Exame Físico (O) */}
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Exame Físico (O)</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, my: 1.5 }}>
                            <TextField label="PA (mmHg)" name="pa" value={exameFisicoData.pa || ''} onChange={handleExameChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '100px' }}/>
                            <TextField label="FC (bpm)" name="fc" type="number" value={exameFisicoData.fc || ''} onChange={handleExameChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '80px' }}/>
                            {/* Adicione outros vitais se desejar (FR, SpO2) */}
                        </Box>
                        
                        {/* Checkboxes Exame Físico */}
                        <FormGroup sx={{ p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                            {/* Agrupando por sistema */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Inspeção/Pescoço:</Typography>
                                {exameFisicoQualitativoOptions.filter(o=>o.group === 'inspecao' || o.group === 'pescoco').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                                ))}
                            </Box>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Ausculta Cardíaca:</Typography>
                                {exameFisicoQualitativoOptions.filter(o=>o.group === 'ausculta_card').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                                ))}
                            </Box>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Ausculta Pulmonar:</Typography>
                                {exameFisicoQualitativoOptions.filter(o=>o.group === 'ausculta_pulm').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                                ))}
                            </Box>
                             <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Vascular/MMII:</Typography>
                                {exameFisicoQualitativoOptions.filter(o=>o.group === 'vascular').map(opt => (
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

                {/* ABA 2: HISTÓRICO CARDIOLÓGICO */}
                <TabPanel value={tabIndex} index={1}>
                    <HistoricoCardiologia pacienteId={pacienteId} />
                </TabPanel>

                {/* ABA 3: EXAMES (Placeholder) */}
                <TabPanel value={tabIndex} index={2}>
                    <Typography>Em breve: Visualizador de Exames (ECG, ECO, Laudos).</Typography>
                </TabPanel>
                
            </Suspense>
        </Paper>
    );
}