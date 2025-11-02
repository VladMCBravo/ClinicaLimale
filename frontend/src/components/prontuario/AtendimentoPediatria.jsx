// src/components/prontuario/AtendimentoPediatria.jsx - VERSÃO FINAL (Tudo ComboBox)

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import {
    Paper, Typography, Grid, FormGroup, FormControlLabel, Checkbox, TextField, Divider,
    Box, Button, CircularProgress, Tabs, Tab,
    // 1. IMPORTAÇÕES ATUALIZADAS PARA MULTI-SELECT
    FormControl, InputLabel, Select, MenuItem, OutlinedInput, Chip
} from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

// --- IMPORTAR AS ABAS COM LAZY LOADING ---
const HistoricoPediatrico = lazy(() => import('./pediatria/HistoricoPediatrico'));
const DnpmDetalhado = lazy(() => import('./pediatria/DnpmDetalhado'));
const VacinacaoTab = lazy(() => import('./pediatria/VacinacaoTab'));

// --- OPÇÕES E TEMPLATES DE SINTOMAS (Sem alterações) ---
const sintomasOptions = [
    { id: 'febre', label: 'Febre' }, { id: 'tosse', label: 'Tosse' }, { id: 'coriza', label: 'Coriza' },
    { id: 'vomitos', label: 'Vômitos' }, { id: 'diarreia', label: 'Diarreia' }, { id: 'irritabilidade', label: 'Irritabilidade / Choro' },
    { id: 'prostracao', label: 'Prostração / Sonolência' }, { id: 'exantema', label: 'Exantema (Manchas)' },
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
    dor_abdominal: "Dor abdominal: Início há X dias, (cólica/pontada), (localização).",
    perda_apetite: "Redução da ingesta alimentar (hiporexia/anorexia) há X dias.",
    cansaco_dispneia: "Relato de cansaço / dispneia aos esforços.",
};
// --- FIM OPÇÕES E TEMPLATES ---

// --- 2. EXAME FÍSICO (TOTALMENTE REESTRUTURADO) ---

