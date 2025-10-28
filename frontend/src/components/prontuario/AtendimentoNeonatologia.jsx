// src/components/prontuario/AtendimentoNeonatologia.jsx
// VERSÃO COMPLETA E CORRIGIDA (Aba 1 - SOAP)

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import {
    Paper, Typography, TextField, Box, Button, CircularProgress, Tabs, Tab,
    Grid, FormGroup, FormControlLabel, Checkbox, Divider
} from '@mui/material';
// --- CORREÇÃO DE CAMINHO ---
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

// --- IMPORT DA ABA DE HISTÓRICO (com caminho corrigido) ---
const HistoricoNeonatologia = lazy(() => import('./neonatologia/HistoricoNeonatologia'));

// --- OPÇÕES E TEMPLATES ---
const sintomasNeonatoOptions = [
    { id: 'boa_aceitacao_dieta', label: 'Boa aceitação da dieta' }, { id: 'succao_forte', label: 'Sucção forte' },
    { id: 'regurgitacoes', label: 'Regurgitações frequentes' }, { id: 'vomitos', label: 'Vômitos' },
    { id: 'hipoativo', label: 'Hipoativo / Sonolento' }, { id: 'irritado', label: 'Irritado / Choro fácil' },
    { id: 'tremor', label: 'Tremores' }, { id: 'apneia', label: 'Apneia / Engasgos' },
];
const exameFisicoNeonatoOptions = [
    { id: 'ativo_reativo', label: 'Ativo/Reativo', group: 'geral', template: "Ativo, reativo, choro forte." },
    { id: 'hipoativo_entregue', label: 'Hipoativo/Entregue', group: 'geral', template: "Hipoativo, entregue ao manuseio." },
    { id: 'normotermico', label: 'Normotérmico', group: 'geral', template: "Normotérmico." },
    { id: 'hipotermico', label: 'Hipotérmico', group: 'geral', template: "Hipotérmico." },
    { id: 'corado_hidratado', label: 'Corado/Hidratado', group: 'pele', template: "Corado, hidratado." },
    { id: 'palido', label: 'Pálido', group: 'pele', template: "Pálido (+/4+)." },
    { id: 'icterico', label: 'Ictérico', group: 'pele', template: "Ictérico (Zona ___ / Zonas de Kramer)." },
    { id: 'cianotico', label: 'Cianótico', group: 'pele', template: "Cianose (Central/Extremidades)." },
    { id: 'boa_perfusao', label: 'Boa Perfusão', group: 'pele', template: "Boa perfusão periférica (TEC < 2s)." },
    { id: 'perfusao_lenta', label: 'Perfusão Lenta', group: 'pele', template: "Perfusão lentificada (TEC > 3s)." },
    { id: 'fa_normotensa', label: 'FA Normotensa', group: 'cabeca', template: "Fontanela anterior normotensa." },
    { id: 'fa_abaulada', label: 'FA Abaulada', group: 'cabeca', template: "Fontanela anterior abaulada." },
    { id: 'sem_bossa_cefalo', label: 'S/ Bossa/Céfalo', group: 'cabeca', template: "Sem bossa serossanguínea ou cefalohematoma." },
    { id: 'acv_brnf', label: 'ACV: BRNF s/ sopros', group: 'torax', template: "ACV: BRNF 2T, sem sopros." },
    { id: 'ar_mv_presente', label: 'AR: MV s/ RA', group: 'torax', template: "AR: MV presente bilateralmente, sem ruídos adventícios." },
    { id: 'taquipneia_tiragem', label: 'Taquipneia/Tiragem', group: 'torax', template: "Taquipneia (FR=___), tiragem (Subcostal/Intercostal/Fúrcula)." },
    { id: 'gemencia', label: 'Gemência', group: 'torax', template: "Gemência expiratória." },
    { id: 'abd_flacido_rha', label: 'Abd Flácido, RHA+', group: 'abdome', template: "Abdome flácido, RHA presentes." },
    { id: 'abd_distendido', label: 'Abd Distendido', group: 'abdome', template: "Abdome distendido, timpânico." },
    { id: 'coto_umbilical_limpo', label: 'Coto Limpo', group: 'abdome', template: "Coto umbilical com aspecto limpo e seco." },
    { id: 'gen_masc_normal', label: 'Gen Masculina Normal', group: 'genitalia', template: "Genitália masculina tópica, testículos palpáveis em bolsa." },
    { id: 'gen_fem_normal', label: 'Gen Feminina Normal', group: 'genitalia', template: "Genitália feminina tópica, grandes lábios cobrindo pequenos." },
    { id: 'reflexos_presentes', label: 'Reflexos Presentes', group: 'neuro', template: "Reflexos primitivos (Sucção, Moro, Preensão) presentes e simétricos." },
    { id: 'hipotonia_hipertonia', label: 'Hipo/Hipertonia', group: 'neuro', template: "Hipotonia / Hipertonia." },
];

