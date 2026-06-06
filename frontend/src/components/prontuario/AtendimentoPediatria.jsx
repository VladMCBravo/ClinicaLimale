// src/components/prontuario/AtendimentoPediatria.jsx

import React, { useState, useEffect, useCallback, Suspense, lazy, useRef } from 'react';
import {
    Typography, FormGroup, FormControlLabel, Checkbox, TextField, Divider,
    Box, Button, FormControl, InputLabel, Select, MenuItem, Chip, CircularProgress
} from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

// Importando o novo Layout Base
import LayoutEvolucaoPadrao from './LayoutEvolucaoPadrao';

// --- IMPORTAR AS ABAS COM LAZY LOADING ---
const HistoricoPediatrico = lazy(() => import('./pediatria/HistoricoPediatrico'));
const DnpmDetalhado = lazy(() => import('./pediatria/DnpmDetalhado'));
const VacinacaoTab = lazy(() => import('./pediatria/VacinacaoTab'));

// --- CONSTANTES MANTIDAS INTACTAS ---
const sintomasOptions = [
    { id: 'febre', label: 'Febre' }, { id: 'tosse', label: 'Tosse' }, { id: 'coriza', label: 'Coriza' },
    { id: 'vomitos', label: 'Vômitos' }, { id: 'diarreia', label: 'Diarreia' }, { id: 'irritabilidade', label: 'Irritabilidade / Choro' },
    { id: 'prostracao', label: 'Prostração / Sonolência' }, { id: 'exantema', label: 'Exantema (Manchas)' },
    { id: 'dor_abdominal', label: 'Dor abdominal' }, { id: 'perda_apetite', label: 'Perda de apetite' },
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

const exameFisicoSelectGroups = [
    // --- GERAL ---
    { id: 'estado_geral', label: 'Estado Geral', options: [{ value: 'BEG', label: 'BEG', template: 'BEG (Bom Estado Geral).' },{ value: 'REG', label: 'REG', template: 'REG (Regular Estado Geral).' },{ value: 'MEG', label: 'MEG', template: 'MEG (Mau Estado Geral).' }] },
    { id: 'atividade', label: 'Atividade', options: [{ value: 'Ativo', label: 'Ativo', template: 'Ativo.' },{ value: 'Hipoativo', label: 'Hipoativo', template: 'Hipoativo.' },{ value: 'Hiperativo', label: 'Hiperativo', template: 'Hiperativo.' }] },
    { id: 'reatividade', label: 'Reatividade', options: [{ value: 'Reativo', label: 'Reativo', template: 'Reativo.' },{ value: 'Hiporeativo', label: 'Hiporeativo', template: 'Hiporeativo.' },{ value: 'Hipereativo', label: 'Hipereativo', template: 'Hipereativo.' }] },
    { id: 'cor_pele', label: 'Coloração', options: [{ value: 'Corado', label: 'Corado', template: 'Corado.' },{ value: 'Descorado', label: 'Descorado (+/4+)', template: 'Descorado (+/4+).' }, { value: 'Pletorico', label: 'Pletórico', template: 'Pletórico.' }] },
    { id: 'hidratacao', label: 'Hidratação', options: [{ value: 'Hidratado', label: 'Hidratado', template: 'Hidratado.' },{ value: 'Desidratado', label: 'Desidratado (+/4+)', template: 'Desidratado (+/4+).' },{ value: 'Edemaciado', label: 'Edemaciado (+/4+)', template: 'Edemaciado (+/4+).' },{ value: 'Anasarca', label: 'Anasarca', template: 'Anasarca.' }] },
    { id: 'estado_febril', label: 'Temperatura', options: [{ value: 'Afebril', label: 'Afebril', template: 'Afebril ao toque.' },{ value: 'Febril', label: 'Febril', template: 'Febril ao toque.' },{ value: 'Hipotermico', label: 'Hipotérmico', template: 'Hipotérmico ao toque.' }] },
    { id: 'cianose', label: 'Cianose', options: [{ value: 'Acianotico', label: 'Acianótico', template: 'Acianótico.' },{ value: 'Cianotico', label: 'Cianótico', template: 'Cianótico (Central/Periférico).' }] },
    { id: 'ictericia', label: 'Icterícia', options: [{ value: 'Anicterico', label: 'Anictérico', template: 'Anictérico.' },{ value: 'Icterico', label: 'Ictérico (+/4+)', template: 'Ictérico (Zona ___/ Kramer).' }] },
    // --- CABEÇA E PESCOÇO ---
    { id: 'fontanelas', label: 'Fontanela Anterior', options: [{ value: 'Normo', label: 'FA Normotensa', template: 'Fontanela anterior normotensa.' },{ value: 'Abaulada', label: 'FA Abaulada', template: 'Fontanela anterior abaulada.' },{ value: 'Deprimida', label: 'FA Deprimida', template: 'Fontanela anterior deprimida.' }] },
    { id: 'suturas', label: 'Suturas', options: [{ value: 'Normais', label: 'Normais', template: 'Suturas cranianas normais.' },{ value: 'Acavalgadas', label: 'Acavalgadas', template: 'Suturas cranianas acavalgadas.' },{ value: 'Diastase', label: 'Diástase', template: 'Diástase de suturas.' }] },
    { id: 'pescoco_estado', label: 'Pescoço', options: [{ value: 'Livre', label: 'Livre/Indolor', template: 'Pescoço livre, indolor, sem massas.' }, { value: 'Rigido', label: 'Rigidez Nucal', template: 'Rigidez de nuca presente.'}] },
    { id: 'linfonodos', label: 'Linfonodos', options: [{ value: 'Ausentes', label: 'Ausentes', template: 'Linfonodos não palpáveis.' },{ value: 'Presentes', label: 'Presentes', template: 'Linfonodos palpáveis em cadeias ___.' }] },
    // --- OLHOS ---
    { id: 'olhos_estado', label: 'Olhos (Estado)', options: [{ value: 'Normal', label: 'Normal', template: 'Olhos sem alterações, pupilas isocóricas e fotorreagentes. Conjuntivas coradas.' },{ value: 'Hiperemia', label: 'Hiperemia Ocular', template: 'Hiperemia conjuntival.' }] },
    { id: 'olhos_secrecao', label: 'Secreção Ocular', options: [{ value: 'Sem', label: 'Sem secreção', template: 'Sem secreção ocular.' },{ value: 'Com', label: 'Com secreção', template: 'Presença de secreção ocular (amarela/esverdeada/clara).' }] },
    { id: 'reflexo_vermelho', label: 'Reflexo Vermelho', options: [{ value: 'Presente', label: 'Presente', template: 'Reflexo vermelho presente bilateralmente.'}, { value: 'Ausente', label: 'Ausente', template: 'Reflexo vermelho ausente em ___.'}] },
    // --- OUVIDOS / NARIZ / BOCA ---
    { id: 'otoscopia', label: 'Otoscopia', options: [{ value: 'Normal', label: 'Normal', template: 'Otoscopia: Membranas timpânicas íntegras, translúcidas.' },{ value: 'HiperemiaSem', label: 'Hiperemia s/ Abaulamento', template: 'Otoscopia: Hiperemia de MT, sem abaulamento.' },{ value: 'HiperemiaCom', label: 'Hiperemia c/ Abaulamento', template: 'Otoscopia: Hiperemia e abaulamento de MT.' }] },
    { id: 'otorreia', label: 'Otorreia', options: [{ value: 'Nao', label: 'Não', template: 'Ausência de otorreia.' },{ value: 'Sim', label: 'Sim', template: 'Presença de otorreia.' }] },
    { id: 'narinas', label: 'Narinas', options: [{ value: 'Permeaveis', label: 'Permeáveis', template: 'Narinas pérvias, sem secreção.'}, { value: 'Obstruidas', label: 'Obstruídas', template: 'Obstrução nasal / Coriza ___.'}]},
    { id: 'oroscopia', label: 'Oroscopia', options: [{ value: 'Normal', label: 'Normal', template: 'Oroscopia sem alterações.'}, { value: 'Hiperemia', label: 'Hiperemia', template: 'Oroscopia: Hiperemia de orofaringe.'}, { value: 'Placas', label: 'Hiperemia c/ Placas', template: 'Oroscopia: Hiperemia com placas purulentas em amígdalas.'}]},
    // --- RESPIRATÓRIO ---
    { id: 'respiratorio_estado', label: 'Padrão Respiratório', options: [{ value: 'Eupneico', label: 'Eupneico', template: 'Eupneico, FR=___.' },{ value: 'Dispneico', label: 'Dispneico', template: 'Dispneico (FR=___), esforço respiratório.' },{ value: 'Taquipneico', label: 'Taquipneico/Tiragem', template: 'Taquipneico (FR=___), com tiragem ___.' }] },
    { id: 'mv_ausculta', label: 'Ausculta (MV)', options: [{ value: 'Presente', label: 'MV presente s/ RA', template: 'AR: MV presente universalmente, sem ruídos adventícios.'}, {value: 'Diminuido', label: 'MV diminuído', template: 'AR: MV diminuído em ___.'}]},
    { id: 'ruidos_adventicios', label: 'Ausculta (RAs)', options: [{ value: 'Nenhum', label: 'Nenhum', template: ''}, { value: 'Roncos', label: 'Roncos', template: 'AR: Roncos difusos.'}, { value: 'Sibilos', label: 'Sibilos', template: 'AR: Sibilos difusos.'}, { value: 'Creptos', label: 'Estertores Creptantes', template: 'AR: Estertores creptantes em ___.'}, { value: 'EstertoresFinos', label: 'Estertores Finos', template: 'AR: Estertores finos em ___.'}]},
    // --- CARDIOVASCULAR ---
    { id: 'ritmo_cardiaco', label: 'Ritmo Cardíaco', options: [{ value: 'BRNF', label: 'BRNF 2T', template: 'ACV: BRNF em 2T.'}, { value: 'Arritmia', label: 'Arritmia', template: 'ACV: Ritmo irregular, arrítmico.'}]},
    { id: 'cardio_sopros', label: 'Sopros Cardíacos', options: [{ value: 'Sem', label: 'Sem sopros', template: 'Sem sopros.' },{ value: 'Com', label: 'Com sopros', template: 'ACV: Sopro ___ /6+ em foco ___.' }] },
    // --- ABDOME ---
    { id: 'forma_abdome', label: 'Abdome (Forma)', options: [{ value: 'Plano', label: 'Plano', template: 'Abdome plano.'}, { value: 'Globoso', label: 'Globoso', template: 'Abdome globoso, timpânico.'}, { value: 'Distendido', label: 'Distendido', template: 'Abdome distendido.'}]},
    { id: 'rha_abdome', label: 'Abdome (RHA)', options: [{ value: 'Presente', label: 'RHA Presentes', template: 'RHA presentes.'}, { value: 'Aumentado', label: 'RHA Aumentados', template: 'RHA aumentados.'}, { value: 'Diminido', label: 'RHA Diminuídos', template: 'RHA diminuídos.'}, { value: 'Ausente', label: 'RHA Ausentes', template: 'RHA ausentes.'}]},
    { id: 'palpacao_abdome', label: 'Abdome (Palpação)', options: [{ value: 'Flacido', label: 'Flácido e Indolor', template: 'Abdome flácido, indolor à palpação.'}, { value: 'Doloroso', label: 'Doloroso', template: 'Abdome doloroso à palpação em ___.'}]},
    { id: 'visceromegalias', label: 'Abdome (Viscerom.)', options: [{ value: 'Nao', label: 'Sem visceromegalias', template: 'Sem visceromegalias palpáveis.'}, { value: 'Sim', label: 'Com visceromegalias', template: 'Visceromegalias palpáveis (descrever).'}]},
    // --- GENITÁLIA / COTO ---
    { id: 'genitalia', label: 'Genitália', options: [{ value: 'Normal', label: 'Normal/Tópica', template: 'Genitália tópica, sem alterações.'}, { value: 'Anormal', label: 'Anormal', template: 'Genitália anormal (descrever).'}]},
    { id: 'perineo', label: 'Períneo', options: [{ value: 'Integro', label: 'Íntegro', template: 'Região perineal íntegra, sem hiperemia ou lesões.'}, { value: 'Alterado', label: 'Alterado', template: 'Região perineal com ___.'}]},
    { id: 'coto_umbilical_sinais', label: 'Coto Umbilical (Sinais)', options: [{ value: 'NaoAplica', label: 'Não se aplica', template: ''}, { value: 'SemSinais', label: 'Sem sinais flogísticos', template: 'Coto umbilical sem sinais flogísticos.'}, { value: 'ComHiperemia', label: 'Com hiperemia', template: 'Coto umbilical com hiperemia/secreção.'}]},
    { id: 'coto_umbilical_aspecto', label: 'Coto Umbilical (Aspecto)', options: [{ value: 'NaoAplica', label: 'Não se aplica', template: ''}, { value: 'Geleia', label: 'Geleia', template: 'Coto umbilical de aspecto gelatinoso.'}, { value: 'Mumificado', label: 'Mumificado', template: 'Coto umbilical mumificado.'}]},
    // --- MEMBROS ---
    { id: 'membros_estado', label: 'Membros e Coluna', options: [{ value: 'Normais', label: 'Normais', template: 'Membros e coluna sem alterações. Ortolani negativo.'}, { value: 'Alterado', label: 'Alterado', template: 'Alteração em membros/coluna (descrever).'}]},
    { id: 'pulsos', label: 'Pulsos', options: [{ value: 'Presentes', label: 'Presentes/Cheios', template: 'Pulsos periféricos cheios e simétricos.'}, { value: 'Diminuidos', label: 'Diminuídos', template: 'Pulsos diminuídos.'}, { value: 'Ausentes', label: 'Ausentes', template: 'Pulsos ausentes.'}]},
    { id: 'simetria', label: 'Simetria (Membros)', options: [{ value: 'Simetricos', label: 'Simétricos', template: 'Membros simétricos.'}, { value: 'Assimetricos', label: 'Assimétricos', template: 'Membros assimétricos (descrever).'}]},
    // --- NEUROLÓGICO ---
    { id: 'neuro_tonus', label: 'Neurológico (Tônus)', options: [{ value: 'Normal', label: 'Tônus Normal', template: 'Tônus muscular normal.'}, { value: 'Hipotonia', label: 'Hipotonia', template: 'Hipotonia global.'}, { value: 'Hipertonia', label: 'Hipertonia', template: 'Hipertonia.'}]},
    { id: 'neuro_reflexos', label: 'Neurológico (Reflexos)', options: [{ value: 'Normais', label: 'Reflexos Normais', template: 'Reflexos primitivos (Moro, sucção, preensão) presentes.'}, { value: 'Anormais', label: 'Reflexos Anormais', template: 'Reflexos primitivos ausentes ou anormais.'}]},
    { id: 'sinais_meningeos', label: 'Sinais Meníngeos', options: [{ value: 'Ausentes', label: 'Ausentes', template: 'Sinais meníngeos (Kernig, Brudzinski) ausentes.'}, { value: 'Presentes', label: 'Presentes', template: 'Sinais meníngeos presentes (descrever).'}]},
];

export default function AtendimentoPediatria({ pacienteId, agendamentoId, onEvolucaoSalva }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- ESTADOS MANTIDOS INTACTOS ---
    const [sintomasConsulta, setSintomasConsulta] = useState({}); 
    const [exameFisicoData, setExameFisicoData] = useState({});
    const [soapData, setSoapData] = useState({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
    const [vacinacaoStatus, setVacinacaoStatus] = useState(null); 
    const [dnpmStatus, setDnpmStatus] = useState(null); 
    const [evolucaoIdSessao, setEvolucaoIdSessao] = useState(null);

    // --- REFS DAS ABAS FILHAS MANTIDAS INTACTAS ---
    const historicoRef = useRef(null);
    const dnpmRef = useRef(null);
    const vacinacaoRef = useRef(null);

    // --- LÓGICAS E EFEITOS MANTIDOS INTACTOS ---
    const fetchStatusResumos = useCallback(async () => {
        if (!pacienteId) {
            setVacinacaoStatus(null);
            setDnpmStatus(null);
            return;
        }
        try {
            console.log("Buscando status de DNPM e Vacinas...");
            // (Código de simulação comentado na original)
        } catch (err) {
            console.error("Erro ao buscar resumos de status", err);
        }
    }, [pacienteId]);

    useEffect(() => {
        console.log("🔥 [EFFECT] O useEffect principal foi disparado (Carregamento)");
        if (pacienteId) {
            setSoapData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
            setSintomasConsulta({});
            setExameFisicoData({}); 
            setVacinacaoStatus(null);
            setDnpmStatus(null);
            setEvolucaoIdSessao(null); 

            console.log("   -> Iniciando GET /pacientes/...");
            apiClient.get(`/pacientes/${pacienteId}/`)
                .then(res => {
                    console.log("   ✅ [API] Dados vitais recebidos.");
                    setExameFisicoData(prev => ({
                        ...prev,
                        peso: res.data.peso || '',
                        altura: res.data.altura || '',
                    }));
                    setSoapData(prev => ({
                        ...prev,
                        notas_objetivas: `Dados Vitais:\nPeso: ${res.data.peso || '___'} kg\nAltura: ${res.data.altura || '___'} cm\nPC: ${prev.pc || '___'} cm\nT: ${prev.temperatura || '___'} °C\n\nExame Físico:\n`
                    }));
                })
                .catch(err => {
                    console.error("   ❌ [API] Erro ao carregar dados do paciente:", err);
                    showSnackbar('Erro ao carregar dados vitais do paciente.', 'error');
                });
            
            fetchStatusResumos();
        } else {
            setSoapData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
            setSintomasConsulta({});
            setExameFisicoData({}); 
            setVacinacaoStatus(null);
            setDnpmStatus(null);
            setEvolucaoIdSessao(null);
        }
    }, [pacienteId, fetchStatusResumos]); 

    const generateExameFisico = useCallback((data) => {
        const currentData = data || exameFisicoData;
        let texto = `Dados Vitais:\nPeso: ${currentData.peso || '___'} kg\nAltura: ${currentData.altura || '___'} cm\nPC: ${currentData.pc || '___'} cm\nT: ${currentData.temperatura || '___'} °C\n\nExame Físico:\n`;
        const selectAchados = exameFisicoSelectGroups.map(group => {
            const selectedValue = currentData[group.id];
            if (!selectedValue || selectedValue === 'Nenhum' || selectedValue === 'NaoAplica') return null; 
            const selectedOption = group.options.find(opt => opt.value === selectedValue);
            return selectedOption ? selectedOption.template : '';
        }).filter(Boolean).join(" ");
        return texto + (selectAchados || "Nenhuma observação selecionada.");
    }, [exameFisicoData]);

    const handleSoapChange = (e) => setSoapData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSintomasChange = (event) => {
        const { name, checked } = event.target;
        setSintomasConsulta(prev => ({ ...prev, [name]: checked }));
        if (checked) {
            const template = sintomaTemplates[name];
            setSoapData(prev => {
                if (prev.notas_subjetivas.includes(template)) return prev;
                return { ...prev, notas_subjetivas: (prev.notas_subjetivas + '\n' + template).trim() };
            });
        }
    };
    
    const handleExameChange = (event) => {
        const { name, value } = event.target;
        const newExameData = { ...exameFisicoData, [name]: value };
        setExameFisicoData(newExameData);
        const exameText = generateExameFisico(newExameData);
        setSoapData(prev => ({ ...prev, notas_objetivas: exameText }));
    };
    
    const preencherNormalidade = () => {
        console.log("🖱️ [CLICK] 'Preencher Normalidade' clicado!");
        const dadosExameNormal = {
            peso: exameFisicoData.peso || '___', 
            altura: exameFisicoData.altura || '___',
            pc: exameFisicoData.pc || '___', 
            temperatura: exameFisicoData.temperatura || '___',
            estado_geral: 'BEG', atividade: 'Ativo', reatividade: 'Reativo', cor_pele: 'Corado',
            hidratacao: 'Hidratado', estado_febril: 'Afebril', cianose: 'Acianotico', ictericia: 'Anicterico',
            fontanelas: 'Normo', suturas: 'Normais', pescoco_estado: 'Livre', linfonodos: 'Ausentes',
            olhos_estado: 'Normal', olhos_secrecao: 'Sem', reflexo_vermelho: 'Presente',
            otoscopia: 'Normal', otorreia: 'Nao', narinas: 'Permeaveis', oroscopia: 'Normal',
            respiratorio_estado: 'Eupneico', mv_ausculta: 'Presente', ruidos_adventicios: 'Nenhum',
            ritmo_cardiaco: 'BRNF', cardio_sopros: 'Sem',
            forma_abdome: 'Plano', rha_abdome: 'Presente', palpacao_abdome: 'Flacido', visceromegalias: 'Nao',
            genitalia: 'Normal', perineo: 'Integro',
            coto_umbilical_sinais: 'NaoAplica', coto_umbilical_aspecto: 'NaoAplica',
            membros_estado: 'Normais', pulsos: 'Presentes', simetria: 'Simetricos',
            neuro_tonus: 'Normal', neuro_reflexos: 'Normais', sinais_meningeos: 'Ausentes',
        };
        const textoExameNormal = `Dados Vitais:\nPeso: ${dadosExameNormal.peso} kg\nAltura: ${dadosExameNormal.altura} cm\nPC: ${dadosExameNormal.pc} cm\nT: ${dadosExameNormal.temperatura} °C\n\nExame Físico:\nBEG (Bom Estado Geral). Ativo. Reativo. Corado. Hidratado. Afebril ao toque. Acianótico. Anictérico. Fontanela anterior normotensa. Suturas cranianas normais. Pescoço livre, indolor, sem massas. Linfonodos não palpáveis. Olhos sem alterações, pupilas isocóricas e fotorreagentes. Conjuntivas coradas. Sem secreção ocular. Reflexo vermelho presente bilateralmente. Otoscopia: Membranas timpânicas íntegras, translúcidas. Ausência de otorreia. Narinas pérvias, sem secreção. Oroscopia sem alterações. Eupneico, FR=___. AR: MV presente universalmente, sem ruídos adventícios. ACV: BRNF em 2T. Sem sopros. Abdome plano. RHA presentes. Abdome flácido, indolor à palpação. Sem visceromegalias palpáveis. Genitália tópica, sem alterações. Região perineal íntegra, sem hiperemia ou lesões. Membros e coluna sem alterações. Ortolani negativo. Pulsos periféricos cheios e simétricos. Membros simétricos. Tônus muscular normal. Reflexos primitivos (Moro, sucção, preensão) presentes. Sinais meníngeos (Kernig, Brudzinski) ausentes.`;
        setSintomasConsulta({});
        setExameFisicoData(dadosExameNormal);
        setSoapData(prev => ({
            ...prev,
            notas_subjetivas: 'Mãe nega queixas. Criança ativa, reativa, alimentando-se bem (SME), diurese e evacuações presentes.',
            notas_objetivas: textoExameNormal,
            avaliacao: 'Criança hígida, sem sinais de alarme. Desenvolvimento adequado para a idade.',
            plano: 'Sigo com orientações gerais, manutenção do aleitamento materno. Alta da consulta.'
        }));
    };

    const handleLimparConsultaAtual = () => {
        setSintomasConsulta({});
        const vitais = {
            peso: exameFisicoData.peso || '___', 
            altura: exameFisicoData.altura || '___',
            pc: exameFisicoData.pc || '___', 
            temperatura: exameFisicoData.temperatura || '___',
        };
        setExameFisicoData(vitais);
        setSoapData({
            notas_subjetivas: '',
            notas_objetivas: `Dados Vitais:\nPeso: ${vitais.peso} kg\nAltura: ${vitais.altura} cm\nPC: ${vitais.pc} cm\nT: ${vitais.temperatura} °C\n\nExame Físico:\n`,
            avaliacao: '',
            plano: ''
        });
        showSnackbar('Campos da consulta atual limpos.', 'info');
    };
    
    const handleSaveSOAPAndVitals = async () => {
        const vitaisData = { 
            peso: exameFisicoData.peso || null, 
            altura: exameFisicoData.altura || null,
        };
        const soapPayload = { ...soapData, agendamento: agendamentoId || null };
        let evolucaoId;
        
        if (evolucaoIdSessao) {
            evolucaoId = evolucaoIdSessao;
            try {
                await apiClient.patch(`/prontuario/pacientes/${pacienteId}/evolucoes/${evolucaoId}/`, soapPayload);
            } catch (error) {
                showSnackbar('Erro ao atualizar a consulta atual (SOAP).', 'error');
                throw error;
            }
        } else {
            try {
                const res = await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes/`, soapPayload);
                evolucaoId = res.data.id; 
                setEvolucaoIdSessao(evolucaoId); 
            } catch (error) {
                showSnackbar('Erro ao salvar a consulta atual (SOAP).', 'error');
                throw error; 
            }
        }
        
        try {
            await apiClient.patch(`/pacientes/${pacienteId}/`, vitaisData);
        } catch (error) {
             showSnackbar('Erro ao atualizar dados vitais do paciente (consulta foi salva).', 'warning');
        }
        return evolucaoId; 
    };

    const handleSaveAtendimentoCompleto = async (event) => {
        if (event) event.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        const isSessaoIniciada = evolucaoIdSessao !== null;

        try {
            const evolucaoId = await handleSaveSOAPAndVitals();
            const savePromises = [];

            if (historicoRef.current) savePromises.push(historicoRef.current.saveData());
            if (dnpmRef.current) savePromises.push(dnpmRef.current.saveData());
            if (vacinacaoRef.current) savePromises.push(vacinacaoRef.current.saveData());

            await Promise.all(savePromises);
            showSnackbar(isSessaoIniciada ? 'Atendimento atualizado com sucesso!' : 'Atendimento salvo com sucesso!', 'success');
            
            fetchStatusResumos();
            
            if(onEvolucaoSalva) {
                onEvolucaoSalva(evolucaoId); 
            }
        } catch (error) {
            if (!error.response) { 
                 showSnackbar('Ocorreu um erro ao orquestrar o salvamento.', 'error');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStatusBadges = () => (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            {vacinacaoStatus && (
                <Chip
                    label={vacinacaoStatus === 'em_dia' ? 'Vacinação em Dia' : 'Vacinação Atrasada'}
                    color={vacinacaoStatus === 'em_dia' ? 'success' : 'error'}
                    size="small"
                    variant="outlined"
                />
            )}
            {dnpmStatus && (
                <Chip
                    label={
                        dnpmStatus === 'normal' ? 'DNPM Adequado' :
                        dnpmStatus === 'alerta' ? 'DNPM Sinais de Alerta' : 'DNPM Atraso'
                    }
                    color={
                        dnpmStatus === 'normal' ? 'success' :
                        dnpmStatus === 'alerta' ? 'warning' : 'error'
                    }
                    size="small"
                    variant="outlined"
                />
            )}
        </Box>
    );


    // =========================================================================
    // O RETURN UTILIZANDO A NOVA ESTRUTURA `LayoutEvolucaoPadrao`
    // =========================================================================

    return (
        <LayoutEvolucaoPadrao
            titulo="Atendimento Pediátrico"
            indicadoresExtras={renderStatusBadges()}
            
            onLimpar={handleLimparConsultaAtual}
            onSalvar={handleSaveAtendimentoCompleto}
            isSubmitting={isSubmitting}
            textoBotaoSalvar={evolucaoIdSessao ? 'Atualizar Atendimento' : 'Salvar Atendimento'}
            
            botaoNormalidade={
                <Button variant="outlined" size="small" onClick={preencherNormalidade} disabled={isSubmitting}>
                    Preencher Normalidade
                </Button>
            }

            // As abas (Histórico, DNPM, Vacinação) mapeadas para ferramentas da coluna direita
            abasApoio={[
                { 
                    label: 'Histórico', 
                    component: (
                        <Suspense fallback={<CircularProgress sx={{ m: 4 }} />}>
                            <HistoricoPediatrico ref={historicoRef} pacienteId={pacienteId} />
                        </Suspense>
                    ) 
                },
                { 
                    label: 'DNPM', 
                    component: (
                        <Suspense fallback={<CircularProgress sx={{ m: 4 }} />}>
                            <DnpmDetalhado ref={dnpmRef} pacienteId={pacienteId} onDataChange={fetchStatusResumos} />
                        </Suspense>
                    ) 
                },
                { 
                    label: 'Vacinação', 
                    component: (
                        <Suspense fallback={<CircularProgress sx={{ m: 4 }} />}>
                            <VacinacaoTab ref={vacinacaoRef} pacienteId={pacienteId} onDataChange={fetchStatusResumos} />
                        </Suspense>
                    ) 
                }
            ]}

            // O seu formulário SOAP robusto e complexo isolado nesta propriedade
            formularioSOAP={
                <Box component="form" sx={{ display: 'flex', flexDirection: 'column' }}>
                    
                    <Typography variant="body1" sx={{ mt: 1, fontWeight: 'medium' }}>Queixa Atual (S)</Typography>
                    <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 1, p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                        {sintomasOptions.map(opt => ( 
                            <FormControlLabel key={opt.id} control={<Checkbox size="small" checked={sintomasConsulta[opt.id] || false} onChange={handleSintomasChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                        ))}
                    </FormGroup>
                    <TextField name="notas_subjetivas" label="Subjetivo (HDA gerada / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_subjetivas || ''} onChange={handleSoapChange} size="small" />
                    
                    <Divider sx={{ my: 2 }} />

                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Exame Físico (O)</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, my: 1.5 }}>
                        <TextField label="Peso (kg)" name="peso" value={exameFisicoData.peso || ''} onChange={handleExameChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '80px' }}/>
                        <TextField label="Altura (cm)" name="altura" value={exameFisicoData.altura || ''} onChange={handleExameChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '80px' }}/>
                        <TextField label="PC (cm)" name="pc" value={exameFisicoData.pc || ''} onChange={handleExameChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '80px' }}/>
                        <TextField label="T (°C)" name="temperatura" value={exameFisicoData.temperatura || ''} onChange={handleExameChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '80px' }}/>
                    </Box>

                    <FormGroup sx={{ p: { xs: 1, sm: 2 }, border: '1px solid #ddd', borderRadius: 1 }}>
                        {(() => {
                            const secoes = [
                                { titulo: 'Geral / Pele', ids: ['estado_geral', 'atividade', 'reatividade', 'cor_pele', 'hidratacao', 'estado_febril', 'cianose', 'ictericia'] },
                                { titulo: 'Cabeça e Pescoço', ids: ['fontanelas', 'suturas', 'pescoco_estado', 'linfonodos'] },
                                { titulo: 'Olhos', ids: ['olhos_estado', 'olhos_secrecao', 'reflexo_vermelho'] },
                                { titulo: 'Ouvidos / Nariz / Boca', ids: ['otoscopia', 'otorreia', 'narinas', 'oroscopia'] },
                                { titulo: 'Respiratório', ids: ['respiratorio_estado', 'mv_ausculta', 'ruidos_adventicios'] },
                                { titulo: 'Cardiovascular', ids: ['ritmo_cardiaco', 'cardio_sopros'] },
                                { titulo: 'Abdome', ids: ['forma_abdome', 'rha_abdome', 'palpacao_abdome', 'visceromegalias'] },
                                { titulo: 'Genitália / Membros / Neuro', ids: ['genitalia', 'perineo', 'coto_umbilical_sinais', 'coto_umbilical_aspecto', 'membros_estado', 'pulsos', 'simetria', 'neuro_tonus', 'neuro_reflexos', 'sinais_meningeos'] },
                            ];
                            const renderSelect = (group) => (
                                <FormControl key={group.id} size="small" sx={{ minWidth: 170, flex: '1 1 170px' }}>
                                    <InputLabel id={`${group.id}-select-label`}>{group.label}</InputLabel>
                                    <Select
                                        labelId={`${group.id}-select-label`}
                                        id={`${group.id}-select`}
                                        name={group.id}
                                        value={exameFisicoData[group.id] || ''}
                                        label={group.label}
                                        onChange={handleExameChange}
                                    >
                                        <MenuItem value=""><em>Nenhum</em></MenuItem>
                                        {group.options.map(opt => (
                                            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            );
                            return secoes.map((secao, index) => (
                                <Box key={secao.titulo}>
                                    {index > 0 && <Divider sx={{ my: 2 }} />}
                                    <Typography variant="overline" color="textSecondary" sx={{ display: 'block', mb: 1.5, mt: index > 0 ? 1 : 0 }}>
                                        {secao.titulo}
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                        {exameFisicoSelectGroups
                                            .filter(group => secao.ids.includes(group.id))
                                            .map(group => renderSelect(group))
                                        }
                                    </Box>
                                </Box>
                            ));
                        })()}
                    </FormGroup>

                    <TextField name="notas_objetivas" label="Objetivo (Gerado / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_objetivas || ''} onChange={handleSoapChange} size="small" sx={{mt: 1.5}}/>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField name="avaliacao" label="Avaliação / Hipóteses Diagnósticas (A)" multiline rows={3} fullWidth value={soapData.avaliacao || ''} onChange={handleSoapChange} size="small" />
                        <TextField name="plano" label="Plano / Conduta (P)" multiline rows={3} fullWidth value={soapData.plano || ''} onChange={handleSoapChange} size="small" />
                    </Box>
                </Box>
            }
        />
    );
}