// src/components/prontuario/AtendimentoOrtopedia.jsx
// VERSÃO REFATORADA COM ABAS

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import {
    Paper, Typography, FormGroup, FormControlLabel, Checkbox, TextField, Divider,
    Box, Button, CircularProgress, Tabs, Tab
} from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

// 1. IMPORTAR A NOVA ABA DE HISTÓRICO
const HistoricoOrtopedia = lazy(() => import('./ortopedia/HistoricoOrtopedia'));

// --- OPÇÕES (Ortopedia - Consulta Atual) ---
const sintomasOrtopediaOptions = [
    { id: 'dor', label: 'Dor', group: 'sintoma', template: 'Dor em ___ (descrever início, tipo, irradiação, intensidade, fatores).' },
    { id: 'trauma', label: 'Trauma', group: 'sintoma', template: 'História de trauma em ___ (descrever mecanismo).' },
    { id: 'limitacao_mov', label: 'Limitação de Mov.', group: 'sintoma', template: 'Limitação de movimento em ___.' },
    { id: 'deformidade', label: 'Deformidade', group: 'sintoma', template: 'Deformidade aparente em ___.' },
    { id: 'edema', label: 'Edema/Inchaço', group: 'sintoma', template: 'Edema em ___.' },
];
const exameFisicoOrtopediaOptions = [
    { id: 'inspecao_normal', label: 'Inspeção Normal', group: 'exame', template: 'Inspeção: Sem alterações.' },
    { id: 'inspecao_edema', label: 'Edema', group: 'exame', template: 'Inspeção: Edema ___ /4+.' },
    { id: 'inspecao_equimose', label: 'Equimose', group: 'exame', template: 'Inspeção: Equimose em ___.' },
    { id: 'palpacao_indolor', label: 'Palpação Indolor', group: 'exame', template: 'Palpação: Indolor.' },
    { id: 'palpacao_dor', label: 'Dor à Palpação', group: 'exame', template: 'Palpação: Dor em ___.' },
    { id: 'adm_preservada', label: 'ADM Preservada', group: 'exame', template: 'ADM: Preservada e indolor.' },
    { id: 'adm_limitada', label: 'ADM Limitada', group: 'exame', template: 'ADM: Limitada para ___ por dor/bloqueio.' },
    { id: 'forca_preservada', label: 'Força Preservada', group: 'exame', template: 'Força Muscular: Grau 5/5 preservada.' },
    { id: 'neurovascular_normal', label: 'Neurovascular Normal', group: 'exame', template: 'Exame Neurovascular: Perfusão, sensibilidade e motricidade distais normais.' },
];
// --- FIM OPÇÕES ---

// Helper TabPanel
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} id={`orto-tabpanel-${index}`} {...other}>
            {value === index && (<Box sx={{ p: { xs: 1, sm: 2 } }}>{children}</Box>)}
        </div>
    );
}

