// src/components/prontuario/AtendimentoPediatria.jsx - VERSÃO FINAL HÍBRIDA (Rádios + Checkboxes)

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import {
    Paper, Typography, Grid, FormGroup, FormControlLabel, Checkbox, TextField, Divider,
    Box, Button, CircularProgress, Tabs, Tab,
    // 1. IMPORTAÇÕES ADICIONADAS PARA RADIO GROUPS
    Radio, RadioGroup, FormControl, FormLabel 
} from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

// --- IMPORTAR AS ABAS COM LAZY LOADING ---
const HistoricoPediatrico = lazy(() => import('./pediatria/HistoricoPediatrico'));
const DnpmDetalhado = lazy(() => import('./pediatria/DnpmDetalhado'));
const VacinacaoTab = lazy(() => import('./pediatria/VacinacaoTab'));

// --- 2. OPÇÕES E TEMPLATES DE SINTOMAS (ATUALIZADO) ---
const sintomasOptions = [
    { id: 'febre', label: 'Febre' }, { id: 'tosse', label: 'Tosse' }, { id: 'coriza', label: 'Coriza' },
    { id: 'vomitos', label: 'Vômitos' }, { id: 'diarreia', label: 'Diarreia' }, { id: 'irritabilidade', label: 'Irritabilidade / Choro' },
    { id: 'prostracao', label: 'Prostração / Sonolência' }, { id: 'exantema', label: 'Exantema (Manchas)' },
    // NOVOS
    { id: 'dor_abdominal', label: 'Dor abdominal' },
    { id: 'perda_apetite', label: 'Perda de apetite' },
    { id: 'cansaco_dispneia', label: 'Cansaço (Dispneia)' },
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
    // NOVOS
    dor_abdominal: "Dor abdominal: Início há X dias, (cólica/pontada), (localização).",
    perda_apetite: "Redução da ingesta alimentar (hiporexia/anorexia) há X dias.",
    cansaco_dispneia: "Relato de cansaço / dispneia aos esforços.",
};
// --- FIM OPÇÕES E TEMPLATES ---

// --- 3. EXAME FÍSICO HÍBRIDO ---

