// src/components/prontuario/AtendimentoObstetricia.jsx
// CORRIGIDO: Removidos useEffects automáticos que causavam loop

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import {
    Paper, Typography, FormGroup, FormControlLabel, Checkbox, TextField, Divider,
    Box, Button, CircularProgress, Tabs, Tab
} from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

const HistoricoObstetricia = lazy(() => import('./obstetricia/HistoricoObstetricia'));

// --- OPÇÕES (Obstetrícia - Consulta Atual) ---
const sintomasOBOptions = [
    { id: 'mov_fetal_presente', label: 'MF Presentes', group: 'subjetivo', template: 'Refere boa movimentação fetal.' },
    { id: 'sangramento', label: 'Sangramento', group: 'subjetivo', template: 'Refere sangramento vaginal (descrever).' },
    { id: 'perda_liquido', label: 'Perda Líquida', group: 'subjetivo', template: 'Refere perda líquida (descrever).' },
    { id: 'contracoes', label: 'Contrações', group: 'subjetivo', template: 'Refere contrações (frequência/intensidade).' },
];
const exameFisicoOBOptions = [
    { id: 'bcf_presente', label: 'BCF (+)', group: 'exame', template: 'BCF = ___ bpm (presente).' },
    { id: 'mf_presente', label: 'MF (+)', group: 'exame', template: 'Movimentação fetal presente.' },
    { id: 'colo_fechado', label: 'Colo Fechado', group: 'toque', template: 'Toque: Colo grosso, posterior, fechado.' },
    { id: 'colo_dilatado', label: 'Colo Dilatado', group: 'toque', template: 'Toque: Colo ___, ___, ___ cm de dilatação, bolsa ___, apresentação ___.' },
];

// Helper TabPanel
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} id={`ob-tabpanel-${index}`} {...other}>
            {value === index && (<Box sx={{ p: { xs: 1, sm: 2 } }}>{children}</Box>)}
        </div>
    );
}

