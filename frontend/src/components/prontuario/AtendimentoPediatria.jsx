// src/components/prontuario/AtendimentoPediatria.jsx - VERSÃO REESTRUTURADA COM ABAS

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import {
    Paper, Typography, Grid, FormGroup, FormControlLabel, Checkbox, TextField, Divider,
    Box, Button, CircularProgress, Tabs, Tab // 1. IMPORTAR TABS
} from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

// --- 2. IMPORTAR AS ABAS COM LAZY LOADING ---
const HistoricoPediatrico = lazy(() => import('./pediatria/HistoricoPediatrico'));
const DnpmDetalhado = lazy(() => import('./pediatria/DnpmDetalhado'));
const VacinacaoTab = lazy(() => import('./pediatria/VacinacaoTab')); // <-- ATUALIZADO

// --- OPÇÕES E TEMPLATES (APENAS DA CONSULTA ATUAL) ---
// (As opções de DNPM foram movidas para HistoricoPediatrico.jsx)
const sintomasOptions = [
    { id: 'febre', label: 'Febre' }, { id: 'tosse', label: 'Tosse' }, { id: 'coriza', label: 'Coriza' },
    { id: 'vomitos', label: 'Vômitos' }, { id: 'diarreia', label: 'Diarreia' }, { id: 'irritabilidade', label: 'Irritabilidade / Choro' },
    { id: 'prostracao', label: 'Prostração / Sonolência' }, { id: 'exantema', label: 'Exantema (Manchas)' },
];
const sintomaTemplates = {
    febre: "Febre: Início há X dias, T. máx X°C. Responde (bem/mal) a antitérmicos.",
    tosse: "Tosse: Início há X dias, (seca/produtiva). Piora (dia/noite).",
    coriza: "Coriza: Início há X dias, (hialina/amarelada/esverdeada).",
    vomitos: "Vômitos: X episódios hoje. (alimentar/bilioso).",
    diarreia: "Diarreia: X episódios hoje. Fezes (líquidas/pastosas), (sem/com) muco/sangue.",
    irritabilidade: "Irritabilidade / Choro intenso. Não cede ao colo.",
    prostracao: "Prostração / Sonolência. Hipoativo, pouca aceitação de líquidos.",
    exantema: "Exantema: Início há X dias. (macular/papular). Local: ",
};
const exameFisicoQualitativoOptions = [
    { id: 'estado_geral_bom', label: 'Bom', group: 'estado_geral', template: "BEG (Bom Estado Geral)." },
    { id: 'estado_geral_regular', label: 'Regular', group: 'estado_geral', template: "REG (Regular Estado Geral)." },
    { id: 'estado_geral_ruim', label: 'Ruim', group: 'estado_geral', template: "MEG (Mau Estado Geral)." },
    { id: 'corado', label: 'Corado', group: 'pele', template: "Corado." }, { id: 'descorado', label: 'Descorado', group: 'pele', template: "Descorado (+/4+)." },
    { id: 'hidratado', label: 'Hidratado', group: 'pele', template: "Hidratado." }, { id: 'desidratado', label: 'Desidratado', group: 'pele', template: "Desidratado (+/4+)." },
    { id: 'eupneico', label: 'Eupneico', group: 'respiratorio', template: "Eupneico, FR=___." }, { id: 'taquipneico', label: 'Taquipneico', group: 'respiratorio', template: "Taquipneico, FR=___." },
    { id: 'oroscopia_normal', label: 'Normal', group: 'oroscopia', template: "Oroscopia sem alterações." },
    { id: 'oroscopia_hiperemia', label: 'Hiperemia', group: 'oroscopia', template: "Oroscopia: Hiperemia de orofaringe." },
    { id: 'acv_brnf', label: 'BRNF s/ sopros', group: 'cardiaco', template: "ACV: BRNF em 2T, sem sopros." },
    { id: 'acv_sopros', label: 'Sopros', group: 'cardiaco', template: "ACV: Sopro ___ /6+ em foco ___." },
    { id: 'ar_mv_presente', label: 'MV presente s/ RA', group: 'respiratorio', template: "AR: MV presente universalmente, sem ruídos adventícios." },
    { id: 'ar_roncos', label: 'Roncos', group: 'respiratorio', template: "AR: Roncos difusos." }, { id: 'ar_sibilos', label: 'Sibilos', group: 'respiratorio', template: "AR: Sibilos difusos." },
    { id: 'abdome_flacido', label: 'Flácido/Indolor', group: 'abdome', template: "Abdome: Flácido, indolor à palpação, RHA+." },
    { id: 'abdome_doloroso', label: 'Doloroso', group: 'abdome', template: "Abdome: Doloroso à palpação em ___." },
];
// --- FIM OPÇÕES ---