// GRUPOS DE SELEÇÃO ÚNICA (Single-Select ComboBox)
const exameFisicoSelectGroups = [
    // --- GERAL / PELE ---
    { id: 'estado_geral', label: 'Estado Geral', options: [{ value: 'BEG', label: 'BEG', template: 'BEG (Bom Estado Geral).' },{ value: 'REG', label: 'REG', template: 'REG (Regular Estado Geral).' },{ value: 'MEG', label: 'MEG', template: 'MEG (Mau Estado Geral).' }] },
    { id: 'cor_pele', label: 'Coloração', options: [{ value: 'Pletorico', label: 'Pletórico', template: 'Pletórico.' },{ value: 'Corado', label: 'Corado', template: 'Corado.' },{ value: 'Descorado', label: 'Descorado', template: 'Descorado (+/4+).' }] },
    { id: 'hidratacao', label: 'Hidratação', options: [{ value: 'Hidratado', label: 'Hidratado', template: 'Hidratado.' },{ value: 'Desidratado', label: 'Desidratado', template: 'Desidratado (+/4+).' },{ value: 'Edemaciado', label: 'Edemaciado', template: 'Edemaciado (+/4+).' },{ value: 'Anasarca', label: 'Anasarca', template: 'Anasarca.' }] },
    { id: 'estado_febril', label: 'Temperatura', options: [{ value: 'Afebril', label: 'Afebril', template: 'Afebril ao toque.' },{ value: 'Febril', label: 'Febril', template: 'Febril ao toque.' },{ value: 'Hipotermico', label: 'Hipotérmico', template: 'Hipotérmico ao toque.' }] },
    { id: 'cianose', label: 'Cianose', options: [{ value: 'Acianotico', label: 'Acianótico', template: 'Acianótico.' },{ value: 'Cianotico', label: 'Cianótico', template: 'Cianótico (Central/Periférico).' }] },
    { id: 'ictericia', label: 'Icterícia', options: [{ value: 'Anicterico', label: 'Anictérico', template: 'Anictérico.' },{ value: 'Icterico', label: 'Ictérico', template: 'Ictérico (Zona ___/ Kramer).' }] },
    // --- NEUROLÓGICO (ESTADO) ---
     { id: 'atividade', label: 'Atividade', options: [{ value: 'Ativo', label: 'Ativo', template: 'Ativo.' },{ value: 'Hipoativo', label: 'Hipoativo', template: 'Hipoativo.' },{ value: 'Hiperativo', label: 'Hiperativo', template: 'Hiperativo.' }] },
    { id: 'reatividade', label: 'Reatividade', options: [{ value: 'Reativo', label: 'Reativo', template: 'Reativo.' },{ value: 'Hiporeativo', label: 'Hiporeativo', template: 'Hiporeativo.' },{ value: 'Hipereativo', label: 'Hipereativo', template: 'Hipereativo.' }] },
    // --- CABEÇA ---
    { id: 'fontanelas', label: 'Fontanela Anterior', options: [{ value: 'Normo', label: 'FA Normotensa', template: 'Fontanela anterior normotensa.' },{ value: 'Abaulada', label: 'FA Abaulada', template: 'Fontanela anterior abaulada.' },{ value: 'Deprimida', label: 'FA Deprimida', template: 'Fontanela anterior deprimida.' }] },
    { id: 'suturas', label: 'Suturas', options: [{ value: 'Normais', label: 'Normais', template: 'Suturas cranianas normais.' },{ value: 'Acavalgadas', label: 'Acavalgadas', template: 'Suturas cranianas acavalgadas.' },{ value: 'Diastase', label: 'Diástase', template: 'Diástase de suturas.' }] },
    // --- OLHOS ---
    { id: 'olhos_estado', label: 'Olhos (Estado)', options: [{ value: 'Normal', label: 'Normal', template: 'Olhos sem alterações, pupilas isocóricas e fotorreagentes. Conjuntivas coradas.' },{ value: 'Hiperemia', label: 'Hiperemia Ocular', template: 'Hiperemia conjuntival.' }] },
    { id: 'olhos_secrecao', label: 'Secreção Ocular', options: [{ value: 'Sem', label: 'Sem secreção', template: 'Sem secreção ocular.' },{ value: 'Com', label: 'Com secreção', template: 'Presença de secreção ocular (amarela/esverdeada/clara).' }] },
    // --- ORL ---
    { id: 'otoscopia', label: 'Otoscopia', options: [{ value: 'Normal', label: 'Normal', template: 'Otoscopia: Membranas timpânicas íntegras, translúcidas.' },{ value: 'HiperemiaSem', label: 'Hiperemia s/ Abaulamento', template: 'Otoscopia: Hiperemia de MT, sem abaulamento.' },{ value: 'HiperemiaCom', label: 'Hiperemia c/ Abaulamento', template: 'Otoscopia: Hiperemia e abaulamento de MT.' }] },
    { id: 'otorreia', label: 'Otorreia', options: [{ value: 'Nao', label: 'Não', template: 'Ausência de otorreia.' },{ value: 'Sim', label: 'Sim', template: 'Presença de otorreia.' }] },
    // --- PESCOÇO ---
    { id: 'linfonodos', label: 'Linfonodos', options: [{ value: 'Ausentes', label: 'Ausentes', template: 'Linfonodos não palpáveis.' },{ value: 'Presentes', label: 'Presentes', template: 'Linfonodos palpáveis em cadeias ___ (tamanho, consistência).' }] },
    // --- RESPIRATÓRIO ---
    { id: 'respiratorio_estado', label: 'Padrão Respiratório', options: [{ value: 'Eupneico', label: 'Eupneico', template: 'Eupneico, FR=___.' },{ value: 'Dispneico', label: 'Dispneico', template: 'Dispneico (FR=___), esforço respiratório.' },{ value: 'Taquipneico', label: 'Taquipneico/Tiragem', template: 'Taquipneico (FR=___), com tiragem ___.' }] },
    // --- CARDIOVASCULAR ---
    { id: 'cardio_sopros', label: 'Sopros Cardíacos', options: [{ value: 'Sem', label: 'Sem sopros', template: 'Sem sopros.' },{ value: 'Com', label: 'Com sopros', template: 'ACV: Sopro ___ /6+ em foco ___.' }] }
];

