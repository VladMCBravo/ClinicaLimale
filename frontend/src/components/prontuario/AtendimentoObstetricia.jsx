// src/components/prontuario/AtendimentoObstetricia.jsx
// VERSÃO REFATORADA COM ABAS

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import {
    Paper, Typography, FormGroup, FormControlLabel, Checkbox, TextField, Divider,
    Box, Button, CircularProgress, Tabs, Tab
} from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

// 1. IMPORTAR A NOVA ABA DE HISTÓRICO
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
// --- FIM OPÇÕES ---

// Helper TabPanel
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} id={`ob-tabpanel-${index}`} {...other}>
            {value === index && (<Box sx={{ p: { xs: 1, sm: 2 } }}>{children}</Box>)}
        </div>
    );
}

export default function AtendimentoObstetricia({ pacienteId, onEvolucaoSalva }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tabIndex, setTabIndex] = useState(0);

    // Estados SOMENTE da Consulta Atual
    const [sintomasConsulta, setSintomasConsulta] = useState({});
    const [exameFisicoData, setExameFisicoData] = useState({});
    const [soapData, setSoapData] = useState({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
    
    // Estado para guardar a IG (pode ser buscada ou preenchida)
    const [igAtual, setIgAtual] = useState('');

    // Reseta estados ao trocar de paciente
    useEffect(() => {
        setSoapData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
        setSintomasConsulta({});
        setExameFisicoData({});
        setTabIndex(0);
        setIgAtual('');
        
        // Opcional: Buscar a IG da anamnese para pré-preencher o S
        if (pacienteId) {
             apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`)
                .then(res => {
                    if (res.data && res.data.ginecologica) {
                        setIgAtual(res.data.ginecologica.ig_atual || '');
                    }
                }).catch(err => console.error("Erro ao buscar IG"));
        }

    }, [pacienteId]);

    // Geradores de texto
    const generateHda = useCallback(() => {
        let texto = `IG: ${igAtual || '___'} semanas.\n`;
        const queixas = sintomasOBOptions
            .filter(opt => sintomasConsulta[opt.id])
            .map(opt => opt.template).join(" ");
        return texto + (queixas || "Nega queixas.");
     }, [sintomasConsulta, igAtual]);

    const generateExameFisico = useCallback(() => {
        let texto = `Dados Vitais:\nPA: ${exameFisicoData.pa || '___x___'} mmHg\nFC: ${exameFisicoData.fc || '___'} bpm\n\nExame Obstétrico:\nAU = ${exameFisicoData.au || '___'} cm.\n`;
        const achados = exameFisicoOBOptions
            .filter(opt => exameFisicoData[opt.id])
            .map(opt => opt.template).join(" ");
         if (!exameFisicoData.bcf_presente && exameFisicoData.bcf_manual) texto += `BCF = ${exameFisicoData.bcf_manual} bpm.\n`;
         if (!exameFisicoData.colo_fechado && !exameFisicoData.colo_dilatado && exameFisicoData.toque_manual) texto += `Toque: ${exameFisicoData.toque_manual}\n`;
            
        return texto + (achados || "Nenhuma observação selecionada.");
    }, [exameFisicoData]);

    // Efeitos que atualizam SOAP
    useEffect(() => {
        setSoapData(prev => ({ ...prev, notas_subjetivas: generateHda() }));
    }, [sintomasConsulta, igAtual, generateHda]);
    useEffect(() => {
        setSoapData(prev => ({ ...prev, notas_objetivas: generateExameFisico() }));
    }, [exameFisicoData, generateExameFisico]);

    // Handlers
    const handleTabChange = (event, newIndex) => { setTabIndex(newIndex); };
    const handleSoapChange = (e) => setSoapData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSintomasChange = (e) => setSintomasConsulta(prev => ({ ...prev, [e.target.name]: e.target.checked }));
    const handleExameChange = (event) => {
        const { name, value, type, checked } = event.target;
        setExameFisicoData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };
    
    // Botão Normalidade
    const preencherNormalidade = () => { 
        setSintomasConsulta({ mov_fetal_presente: true }); 
        setExameFisicoData(prev => ({
            ...prev,
            bcf_presente: true, mf_presente: true, colo_fechado: true, colo_dilatado: false,
            toque_manual: '', bcf_manual: '',
        }));
        setSoapData({
             notas_subjetivas: `IG: ${igAtual || '___'} semanas.\nRefere boa movimentação fetal.`,
             notas_objetivas: `Dados Vitais:\nPA: ${exameFisicoData.pa || '___x___'} mmHg\nFC: ${exameFisicoData.fc || '___'} bpm\n\nExame Obstétrico:\nAU = ${exameFisicoData.au || '___'} cm.\nBCF = ___ bpm (presente). Movimentação fetal presente. Toque: Colo grosso, posterior, fechado.`,
             avaliacao: 'Gestação tópica, feto vivo, sem sinais de trabalho de parto.',
             plano: 'Manter acompanhamento pré-natal. Orientações gerais.'
        });
     };
    
    // Botão Limpar
    const handleLimparConsultaAtual = () => {
        setSintomasConsulta({});
        setExameFisicoData({});
        setSoapData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
        showSnackbar('Campos da consulta atual limpos.', 'info');
    };
    
    // Submit (Salva SÓ a Evolução)
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            const soapPayload = {
                ...soapData,
                pressao_arterial: exameFisicoData.pa || null,
                frequencia_cardiaca: exameFisicoData.fc || null,
            };
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes/`, soapPayload);
            showSnackbar('Evolução salva com sucesso!', 'success');
            if(onEvolucaoSalva) onEvolucaoSalva();
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
                    <Paper variant="outlined" sx={{ p: 2, borderColor: 'primary.main' }}>
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
                    {/* O componente de histórico agora recebe a prop 'onIgCalculada' */}
                    <HistoricoObstetricia 
                        pacienteId={pacienteId} 
                        onIgCalculada={(ig) => setIgAtual(ig)} // Passa a IG para o componente pai
                    />
                </TabPanel>

            </Suspense>
        </Paper>
    );
}