// Helper TabPanel
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} id={`neo-tabpanel-${index}`} {...other}>
            {value === index && (<Box sx={{ p: { xs: 1, sm: 2 } }}>{children}</Box>)}
        </div>
    );
}

// --- Componente Principal ---
export default function AtendimentoNeonatologia({ pacienteId, onEvolucaoSalva }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tabIndex, setTabIndex] = useState(0);

    // Estados da Consulta Atual
    const [sintomasConsulta, setSintomasConsulta] = useState({});
    const [exameFisicoData, setExameFisicoData] = useState({});
    const [vitalsData, setVitalsData] = useState({});
    const [evolucaoDiaria, setEvolucaoDiaria] = useState({ dieta: '', diurese: '', evacuacao: '' });
    const [soapData, setSoapData] = useState({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });

    // Reseta estados ao trocar de paciente
    useEffect(() => {
        setSoapData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
        setSintomasConsulta({});
        setExameFisicoData({});
        setVitalsData({});
        setEvolucaoDiaria({ dieta: '', diurese: '', evacuacao: '' });
        setTabIndex(0);
    }, [pacienteId]);

    // Geradores de texto
    const generateSubjetivo = useCallback(() => {
        const sintomasText = sintomasNeonatoOptions
            .filter(opt => sintomasConsulta[opt.id])
            .map(opt => opt.label)
            .join(', ');
        return `Informações mãe/enfermagem: ${sintomasText || 'Nenhuma queixa relatada.'}\nDieta: ${evolucaoDiaria.dieta || 'Não informado'}\nDiurese: ${evolucaoDiaria.diurese || 'Não informado'}\nEvacuação: ${evolucaoDiaria.evacuacao || 'Não informado'}`;
    }, [sintomasConsulta, evolucaoDiaria]);

    const generateObjetivo = useCallback(() => {
        let texto = `Dados Vitais:\nPeso: ${vitalsData.peso || '___'} g\nFC: ${vitalsData.fc || '___'} bpm\nFR: ${vitalsData.fr || '___'} irpm\nT: ${vitalsData.temp || '___'} °C\nSpO2: ${vitalsData.spo2 || '___'} %\n\nExame Físico:\n`;
        const achados = exameFisicoNeonatoOptions
            .filter(opt => exameFisicoData[opt.id])
            .map(opt => opt.template).join(" ");
        return texto + (achados || "Nenhuma observação selecionada.");
    }, [vitalsData, exameFisicoData]);

    // Efeitos que atualizam SOAP
    useEffect(() => {
        const subjetivoText = generateSubjetivo();
        setSoapData(prev => ({ ...prev, notas_subjetivas: subjetivoText }));
    }, [sintomasConsulta, evolucaoDiaria, generateSubjetivo]);

    useEffect(() => {
        const objetivoText = generateObjetivo();
        setSoapData(prev => ({ ...prev, notas_objetivas: objetivoText }));
    }, [vitalsData, exameFisicoData, generateObjetivo]);

    // Handlers
    const handleTabChange = (event, newIndex) => { setTabIndex(newIndex); };
    const handleSoapChange = (e) => setSoapData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSintomasChange = (e) => setSintomasConsulta(prev => ({ ...prev, [e.target.name]: e.target.checked }));
    const handleExameChange = (e) => setExameFisicoData(prev => ({ ...prev, [e.target.name]: e.target.checked }));
    const handleVitalsChange = (e) => setVitalsData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleEvolucaoDiariaChange = (e) => setEvolucaoDiaria(prev => ({ ...prev, [e.target.name]: e.target.value }));

    // Botão Normalidade
    const preencherNormalidade = () => {
        setSintomasConsulta({ boa_aceitacao_dieta: true, succao_forte: true });
        setExameFisicoData({
            ativo_reativo: true, normotermico: true, corado_hidratado: true, boa_perfusao: true,
            fa_normotensa: true, sem_bossa_cefalo: true, acv_brnf: true, ar_mv_presente: true,
            abd_flacido_rha: true, coto_umbilical_limpo: true,
            // Assumir Genitália normal (pode precisar de ajuste se precisar diferenciar)
            gen_masc_normal: true, gen_fem_normal: true,
            reflexos_presentes: true,
        });
        setVitalsData(prev => ({ ...prev })); // Mantém vitais já digitados
        setEvolucaoDiaria(prev => ({ ...prev, diurese: 'Presente', evacuacao: 'Presente' }));
        setSoapData({
            notas_subjetivas: 'Informações mãe/enfermagem: Boa aceitação da dieta, Sucção forte\nDieta: \nDiurese: Presente\nEvacuação: Presente',
            notas_objetivas: `Dados Vitais:\nPeso: ${vitalsData.peso || '___'} g\nFC: ${vitalsData.fc || '___'} bpm\nFR: ${vitalsData.fr || '___'} irpm\nT: ${vitalsData.temp || '___'} °C\nSpO2: ${vitalsData.spo2 || '___'} %\n\nExame Físico:\nAtivo, reativo, choro forte. Normotérmico. Corado, hidratado. Boa perfusão periférica (TEC < 2s). Fontanela anterior normotensa. Sem bossa serossanguínea ou cefalohematoma. ACV: BRNF 2T, sem sopros. AR: MV presente bilateralmente, sem ruídos adventícios. Abdome flácido, RHA presentes. Coto umbilical com aspecto limpo e seco. Genitália masculina tópica, testículos palpáveis em bolsa. Genitália feminina tópica, grandes lábios cobrindo pequenos. Reflexos primitivos (Sucção, Moro, Preensão) presentes e simétricos.`,
            avaliacao: 'RN termo, AIG, estável, em Alojamento Conjunto. Sem intercorrências.',
            plano: 'Manter Alojamento Conjunto. Sinais vitais de rotina. Observar diurese/evacuação. Alta provável em 24-48h se mantiver boa evolução.'
        });
     };

    // Botão Limpar
    const handleLimparConsultaAtual = () => {
        setSintomasConsulta({});
        setExameFisicoData({});
        setVitalsData({});
        setEvolucaoDiaria({ dieta: '', diurese: '', evacuacao: '' });
        setSoapData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
        showSnackbar('Campos da consulta atual limpos.', 'info');
    };

    // handleSubmit (Salva apenas a Evolução SOAP)
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            // Adiciona vitais e evolução diária ao payload SOAP se o modelo Evolucao os suportar
            // No momento, o modelo Evolucao tem apenas PA, FC, Peso, Altura genéricos.
            // Para Neo, idealmente teríamos campos específicos ou usaríamos notas_objetivas/subjetivas.
            const soapPayload = { ...soapData };

            await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes/`, soapPayload);
            showSnackbar('Evolução salva com sucesso!', 'success');
            if(onEvolucaoSalva) onEvolucaoSalva();
            handleLimparConsultaAtual(); // Limpa os campos após salvar

        } catch (error) {
             console.error("Erro ao salvar evolução:", error.response?.data);
             showSnackbar(`Erro ao salvar evolução: ${error.response?.data?.detail || error.message}`, 'error');
        }
        finally { setIsSubmitting(false); }
    };

    // --- JSX COM ABAS ---
    return (
        <Paper sx={{ mb: 2, overflow: 'hidden' }}>
            {/* CABEÇALHO */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 0 }}>
                <Typography variant="h6" gutterBottom> Atendimento Neonatal </Typography>
                {tabIndex === 0 && (
                    <Button variant="outlined" size="small" onClick={preencherNormalidade}> Preencher Normalidade </Button>
                )}
            </Box>

            {/* NAVEGAÇÃO DAS ABAS */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                <Tabs value={tabIndex} onChange={handleTabChange} aria-label="Abas prontuário neonatal" variant="scrollable" scrollButtons="auto">
                    <Tab label="Consulta Atual" id="neo-tab-0" />
                    <Tab label="Histórico" id="neo-tab-1" />
                </Tabs>
            </Box>

            {/* CONTEÚDO DAS ABAS */}
            <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
                {/* ABA 1: CONSULTA ATUAL (SOAP) */}
                <TabPanel value={tabIndex} index={0}>
                    <Paper variant="outlined" sx={{ p: 2, borderColor: 'primary.main' }}>
                         <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Consulta Atual (SOAP)</Typography>

                         {/* Subjetivo (Info Mãe/Enf + Evolução) */}
                         <Typography variant="body1" sx={{ mt: 1, fontWeight: 'medium' }}>Informações Mãe/Enfermagem (S)</Typography>
                         <FormGroup sx={{ flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 1, p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                            {sintomasNeonatoOptions.map(opt => (
                                <FormControlLabel key={opt.id} control={<Checkbox size="small" checked={sintomasConsulta[opt.id] || false} onChange={handleSintomasChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                            ))}
                        </FormGroup>
                        <Grid container spacing={2} sx={{mb: 1.5}}>
                            <Grid item xs={12} sm={4}><TextField name="dieta" label="Dieta" fullWidth value={evolucaoDiaria.dieta} onChange={handleEvolucaoDiariaChange} size="small" placeholder="Tipo, Volume, Aceitação"/></Grid>
                            <Grid item xs={12} sm={4}><TextField name="diurese" label="Diurese" fullWidth value={evolucaoDiaria.diurese} onChange={handleEvolucaoDiariaChange} size="small" placeholder="Presente, Ausente, Fraldas"/></Grid>
                            <Grid item xs={12} sm={4}><TextField name="evacuacao" label="Evacuação" fullWidth value={evolucaoDiaria.evacuacao} onChange={handleEvolucaoDiariaChange} size="small" placeholder="Presente, Ausente, Aspecto"/></Grid>
                        </Grid>
                        <TextField name="notas_subjetivas" label="Subjetivo (Gerado / Anotações Livres)" multiline rows={3} fullWidth value={soapData.notas_subjetivas || ''} onChange={handleSoapChange} size="small" />

                        <Divider sx={{ my: 2 }} />

                        {/* Objetivo (Exame Físico) */}
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Exame Físico (O)</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, my: 1.5 }}>
                            <TextField label="Peso (g)" name="peso" type="number" value={vitalsData.peso || ''} onChange={handleVitalsChange} size="small" sx={{minWidth: '80px'}}/>
                            <TextField label="FC (bpm)" name="fc" type="number" value={vitalsData.fc || ''} onChange={handleVitalsChange} size="small" sx={{minWidth: '80px'}}/>
                            <TextField label="FR (irpm)" name="fr" type="number" value={vitalsData.fr || ''} onChange={handleVitalsChange} size="small" sx={{minWidth: '80px'}}/>
                            <TextField label="T (°C)" name="temp" type="number" step="0.1" value={vitalsData.temp || ''} onChange={handleVitalsChange} size="small" sx={{minWidth: '80px'}}/>
                             <TextField label="SpO2 (%)" name="spo2" type="number" value={vitalsData.spo2 || ''} onChange={handleVitalsChange} size="small" sx={{minWidth: '80px'}}/>
                             {/* Adicionar Glicemia Capilar se necessário */}
                        </Box>
                        {/* Checkboxes Exame Físico Neo */}
                        <FormGroup sx={{ p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                             {/* Agrupados por Sistema */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Geral:</Typography>
                                {exameFisicoNeonatoOptions.filter(o=>o.group === 'geral').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                                ))}
                            </Box>
                             <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Pele:</Typography>
                                {exameFisicoNeonatoOptions.filter(o=>o.group === 'pele').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                                ))}
                            </Box>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Cabeça/Pescoço:</Typography>
                                {exameFisicoNeonatoOptions.filter(o=>o.group === 'cabeca').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                                ))}
                            </Box>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Tórax (Card/Resp):</Typography>
                                {exameFisicoNeonatoOptions.filter(o=>o.group === 'torax').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                                ))}
                            </Box>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Abdome:</Typography>
                                {exameFisicoNeonatoOptions.filter(o=>o.group === 'abdome').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                                ))}
                            </Box>
                             <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Genitália:</Typography>
                                {exameFisicoNeonatoOptions.filter(o=>o.group === 'genitalia').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                                ))}
                            </Box>
                             <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Neurológico:</Typography>
                                {exameFisicoNeonatoOptions.filter(o=>o.group === 'neuro').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                                ))}
                            </Box>
                        </FormGroup>
                        <TextField name="notas_objetivas" label="Objetivo (Gerado / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_objetivas || ''} onChange={handleSoapChange} size="small" sx={{mt: 1.5}}/>

                        <Divider sx={{ my: 2 }} />

                        {/* Avaliação e Plano */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField name="avaliacao" label="Avaliação / Intercorrências (A)" multiline rows={3} fullWidth value={soapData.avaliacao || ''} onChange={handleSoapChange} size="small" />
                            <TextField name="plano" label="Plano / Conduta (P)" multiline rows={3} fullWidth value={soapData.plano || ''} onChange={handleSoapChange} size="small" />
                             <Box sx={{ textAlign: 'right', mt: 1, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                <Button onClick={handleLimparConsultaAtual} variant="outlined" disabled={isSubmitting}> Limpar Consulta </Button>
                                <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting}>
                                    {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Evolução'}
                                </Button>
                            </Box>
                        </Box>
                    </Paper>
                </TabPanel>

                {/* ABA 2: HISTÓRICO NEONATAL */}
                <TabPanel value={tabIndex} index={1}>
                    <HistoricoNeonatologia pacienteId={pacienteId} />
                </TabPanel>

            </Suspense>
        </Paper>
    );
}