// GRUPOS DE SELEÇÃO MÚLTIPLA (Multi-Select ComboBox)
const exameFisicoMultiSelectGroups = [
    { 
        id: 'olhos_achados', 
        label: 'Olhos (Achados)', 
        options: [
            { id: 'reflexo_vermelho_presente', label: 'Reflexo Vermelho +' },
            { id: 'reflexo_vermelho_ausente', label: 'Reflexo Vermelho -' }
        ] 
    },
    { 
        id: 'orl_achados', 
        label: 'Nariz / Boca', 
        options: [
            { id: 'narinas_permeaveis', label: 'Narinas Permeáveis' },
            { id: 'narinas_obstruidas', label: 'Narinas Obstruídas' },
            { id: 'oroscopia_normal', label: 'Oroscopia Normal' },
            { id: 'oroscopia_hiperemia', label: 'Oroscopia Hiperemia' },
            { id: 'oroscopia_placas', label: 'Oroscopia Placas' }
        ] 
    },
    { 
        id: 'pescoco_achados', 
        label: 'Pescoço (Achados)', 
        options: [
            { id: 'pescoco_livre', label: 'Livre/Indolor' }
        ] 
    },
    { 
        id: 'respiratorio_achados', 
        label: 'Respiratório (Achados)', 
        options: [
            { id: 'ar_mv_presente', label: 'MV presente s/ RA' },
            { id: 'ar_roncos', label: 'Roncos' },
            { id: 'ar_sibilos', label: 'Sibilos' },
            { id: 'ar_creptos', label: 'Estertores Creptantes' }
        ] 
    },
    { 
        id: 'cardiaco_achados', 
        label: 'Cardiovascular (Achados)', 
        options: [
            { id: 'acv_brnf', label: 'BRNF 2T' },
            { id: 'pulsos_cheios', label: 'Pulsos Cheios/Simétricos' }
        ] 
    },
    { 
        id: 'abdome_achados', 
        label: 'Abdome', 
        options: [
            { id: 'abdome_flacido', label: 'Flácido/Indolor' },
            { id: 'abdome_doloroso', label: 'Doloroso' },
            { id: 'abdome_distendido', label: 'Distendido' },
            { id: 'sem_visceromegalias', label: 'S/ Visceromegalias' }
        ] 
    },
    { 
        id: 'genitalia_achados', 
        label: 'Genitália / Períneo', 
        options: [
            { id: 'genitalia_masc_normal', label: 'Gen Masc Normal' },
            { id: 'genitalia_fem_normal', label: 'Gen Fem Normal' },
            { id: 'genitalia_alterada', label: 'Gen Alterada' },
            { id: 'perineo_integro', label: 'Períneo Íntegro' }
        ] 
    },
    { 
        id: 'membros_achados', 
        label: 'Coluna / Membros', 
        options: [
            { id: 'coluna_sem_desvios', label: 'Coluna s/ Desvios' },
            { id: 'membros_normais', label: 'MMSS/MMII Normais' },
            { id: 'ortolani_negativo', label: 'Ortolani Negativo' }
        ] 
    },
    { 
        id: 'neuro_achados', 
        label: 'Neurológico (Achados)', 
        options: [
            { id: 'neuro_normal_idade', label: 'Normal p/ Idade (Reflexos/Tônus)' },
            { id: 'reflexos_primitivos_presentes', label: 'Reflexos Primitivos +' },
            { id: 'tonus_normal', label: 'Tônus Normal' },
            { id: 'hipotonia_hipertonia', label: 'Hipo/Hipertonia' }
        ] 
    }
];

