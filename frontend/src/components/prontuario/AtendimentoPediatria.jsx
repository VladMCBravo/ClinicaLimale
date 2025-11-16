// src/components/prontuario/AtendimentoPediatria.jsx
// VERSÃO REATORADA: Orquestrador com botão de Salvar Único

import React, { useState, useEffect, useCallback, Suspense, lazy, useRef } from 'react';
import {
    Paper, Typography, FormGroup, FormControlLabel, Checkbox, TextField, Divider,
    Box, Button, CircularProgress, Tabs, Tab,
    FormControl, InputLabel, Select, MenuItem,
    Chip
} from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

// --- IMPORTAR AS ABAS COM LAZY LOADING ---
const HistoricoPediatrico = lazy(() => import('./pediatria/HistoricoPediatrico'));
const DnpmDetalhado = lazy(() => import('./pediatria/DnpmDetalhado'));
const VacinacaoTab = lazy(() => import('./pediatria/VacinacaoTab'));

// --- (Constantes de sintomas e exame físico omitidas) ---
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

export default function AtendimentoPediatria({ pacienteId, agendamentoId, onEvolucaoSalva }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tabIndex, setTabIndex] = useState(0);

    const [sintomasConsulta, setSintomasConsulta] = useState({}); 
    const [exameFisicoData, setExameFisicoData] = useState({});
    const [soapData, setSoapData] = useState({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });

    const [vacinacaoStatus, setVacinacaoStatus] = useState(null); 
    const [dnpmStatus, setDnpmStatus] = useState(null); 
    
    // --- 1. CRIAR AS REFS PARA AS ABAS FILHAS ---
    const historicoRef = useRef(null);
    const dnpmRef = useRef(null);
    const vacinacaoRef = useRef(null);

    // ★★★ MUDANÇA 1: Adicionar estado para o ID da Evolução da Sessão ★★★
    const [evolucaoIdSessao, setEvolucaoIdSessao] = useState(null);

    // --- 3. NOVA FUNÇÃO PARA BUSCAR STATUS ---
    const fetchStatusResumos = useCallback(async () => {
        if (!pacienteId) {
            setVacinacaoStatus(null);
            setDnpmStatus(null);
            return;
        }
        try {
            // (Simulação)
            // const resVacinacao = await apiClient.get(`/prontuario/pacientes/${pacienteId}/vacinas/resumo/`);
            // setVacinacaoStatus(resVacinacao.data.status); // ex: 'em_dia'
            // const resDnpm = await apiClient.get(`/prontuario/pacientes/${pacienteId}/dnpm/resumo/`);
            // setDnpmStatus(resDnpm.data.status); // ex: 'normal'
            console.log("Buscando status de DNPM e Vacinas...");
        } catch (err) {
            console.error("Erro ao buscar resumos de status", err);
        }
    }, [pacienteId]);


    // --- 4. useEffect DE CARREGAMENTO (MODIFICADO) ---
    useEffect(() => {
        console.log("🔥 [EFFECT] O useEffect principal foi disparado (Carregamento)");
        
        if (pacienteId) {
            // Reseta tudo ao trocar de paciente
            setSoapData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
            setSintomasConsulta({});
            setExameFisicoData({}); 
            setTabIndex(0); 
            setVacinacaoStatus(null);
            setDnpmStatus(null);
            
            // ★★★ MUDANÇA 2: Resetar o ID da sessão ao trocar de paciente ★★★
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
                    // Pré-popula o campo 'objetivo' com os vitais
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
             // Limpa tudo se não houver paciente
            setSoapData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
            setSintomasConsulta({});
            setExameFisicoData({}); 
            setTabIndex(0); 
            setVacinacaoStatus(null);
            setDnpmStatus(null);
            setEvolucaoIdSessao(null); // Limpa o ID da sessão
        }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pacienteId, fetchStatusResumos]); 


    // --- GERADORES DE TEXTO (Sem alterações) ---
    const generateHda = useCallback((sintomas) => {
        const currentSintomas = sintomas || sintomasConsulta;
        return sintomasOptions
            .filter(opt => currentSintomas[opt.id]) 
            .map(opt => sintomaTemplates[opt.id])
            .join('\n');
    }, [sintomasConsulta]);

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

    
    // --- HANDLERS (Sem alterações) ---
    const handleTabChange = (event, newIndex) => {
        setTabIndex(newIndex);
    };
    const handleSoapChange = (e) => {
        setSoapData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

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
    
    // --- preencherNormalidade (Sem alterações) ---
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

    // --- handleLimparConsultaAtual (Sem alterações) ---
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
    
    // --- 5. LÓGICA DE SALVAMENTO (REATORADA E CORRIGIDA) ---
    
    const handleSaveSOAPAndVitals = async () => {
        const vitaisData = { 
            peso: exameFisicoData.peso || null, 
            altura: exameFisicoData.altura || null,
        };
        
        // ★★★ 1. CRIAR O PAYLOAD CORRETO ★★★
        // Aqui é onde usamos o 'agendamentoId' que estava sombreado
        const soapPayload = {
            ...soapData,
            agendamento: agendamentoId || null 
        };

        let evolucaoId;
        
        if (evolucaoIdSessao) {
            // --- JÁ EXISTE UMA EVOLUÇÃO, ATUALIZAR (PATCH) ---
            console.log(`   -> Atualizando SOAP da Evolução ID: ${evolucaoIdSessao}`);
            evolucaoId = evolucaoIdSessao;
            try {
                // ★★★ 2. ENVIAR O PAYLOAD CORRETO (com agendamentoId) ★★★
                await apiClient.patch(`/prontuario/pacientes/${pacienteId}/evolucoes/${evolucaoId}/`, soapPayload);
                console.log('SOAP atualizado com sucesso.');
            } catch (error) {
                console.error("Erro ao ATUALIZAR evolução (SOAP):", error.response?.data || error);
                showSnackbar('Erro ao atualizar a consulta atual (SOAP).', 'error');
                throw error; // Lança o erro para parar a execução
            }
        } else {
            // --- NÃO EXISTE, CRIAR UMA NOVA (POST) ---
            console.log("   -> Criando NOVA Evolução (POST)...");
            try {
                // ★★★ 3. USAR A URL ÚNICA E ENVIAR O PAYLOAD CORRETO ★★★
                
                // ANTES (errado):
                // const res = await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes-pediatria/`, soapData);
                
                // DEPOIS (correto):
                const res = await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes/`, soapPayload);

                evolucaoId = res.data.id; // Guarda o NOVO ID
                setEvolucaoIdSessao(evolucaoId); // Salva o ID na sessão!
                console.log(`SOAP salvo com sucesso. Nova Evolução ID: ${evolucaoId}`);
            } catch (error) {
                console.error("Erro ao CRIAR evolução (SOAP):", error.response?.data || error);
                showSnackbar('Erro ao salvar a consulta atual (SOAP).', 'error');
                throw error; // Lança o erro para parar a execução
            }
        }
        
        // Salva os vitais (separadamente, sem alteração)
        try {
            await apiClient.patch(`/pacientes/${pacienteId}/`, vitaisData);
            console.log('Dados vitais atualizados.');
        } catch (error) {
             console.error("Erro ao atualizar vitais:", error.response?.data || error);
             showSnackbar('Erro ao atualizar dados vitais do paciente (consulta foi salva).', 'warning');
        }
        
        return evolucaoId; // Retorna o ID (seja novo ou antigo)
    };

    // ETAPA 2: A nova função "Mestra" que salva TUDO
    const handleSaveAtendimentoCompleto = async (event) => {
        if (event) event.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        // Verifica se a sessão já foi iniciada ANTES de salvar
        const isSessaoIniciada = evolucaoIdSessao !== null;
        console.log("--- INICIANDO SALVAMENTO COMPLETO ---");

        try {
            // 1. Salva o SOAP e VITAIS primeiro (agora com lógica de PATCH/POST)
            console.log("   -> Etapa 1: Salvando SOAP e Vitais...");
            const evolucaoId = await handleSaveSOAPAndVitals();
            
            // 2. Prepara as promessas de salvamento das outras abas
            console.log("   -> Etapa 2: Preparando salvamento das outras abas...");
            const savePromises = [];

            if (historicoRef.current) {
                savePromises.push(historicoRef.current.saveData());
            } else {
                console.warn("Ref do Histórico não encontrada.");
            }

            if (dnpmRef.current) {
                savePromises.push(dnpmRef.current.saveData());
            } else {
                console.warn("Ref do DNPM não encontrada.");
            }

            if (vacinacaoRef.current) {
                savePromises.push(vacinacaoRef.current.saveData());
            } else {
                console.warn("Ref da Vacinação não encontrada.");
            }

            // 3. Executa todas as promessas em paralelo
            await Promise.all(savePromises);
            console.log("   -> Etapa 3: Histórico, DNPM e Vacinas salvos.");

            // 4. Sucesso total
            
            // ★★★ MUDANÇA 4: Mensagem de sucesso condicional ★★★
            showSnackbar(
                isSessaoIniciada 
                    ? 'Atendimento atualizado com sucesso!' 
                    : 'Atendimento salvo com sucesso!', 
                'success'
            );
            
            // ★★★ MUDANÇA 5: NÃO LIMPAR O FORMULÁRIO ★★★
            // O formulário só deve ser limpo se o usuário clicar em "Limpar"
            // ou trocar de paciente.
            // handleLimparConsultaAtual(); // <-- LINHA REMOVIDA
            
            // Atualiza os badges
            fetchStatusResumos();
            
            // Chama a função do PAI (ProntuarioCompleto) para abrir o modal
            if(onEvolucaoSalva) {
                console.log(`   -> Etapa 4: Chamando onEvolucaoSalva com ID: ${evolucaoId}`);
                onEvolucaoSalva(evolucaoId); 
            }

        } catch (error) {
            console.error("--- ERRO NO SALVAMENTO COMPLETO ---", error);
            // Os snackbars de erro específicos já devem ter sido mostrados pelas
            // funções filhas ou pelo 'handleSaveSOAPAndVitals'
            if (!error.response) { // Se for um erro que não é da API
                 showSnackbar('Ocorreu um erro ao orquestrar o salvamento.', 'error');
            }
        } finally {
            setIsSubmitting(false);
            console.log("--- FIM DO SALVAMENTO COMPLETO ---");
        }
    };


    // --- 6. FUNÇÃO PARA RENDERIZAR OS INDICADORES DE STATUS (Sem alterações) ---
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


    // --- 7. JSX (ATUALIZADO COM REFS E NOVO BOTÃO) ---
    return (
        <Paper sx={{ mb: 2, overflow: 'hidden' }}>
            
            {/* --- CABEÇALHO ATUALIZADO COM OS BOTÕES MESTRES --- */}
            <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between', 
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: 1,
                p: 2, pb: 0 
            }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography variant="h6" gutterBottom sx={{mb: 0}}> 
                        Atendimento Pediátrico 
                    </Typography>
                    {renderStatusBadges()}
                </Box>
                
                {/* --- BOTÕES MESTRES MOVIDOS PARA CÁ --- */}
                <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                    <Button onClick={handleLimparConsultaAtual} variant="outlined" size="small" disabled={isSubmitting}>
                        Limpar
                    </Button>
                    <Button 
                        onClick={handleSaveAtendimentoCompleto} 
                        variant="contained" 
                        size="small"
                        disabled={isSubmitting || !pacienteId}
                    >
                        {/* ★★★ MUDANÇA 6: Texto do botão condicional ★★★ */}
                        {isSubmitting ? <CircularProgress size={20} /> : (evolucaoIdSessao ? 'Atualizar Atendimento' : 'Salvar Atendimento')}
                    </Button>
                </Box>
                {/* --- FIM DOS BOTÕES MESTRES --- */}
                
            </Box>

            {/* --- NAVEGAÇÃO DAS ABAS (Sem alterações) --- */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, mt: 1 }}>
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
                        
                        {/* --- BOTÃO PREENCHER NORMALIDADE MOVIDO PARA CÁ --- */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 0 }}>
                                Consulta Atual (SOAP)
                            </Typography>
                            <Button 
                                variant="outlined" 
                                size="small" 
                                onClick={preencherNormalidade}
                                disabled={isSubmitting} // Desabilita enquanto salva
                            > 
                                Preencher Normalidade 
                            </Button>
                        </Box>
                        {/* --- FIM DO BOTÃO --- */}
                        
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

                        {/* RENDERIZAÇÃO 100% ComboBox, SEPARADA POR SEÇÕES */}
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

                        {/* Campo Objetivo (preenchido ou editado) */}
                        <TextField name="notas_objetivas" label="Objetivo (Gerado / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_objetivas || ''} onChange={handleSoapChange} size="small" sx={{mt: 1.5}}/>

                        <Divider sx={{ my: 2 }} />

                        {/* Campos Finais (A, P) e Botões (Sem alterações) */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField name="avaliacao" label="Avaliação / Hipóteses Diagnósticas (A)" multiline rows={3} fullWidth value={soapData.avaliacao || ''} onChange={handleSoapChange} size="small" />
                            <TextField name="plano" label="Plano / Conduta (P)" multiline rows={3} fullWidth value={soapData.plano || ''} onChange={handleSoapChange} size="small" />
                            
                            {/* --- BOTÕES ATUALIZADOS --- */}
                            <Box sx={{ textAlign: 'right', mt: 1, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                <Button onClick={handleLimparConsultaAtual} variant="outlined" disabled={isSubmitting}>
                                    Limpar
                                </Button>
                                <Button 
                                    onClick={handleSaveAtendimentoCompleto} 
                                    variant="contained" 
                                    disabled={isSubmitting || !pacienteId}
                                >
                                    {/* ★★★ MUDANÇA 7: Texto do botão condicional ★★★ */}
                                    {isSubmitting ? <CircularProgress size={24} /> : (evolucaoIdSessao ? 'Atualizar Atendimento' : 'Salvar Atendimento')}
                                </Button>
                            </Box>
                        </Box>
                    </Paper>
                </TabPanel>

                {/* --- ABAS ATUALIZADAS COM AS REFS --- */}
                
                <TabPanel value={tabIndex} index={1}>
                    <HistoricoPediatrico 
                        pacienteId={pacienteId} 
                        ref={historicoRef} 
                    />
                </TabPanel>

                <TabPanel value={tabIndex} index={2}>
                    <DnpmDetalhado 
                        pacienteId={pacienteId} 
                        onDataChange={fetchStatusResumos} 
                        ref={dnpmRef} 
                    />
                </TabPanel>

                <TabPanel value={tabIndex} index={3}>
                    <VacinacaoTab 
                        pacienteId={pacienteId} 
                        onDataChange={fetchStatusResumos} 
                        ref={vacinacaoRef} 
                    />
                </TabPanel>

            </Suspense>
        </Paper>
    );
}