// LISTA DE RADIO GROUPS (Baseado nas "caixas" pedidas)
const exameFisicoRadioGroups = [
    // --- GERAL / PELE ---
    { 
        id: 'estado_geral', 
        label: 'Estado Geral',
        options: [
            { value: 'BEG', label: 'BEG', template: 'BEG (Bom Estado Geral).' },
            { value: 'REG', label: 'REG', template: 'REG (Regular Estado Geral).' },
            { value: 'MEG', label: 'MEG', template: 'MEG (Mau Estado Geral).' }
        ]
    },
    { 
        id: 'cor_pele', 
        label: 'Coloração', 
        options: [
            { value: 'Pletorico', label: 'Pletórico', template: 'Pletórico.' },
            { value: 'Corado', label: 'Corado', template: 'Corado.' },
            { value: 'Descorado', label: 'Descorado', template: 'Descorado (+/4+).' }
        ]
    },
    { 
        id: 'hidratacao', 
        label: 'Hidratação', 
        options: [
            { value: 'Hidratado', label: 'Hidratado', template: 'Hidratado.' },
            { value: 'Desidratado', label: 'Desidratado', template: 'Desidratado (+/4+).' },
            { value: 'Edemaciado', label: 'Edemaciado', template: 'Edemaciado (+/4+).' },
            { value: 'Anasarca', label: 'Anasarca', template: 'Anasarca.' }
        ]
    },
    { 
        id: 'estado_febril', 
        label: 'Temperatura', 
        options: [
            { value: 'Afebril', label: 'Afebril', template: 'Afebril ao toque.' },
            { value: 'Febril', label: 'Febril', template: 'Febril ao toque.' },
            { value: 'Hipotermico', label: 'Hipotérmico', template: 'Hipotérmico ao toque.' }
        ]
    },
    { 
        id: 'cianose', 
        label: 'Cianose', 
        options: [
            { value: 'Acianotico', label: 'Acianótico', template: 'Acianótico.' },
            { value: 'Cianotico', label: 'Cianótico', template: 'Cianótico (Central/Periférico).' }
        ]
    },
    { 
        id: 'ictericia', 
        label: 'Icterícia', 
        options: [
            { value: 'Anicterico', label: 'Anictérico', template: 'Anictérico.' },
            { value: 'Icterico', label: 'Ictérico', template: 'Ictérico (Zona ___/ Kramer).' }
        ]
    },
    // --- NEUROLÓGICO (ESTADO) ---
     { 
        id: 'atividade', 
        label: 'Atividade', 
        options: [
            { value: 'Ativo', label: 'Ativo', template: 'Ativo.' },
            { value: 'Hipoativo', label: 'Hipoativo', template: 'Hipoativo.' },
            { value: 'Hiperativo', label: 'Hiperativo', template: 'Hiperativo.' }
        ]
    },
    { 
        id: 'reatividade', 
        label: 'Reatividade', 
        options: [
            { value: 'Reativo', label: 'Reativo', template: 'Reativo.' },
            { value: 'Hiporeativo', label: 'Hiporeativo', template: 'Hiporeativo.' },
            { value: 'Hipereativo', label: 'Hipereativo', template: 'Hipereativo.' }
        ]
    },
    // --- CABEÇA ---
    {
        id: 'fontanelas',
        label: 'Fontanela Anterior',
        options: [
            { value: 'Normo', label: 'FA Normotensa', template: 'Fontanela anterior normotensa.' },
            { value: 'Abaulada', label: 'FA Abaulada', template: 'Fontanela anterior abaulada.' },
            { value: 'Deprimida', label: 'FA Deprimida', template: 'Fontanela anterior deprimida.' }
        ]
    },
    {
        id: 'suturas',
        label: 'Suturas',
        options: [
            { value: 'Normais', label: 'Normais', template: 'Suturas cranianas normais.' },
            { value: 'Acavalgadas', label: 'Acavalgadas', template: 'Suturas cranianas acavalgadas.' },
            { value: 'Diastase', label: 'Diástase', template: 'Diástase de suturas.' }
        ]
    },
    // --- OLHOS ---
    {
        id: 'olhos_estado',
        label: 'Olhos',
        options: [
            { value: 'Normal', label: 'Normal', template: 'Olhos sem alterações, pupilas isocóricas e fotorreagentes. Conjuntivas coradas.' },
            { value: 'Hiperemia', label: 'Hiperemia Ocular', template: 'Hiperemia conjuntival.' }
        ]
    },
    {
        id: 'olhos_secrecao',
        label: 'Secreção Ocular',
        options: [
            { value: 'Sem', label: 'Sem secreção', template: 'Sem secreção ocular.' },
            { value: 'Com', label: 'Com secreção', template: 'Presença de secreção ocular (amarela/esverdeada/clara).' }
        ]
    },
    // --- ORL ---
    {
        id: 'otoscopia',
        label: 'Otoscopia',
        options: [
            { value: 'Normal', label: 'Normal', template: 'Otoscopia: Membranas timpânicas íntegras, translúcidas.' },
            { value: 'HiperemiaSem', label: 'Hiperemia s/ Abaulamento', template: 'Otoscopia: Hiperemia de MT, sem abaulamento.' },
            { value: 'HiperemiaCom', label: 'Hiperemia c/ Abaulamento', template: 'Otoscopia: Hiperemia e abaulamento de MT.' }
        ]
    },
    {
        id: 'otorreia',
        label: 'Otorreia',
        options: [
            { value: 'Nao', label: 'Não', template: 'Ausência de otorreia.' },
            { value: 'Sim', label: 'Sim', template: 'Presença de otorreia.' }
        ]
    },
    // --- PESCOÇO ---
    {
        id: 'linfonodos',
        label: 'Linfonodos',
        options: [
            { value: 'Ausentes', label: 'Ausentes', template: 'Linfonodos não palpáveis.' },
            { value: 'Presentes', label: 'Presentes', template: 'Linfonodos palpáveis em cadeias ___ (tamanho, consistência).' }
        ]
    },
    // --- RESPIRATÓRIO ---
    {
        id: 'respiratorio_estado',
        label: 'Padrão Respiratório',
        options: [
            { value: 'Eupneico', label: 'Eupneico', template: 'Eupneico, FR=___.' },
            { value: 'Dispneico', label: 'Dispneico', template: 'Dispneico (FR=___), esforço respiratório.' },
            { value: 'Taquipneico', label: 'Taquipneico/Tiragem', template: 'Taquipneico (FR=___), com tiragem ___.' }
        ]
    },
    // --- CARDIOVASCULAR ---
    {
        id: 'cardio_sopros',
        label: 'Sopros Cardíacos',
        options: [
            { value: 'Sem', label: 'Sem sopros', template: 'Sem sopros.' },
            { value: 'Com', label: 'Com sopros', template: 'ACV: Sopro ___ /6+ em foco ___.' }
        ]
    }
];

