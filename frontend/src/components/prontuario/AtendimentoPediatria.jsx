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
// --- FIM OPÇÕES E TEMPLATES ---

// --- EXAME FÍSICO ATUALIZADO ---
const exameFisicoQualitativoOptions = [
    // Geral (Já existentes)
    { id: 'estado_geral_bom', label: 'Bom', group: 'geral', template: "BEG (Bom Estado Geral)." },
    { id: 'estado_geral_regular', label: 'Regular', group: 'geral', template: "REG (Regular Estado Geral)." },
    { id: 'estado_geral_ruim', label: 'Ruim', group: 'geral', template: "MEG (Mau Estado Geral)." },
    { id: 'corado', label: 'Corado', group: 'pele', template: "Corado." }, { id: 'descorado', label: 'Descorado', group: 'pele', template: "Descorado (+/4+)." },
    { id: 'hidratado', label: 'Hidratado', group: 'pele', template: "Hidratado." }, { id: 'desidratado', label: 'Desidratado', group: 'pele', template: "Desidratado (+/4+)." },
    { id: 'afebril_toque', label: 'Afebril', group: 'geral', template: "Afebril ao toque." },
    { id: 'febril_toque', label: 'Febril', group: 'geral', template: "Febril ao toque." },
    { id: 'acianotico', label: 'Acianótico', group: 'pele', template: "Acianótico." },
    { id: 'cianotico', label: 'Cianótico', group: 'pele', template: "Cianótico (Central/Periférico)." },
    { id: 'anicterico', label: 'Anictérico', group: 'pele', template: "Anictérico." },
    { id: 'icterico', label: 'Ictérico', group: 'pele', template: "Ictérico (Zona ___/ Kramer)." },

    // NOVOS: Cabeça / Fontanelas
    { id: 'fontanela_normo', label: 'FA Normotensa', group: 'cabeca', template: "Fontanela anterior normotensa." },
    { id: 'fontanela_abaulada', label: 'FA Abaulada', group: 'cabeca', template: "Fontanela anterior abaulada." },
    { id: 'fontanela_deprimida', label: 'FA Deprimida', group: 'cabeca', template: "Fontanela anterior deprimida." },
    { id: 'suturas_normais', label: 'Suturas Normais', group: 'cabeca', template: "Suturas cranianas normais." },

    // NOVOS: Olhos
    { id: 'olhos_normais', label: 'Normais', group: 'olhos', template: "Olhos sem alterações, pupilas isocóricas e fotorreagentes." },
    { id: 'reflexo_vermelho_presente', label: 'Reflexo Vermelho +', group: 'olhos', template: "Reflexo vermelho presente bilateralmente." },
    { id: 'reflexo_vermelho_ausente', label: 'Reflexo Vermelho -', group: 'olhos', template: "Reflexo vermelho ausente em ___." },
    { id: 'conjuntivas_normais', label: 'Conjuntivas Normais', group: 'olhos', template: "Conjuntivas coradas." },
    { id: 'conjuntivas_hiperemiadas', label: 'Conjuntivas Hiperemiadas', group: 'olhos', template: "Hiperemia conjuntival." },

    // NOVOS e EXISTENTES: Ouvidos/Nariz/Boca (ORL)
    { id: 'otoscopia_normal', label: 'Otoscopia Normal', group: 'orl', template: "Otoscopia: Membranas timpânicas íntegras, translúcidas." },
    { id: 'otoscopia_alterada', label: 'Otoscopia Alterada', group: 'orl', template: "Otoscopia: ___ (descrever)." },
    { id: 'narinas_permeaveis', label: 'Narinas Permeáveis', group: 'orl', template: "Narinas pérvias, sem secreção." },
    { id: 'narinas_obstruidas', label: 'Narinas Obstruídas', group: 'orl', template: "Obstrução nasal / Coriza ___." },
    { id: 'oroscopia_normal', label: 'Oroscopia Normal', group: 'orl', template: "Oroscopia sem alterações." }, // Já existia
    { id: 'oroscopia_hiperemia', label: 'Oroscopia Hiperemia', group: 'orl', template: "Oroscopia: Hiperemia de orofaringe." }, // Já existia
    { id: 'oroscopia_placas', label: 'Oroscopia Placas', group: 'orl', template: "Oroscopia: Hiperemia com placas purulentas em amígdalas." },

    // NOVOS: Pescoço / Linfonodos
    { id: 'pescoco_livre', label: 'Livre/Indolor', group: 'pescoco', template: "Pescoço livre, sem massas ou rigidez." },
    { id: 'linfonodos_ausentes', label: 'Linfonodos Ausentes', group: 'pescoco', template: "Linfonodos não palpáveis." },
    { id: 'linfonodos_presentes', label: 'Linfonodos Palpáveis', group: 'pescoco', template: "Linfonodos palpáveis em cadeias ___ (tamanho, consistência)." },

    // Tórax / Respiratório (Já existentes)
    { id: 'eupneico', label: 'Eupneico', group: 'respiratorio', template: "Eupneico, FR=___." },
    { id: 'taquipneico', label: 'Taquipneico/Tiragem', group: 'respiratorio', template: "Taquipneico (FR=___), com tiragem ___." },
    { id: 'ar_mv_presente', label: 'MV presente s/ RA', group: 'respiratorio', template: "AR: MV presente universalmente, sem ruídos adventícios." },
    { id: 'ar_roncos', label: 'Roncos', group: 'respiratorio', template: "AR: Roncos difusos." },
    { id: 'ar_sibilos', label: 'Sibilos', group: 'respiratorio', template: "AR: Sibilos difusos." },
    { id: 'ar_creptos', label: 'Estertores Creptantes', group: 'respiratorio', template: "AR: Estertores creptantes em ___." },

    // Cardiovascular (Já existentes)
    { id: 'acv_brnf', label: 'BRNF s/ sopros', group: 'cardiaco', template: "ACV: BRNF em 2T, sem sopros." },
    { id: 'acv_sopros', label: 'Sopros', group: 'cardiaco', template: "ACV: Sopro ___ /6+ em foco ___." },
    { id: 'pulsos_cheios', label: 'Pulsos Cheios/Simétricos', group: 'cardiaco', template: "Pulsos periféricos cheios e simétricos." }, // Adicionado grupo

    // Abdome (Já existentes)
    { id: 'abdome_flacido', label: 'Flácido/Indolor', group: 'abdome', template: "Abdome: Flácido, indolor à palpação, RHA+." },
    { id: 'abdome_doloroso', label: 'Doloroso', group: 'abdome', template: "Abdome: Doloroso à palpação em ___." },
    { id: 'abdome_distendido', label: 'Distendido', group: 'abdome', template: "Abdome: Distendido, timpânico." }, // Adicionado
    { id: 'sem_visceromegalias', label: 'S/ Visceromegalias', group: 'abdome', template: "Sem visceromegalias palpáveis." }, // Adicionado

    // NOVOS: Genitália / Períneo
    { id: 'genitalia_masc_normal', label: 'Gen Masc Normal', group: 'genitalia', template: "Genitália masculina tópica, testículos em bolsa." },
    { id: 'genitalia_fem_normal', label: 'Gen Fem Normal', group: 'genitalia', template: "Genitália feminina tópica, sem alterações." },
    { id: 'genitalia_alterada', label: 'Gen Alterada', group: 'genitalia', template: "Genitália: ___ (descrever)." },
    { id: 'perineo_integro', label: 'Períneo Íntegro', group: 'genitalia', template: "Região perineal íntegra, sem hiperemia ou lesões." },

    // NOVOS: Coluna / Membros
    { id: 'coluna_sem_desvios', label: 'Coluna s/ Desvios', group: 'membros', template: "Coluna vertebral sem desvios aparentes." },
    { id: 'membros_normais', label: 'MMSS/MMII Normais', group: 'membros', template: "Membros superiores e inferiores sem deformidades ou edema. Mobilidade preservada." },
    { id: 'ortolani_negativo', label: 'Ortolani Negativo', group: 'membros', template: "Manobra de Ortolani negativa." },

    // NOVOS: Neurológico
    { id: 'neuro_normal_idade', label: 'Normal p/ Idade', group: 'neuro', template: "Neurológico: Ativo, reativo, tônus e reflexos normais para a idade." },
    { id: 'reflexos_primitivos_presentes', label: 'Reflexos Primitivos +', group: 'neuro', template: "Reflexos primitivos (Moro, sucção, preensão) presentes." },
    { id: 'tonus_normal', label: 'Tônus Normal', group: 'neuro', template: "Tônus muscular normal." },
    { id: 'hipotonia_hipertonia', label: 'Hipo/Hipertonia', group: 'neuro', template: "Hipotonia / Hipertonia." },
];
// --- FIM EXAME FÍSICO ---

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

    // --- generateExameFisico ATUALIZADO ---
    const generateExameFisico = useCallback(() => {
        // Incluir FR e SpO2 se forem coletados nos vitais
        let texto = `Dados Vitais:\nPeso: ${exameFisicoData.peso || '___'} kg\nAltura: ${exameFisicoData.altura || '___'} cm\nPC: ${exameFisicoData.pc || '___'} cm\nT: ${exameFisicoData.temperatura || '___'} °C\n\nExame Físico:\n`;

        const achados = exameFisicoQualitativoOptions
            .filter(opt => exameFisicoData[opt.id])
            .map(opt => opt.template)
            .join(" ");

        return texto + (achados || "Nenhuma observação selecionada.");
    }, [exameFisicoData]); // Depende apenas do exameFisicoData agora

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
    
    // --- preencherNormalidade ATUALIZADO ---
    const preencherNormalidade = () => {
        setSintomasConsulta({});
        setExameFisicoData(prev => ({
            ...prev, // Mantém peso/altura/pc/temp digitados
            estado_geral_bom: true, corado: true, hidratado: true, afebril_toque: true, acianotico: true, anicterico: true, // Geral
            fontanela_normo: true, suturas_normais: true, // Cabeça
            olhos_normais: true, reflexo_vermelho_presente: true, conjuntivas_normais: true, // Olhos
            otoscopia_normal: true, narinas_permeaveis: true, oroscopia_normal: true, // ORL
            pescoco_livre: true, linfonodos_ausentes: true, // Pescoço
            eupneico: true, ar_mv_presente: true, // Respiratório
            acv_brnf: true, pulsos_cheios: true, // Cardio
            abdome_flacido: true, sem_visceromegalias: true, // Abdome
            genitalia_masc_normal: true, genitalia_fem_normal: true, perineo_integro: true, // Genitália
            coluna_sem_desvios: true, membros_normais: true, ortolani_negativo: true, // Membros
            neuro_normal_idade: true, reflexos_primitivos_presentes: true, tonus_normal: true, // Neuro
            // Limpa os 'alterados'
            estado_geral_regular: false, estado_geral_ruim: false, descorado: false, desidratado: false, febril_toque: false, cianotico: false, icterico: false,
            fontanela_abaulada: false, fontanela_deprimida: false,
            reflexo_vermelho_ausente: false, conjuntivas_hiperemiadas: false,
            otoscopia_alterada: false, narinas_obstruidas: false, oroscopia_hiperemia: false, oroscopia_placas: false,
            linfonodos_presentes: false,
            taquipneico: false, ar_roncos: false, ar_sibilos: false, ar_creptos: false,
            acv_sopros: false,
            abdome_doloroso: false, abdome_distendido: false,
            genitalia_alterada: false,
            hipotonia_hipertonia: false,
        }));
        setSoapData({
            notas_subjetivas: 'Mãe nega queixas. Criança ativa, reativa, alimentando-se bem (SME), diurese e evacuações presentes.',
            // Template normalidade mais completo
            notas_objetivas: `Dados Vitais:\nPeso: ${exameFisicoData.peso || '___'} kg\nAltura: ${exameFisicoData.altura || '___'} cm\nPC: ${exameFisicoData.pc || '___'} cm\nT: ${exameFisicoData.temperatura || '___'} °C\n\nExame Físico:\nBEG (Bom Estado Geral). Corado. Hidratado. Afebril ao toque. Acianótico. Anictérico. Fontanela anterior normotensa. Suturas cranianas normais. Olhos sem alterações, pupilas isocóricas e fotorreagentes. Reflexo vermelho presente bilateralmente. Conjuntivas coradas. Otoscopia: Membranas timpânicas íntegras, translúcidas. Narinas pérvias, sem secreção. Oroscopia sem alterações. Pescoço livre, sem massas ou rigidez. Linfonodos não palpáveis. Eupneico, FR=___. AR: MV presente universalmente, sem ruídos adventícios. ACV: BRNF em 2T, sem sopros. Pulsos periféricos cheios e simétricos. Abdome: Flácido, indolor à palpação, RHA+. Sem visceromegalias palpáveis. Genitália masculina tópica, testículos em bolsa. Genitália feminina tópica, sem alterações. Região perineal íntegra, sem hiperemia ou lesões. Coluna vertebral sem desvios aparentes. Membros superiores e inferiores sem deformidades ou edema. Mobilidade preservada. Manobra de Ortolani negativa. Neurológico: Ativo, reativo, tônus e reflexos normais para a idade. Reflexos primitivos (Moro, sucção, preensão) presentes. Tônus muscular normal.`,
            avaliacao: 'Criança hígida, sem sinais de alarme. Desenvolvimento adequado para a idade.',
            plano: 'Sigo com orientações gerais, manutenção do aleitamento materno. Alta da consulta.'
        });
    };

     // --- handleLimparConsultaAtual ATUALIZADO ---
    const handleLimparConsultaAtual = () => {
        setSintomasConsulta({});
        // Limpa checkboxes do exame, mas mantém vitais pré-carregados
        setExameFisicoData(prev => ({ peso: prev.peso, altura: prev.altura }));
        setSoapData({
            notas_subjetivas: '',
            // Template inicial mais robusto
            notas_objetivas: `Dados Vitais:\nPeso: ${exameFisicoData.peso || '___'} kg\nAltura: ${exameFisicoData.altura || '___'} cm\nPC: ${exameFisicoData.pc || '___'} cm\nT: ${exameFisicoData.temperatura || '___'} °C\n\nExame Físico:\n`,
            avaliacao: '',
            plano: ''
        });
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
                            {/* Inputs Vitais (Peso, Altura, PC, Temp - igual) */}
                            <TextField label="Peso (kg)" name="peso" value={exameFisicoData.peso || ''} onChange={handleExameChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '80px' }}/>
                            <TextField label="Altura (cm)" name="altura" value={exameFisicoData.altura || ''} onChange={handleExameChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '80px' }}/>
                            <TextField label="PC (cm)" name="pc" value={exameFisicoData.pc || ''} onChange={handleExameChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '80px' }}/>
                            <TextField label="T (°C)" name="temperatura" value={exameFisicoData.temperatura || ''} onChange={handleExameChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '80px' }}/>
                         </Box>

                        {/* Checkboxes Exame Físico AGRUPADOS */}
                        <FormGroup sx={{ p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                            {/* Grupo Geral/Pele */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                               <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Geral / Pele:</Typography>
                               {exameFisicoQualitativoOptions.filter(o=>o.group === 'geral' || o.group === 'pele').map(opt => (
                                   <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                               ))}
                           </Box>
                           {/* Grupo Cabeça */}
                           <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                               <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Cabeça / Fontanelas:</Typography>
                               {exameFisicoQualitativoOptions.filter(o=>o.group === 'cabeca').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                               ))}
                           </Box>
                            {/* Grupo Olhos */}
                           <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                               <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Olhos:</Typography>
                               {exameFisicoQualitativoOptions.filter(o=>o.group === 'olhos').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                               ))}
                           </Box>
                            {/* Grupo ORL */}
                           <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                               <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Ouvidos / Nariz / Boca:</Typography>
                               {exameFisicoQualitativoOptions.filter(o=>o.group === 'orl').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                               ))}
                           </Box>
                           {/* Grupo Pescoço */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                               <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Pescoço / Linfonodos:</Typography>
                               {exameFisicoQualitativoOptions.filter(o=>o.group === 'pescoco').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                               ))}
                           </Box>
                            {/* Grupo Respiratório */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                               <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Respiratório:</Typography>
                               {exameFisicoQualitativoOptions.filter(o=>o.group === 'respiratorio').map(opt => (
                                   <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                               ))}
                           </Box>
                           {/* Grupo Cardíaco */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                               <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Cardiovascular:</Typography>
                               {exameFisicoQualitativoOptions.filter(o=>o.group === 'cardiaco').map(opt => (
                                   <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                               ))}
                           </Box>
                           {/* Grupo Abdome */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                               <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Abdome:</Typography>
                               {exameFisicoQualitativoOptions.filter(o=>o.group === 'abdome').map(opt => (
                                   <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                               ))}
                           </Box>
                            {/* Grupo Genitália */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                               <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Genitália / Períneo:</Typography>
                               {exameFisicoQualitativoOptions.filter(o=>o.group === 'genitalia').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                               ))}
                           </Box>
                            {/* Grupo Coluna / Membros */}
                           <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                               <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Coluna / Membros:</Typography>
                               {exameFisicoQualitativoOptions.filter(o=>o.group === 'membros').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                               ))}
                           </Box>
                            {/* Grupo Neurológico */}
                           <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                               <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Neurológico:</Typography>
                               {exameFisicoQualitativoOptions.filter(o=>o.group === 'neuro').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                               ))}
                           </Box>
                        </FormGroup>

                        {/* Campo Objetivo (preenchido ou editado) */}
                        <TextField name="notas_objetivas" label="Objetivo (Gerado / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_objetivas || ''} onChange={handleSoapChange} size="small" sx={{mt: 1.5}}/>

                        <Divider sx={{ my: 2 }} />

                        {/* Campos Finais (A, P) e Botões */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {/* ... (TextFields Avaliação e Plano - igual) ... */}
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

                {/* ABA 4: VACINAÇÃO */}
                <TabPanel value={tabIndex} index={3}>
                    <VacinacaoTab pacienteId={pacienteId} />
                </TabPanel>

            </Suspense>
        </Paper>
    );
}