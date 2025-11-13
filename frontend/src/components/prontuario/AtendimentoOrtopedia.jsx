// src/components/prontuario/AtendimentoOrtopedia.jsx
// VERSÃO CORRIGIDA: Removidos useEffects que causavam loop

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import {
    Paper, Typography, FormGroup, FormControlLabel, Checkbox, TextField, Divider,
    Box, Button, CircularProgress, Tabs, Tab
} from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

const HistoricoOrtopedia = lazy(() => import('./ortopedia/HistoricoOrtopedia'));

// --- (Constantes de Opções omitidas para brevidade) ---
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

    // Geradores de texto (Atualizados para aceitar argumentos)
    const generateHda = useCallback((sintomas) => {
         const currentSintomas = sintomas || sintomasConsulta;
         return sintomasOrtopediaOptions
            .filter(opt => currentSintomas[opt.id])
            .map(opt => opt.template).join(" ");
     }, [sintomasConsulta]);
     
    const generateExameFisico = useCallback((data) => {
        const currentData = data || exameFisicoData;
        let texto = `Exame Físico Ortopédico (Local: ${currentData.ex_local || '___'}):\n`;
        const achados = exameFisicoOrtopediaOptions
            .filter(opt => currentData[opt.id])
            .map(opt => opt.template).join(" ");
        if (currentData.ex_inspecao && !currentData.inspecao_normal) texto += `Inspeção: ${currentData.ex_inspecao}\n`;
        if (currentData.ex_palpacao && !currentData.palpacao_indolor && !currentData.palpacao_dor) texto += `Palpação: ${currentData.ex_palpacao}\n`;
        if (currentData.ex_adm && !currentData.adm_preservada && !currentData.adm_limitada) texto += `ADM: ${currentData.ex_adm}\n`;
        if (currentData.ex_forca && !currentData.forca_preservada) texto += `Força Muscular: ${currentData.ex_forca}\n`;
        if (currentData.ex_neurovascular && !currentData.neurovascular_normal) texto += `Neurovascular: ${currentData.ex_neurovascular}\n`;
        if (currentData.ex_testes) texto += `Testes Especiais: ${currentData.ex_testes}\n`;
        
        return texto + (achados || "Nenhuma observação selecionada.");
    }, [exameFisicoData]);

    // --- CORREÇÃO: useEffects que atualizam SOAP foram removidos ---
    // useEffect(() => { ... }, [sintomasConsulta, generateHda]);
    // useEffect(() => { ... }, [exameFisicoData, generateExameFisico]);

    // Handlers (Atualizados para controlar o SOAP)
    const handleTabChange = (event, newIndex) => { setTabIndex(newIndex); };
    const handleSoapChange = (e) => setSoapData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    
    const handleSintomasChange = (e) => {
        const newSintomas = { ...sintomasConsulta, [e.target.name]: e.target.checked };
        setSintomasConsulta(newSintomas);
        
        // Atualiza SOAP
        const hdaText = generateHda(newSintomas);
        setSoapData(prev => ({ ...prev, notas_subjetivas: hdaText }));
    };

    const handleExameChange = (event) => {
        const { name, value, type, checked } = event.target;
        const newExameData = { ...exameFisicoData, [name]: type === 'checkbox' ? checked : value };
        setExameFisicoData(newExameData);
        
        // Atualiza SOAP
        const exameText = generateExameFisico(newExameData);
        setSoapData(prev => ({ ...prev, notas_objetivas: exameText }));
    };

    // Botão Normalidade (Atualizado para ser auto-contido)
    const preencherNormalidade = () => { 
        const dadosExameNormal = {
            ex_local: exameFisicoData.ex_local || '___',
            inspecao_normal: true, palpacao_indolor: true, adm_preservada: true, 
            forca_preservada: true, neurovascular_normal: true,
            inspecao_edema: false, inspecao_equimose: false, palpacao_dor: false, adm_limitada: false,
            ex_inspecao: '', ex_palpacao: '', ex_adm: '', ex_forca: '', ex_neurovascular: '', ex_testes: ''
        };
        
        const textoExameNormal = `Exame Físico Ortopédico (Local: ${dadosExameNormal.ex_local}):\nInspeção: Sem alterações. Palpação: Indolor. ADM: Preservada e indolor. Força Muscular: Grau 5/5 preservada. Exame Neurovascular: Perfusão, sensibilidade e motricidade distais normais. Testes Especiais: Negativos.`;
        
        setSintomasConsulta({}); 
        setExameFisicoData(dadosExameNormal);
        setSoapData({
             notas_subjetivas: 'Paciente nega dor ou outras queixas musculoesqueléticas.',
             notas_objetivas: textoExameNormal,
             avaliacao: 'Exame ortopédico sem alterações no momento.',
             plano: 'Orientações gerais. Manter observação.'
        });
     };
     
    // Botão Limpar (Atualizado)
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
            // --- CORREÇÃO AQUI ---
            const res = await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes/`, soapData);
            
            showSnackbar('Evolução salva com sucesso!', 'success');
            
            // --- E AQUI ---
            if (onEvolucaoSalva) onEvolucaoSalva(res.data.id); // Envie o ID
            
            handleLimparConsultaAtual();
        } catch (error) {
            console.error("Erro ao salvar evolução:", error.response?.data);
            showSnackbar(`Erro ao salvar evolução: ${error.response?.data?.detail || error.message}`, 'error');
        }
        setIsSubmitting(false); 
    };

    // --- RETURN (Sem alterações no JSX, apenas removi o `name` duplicado que o linter achou) ---
    return (
        <Paper sx={{ mb: 2, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 0 }}>
                <Typography variant="h6" gutterBottom> Atendimento Ortopédico </Typography>
                {tabIndex === 0 && (
                    <Button variant="outlined" size="small" onClick={preencherNormalidade}> Preencher Normalidade </Button>
                )}
            </Box>

             <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                <Tabs value={tabIndex} onChange={handleTabChange} aria-label="Abas prontuário ortopédico" variant="scrollable" scrollButtons="auto">
                    <Tab label="Consulta Atual" id="orto-tab-0" />
                    <Tab label="Histórico" id="orto-tab-1" />
                </Tabs>
            </Box>

            <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
                <TabPanel value={tabIndex} index={0}>
                    <Paper component="form" onSubmit={handleSubmit} variant="outlined" sx={{ p: 2, borderColor: 'primary.main' }}>
                       <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Consulta Atual</Typography>
                       
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

                       <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {/* --- CORREÇÃO DO LINT: Removido 'name' duplicado --- */}
                          <TextField name="avaliacao" label="Avaliação / Hipóteses Diagnósticas (A)" multiline rows={3} fullWidth value={soapData.avaliacao || ''} onChange={handleSoapChange} size="small" />
                          <TextField name="plano" label="Plano / Conduta (P)" multiline rows={3} fullWidth value={soapData.plano || ''} onChange={handleSoapChange} size="small" />
                          <Box sx={{ textAlign: 'right', mt: 1, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                             <Button onClick={handleLimparConsultaAtual} variant="outlined" disabled={isSubmitting}> Limpar Consulta </Button>
                             <Button type="submit" variant="contained" disabled={isSubmitting}> Salvar Atendimento </Button>
                          </Box>
                       </Box>
                    </Paper>
                </TabPanel>

                <TabPanel value={tabIndex} index={1}>
                    <HistoricoOrtopedia pacienteId={pacienteId} />
                </TabPanel>
            </Suspense>
        </Paper>
    );
}