// LISTA DE CHECKBOXES (Apenas achados cumulativos)
const exameFisicoQualitativoOptions = [
    // --- GERAL/PELE/CABEÇA/OLHOS: Removidos (estão nos Rádios) ---
    
    // --- OLHOS (Achados cumulativos) ---
    { id: 'reflexo_vermelho_presente', label: 'Reflexo Vermelho +', group: 'olhos', template: "Reflexo vermelho presente bilateralmente." },
    { id: 'reflexo_vermelho_ausente', label: 'Reflexo Vermelho -', group: 'olhos', template: "Reflexo vermelho ausente em ___." },

    // --- ORL (Achados cumulativos) ---
    { id: 'narinas_permeaveis', label: 'Narinas Permeáveis', group: 'orl', template: "Narinas pérvias, sem secreção." },
    { id: 'narinas_obstruidas', label: 'Narinas Obstruídas', group: 'orl', template: "Obstrução nasal / Coriza ___." },
    { id: 'oroscopia_normal', label: 'Oroscopia Normal', group: 'orl', template: "Oroscopia sem alterações." },
    { id: 'oroscopia_hiperemia', label: 'Oroscopia Hiperemia', group: 'orl', template: "Oroscopia: Hiperemia de orofaringe." },
    { id: 'oroscopia_placas', label: 'Oroscopia Placas', group: 'orl', template: "Oroscopia: Hiperemia com placas purulentas em amígdalas." },

    // --- PESCOÇO (Achados cumulativos) ---
    { id: 'pescoco_livre', label: 'Livre/Indolor', group: 'pescoco', template: "Pescoço livre, sem massas ou rigidez." },

    // --- RESPIRATÓRIO (Achados cumulativos) ---
    { id: 'ar_mv_presente', label: 'MV presente s/ RA', group: 'respiratorio', template: "AR: MV presente universalmente, sem ruídos adventícios." },
    { id: 'ar_roncos', label: 'Roncos', group: 'respiratorio', template: "AR: Roncos difusos." },
    { id: 'ar_sibilos', label: 'Sibilos', group: 'respiratorio', template: "AR: Sibilos difusos." },
    { id: 'ar_creptos', label: 'Estertores Creptantes', group: 'respiratorio', template: "AR: Estertores creptantes em ___." },

    // --- CARDIOVASCULAR (Achados cumulativos) ---
    { id: 'acv_brnf', label: 'BRNF 2T', group: 'cardiaco', template: "ACV: BRNF em 2T." },
    { id: 'pulsos_cheios', label: 'Pulsos Cheios/Simétricos', group: 'cardiaco', template: "Pulsos periféricos cheios e simétricos." },

    // --- ABDOME (Permanecem Checkboxes) ---
    { id: 'abdome_flacido', label: 'Flácido/Indolor', group: 'abdome', template: "Abdome: Flácido, indolor à palpação, RHA+." },
    { id: 'abdome_doloroso', label: 'Doloroso', group: 'abdome', template: "Abdome: Doloroso à palpação em ___." },
    { id: 'abdome_distendido', label: 'Distendido', group: 'abdome', template: "Abdome: Distendido, timpânico." },
    { id: 'sem_visceromegalias', label: 'S/ Visceromegalias', group: 'abdome', template: "Sem visceromegalias palpáveis." },

    // --- GENITÁLIA (Permanecem Checkboxes) ---
    { id: 'genitalia_masc_normal', label: 'Gen Masc Normal', group: 'genitalia', template: "Genitália masculina tópica, testículos em bolsa." },
    { id: 'genitalia_fem_normal', label: 'Gen Fem Normal', group: 'genitalia', template: "Genitália feminina tópica, sem alterações." },
    { id: 'genitalia_alterada', label: 'Gen Alterada', group: 'genitalia', template: "Genitália: ___ (descrever)." },
    { id: 'perineo_integro', label: 'Períneo Íntegro', group: 'genitalia', template: "Região perineal íntegra, sem hiperemia ou lesões." },

    // --- MEMBROS (Permanecem Checkboxes) ---
    { id: 'coluna_sem_desvios', label: 'Coluna s/ Desvios', group: 'membros', template: "Coluna vertebral sem desvios aparentes." },
    { id: 'membros_normais', label: 'MMSS/MMII Normais', group: 'membros', template: "Membros superiores e inferiores sem deformidades ou edema. Mobilidade preservada." },
    { id: 'ortolani_negativo', label: 'Ortolani Negativo', group: 'membros', template: "Manobra de Ortolani negativa." },

    // --- NEUROLÓGICO (Achados cumulativos) ---
    { id: 'neuro_normal_idade', label: 'Normal p/ Idade (Reflexos/Tônus)', group: 'neuro', template: "Neurológico: Tônus e reflexos normais para a idade." },
    { id: 'reflexos_primitivos_presentes', label: 'Reflexos Primitivos +', group: 'neuro', template: "Reflexos primitivos (Moro, sucção, preensão) presentes." },
    { id: 'tonus_normal', label: 'Tônus Normal', group: 'neuro', template: "Tônus muscular normal." },
    { id: 'hipotonia_hipertonia', label: 'Hipo/Hipertonia', group: 'neuro', template: "Hipotonia / Hipertonia." },
];
// --- FIM EXAME FÍSICO ---