// Dicionário de templates para os Multi-Selects (para gerar o texto)
const multiSelectTemplates = {
    'reflexo_vermelho_presente': "Reflexo vermelho presente bilateralmente.",
    'reflexo_vermelho_ausente': "Reflexo vermelho ausente em ___.",
    'narinas_permeaveis': "Narinas pérvias, sem secreção.",
    'narinas_obstruidas': "Obstrução nasal / Coriza ___.",
    'oroscopia_normal': "Oroscopia sem alterações.",
    'oroscopia_hiperemia': "Oroscopia: Hiperemia de orofaringe.",
    'oroscopia_placas': "Oroscopia: Hiperemia com placas purulentas em amígdalas.",
    'pescoco_livre': "Pescoço livre, sem massas ou rigidez.",
    'ar_mv_presente': "AR: MV presente universalmente, sem ruídos adventícios.",
    'ar_roncos': "AR: Roncos difusos.",
    'ar_sibilos': "AR: Sibilos difusos.",
    'ar_creptos': "AR: Estertores creptantes em ___.",
    'acv_brnf': "ACV: BRNF em 2T.",
    'pulsos_cheios': "Pulsos periféricos cheios e simétricos.",
    'abdome_flacido': "Abdome: Flácido, indolor à palpação, RHA+.",
    'abdome_doloroso': "Abdome: Doloroso à palpação em ___.",
    'abdome_distendido': "Abdome: Distendido, timpânico.",
    'sem_visceromegalias': "Sem visceromegalias palpáveis.",
    'genitalia_masc_normal': "Genitália masculina tópica, testículos em bolsa.",
    'genitalia_fem_normal': "Genitália feminina tópica, sem alterações.",
    'genitalia_alterada': "Genitália: ___ (descrever).",
    'perineo_integro': "Região perineal íntegra, sem hiperemia ou lesões.",
    'coluna_sem_desvios': "Coluna vertebral sem desvios aparentes.",
    'membros_normais': "Membros superiores e inferiores sem deformidades ou edema. Mobilidade preservada.",
    'ortolani_negativo': "Manobra de Ortolani negativa.",
    'neuro_normal_idade': "Neurológico: Tônus e reflexos normais para a idade.",
    'reflexos_primitivos_presentes': "Reflexos primitivos (Moro, sucção, preensão) presentes.",
    'tonus_normal': "Tônus muscular normal.",
    'hipotonia_hipertonia': "Hipotonia / Hipertonia."
};

// Dicionário para buscar o label de um multi-select (usado para renderizar os Chips)
const allMultiSelectOptions = new Map(
    exameFisicoMultiSelectGroups.flatMap(g => g.options.map(o => [o.id, o.label]))
);
// --- FIM EXAME FÍSICO ---