export default function AtendimentoOrtopedia({ pacienteId, onEvolucaoSalva }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tabIndex, setTabIndex] = useState(0);

    // Estados da Consulta Atual
    const [sintomasConsulta, setSintomasConsulta] = useState({});
    const [exameFisicoData, setExameFisicoData] = useState({});
    const [soapData, setSoapData] = useState({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });

    // Reseta estados ao trocar de paciente
    useEffect(() => {
        setSoapData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
        setSintomasConsulta({});
        setExameFisicoData({});
        setTabIndex(0);
    }, [pacienteId]);

    // Geradores de texto
    const generateHda = useCallback(() => {
         return sintomasOrtopediaOptions
            .filter(opt => sintomasConsulta[opt.id])
            .map(opt => opt.template).join(" ");
     }, [sintomasConsulta]);
     
    const generateExameFisico = useCallback(() => {
        let texto = `Exame Físico Ortopédico (Local: ${exameFisicoData.ex_local || '___'}):\n`;
        const achados = exameFisicoOrtopediaOptions
            .filter(opt => exameFisicoData[opt.id])
            .map(opt => opt.template).join(" ");
        if (exameFisicoData.ex_inspecao && !exameFisicoData.inspecao_normal) texto += `Inspeção: ${exameFisicoData.ex_inspecao}\n`;
        if (exameFisicoData.ex_palpacao && !exameFisicoData.palpacao_indolor && !exameFisicoData.palpacao_dor) texto += `Palpação: ${exameFisicoData.ex_palpacao}\n`;
        if (exameFisicoData.ex_adm && !exameFisicoData.adm_preservada && !exameFisicoData.adm_limitada) texto += `ADM: ${exameFisicoData.ex_adm}\n`;
        if (exameFisicoData.ex_forca && !exameFisicoData.forca_preservada) texto += `Força Muscular: ${exameFisicoData.ex_forca}\n`;
        if (exameFisicoData.ex_neurovascular && !exameFisicoData.neurovascular_normal) texto += `Neurovascular: ${exameFisicoData.ex_neurovascular}\n`;
        if (exameFisicoData.ex_testes) texto += `Testes Especiais: ${exameFisicoData.ex_testes}\n`;
        
        return texto + (achados || "Nenhuma observação selecionada.");
    }, [exameFisicoData]);

    // Efeitos que atualizam SOAP
    useEffect(() => {
        setSoapData(prev => ({ ...prev, notas_subjetivas: generateHda() || (prev.notas_subjetivas || '') }));
    }, [sintomasConsulta, generateHda]);
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
        setSintomasConsulta({}); 
        setExameFisicoData(prev => ({
            ...prev,
            inspecao_normal: true, palpacao_indolor: true, adm_preservada: true, 
            forca_preservada: true, neurovascular_normal: true,
            inspecao_edema: false, inspecao_equimose: false, palpacao_dor: false, adm_limitada: false,
            ex_inspecao: '', ex_palpacao: '', ex_adm: '', ex_forca: '', ex_neurovascular: '', ex_testes: ''
        }));
        setSoapData({
             notas_subjetivas: 'Paciente nega dor ou outras queixas musculoesqueléticas.',
             notas_objetivas: `Exame Físico Ortopédico (Local: ${exameFisicoData.ex_local || '___'}):\nInspeção: Sem alterações. Palpação: Indolor. ADM: Preservada e indolor. Força Muscular: Grau 5/5 preservada. Exame Neurovascular: Perfusão, sensibilidade e motricidade distais normais. Testes Especiais: Negativos.`,
             avaliacao: 'Exame ortopédico sem alterações no momento.',
             plano: 'Orientações gerais. Manter observação.'
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
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes/`, soapData);
            showSnackbar('Evolução salva com sucesso!', 'success');
            if (onEvolucaoSalva) onEvolucaoSalva();
            handleLimparConsultaAtual();
        } catch (error) {
            console.error("Erro ao salvar evolução:", error.response?.data);
            showSnackbar(`Erro ao salvar evolução: ${error.response?.data?.detail || error.message}`, 'error');
        }
        setIsSubmitting(false); 
    };

    // --- RETURN ---
    return (
        <Paper sx={{ mb: 2, overflow: 'hidden' }}>
            {/* CABEÇALHO */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 0 }}>
                <Typography variant="h6" gutterBottom> Atendimento Ortopédico </Typography>
                {tabIndex === 0 && (
                    <Button variant="outlined" size="small" onClick={preencherNormalidade}> Preencher Normalidade </Button>
                )}
            </Box>

             {/* NAVEGAÇÃO DAS ABAS */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                <Tabs value={tabIndex} onChange={handleTabChange} aria-label="Abas prontuário ortopédico" variant="scrollable" scrollButtons="auto">
                    <Tab label="Consulta Atual" id="orto-tab-0" />
                    <Tab label="Histórico" id="orto-tab-1" />
                </Tabs>
            </Box>

            {/* CONTEÚDO DAS ABAS */}
            <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
                {/* ABA 1: CONSULTA ATUAL (SOAP) */}
                <TabPanel value={tabIndex} index={0}>
                    <Paper variant="outlined" sx={{ p: 2, borderColor: 'primary.main' }}>
                       <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Consulta Atual</Typography>
                       
                       {/* Queixa Atual (S) */}
                       <Typography variant="body1" sx={{ mt: 1, fontWeight: 'medium' }}>Queixa Atual / HDA (S)</Typography>
                       <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 1, p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                           {sintomasOrtopediaOptions.map(opt => ( 
                               <FormControlLabel 
                                   key={opt.id} 
                                   control={<Checkbox checked={sintomasConsulta[opt.id] || false} onChange={handleSintomasChange} name={opt.id} size="small"/>} 
                                   label={<Typography variant="body2">{opt.label}</Typography>} 
                                   sx={{mr: 1}} 
                               />
                           ))}
                       </FormGroup>
                       <TextField name="notas_subjetivas" label="Subjetivo (Gerado / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_subjetivas || ''} onChange={handleSoapChange} size="small" />
                       
                       <Divider sx={{ my: 2 }} />

                       {/* Exame Físico (O) */}
                       <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Exame Físico (O)</Typography>
                       <TextField label="Local Afetado / Articulação" name="ex_local" size="small" fullWidth sx={{my: 1.5}} value={exameFisicoData.ex_local || ''} onChange={handleExameChange} />
                       <FormGroup sx={{ p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                           <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                             {exameFisicoOrtopediaOptions.map(opt => ( 
                                 <FormControlLabel 
                                     key={opt.id} 
                                     control={<Checkbox checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} size="small"/>} 
                                     label={<Typography variant="body2">{opt.label}</Typography>} 
                                     sx={{mr: 1}} 
                                 />
                             ))}
                           </Box>
                       </FormGroup>
                       <TextField label="Inspeção (descrição livre)" name="ex_inspecao" multiline rows={2} fullWidth size="small" sx={{mt: 1}} value={exameFisicoData.ex_inspecao || ''} onChange={handleExameChange} />
                       <TextField label="Palpação (descrição livre)" name="ex_palpacao" multiline rows={2} fullWidth size="small" sx={{mt: 1}} value={exameFisicoData.ex_palpacao || ''} onChange={handleExameChange} />
                       <TextField label="ADM (descrição livre)" name="ex_adm" multiline rows={2} fullWidth size="small" sx={{mt: 1}} value={exameFisicoData.ex_adm || ''} onChange={handleExameChange} />
                       <TextField label="Força Muscular (0-5)" name="ex_forca" multiline rows={2} fullWidth size="small" sx={{mt: 1}} value={exameFisicoData.ex_forca || ''} onChange={handleExameChange} />
                       <TextField label="Exame Neurovascular (descrição livre)" name="ex_neurovascular" multiline rows={2} fullWidth size="small" sx={{mt: 1}} value={exameFisicoData.ex_neurovascular || ''} onChange={handleExameChange} />
                       <TextField label="Testes Especiais (descrição livre)" name="ex_testes" multiline rows={2} fullWidth size="small" sx={{mt: 1}} value={exameFisicoData.ex_testes || ''} onChange={handleExameChange} />
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

                {/* ABA 2: HISTÓRICO ORTOPÉDICO */}
                <TabPanel value={tabIndex} index={1}>
                    <HistoricoOrtopedia pacienteId={pacienteId} />
                </TabPanel>
            </Suspense>
        </Paper>
    );
}