// 3. FUNÇÃO HELPER PARA PAINÉIS DAS ABAS
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`pediatria-tabpanel-${index}`}
            aria-labelledby={`pediatria-tab-${index}`}
            {...other}
        >
            {value === index && (
                // Adicionamos o padding aqui para o conteúdo da aba
                <Box sx={{ p: { xs: 1, sm: 2 } }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

export default function AtendimentoPediatria({ pacienteId, onEvolucaoSalva }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // 4. ESTADO PARA CONTROLAR AS ABAS
    const [tabIndex, setTabIndex] = useState(0);

    // --- ESTADOS DA CONSULTA ATUAL (SOAP) ---
    // (O estado de anamnese foi removido)
    const [sintomasConsulta, setSintomasConsulta] = useState({}); // Estado local para sintomas da consulta
    const [exameFisicoData, setExameFisicoData] = useState({});
    const [soapData, setSoapData] = useState({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });

    // --- LÓGICA DE CARREGAMENTO REMOVIDA ---
    // (A lógica de carregar Anamnese foi para HistoricoPediatrico.jsx)

    // --- CARREGA DADOS VITAIS DO PACIENTE (Peso e Altura) ---
    // (Esta lógica permanece, pois é usada na Aba 1)
    useEffect(() => {
        if (pacienteId) {
            apiClient.get(`/pacientes/${pacienteId}/`)
                .then(res => {
                    setExameFisicoData(prev => ({
                        ...prev,
                        peso: res.data.peso || '',
                        altura: res.data.altura || '',
                    }));
                })
                .catch(err => {
                    console.error("Erro ao carregar dados do paciente:", err);
                    showSnackbar('Erro ao carregar dados vitais do paciente.', 'error');
                });
        }
        // Reseta o SOAP ao trocar de paciente
        setSoapData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
        setSintomasConsulta({});
        setExameFisicoData(prev => ({ peso: prev.peso, altura: prev.altura })); // Mantém vitais
        setTabIndex(0); // Volta para a primeira aba

    }, [pacienteId, showSnackbar]);


    // --- GERADORES DE TEXTO (Permanecem) ---
    const generateHda = useCallback(() => {
        return sintomasOptions
            .filter(opt => sintomasConsulta[opt.id]) // Usa o estado local 'sintomasConsulta'
            .map(opt => sintomaTemplates[opt.id])
            .join('\n');
    }, [sintomasConsulta]);

    const generateExameFisico = useCallback(() => {
        let texto = `Dados Vitais:\nPeso: ${exameFisicoData.peso || '___'} kg\nAltura: ${exameFisicoData.altura || '___'} cm\nPC: ${exameFisicoData.pc || '___'} cm\nT: ${exameFisicoData.temperatura || '___'} °C\n\nExame Físico:\n`;
        const achados = exameFisicoQualitativoOptions
            .filter(opt => exameFisicoData[opt.id])
            .map(opt => opt.template)
            .join(" ");
        return texto + (achados || "Nenhuma observação selecionada.");
    }, [exameFisicoData]);

    // Efeitos que ATUALIZAM o SOAP (Permanecem)
    useEffect(() => {
        const hdaText = generateHda();
        setSoapData(prev => ({
            ...prev,
            notas_subjetivas: hdaText || (prev.notas_subjetivas || '')
        }));
    }, [sintomasConsulta, generateHda]);

    useEffect(() => {
        const exameText = generateExameFisico();
        setSoapData(prev => ({ ...prev, notas_objetivas: exameText }));
    }, [exameFisicoData, generateExameFisico]);


    // --- HANDLERS DA CONSULTA ATUAL (Permanecem) ---
    const handleTabChange = (event, newIndex) => {
        setTabIndex(newIndex);
    };

    const handleSoapChange = (e) => {
        setSoapData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSintomasChange = (event) => {
        const { name, checked } = event.target;
        setSintomasConsulta(prev => ({ ...prev, [name]: checked })); // Usa estado local
    };

    const handleExameChange = (event) => {
        const { name, value, type, checked } = event.target;
        setExameFisicoData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };
    
    // (Handlers de Anamnese e DNPM foram REMOVIDOS)

    const preencherNormalidade = () => {
        setSintomasConsulta({}); // Limpa sintomas locais
        setExameFisicoData(prev => ({
            ...prev,
            estado_geral_bom: true, estado_geral_regular: false, estado_geral_ruim: false,
            corado: true, hidratado: true, eupneico: true,
            oroscopia_normal: true, oroscopia_hiperemia: false,
            acv_brnf: true, ar_mv_presente: true, abdome_flacido: true,
        }));
        setSoapData({
            notas_subjetivas: 'Mãe nega queixas. Criança ativa, reativa, alimentando-se bem (SME), diurese e evacuações presentes.',
            notas_objetivas: `Dados Vitais:\nPeso: ${exameFisicoData.peso || '___'} kg\nAltura: ${exameFisicoData.altura || '___'} cm\nPC: ${exameFisicoData.pc || '___'} cm\nT: ${exameFisicoData.temperatura || '___'} °C\n\nExame Físico:\nBEG (Bom Estado Geral). Corado. Hidratado. Eupneico, FR=___. Oroscopia sem alterações. ACV: BRNF em 2T, sem sopros. AR: MV presente universalmente, sem ruídos adventícios. Abdome: Flácido, indolor à palpação, RHA+.`,
            avaliacao: 'Criança hígida, sem sinais de alarme. Desenvolvimento adequado para a idade.',
            plano: 'Sigo com orientações gerais, manutenção do aleitamento materno. Alta da consulta.'
        });
    };
    
    const handleLimparConsultaAtual = () => {
        setSintomasConsulta({});
        setSoapData({
            notas_subjetivas: '',
            notas_objetivas: `Dados Vitais:\nPeso: ${exameFisicoData.peso || '___'} kg\nAltura: ${exameFisicoData.altura || '___'} cm\nPC: ${exameFisicoData.pc || '___'} cm\nT: ${exameFisicoData.temperatura || '___'} °C\n\nExame Físico:\n`,
            avaliacao: '',
            plano: ''
        });
        // Limpa checkboxes do exame, mas mantém vitais
        setExameFisicoData(prev => ({ peso: prev.peso, altura: prev.altura, pc: prev.pc, temperatura: prev.temperatura }));
        showSnackbar('Campos da consulta atual limpos.', 'info');
    };
    
    // --- 5. SUBMIT (SIMPLIFICADO) ---
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        
        // 1. Prepara os dados vitais (Peso e Altura)
        const vitaisData = {
            peso: exameFisicoData.peso || null,
            altura: exameFisicoData.altura || null,
        };

        // 2. Salva a EVOLUÇÃO (SOAP)
        try {
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes/`, soapData);
            showSnackbar('Evolução salva com sucesso!', 'success');
            if(onEvolucaoSalva) onEvolucaoSalva();
        } catch (error) {
            showSnackbar('Erro ao salvar evolução.', 'error');
            setIsSubmitting(false);
            return;
        }

        // 3. (A etapa de salvar Anamnese foi REMOVIDA daqui)
        
        // 4. ATUALIZA OS VITAIS (Peso/Altura) DO PACIENTE
        try {
            await apiClient.patch(`/pacientes/${pacienteId}/`, vitaisData);
            showSnackbar('Peso e Altura do paciente atualizados.', 'info');
        } catch (error) {
             showSnackbar('Erro ao atualizar peso/altura do paciente.', 'error');
        } finally {
            setIsSubmitting(false);
            // Limpa os campos da consulta após salvar
            handleLimparConsultaAtual();
        }
    };


    // --- 6. JSX ATUALIZADO COM ABAS ---
    return (
        <Paper sx={{ mb: 2, overflow: 'hidden' }}> {/* Remove padding p:2 daqui */}
            
            {/* --- CABEÇALHO --- */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 0 }}>
                <Typography variant="h6" gutterBottom> Atendimento Pediátrico </Typography>
                {/* Mostra o botão apenas se estiver na primeira aba */}
                {tabIndex === 0 && (
                    <Button variant="outlined" size="small" onClick={preencherNormalidade}> Preencher Normalidade </Button>
                )}
            </Box>

            {/* --- NAVEGAÇÃO DAS ABAS --- */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                <Tabs value={tabIndex} onChange={handleTabChange} aria-label="Abas do prontuário pediátrico" variant="scrollable" scrollButtons="auto">
                    <Tab label="Consulta Atual" id="pediatria-tab-0" />
                    <Tab label="Histórico" id="pediatria-tab-1" />
                    <Tab label="DNPM" id="pediatria-tab-2" />
                    <Tab label="Vacinação" id="pediatria-tab-3" />
                </Tabs>
            </Box>

            {/* --- CONTEÚDO DAS ABAS --- */}
            <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
                
                {/* ABA 1: CONSULTA ATUAL (SOAP) */}
                <TabPanel value={tabIndex} index={0}>
                    <Paper variant="outlined" sx={{ p: 2, borderColor: 'primary.main' }}>
                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Consulta Atual (SOAP)</Typography>
                        
                        {/* Queixa Atual (S) */}
                        <Typography variant="body1" sx={{ mt: 1, fontWeight: 'medium' }}>Queixa Atual (S)</Typography>
                        <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 1, p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                            {sintomasOptions.map(opt => ( 
                                <FormControlLabel key={opt.id} control={<Checkbox checked={sintomasConsulta[opt.id] || false} onChange={handleSintomasChange} name={opt.id} />} label={opt.label} />
                            ))}
                        </FormGroup>
                        <TextField name="notas_subjetivas" label="Subjetivo (HDA gerada / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_subjetivas || ''} onChange={handleSoapChange} size="small" />
                        
                        <Divider sx={{ my: 2 }} />

                        {/* Exame Físico (O) */}
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Exame Físico (O)</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, my: 1.5 }}>
                            <TextField label="Peso (kg)" name="peso" value={exameFisicoData.peso || ''} onChange={handleExameChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '80px' }}/>
                            <TextField label="Altura (cm)" name="altura" value={exameFisicoData.altura || ''} onChange={handleExameChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '80px' }}/>
                            <TextField label="PC (cm)" name="pc" value={exameFisicoData.pc || ''} onChange={handleExameChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '80px' }}/>
                            <TextField label="T (°C)" name="temperatura" value={exameFisicoData.temperatura || ''} onChange={handleExameChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '80px' }}/>
                        </Box>
                        
                        {/* Checkboxes Exame Físico */}
                        <FormGroup sx={{ p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                            {/* ... (O JSX dos checkboxes agrupados permanece exatamente o mesmo) ... */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Geral:</Typography>
                                {exameFisicoQualitativoOptions.filter(o=>o.group === 'estado_geral' || o.group === 'pele').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                                ))}
                            </Box>
                            {/* ... (Copie os outros <Box> de Respiratório, Cardíaco, Abdome, Oroscopia aqui) ... */}
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

                {/* ABA 2: HISTÓRICO PEDIÁTRICO */}
                <TabPanel value={tabIndex} index={1}>
                    <HistoricoPediatrico pacienteId={pacienteId} />
                </TabPanel>

                {/* ABA 3: DNPM */}
                <TabPanel value={tabIndex} index={2}>
                    <DnpmDetalhado pacienteId={pacienteId} />
                </TabPanel>

                {/* ABA 4: VACINAÇÃO (AGORA FUNCIONAL) */}
                <TabPanel value={tabIndex} index={3}>
                    {/* SUBSTITUÍDO O PLACEHOLDER */}
                    <VacinacaoTab pacienteId={pacienteId} />
                </TabPanel>

            </Suspense>
        </Paper>
    );
}