// --- TABPANEL (Sem alterações) ---
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            style={{ display: value !== index ? 'none' : 'block' }} 
            hidden={value !== index}
            id={`pediatria-tabpanel-${index}`}
            aria-labelledby={`pediatria-tab-${index}`}
            {...other}
        >
            <Box sx={{ p: { xs: 1, sm: 2 } }}>
                {children}
            </Box>
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

    // --- useEffect de carregamento (Sem alterações) ---
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
        setSoapData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
        setSintomasConsulta({});
        setExameFisicoData(prev => ({ peso: prev.peso, altura: prev.altura })); 
        setTabIndex(0); 
    }, [pacienteId]);


    // --- 3. GERADORES DE TEXTO (ATUALIZADOS) ---
    const generateHda = useCallback(() => {
        return sintomasOptions
            .filter(opt => sintomasConsulta[opt.id]) 
            .map(opt => sintomaTemplates[opt.id])
            .join('\n');
    }, [sintomasConsulta]);

    // ATUALIZADO para ler Selects e Multi-Selects
    const generateExameFisico = useCallback(() => {
        let texto = `Dados Vitais:\nPeso: ${exameFisicoData.peso || '___'} kg\nAltura: ${exameFisicoData.altura || '___'} cm\nPC: ${exameFisicoData.pc || '___'} cm\nT: ${exameFisicoData.temperatura || '___'} °C\n\nExame Físico:\n`;

        // 1. Gera texto dos Selects (Single-Select)
        const selectAchados = exameFisicoSelectGroups.map(group => {
            const selectedValue = exameFisicoData[group.id]; // Ex: 'BEG'
            if (!selectedValue) return null;
            
            const selectedOption = group.options.find(opt => opt.value === selectedValue);
            return selectedOption ? selectedOption.template : ''; // Ex: 'BEG (Bom Estado Geral).'
        }).filter(Boolean).join(" ");

        // 2. Gera texto dos Multi-Selects
        const multiSelectAchados = exameFisicoMultiSelectGroups.flatMap(group => {
            const selectedValues = exameFisicoData[group.id]; // Ex: ['narinas_permeaveis', 'oroscopia_normal']
            if (!selectedValues || selectedValues.length === 0) return [];
            
            // Mapeia cada valor (id) para seu template
            return selectedValues.map(valueId => multiSelectTemplates[valueId]);
        }).filter(Boolean).join(" ");


        return texto + [selectAchados, multiSelectAchados].filter(Boolean).join(" ") || "Nenhuma observação selecionada.";
    }, [exameFisicoData]);

    // --- useEffects de atualização (Sem alterações) ---
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


    // --- 4. HANDLERS (ATUALIZADOS) ---
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

    // ATUALIZADO: Este handler agora suporta <Select multiple>
    const handleExameChange = (event) => {
        const { name, value, type, checked } = event.target;

        if (type === 'checkbox') {
            // Lógica antiga para Checkboxes (se ainda houver algum)
             setExameFisicoData(prev => ({
                ...prev,
                [name]: checked
            }));
        } else {
            // Lógica para <Select> (single) e <Select multiple>
            // O 'value' do <Select multiple> já é um array!
             setExameFisicoData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };
    
    // --- 5. preencherNormalidade (ATUALIZADO) ---
    // Atualizado para setar os novos estados (arrays) dos Multi-Selects
    const preencherNormalidade = () => {
        setSintomasConsulta({});
        setExameFisicoData(prev => ({
            ...prev,
            // --- Campos de Select (Single) ---
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

            // --- Campos de Select (Multi) ---
            olhos_achados: ['reflexo_vermelho_presente'],
            orl_achados: ['narinas_permeaveis', 'oroscopia_normal'],
            pescoco_achados: ['pescoco_livre'],
            respiratorio_achados: ['ar_mv_presente'],
            cardiaco_achados: ['acv_brnf', 'pulsos_cheios'],
            abdome_achados: ['abdome_flacido', 'sem_visceromegalias'],
            genitalia_achados: ['genitalia_masc_normal', 'perineo_integro'], // Exemplo, pode ser os 2
            membros_achados: ['coluna_sem_desvios', 'membros_normais', 'ortolani_negativo'],
            neuro_achados: ['neuro_normal_idade', 'reflexos_primitivos_presentes', 'tonus_normal'],
        }));
        
        // Texto gerado (sem alterações, a lógica de geração já foi atualizada)
        setSoapData(prev => ({
            ...prev,
            notas_subjetivas: 'Mãe nega queixas. Criança ativa, reativa, alimentando-se bem (SME), diurese e evacuações presentes.',
            notas_objetivas: `Dados Vitais:\nPeso: ${exameFisicoData.peso || '___'} kg\nAltura: ${exameFisicoData.altura || '___'} cm\nPC: ${exameFisicoData.pc || '___'} cm\nT: ${exameFisicoData.temperatura || '___'} °C\n\nExame Físico:\nBEG (Bom Estado Geral). Corado. Hidratado. Afebril ao toque. Acianótico. Anictérico. Ativo. Reativo. Fontanela anterior normotensa. Suturas cranianas normais. Olhos sem alterações, pupilas isocóricas e fotorreagentes. Conjuntivas coradas. Sem secreção ocular. Reflexo vermelho presente bilateralmente. Otoscopia: Membranas timpânicas íntegras, translúcidas. Ausência de otorreia. Narinas pérvias, sem secreção. Oroscopia sem alterações. Pescoço livre, sem massas ou rigidez. Linfonodos não palpáveis. Eupneico, FR=___. AR: MV presente universalmente, sem ruídos adventícios. ACV: BRNF em 2T. Sem sopros. Pulsos periféricos cheios e simétricos. Abdome: Flácido, indolor à palpação, RHA+. Sem visceromegalias palpáveis. Genitália masculina tópica, testículos em bolsa. Região perineal íntegra, sem hiperemia ou lesões. Coluna vertebral sem desvios aparentes. Membros superiores e inferiores sem deformidades ou edema. Mobilidade preservada. Manobra de Ortolani negativa. Neurológico: Tônus e reflexos normais para a idade. Reflexos primitivos (Moro, sucção, preensão) presentes. Tônus muscular normal.`,
            avaliacao: 'Criança hígida, sem sinais de alarme. Desenvolvimento adequado para a idade.',
            plano: 'Sigo com orientações gerais, manutenção do aleitamento materno. Alta da consulta.'
        }));
    };

     // --- handleLimparConsultaAtual (ATUALIZADO) ---
    const handleLimparConsultaAtual = () => {
        setSintomasConsulta({});
        // Limpa exame físico, mas mantém vitais pré-carregados
        setExameFisicoData(prev => ({ 
            peso: prev.peso, 
            altura: prev.altura, 
            pc: prev.pc, 
            temperatura: prev.temperatura 
        }));
        setSoapData({
            notas_subjetivas: '',
            notas_objetivas: `Dados Vitais:\nPeso: ${exameFisicoData.peso || '___'} kg\nAltura: ${exameFisicoData.altura || '___'} cm\nPC: ${exameFisicoData.pc || '___'} cm\nT: ${exameFisicoData.temperatura || '___'} °C\n\nExame Físico:\n`,
            avaliacao: '',
            plano: ''
        });
        showSnackbar('Campos da consulta atual limpos.', 'info');
    };
    
    // --- SUBMIT (Sem alterações) ---
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        const vitaisData = { 
            peso: exameFisicoData.peso || null, 
            altura: exameFisicoData.altura || null,
            // Adicione PC e Temp se precisar salvar no paciente
        };
        try {
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes/`, soapData);
            showSnackbar('Evolução salva com sucesso!', 'success');
            if(onEvolucoesSalva) onEvolucoesSalva();
        } catch (error) {
            console.error("Erro ao salvar evolução:", error.response?.data || error);
            showSnackbar('Erro ao salvar evolução.', 'error');
            setIsSubmitting(false);
            return;
        }
        try {
            await apiClient.patch(`/pacientes/${pacienteId}/`, vitaisData);
            showSnackbar('Peso e Altura do paciente atualizados.', 'info');
        } catch (error) {
             console.error("Erro ao atualizar vitais:", error.response?.data || error);
             showSnackbar('Erro ao atualizar peso/altura do paciente.', 'error');
        } finally {
            setIsSubmitting(false);
            handleLimparConsultaAtual();
        }
    };


    // --- 6. JSX ATUALIZADO (Totalmente baseado em ComboBoxes) ---
    return (
        <Paper sx={{ mb: 2, overflow: 'hidden' }}>
            
            {/* --- CABEÇALHO (Sem alterações) --- */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 0 }}>
                <Typography variant="h6" gutterBottom> Atendimento Pediátrico </Typography>
                {tabIndex === 0 && (
                    <Button variant="outlined" size="small" onClick={preencherNormalidade}> Preencher Normalidade </Button>
                )}
            </Box>

            {/* --- NAVEGAÇÃO DAS ABAS (Sem alterações) --- */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                <Tabs value={tabIndex} onChange={handleTabChange} aria-label="Abas do prontuário pediátrico" variant="scrollable" scrollButtons="auto">
                    <Tab label="Consulta Atual" id="pediatria-tab-0" />
                    <Tab label="Histórico" id="pediatria-tab-1" />
                    <Tab label="DNPM" id="pediatria-tab-2" />
                    <Tab label="Vacinação" id="pediatria-tab-3" />
                </Tabs>
            </Box>

            {/* --- CONTEÚDO DAS ABAS (Sem alterações) --- */}
            <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
                
                {/* ABA 1: CONSULTA ATUAL (SOAP) */}
                <TabPanel value={tabIndex} index={0}>
                    <Paper variant="outlined" sx={{ p: 2, borderColor: 'primary.main' }}>
                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Consulta Atual (SOAP)</Typography>
                        
                        {/* Queixa Atual (S) (Sem alterações) */}
                        <Typography variant="body1" sx={{ mt: 1, fontWeight: 'medium' }}>Queixa Atual (S)</Typography>
                        <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 1, p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                            {sintomasOptions.map(opt => ( 
                                <FormControlLabel key={opt.id} control={<Checkbox size="small" checked={sintomasConsulta[opt.id] || false} onChange={handleSintomasChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                            ))}
                        </FormGroup>
                        <TextField name="notas_subjetivas" label="Subjetivo (HDA gerada / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_subjetivas || ''} onChange={handleSoapChange} size="small" />
                        
                        <Divider sx={{ my: 2 }} />

                        {/* Exame Físico (O) (Sem alterações nos vitais) */}
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Exame Físico (O)</Typography>
                         <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, my: 1.5 }}>
                            <TextField label="Peso (kg)" name="peso" value={exameFisicoData.peso || ''} onChange={handleExameChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '80px' }}/>
                            <TextField label="Altura (cm)" name="altura" value={exameFisicoData.altura || ''} onChange={handleExameChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '80px' }}/>
                            <TextField label="PC (cm)" name="pc" value={exameFisicoData.pc || ''} onChange={handleExameChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '80px' }}/>
                            <TextField label="T (°C)" name="temperatura" value={exameFisicoData.temperatura || ''} onChange={handleExameChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '80px' }}/>
                         </Box>

                        {/* 7. RENDERIZAÇÃO FINAL (Tudo ComboBox) */}
                        <FormGroup sx={{ p: 1.5, border: '1px solid #ddd', borderRadius: 1 }}>
                            
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                
                                {/* --- GRUPOS DE SINGLE-SELECT (ComboBox) --- */}
                                {exameFisicoSelectGroups.map(group => (
                                    <FormControl 
                                        key={group.id} 
                                        size="small" 
                                        sx={{ 
                                            minWidth: 160, // Largura mínima para legibilidade
                                            flex: '1 1 160px' // Flex grow/shrink
                                        }}
                                    >
                                        <InputLabel id={`${group.id}-select-label`}>{group.label}</InputLabel>
                                        <Select
                                            labelId={`${group.id}-select-label`}
                                            id={`${group.id}-select`}
                                            name={group.id} // Chave do estado
                                            value={exameFisicoData[group.id] || ''}
                                            label={group.label}
                                            onChange={handleExameChange}
                                        >
                                            <MenuItem value="">
                                                <em>Nenhum</em>
                                            </MenuItem>
                                            {group.options.map(opt => (
                                                <MenuItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                ))}

                                {/* --- GRUPOS DE MULTI-SELECT (ComboBox) --- */}
                                {exameFisicoMultiSelectGroups.map(group => (
                                    <FormControl 
                                        key={group.id} 
                                        size="small" 
                                        sx={{ 
                                            minWidth: 200, // Largura mínima maior
                                            flex: '1 1 200px' // Flex grow/shrink
                                        }}
                                    >
                                        <InputLabel id={`${group.id}-multi-select-label`}>{group.label}</InputLabel>
                                        <Select
                                            labelId={`${group.id}-multi-select-label`}
                                            id={`${group.id}-multi-select`}
                                            multiple
                                            name={group.id} // Chave do estado
                                            value={exameFisicoData[group.id] || []} // Estado deve ser um array
                                            onChange={handleExameChange}
                                            label={group.label}
                                            input={<OutlinedInput label={group.label} />}
                                            renderValue={(selected) => (
                                                // Renderiza os "chips"
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                    {selected.map((valueId) => (
                                                        <Chip 
                                                            key={valueId} 
                                                            label={allMultiSelectOptions.get(valueId) || valueId} 
                                                            size="small" 
                                                        />
                                                    ))}
                                                </Box>
                                            )}
                                        >
                                            {group.options.map(opt => (
                                                <MenuItem key={opt.id} value={opt.id}>
                                                    {opt.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                ))}
                            </Box>
                            
                            {/* O Divider e os Checkboxes antigos foram removidos */}

                        </FormGroup>

                        {/* Campo Objetivo (preenchido ou editado) */}
                        <TextField name="notas_objetivas" label="Objetivo (Gerado / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_objetivas || ''} onChange={handleSoapChange} size="small" sx={{mt: 1.5}}/>

                        <Divider sx={{ my: 2 }} />

                        {/* Campos Finais (A, P) e Botões (Sem alterações) */}
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

                {/* ABA 2: HISTÓRICO PEDIÁTRICO (Sem alterações) */}
                <TabPanel value={tabIndex} index={1}>
                    <HistoricoPediatrico pacienteId={pacienteId} />
                </TabPanel>

                {/* ABA 3: DNPM (Sem alterações) */}
                <TabPanel value={tabIndex} index={2}>
                    <DnpmDetalhado pacienteId={pacienteId} />
                </TabPanel>

                {/* ABA 4: VACINAÇÃO (Sem alterações) */}
                <TabPanel value={tabIndex} index={3}>
                    <VacinacaoTab pacienteId={pacienteId} />
                </TabPanel>

            </Suspense>
        </Paper>
    );
}