// FUNÇÃO HELPER PARA PAINÉIS DAS ABAS (Sem alteração)
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
                <Box sx={{ p: { xs: 1, sm: 2 } }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

export default function AtendimentoPediatria({ pacienteId, onEvolucoesSalva }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tabIndex, setTabIndex] = useState(0);

    const [sintomasConsulta, setSintomasConsulta] = useState({}); 
    const [exameFisicoData, setExameFisicoData] = useState({});
    const [soapData, setSoapData] = useState({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });

    // CARREGA DADOS VITAIS DO PACIENTE (Sem alteração)
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
        // Reseta tudo ao trocar de paciente
        setSoapData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
        setSintomasConsulta({});
        // Limpa exame físico mas mantém vitais pré-carregados
        setExameFisicoData(prev => ({ peso: prev.peso, altura: prev.altura })); 
        setTabIndex(0); 
    }, [pacienteId, showSnackbar]);


    // --- 4. GERADORES DE TEXTO (ATUALIZADOS) ---
    const generateHda = useCallback(() => {
        return sintomasOptions
            .filter(opt => sintomasConsulta[opt.id]) 
            .map(opt => sintomaTemplates[opt.id])
            .join('\n');
    }, [sintomasConsulta]); // Depende apenas dos sintomas da consulta

    // REESCRITO PARA SISTEMA HÍBRIDO (Rádios + Checkboxes)
    const generateExameFisico = useCallback(() => {
        let texto = `Dados Vitais:\nPeso: ${exameFisicoData.peso || '___'} kg\nAltura: ${exameFisicoData.altura || '___'} cm\nPC: ${exameFisicoData.pc || '___'} cm\nT: ${exameFisicoData.temperatura || '___'} °C\n\nExame Físico:\n`;

        // 1. Gera texto dos RadioGroups
        const radioAchados = exameFisicoRadioGroups.map(group => {
            const selectedValue = exameFisicoData[group.id]; // Ex: 'BEG'
            if (!selectedValue) return null;
            
            const selectedOption = group.options.find(opt => opt.value === selectedValue);
            return selectedOption ? selectedOption.template : ''; // Ex: 'BEG (Bom Estado Geral).'
        }).filter(Boolean).join(" ");

        // 2. Gera texto dos Checkboxes (lógica restante)
        const checkboxAchados = exameFisicoQualitativoOptions
            .filter(opt => exameFisicoData[opt.id]) // Filtra os checkboxes marcados
            .map(opt => opt.template)
            .join(" ");

        return texto + [radioAchados, checkboxAchados].filter(Boolean).join(" ") || "Nenhuma observação selecionada.";
    }, [exameFisicoData]); // Depende apenas do exameFisicoData

    // Efeitos que ATUALIZAM o SOAP (Sem alteração)
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


    // --- 5. HANDLERS (Sem alteração, já são compatíveis) ---
    const handleTabChange = (event, newIndex) => {
        setTabIndex(newIndex);
    };

    const handleSoapChange = (e) => {
        setSoapData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSintomasChange = (event) => {
        const { name, checked } = event.target;
        setSintomasConsulta(prev => ({ ...prev, [name]: checked }));
    };

    // Esta função JÁ SUPORTA Rádios (value) e Checkboxes (checked)
    const handleExameChange = (event) => {
        const { name, value, type, checked } = event.target;
        setExameFisicoData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };
    
    // 6. preencherNormalidade REESCRITO PARA SISTEMA HÍBRIDO FINAL
    const preencherNormalidade = () => {
        setSintomasConsulta({});
        setExameFisicoData(prev => ({
            ...prev, // Mantém peso/altura/pc/temp digitados
            
            // --- CAMPOS DE RÁDIO (Normalidade) ---
            estado_geral: 'BEG',
            cor_pele: 'Corado',
            hidratacao: 'Hidratado',
            estado_febril: 'Afebril',
            cianose: 'Acianotico',
            ictericia: 'Anicterico',
            atividade: 'Ativo',
            reatividade: 'Reativo',
            fontanelas: 'Normo',
            suturas: 'Normais',
            olhos_estado: 'Normal',
            olhos_secrecao: 'Sem',
            otoscopia: 'Normal',
            otorreia: 'Nao',
            linfonodos: 'Ausentes',
            respiratorio_estado: 'Eupneico',
            cardio_sopros: 'Sem',

            // --- CAMPOS DE CHECKBOX (Normalidade) ---
            reflexo_vermelho_presente: true,
            narinas_permeaveis: true,
            oroscopia_normal: true,
            pescoco_livre: true,
            ar_mv_presente: true,
            acv_brnf: true,
            pulsos_cheios: true,
            abdome_flacido: true,
            sem_visceromegalias: true,
            genitalia_masc_normal: true, 
            genitalia_fem_normal: true, 
            perineo_integro: true, 
            coluna_sem_desvios: true, 
            membros_normais: true, 
            ortolani_negativo: true,
            neuro_normal_idade: true, 
            reflexos_primitivos_presentes: true, 
            tonus_normal: true,

            // --- LIMPAR CHECKBOXES DE ALTERAÇÃO ---
            reflexo_vermelho_ausente: false,
            narinas_obstruidas: false, oroscopia_hiperemia: false, oroscopia_placas: false,
            ar_roncos: false, ar_sibilos: false, ar_creptos: false,
            abdome_doloroso: false, abdome_distendido: false,
            genitalia_alterada: false,
            hipotonia_hipertonia: false,
        }));
        
        // ATUALIZAR O TEXTO GERADO
        setSoapData(prev => ({
            ...prev,
            notas_subjetivas: 'Mãe nega queixas. Criança ativa, reativa, alimentando-se bem (SME), diurese e evacuações presentes.',
            // Template de normalidade completo e atualizado
            notas_objetivas: `Dados Vitais:\nPeso: ${exameFisicoData.peso || '___'} kg\nAltura: ${exameFisicoData.altura || '___'} cm\nPC: ${exameFisicoData.pc || '___'} cm\nT: ${exameFisicoData.temperatura || '___'} °C\n\nExame Físico:\nBEG (Bom Estado Geral). Corado. Hidratado. Afebril ao toque. Acianótico. Anictérico. Ativo. Reativo. Fontanela anterior normotensa. Suturas cranianas normais. Olhos sem alterações, pupilas isocóricas e fotorreagentes. Conjuntivas coradas. Sem secreção ocular. Reflexo vermelho presente bilateralmente. Otoscopia: Membranas timpânicas íntegras, translúcidas. Ausência de otorreia. Narinas pérvias, sem secreção. Oroscopia sem alterações. Pescoço livre, sem massas ou rigidez. Linfonodos não palpáveis. Eupneico, FR=___. AR: MV presente universalmente, sem ruídos adventícios. ACV: BRNF em 2T. Sem sopros. Pulsos periféricos cheios e simétricos. Abdome: Flácido, indolor à palpação, RHA+. Sem visceromegalias palpáveis. Genitália masculina tópica, testículos em bolsa. Genitália feminina tópica, sem alterações. Região perineal íntegra, sem hiperemia ou lesões. Coluna vertebral sem desvios aparentes. Membros superiores e inferiores sem deformidades ou edema. Mobilidade preservada. Manobra de Ortolani negativa. Neurológico: Tônus e reflexos normais para a idade. Reflexos primitivos (Moro, sucção, preensão) presentes. Tônus muscular normal.`,
            avaliacao: 'Criança hígida, sem sinais de alarme. Desenvolvimento adequado para a idade.',
            plano: 'Sigo com orientações gerais, manutenção do aleitamento materno. Alta da consulta.'
        }));
    };

     // handleLimparConsultaAtual (Limpa Rádios e Checkboxes)
    const handleLimparConsultaAtual = () => {
        setSintomasConsulta({});
        // Limpa exame físico, mas mantém vitais pré-carregados
        setExameFisicoData(prev => ({ peso: prev.peso, altura: prev.altura }));
        setSoapData({
            notas_subjetivas: '',
            // Template inicial só com vitais
            notas_objetivas: `Dados Vitais:\nPeso: ${exameFisicoData.peso || '___'} kg\nAltura: ${exameFisicoData.altura || '___'} cm\nPC: ${exameFisicoData.pc || '___'} cm\nT: ${exameFisicoData.temperatura || '___'} °C\n\nExame Físico:\n`,
            avaliacao: '',
            plano: ''
        });
        showSnackbar('Campos da consulta atual limpos.', 'info');
    };
    
    // 7. SUBMIT (Sem alteração, já é compatível)
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        
        const vitaisData = {
            peso: exameFisicoData.peso || null,
            altura: exameFisicoData.altura || null,
        };

        // Salva Evolução (SOAP)
        try {
            // soapData já é atualizado pelo useEffect/generateExameFisico
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes/`, soapData);
            showSnackbar('Evolução salva com sucesso!', 'success');
            if(onEvolucoesSalva) onEvolucoesSalva(); // Atualiza a lista de evoluções
        } catch (error) {
            console.error("Erro ao salvar evolução:", error.response?.data || error);
            showSnackbar('Erro ao salvar evolução.', 'error');
            setIsSubmitting(false);
            return;
        }
        
        // Atualiza Vitais do Paciente
        try {
            await apiClient.patch(`/pacientes/${pacienteId}/`, vitaisData);
            showSnackbar('Peso e Altura do paciente atualizados.', 'info');
        } catch (error) {
             console.error("Erro ao atualizar vitais:", error.response?.data || error);
             showSnackbar('Erro ao atualizar peso/altura do paciente.', 'error');
        } finally {
            setIsSubmitting(false);
            // Limpa os campos da consulta atual para o próximo atendimento
            handleLimparConsultaAtual();
        }
    };


    // --- 8. JSX ATUALIZADO COM RENDERIZAÇÃO HÍBRIDA ---
    return (
        <Paper sx={{ mb: 2, overflow: 'hidden' }}>
            
            {/* --- CABEÇALHO --- */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 0 }}>
                <Typography variant="h6" gutterBottom> Atendimento Pediátrico </Typography>
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
                            {/* Renderiza os sintomas atualizados */}
                            {sintomasOptions.map(opt => ( 
                                <FormControlLabel key={opt.id} control={<Checkbox size="small" checked={sintomasConsulta[opt.id] || false} onChange={handleSintomasChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
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

                        {/* RENDERIZAÇÃO HÍBRIDA DO EXAME FÍSICO */}
                        <FormGroup sx={{ p: 1.5, border: '1px solid #ddd', borderRadius: 1 }}>
                            
                            {/* --- NOVOS GRUPOS DE RÁDIO (Layout em 2 colunas) --- */}
                            <Grid container spacing={1.5}>
                                {exameFisicoRadioGroups.map(group => (
                                    <Grid item xs={12} sm={6} md={4} key={group.id}>
                                        <FormControl component="fieldset" size="small" fullWidth>
                                            <FormLabel component="legend" sx={{fontSize: '0.9rem', fontWeight: 'medium'}}>{group.label}</FormLabel>
                                            <RadioGroup
                                                row
                                                name={group.id}
                                                value={exameFisicoData[group.id] || ''}
                                                onChange={handleExameChange}
                                            >
                                                {group.options.map(opt => (
                                                    <FormControlLabel 
                                                        key={opt.value} 
                                                        value={opt.value} 
                                                        control={<Radio size="small" />} 
                                                        label={<Typography variant="body2">{opt.label}</Typography>}
                                                        sx={{mr: 1}}
                                                    />
                                                ))}
                                            </RadioGroup>
                                        </FormControl>
                                    </Grid>
                                ))}
                            </Grid>

                            <Divider sx={{ my: 1.5 }} />

                            {/* --- CHECKBOXES RESTANTES (AGRUPADOS) --- */}
                            {/* Grupo Olhos (Achados) */}
                           <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                               <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Olhos (Achados):</Typography>
                               {exameFisicoQualitativoOptions.filter(o=>o.group === 'olhos').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                               ))}
                           </Box>
                            {/* Grupo ORL (Achados) */}
                           <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                               <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Nariz / Boca:</Typography>
                               {exameFisicoQualitativoOptions.filter(o=>o.group === 'orl').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                               ))}
                           </Box>
                           {/* Grupo Pescoço (Achados) */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                               <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Pescoço (Achados):</Typography>
                               {exameFisicoQualitativoOptions.filter(o=>o.group === 'pescoco').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                               ))}
                           </Box>
                            {/* Grupo Respiratório (Achados) */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                               <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Respiratório (Achados):</Typography>
                               {exameFisicoQualitativoOptions.filter(o=>o.group === 'respiratorio').map(opt => (
                                   <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                               ))}
                           </Box>
                           {/* Grupo Cardíaco (Achados) */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                               <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Cardiovascular (Achados):</Typography>
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
                               <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Neurológico (Achados):</Typography>
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