export default function AtendimentoObstetricia({ pacienteId, onEvolucaoSalva, agendamentoId }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tabIndex, setTabIndex] = useState(0);

    const [sintomasConsulta, setSintomasConsulta] = useState({});
    const [exameFisicoData, setExameFisicoData] = useState({});
    const [soapData, setSoapData] = useState({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
    const [igAtual, setIgAtual] = useState('');

    useEffect(() => {
        setSoapData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
        setSintomasConsulta({});
        setExameFisicoData({});
        setTabIndex(0);
        setIgAtual('');
        
        if (pacienteId) {
             apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`)
                .then(res => {
                    if (res.data && res.data.ginecologica) {
                        const ig = res.data.ginecologica.ig_atual || '';
                        setIgAtual(ig);
                        // Pré-preenche o subjetivo inicial com a IG
                        setSoapData(prev => ({ ...prev, notas_subjetivas: `IG: ${ig || '___'} semanas.\n` }));
                    }
                }).catch(err => console.error("Erro ao buscar IG"));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pacienteId]);

    // Geradores de texto
    const generateHda = useCallback((sintomas, ig) => {
        const currentSintomas = sintomas || sintomasConsulta;
        const currentIg = ig !== undefined ? ig : igAtual;
        
        let texto = `IG: ${currentIg || '___'} semanas.\n`;
        const queixas = sintomasOBOptions
            .filter(opt => currentSintomas[opt.id])
            .map(opt => opt.template).join(" ");
        return texto + (queixas || "Nega queixas.");
     }, [sintomasConsulta, igAtual]);

    const generateExameFisico = useCallback((exame) => {
        const currentExame = exame || exameFisicoData;
        let texto = `Dados Vitais:\nPA: ${currentExame.pa || '___x___'} mmHg\nFC: ${currentExame.fc || '___'} bpm\n\nExame Obstétrico:\nAU = ${currentExame.au || '___'} cm.\n`;
        const achados = exameFisicoOBOptions
            .filter(opt => currentExame[opt.id])
            .map(opt => opt.template).join(" ");
         if (!currentExame.bcf_presente && currentExame.bcf_manual) texto += `BCF = ${currentExame.bcf_manual} bpm.\n`;
         if (!currentExame.colo_fechado && !currentExame.colo_dilatado && currentExame.toque_manual) texto += `Toque: ${currentExame.toque_manual}\n`;
            
        return texto + (achados || "Nenhuma observação selecionada.");
    }, [exameFisicoData]);

    // Handlers
    const handleTabChange = (event, newIndex) => { setTabIndex(newIndex); };
    const handleSoapChange = (e) => setSoapData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    
    const handleSintomasChange = (e) => {
        const newSintomas = { ...sintomasConsulta, [e.target.name]: e.target.checked };
        setSintomasConsulta(newSintomas);
        
        const hdaText = generateHda(newSintomas, igAtual);
        setSoapData(prev => ({ ...prev, notas_subjetivas: hdaText }));
    };
    
    const handleExameChange = (event) => {
        const { name, value, type, checked } = event.target;
        const newExameData = { ...exameFisicoData, [name]: type === 'checkbox' ? checked : value };
        setExameFisicoData(newExameData);
        
        const exameText = generateExameFisico(newExameData);
        setSoapData(prev => ({ ...prev, notas_objetivas: exameText }));
    };
    
    // Botão Normalidade
    const preencherNormalidade = () => { 
        const newSintomas = { mov_fetal_presente: true };
        setSintomasConsulta(newSintomas); 
        
        const newExameData = {
            ...exameFisicoData, // Mantém PA, FC, AU
            bcf_presente: true, mf_presente: true, colo_fechado: true, colo_dilatado: false,
            toque_manual: '', bcf_manual: '',
        };
        setExameFisicoData(newExameData);
        
        // Gera textos com os novos dados
        const hdaText = generateHda(newSintomas, igAtual);
        const exameText = generateExameFisico(newExameData);

        setSoapData({
             notas_subjetivas: hdaText,
             notas_objetivas: exameText.replace('BCF = ___ bpm (presente).', `BCF = ${newExameData.bcf_manual || '___'} bpm (presente).`)
                                       .replace('Toque: Colo grosso, posterior, fechado.', `Toque: Colo grosso, posterior, fechado.`),
             avaliacao: 'Gestação tópica, feto vivo, sem sinais de trabalho de parto.',
             plano: 'Manter acompanhamento pré-natal. Orientações gerais.'
        });
     };
    
    // Botão Limpar
    const handleLimparConsultaAtual = () => {
        setSintomasConsulta({});
        setExameFisicoData({});
        // Recria textos com dados vazios
        const hdaText = generateHda({}, igAtual); 
        const exameText = generateExameFisico({});
        setSoapData({ notas_subjetivas: hdaText, notas_objetivas: exameText, avaliacao: '', plano: '' });
        showSnackbar('Campos da consulta atual limpos.', 'info');
    };
    
    // --- ★★★ handleSubmit (CORRIGIDO) ★★★ ---
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            // 1. Criar o payload completo
            const soapPayload = {
                ...soapData,
                pressao_arterial: exameFisicoData.pa || null,
                frequencia_cardiaca: exameFisicoData.fc || null,
                
                // 2. Adicionar o agendamentoId
                agendamento: agendamentoId || null,
            };
            
            // 3. Usar a URL genérica
            const res = await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes/`, soapPayload);
            
            showSnackbar('Evolução salva com sucesso!', 'success');
            
            // 4. Chamar o callback (singular)
            if(onEvolucaoSalva) onEvolucaoSalva(res.data.id);
            
            handleLimparConsultaAtual(); // Limpa consulta após salvar
        } catch (error) {
             console.error("Erro ao salvar evolução:", error.response?.data);
             showSnackbar(`Erro ao salvar evolução: ${error.response?.data?.detail || error.message}`, 'error');
        }
        finally { setIsSubmitting(false); }
    };

    // --- RETURN ---
    return (
        <Paper sx={{ mb: 2, overflow: 'hidden' }}>
            {/* CABEÇALHO */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 0 }}>
                <Typography variant="h6" gutterBottom> Atendimento Obstétrico </Typography>
                {tabIndex === 0 && (
                    <Button variant="outlined" size="small" onClick={preencherNormalidade}> Preencher Normalidade </Button>
                )}
            </Box>

            {/* NAVEGAÇÃO DAS ABAS */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                <Tabs value={tabIndex} onChange={handleTabChange} aria-label="Abas prontuário obstétrico" variant="scrollable" scrollButtons="auto">
                    <Tab label="Consulta Atual" id="ob-tab-0" />
                    <Tab label="Histórico" id="ob-tab-1" />
                </Tabs>
            </Box>

            {/* CONTEÚDO DAS ABAS */}
            <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
                
                {/* ABA 1: CONSULTA ATUAL (SOAP) */}
                <TabPanel value={tabIndex} index={0}>
                    <Paper component="form" onSubmit={handleSubmit} variant="outlined" sx={{ p: 2, borderColor: 'primary.main' }}>
                       <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Consulta Atual</Typography>
                       
                       {/* Queixa Atual (S) */}
                       <Typography variant="body1" sx={{ mt: 1, fontWeight: 'medium' }}>Queixa Atual (S)</Typography>
                       <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 1, p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                           {sintomasOBOptions.map(opt => ( 
                               <FormControlLabel key={opt.id} control={<Checkbox checked={sintomasConsulta[opt.id] || false} onChange={handleSintomasChange} name={opt.id} />} label={opt.label} />
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
                </TabPanel>

                {/* ABA 2: HISTÓRICO OBSTÉTRICO */}
                <TabPanel value={tabIndex} index={1}>
                    <HistoricoObstetricia 
                        pacienteId={pacienteId} 
                        onIgCalculada={(ig) => setIgAtual(ig)}
                    />
                </TabPanel>

            </Suspense>
        </Paper>
    );
}