// src/components/prontuario/AtendimentoNeonatologia.jsx
// VERSÃO CORRIGIDA: Removidos 'showSnackbar' e useEffects do SOAP

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import {
    Paper, Typography, TextField, Box, Button, CircularProgress, Tabs, Tab,
    Grid, FormGroup, FormControlLabel, Checkbox, Divider,
    FormControl, InputLabel, Select, MenuItem,
    Chip
} from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

const HistoricoNeonatologia = lazy(() => import('./neonatologia/HistoricoNeonatologia'));
const DnpmDetalhado = lazy(() => import('./pediatria/DnpmDetalhado'));
const VacinacaoTab = lazy(() => import('./pediatria/VacinacaoTab'));

// --- (Constantes de Opções omitidas para brevidade) ---
const exameFisicoNeoGroups = [
    { id: 'avaliacao_geral', label: 'Avaliação Geral', options: [{ value: 'BEG', label: 'BEG', template: 'Bom Estado Geral (BEG).'}, { value: 'REG', label: 'REG', template: 'Regular Estado Geral (REG).'}, { value: 'MEG', label: 'MEG', template: 'Mau Estado Geral (MEG).'}] },
    { id: 'atividade', label: 'Atividade', options: [{ value: 'Ativo', label: 'Ativo', template: 'Ativo.'}, { value: 'Hipoativo', label: 'Hipoativo', template: 'Hipoativo.'}, { value: 'Letargico', label: 'Letárgico', template: 'Letárgico.'}] },
    { id: 'reatividade', label: 'Reatividade', options: [{ value: 'Reativo', label: 'Reativo', template: 'Reativo.'}, { value: 'Hiporreativo', label: 'Hiporreativo', template: 'Hiporreativo.'}, { value: 'Irritado', label: 'Irritado', template: 'Irritado.'}] },
    { id: 'cor', label: 'Coloração', options: [{ value: 'Corado', label: 'Corado', template: 'Corado.'},{ value: 'Descorado', label: 'Descorado', template: 'Descorado.'},{ value: 'Icterico', label: 'Ictérico', template: 'Ictérico (Zona ___).'},{ value: 'Cianotico', label: 'Cianótico', template: 'Cianótico.'}] },
    { id: 'hidratacao', label: 'Hidratação', options: [{ value: 'Hidratado', label: 'Hidratado', template: 'Hidratado.'},{ value: 'Desidratado', label: 'Desidratado', template: 'Desidratado.'}] },
    { id: 'estado_febril', label: 'Temperatura', options: [{ value: 'Afebril', label: 'Afebril', template: 'Afebril ao toque.'},{ value: 'Febril', label: 'Febril', template: 'Febril ao toque.'}] },
    { id: 'pele_lesoes', label: 'Pele (Lesões)', options: [{ value: 'Integra', label: 'Íntegra / Sem Lesões', template: 'Pele íntegra, sem lesões.'},{ value: 'Eritema', label: 'Eritema Tóxico', template: 'Eritema tóxico neonatal.'},{ value: 'Petequias', label: 'Petéquias', template: 'Petéquias presentes.'},{ value: 'Outras', label: 'Outras Lesões', template: 'Lesões cutâneas (descrever).'}] },
    { id: 'fontanela', label: 'Fontanela Anterior', options: [{ value: 'Normotensa', label: 'Normotensa', template: 'Fontanela anterior normotensa.'},{ value: 'Abaulada', label: 'FA Abaulada', template: 'Fontanela anterior abaulada.'},{ value: 'Deprimida', label: 'FA Deprimida', template: 'Fontanela anterior deprimida.'}] },
    { id: 'suturas', label: 'Suturas', options: [{ value: 'Normais', label: 'Normais', template: 'Suturas cranianas normais.'},{ value: 'Acavalgadas', label: 'Acavalgadas', template: 'Suturas acavalgadas.'},{ value: 'Diastase', label: 'Diástase', template: 'Diástase de suturas.'}] },
    { id: 'pescoco', label: 'Pescoço', options: [{ value: 'Livre', label: 'Livre / Indolor', template: 'Pescoço livre, sem massas.'},{ value: 'Massas', label: 'Massas / Gânglios', template: 'Massas ou gânglios palpáveis.'},{ value: 'Retracoes', label: 'Retrações', template: 'Retrações cervicais.'}] },
    { id: 'olhos_estado', label: 'Olhos (Estado)', options: [{ value: 'Normal', label: 'Normal', template: 'Pupilas isocóricas. Conjuntivas coradas.'},{ value: 'Hiperemia', label: 'Hiperemia Conjuntival', template: 'Hiperemia conjuntival.'},{ value: 'Edema', label: 'Edema Palpebral', template: 'Edema palpebral.'}] },
    { id: 'olhos_secrecao', label: 'Secreção Ocular', options: [{ value: 'Ausente', label: 'Ausente', template: 'Sem secreção ocular.'},{ value: 'Presente', label: 'Presente', template: 'Secreção ocular presente.'}] },
    { id: 'reflexo_vermelho', label: 'Reflexo Vermelho', options: [{ value: 'Presente', label: 'Presente', template: 'Reflexo vermelho presente.'},{ value: 'Ausente', label: 'Ausente', template: 'Reflexo vermelho ausente.'}] },
    { id: 'orofaringe', label: 'Orofaringe', options: [{ value: 'Normal', label: 'Normal', template: 'Orofaringe normal, palato íntegro.'},{ value: 'Frenulo_curto', label: 'Frênulo Curto', template: 'Frênulo lingual curto.'},{ value: 'Outros', label: 'Alterada', template: 'Orofaringe alterada (descrever).'}] },
    { id: 'respiratorio_padrao', label: 'Padrão Respiratório', options: [{ value: 'Eupneico', label: 'Eupneico', template: 'Eupneico, boa expansibilidade.'},{ value: 'Dispneico', label: 'Dispneico/Taquipneico', template: 'Dispneico/Taquipneico, com retrações.'}] },
    { id: 'respiratorio_ausculta', label: 'Ausculta Respiratória', options: [{ value: 'Normal', label: 'MV+ s/ RA', template: 'MV presente bilateralmente, sem ruídos adventícios.'},{ value: 'Roncos', label: 'Roncos', template: 'Roncos.'},{ value: 'Sibilos', label: 'Sibilos', template: 'Sibilos.'},{ value: 'Estertores', label: 'Estertores', template: 'Estertores.'}] },
    { id: 'cardio_ritmo', label: 'Ritmo Cardíaco', options: [{ value: 'Normal', label: 'BRNF 2T', template: 'BRNF em 2T.'},{ value: 'Arritmia', label: 'Arritmia', template: 'Ritmo arrítmico.'}] },
    { id: 'cardio_sopros', label: 'Sopros', options: [{ value: 'Ausentes', label: 'Ausentes', template: 'Sem sopros.'},{ value: 'Presentes', label: 'Presentes', template: 'Sopro (descrever /6+).'}] },
    { id: 'cardio_perfusao', label: 'Perfusão', options: [{ value: 'Normal', label: 'Perfusão < 3s', template: 'Perfusão periférica < 3s.'},{ value: 'Lenta', label: 'Perfusão > 3s', template: 'Perfusão lentificada.'}] },
    { id: 'abdome_forma', label: 'Abdome (Forma)', options: [{ value: 'Plano', label: 'Plano', template: 'Abdome plano.'},{ value: 'Globoso', label: 'Globoso', template: 'Abdome globoso.'},{ value: 'Distendido', label: 'Distendido', template: 'Abdome distendido.'}] },
    { id: 'abdome_rha', label: 'Abdome (RHA)', options: [{ value: 'Presentes', label: 'RHA Presentes', template: 'RHA presentes.'},{ value: 'Aumentados', label: 'RHA Aumentados', template: 'RHA aumentados.'},{ value: 'Diminuidos', label: 'RHA Diminuídos', template: 'RHA diminuídos.'},{ value: 'Ausentes', label: 'RHA Ausentes', template: 'RHA ausentes.'}] },
    { id: 'abdome_palpacao', label: 'Abdome (Palpação)', options: [{ value: 'Flacido', label: 'Flácido/Indolor', template: 'Abdome flácido, indolor.'},{ value: 'Doloroso', label: 'Doloroso', template: 'Abdome doloroso à palpação.'},{ value: 'Massas', label: 'Massas Palpáveis', template: 'Massa palpável em ___.'}] },
    { id: 'abdome_viscero', label: 'Abdome (Viscerom.)', options: [{ value: 'Ausentes', label: 'Ausentes', template: 'Sem visceromegalias.'},{ value: 'Hepatomegalia', label: 'Hepatomegalia', template: 'Hepatomegalia.'},{ value: 'Esplenomegalia', label: 'Esplenomegalia', template: 'Esplenomegalia.'}] },
    { id: 'cordao', label: 'Cordão Umbilical', options: [{ value: 'NaoAplica', label: 'Não se aplica', template: ''}, { value: 'Normal', label: 'Seco, sem sinais flogísticos', template: 'Coto umbilical seco, sem sinais flogísticos.'},{ value: 'Alterado', label: 'Alterado (Eritema/Secreção)', template: 'Coto umbilical com hiperemia/secreção.'}] },
    { id: 'genitalia', label: 'Genitália', options: [{ value: 'Normal', label: 'Normal/Tópica', template: 'Genitália tópica, sem alterações.'},{ value: 'Anormal', label: 'Anormal', template: 'Genitália anormal (descrever).'}] },
    { id: 'anus', label: 'Ânus', options: [{ value: 'Pervio', label: 'Pérvio', template: 'Ânus pérvio.'},{ value: 'Imperfurado', label: 'Imperfurado', template: 'Ânus imperfurado.'}] },
    { id: 'membros_coluna', label: 'Membros e Coluna', options: [{ value: 'Normal', label: 'Normais, alinhados', template: 'Membros e coluna sem alterações. Ortolani negativo.'},{ value: 'Fosseta', label: 'Fosseta Sacral', template: 'Fosseta sacral.'},{ value: 'Alterado', label: 'Alterado', template: 'Alteração em membros/coluna (descrever).'}] },
    { id: 'pulsos', label: 'Pulsos (Membros)', options: [{ value: 'Simetricos', label: 'Simétricos/Cheios', template: 'Pulsos simétricos e cheios.'},{ value: 'Assimetricos', label: 'Assimétricos/Diminuídos', template: 'Pulsos assimétricos ou diminuídos.'}] },
    { id: 'neuro_tonus', label: 'Tônus', options: [{ value: 'Normal', label: 'Tônus Normal', template: 'Tônus normal, ativo.'}, { value: 'Hipotonia', label: 'Hipotonia', template: 'Hipotonia.'}, { value: 'Hipertonia', label: 'Hipertonia', template: 'Hipertonia.'}] },
    { id: 'sinais_meningeos', label: 'Sinais Meníngeos', options: [{ value: 'Ausentes', label: 'Ausentes', template: 'Sinais meníngeos ausentes.'}, { value: 'Presentes', label: 'Presentes', template: 'Sinais meníngeos presentes.'}] },
];
const reflexosPrimitivosGroups = [
    { id: 'reflexo_moro', label: 'Moro', options: [{ value: 'Presente', label: 'Presente', template: 'Moro presente.'}, { value: 'Ausente', label: 'Ausente', template: 'Moro ausente.'}, { value: 'Incompleto', label: 'Incompleto', template: 'Moro incompleto.'}] },
    { id: 'reflexo_cocleo_palp', label: 'Cócleo-Palpebral', options: [{ value: 'Presente', label: 'Presente', template: 'Refl. Cócleo-Palpebral presente.'}, { value: 'Ausente', label: 'Ausente', template: 'Refl. Cócleo-Palpebral ausente.'}] },
    { id: 'reflexo_succao', label: 'Sucção', options: [{ value: 'Presente', label: 'Presente', template: 'Refl. Sucção presente.'}, { value: 'Ausente', label: 'Ausente', template: 'Refl. Sucção ausente.'}, { value: 'Fraco', label: 'Fraco', template: 'Refl. Sucção fraco.'}] },
    { id: 'reflexo_preensao_palmar', label: 'Preensão Palmar', options: [{ value: 'Presente', label: 'Presente', template: 'Preensão Palmar presente.'}, { value: 'Ausente', label: 'Ausente', template: 'Preensão Palmar ausente.'}, { value: 'Fraco', label: 'Fraco', template: 'Preensão Palmar fraca.'}] },
    { id: 'reflexo_preensao_plantar', label: 'Preensão Plantar', options: [{ value: 'Presente', label: 'Presente', template: 'Preensão Plantar presente.'}, { value: 'Ausente', label: 'Ausente', template: 'Preensão Plantar ausente.'}, { value: 'Fraco', label: 'Fraco', template: 'Preensão Plantar fraca.'}] },
    { id: 'reflexo_cutaneo_plantar', label: 'Cutâneo Plantar', options: [{ value: 'Normal', label: 'Normal (Extensor)', template: 'Refl. Cutâneo Plantar extensor.'}, { value: 'Ausente', label: 'Ausente', template: 'Refl. Cutâneo Plantar ausente.'}, { value: 'Flexor', label: 'Flexor (Anormal)', template: 'Refl. Cutâneo Plantar flexor.'}] },
    { id: 'reflexo_marcha', label: 'Marcha', options: [{ value: 'Presente', label: 'Presente', template: 'Refl. Marcha presente.'}, { value: 'Ausente', label: 'Ausente', template: 'Refl. Marcha ausente.'}] },
    { id: 'reflexo_galant', label: 'Galant', options: [{ value: 'Presente', label: 'Presente', template: 'Refl. Galant presente.'}, { value: 'Ausente', label: 'Ausente', template: 'Refl. Galant ausente.'}] },
    { id: 'reflexo_atnr', label: 'ATNR', options: [{ value: 'Presente', label: 'Presente', template: 'Refl. ATNR presente.'}, { value: 'Ausente', label: 'Ausente', template: 'Refl. ATNR ausente.'}] },
];
// --- FIM EXAME FÍSICO ---

// Helper TabPanel
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            style={{ display: value !== index ? 'none' : 'block' }} 
            hidden={value !== index}
            id={`neo-tabpanel-${index}`}
            {...other}
        >
            <Box sx={{ p: { xs: 1, sm: 2 } }}>{children}</Box>
        </div>
    );
}

// --- Componente Principal ---
export default function AtendimentoNeonatologia({ pacienteId, onEvolucaoSalva, agendamentoId }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tabIndex, setTabIndex] = useState(0);

    const [vitalsData, setVitalsData] = useState({}); 
    const [evolucaoDiaria, setEvolucaoDiaria] = useState({ dieta: '', diurese: '', evacuacao: '' });
    const [exameFisicoData, setExameFisicoData] = useState({});
    const [soapData, setSoapData] = useState({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });

    const [vacinacaoStatus, setVacinacaoStatus] = useState(null); 
    const [dnpmStatus, setDnpmStatus] = useState(null); 

    const fetchStatusResumos = useCallback(async () => {
        if (!pacienteId) {
            setVacinacaoStatus(null);
            setDnpmStatus(null);
            return;
        }
        try {
            // (endpoints desabilitados)
        } catch (err) {
            console.error("Erro ao buscar resumos de status", err);
        }
    }, [pacienteId]);

    // --- useEffect DE CARREGAMENTO (COM CORREÇÃO) ---
    useEffect(() => {
        setSoapData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
        setExameFisicoData({});
        setVitalsData({});
        setEvolucaoDiaria({ dieta: '', diurese: '', evacuacao: '' });
        setTabIndex(0); 
        setVacinacaoStatus(null);
        setDnpmStatus(null);

        if (pacienteId) {
            apiClient.get(`/pacientes/${pacienteId}/`)
                .then(res => {
                    setVitalsData(prev => ({
                        ...prev,
                        // peso: res.data.peso || '', 
                    }));
                })
                .catch(err => {
                    console.error("Erro ao carregar dados do paciente:", err);
                    showSnackbar('Erro ao carregar dados vitais do paciente.', 'error');
                });
            
            fetchStatusResumos();
        }
    // --- CORREÇÃO APLICADA: 'showSnackbar' removido das dependências ---
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pacienteId, fetchStatusResumos]);


    // --- Geradores de texto (Atualizados para aceitar argumentos) ---
    const generateSubjetivo = useCallback((vitals, evolucao) => {
        const currentVitals = vitals || vitalsData;
        const currentEvolucao = evolucao || evolucaoDiaria;
        return `RN com ${currentVitals.dias_vida || '___'} dias de vida, IGC ${currentVitals.igc_semanas || '__'}s ${currentVitals.igc_dias || '_'}d.\nMedicações em uso: ${currentVitals.medicacoes || 'Nenhuma'}.\nObservações: ${currentVitals.observacoes || 'Nenhuma'}\n\nEvolução diária:\nDieta: ${currentEvolucao.dieta || 'Não informado'}\nDiurese: ${currentEvolucao.diurese || 'Não informado'}\nEvacuação: ${currentEvolucao.evacuacao || 'Não informado'}`;
    }, [vitalsData, evolucaoDiaria]);

    const generateObjetivo = useCallback((vitals, exame) => {
        const currentVitals = vitals || vitalsData;
        const currentExame = exame || exameFisicoData;
        let texto = `Dados Vitais:\nPeso: ${currentVitals.peso || '___'} g\nCompr: ${currentVitals.comprimento || '___'} cm\nPC: ${currentVitals.pc || '___'} cm\n\nExame Físico:\n`;
        const todosOsGrupos = [...exameFisicoNeoGroups, ...reflexosPrimitivosGroups];
        const achados = todosOsGrupos.map(group => {
            const selectedValue = currentExame[group.id];
            if (!selectedValue || selectedValue === 'Nenhum' || selectedValue === 'NaoAplica') return null;
            const option = group.options.find(opt => opt.value === selectedValue);
            return option ? option.template : '';
        }).filter(Boolean).join(" ");
        return texto + (achados || "Nenhuma observação selecionada.");
    }, [vitalsData, exameFisicoData]);

    // --- CORREÇÃO: useEffects que atualizam SOAP foram removidos ---
    // useEffect(() => { ... }, [vitalsData, evolucaoDiaria, generateSubjetivo]);
    // useEffect(() => { ... }, [vitalsData, exameFisicoData, generateObjetivo]);

    // --- Handlers (Atualizados para controlar o SOAP) ---
    const handleTabChange = (event, newIndex) => { setTabIndex(newIndex); };
    const handleSoapChange = (e) => setSoapData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    
    const handleVitalsChange = (e) => {
        const newVitals = { ...vitalsData, [e.target.name]: e.target.value };
        setVitalsData(newVitals);
        
        // Atualiza SOAP
        setSoapData(prev => ({
            ...prev,
            notas_subjetivas: generateSubjetivo(newVitals, evolucaoDiaria),
            notas_objetivas: generateObjetivo(newVitals, exameFisicoData)
        }));
    };
    const handleEvolucaoDiariaChange = (e) => {
        const newEvolucao = { ...evolucaoDiaria, [e.target.name]: e.target.value };
        setEvolucaoDiaria(newEvolucao);

        // Atualiza SOAP
        setSoapData(prev => ({
            ...prev,
            notas_subjetivas: generateSubjetivo(vitalsData, newEvolucao)
        }));
    };
    const handleExameChange = (e) => {
        const newExame = { ...exameFisicoData, [e.target.name]: e.target.value };
        setExameFisicoData(newExame);

        // Atualiza SOAP
        setSoapData(prev => ({
            ...prev,
            notas_objetivas: generateObjetivo(vitalsData, newExame)
        }));
    };

    // --- preencherNormalidade (Atualizado para ser auto-contido) ---
    const preencherNormalidade = () => {
        const dadosExameNormal = {
            avaliacao_geral: 'BEG', cor: 'Corado', hidratacao: 'Hidratado', estado_febril: 'Afebril',
            atividade: 'Ativo', reatividade: 'Reativo', pele_lesoes: 'Integra',
            fontanela: 'Normotensa', suturas: 'Normais', pescoco: 'Livre',
            olhos_estado: 'Normal', olhos_secrecao: 'Ausente', reflexo_vermelho: 'Presente',
            orofaringe: 'Normal',
            respiratorio_padrao: 'Eupneico', respiratorio_ausculta: 'Normal',
            cardio_ritmo: 'Normal', cardio_sopros: 'Ausentes', cardio_perfusao: 'Normal',
            abdome_forma: 'Plano', abdome_rha: 'Presentes', abdome_palpacao: 'Flacido', abdome_viscero: 'Ausentes',
            cordao: 'NaoAplica', genitalia: 'Normal', anus: 'Pervio',
            membros_coluna: 'Normal', pulsos: 'Simetricos',
            neuro_tonus: 'Normal', sinais_meningeos: 'Ausentes',
            reflexo_moro: 'Presente', reflexo_cocleo_palp: 'Presente', reflexo_succao: 'Presente',
            reflexo_preensao_palmar: 'Presente', reflexo_preensao_plantar: 'Presente',
            reflexo_cutaneo_plantar: 'Normal', reflexo_marcha: 'Presente', reflexo_galant: 'Presente', reflexo_atnr: 'Presente',
        };
        const dadosEvolucaoNormal = { dieta: 'Seno materno sob livre demanda', diurese: 'Adequada', evacuacao: 'Presente' };
        
        const textoSubjetivo = `RN com ${vitalsData.dias_vida || '___'} dias de vida, IGC ${vitalsData.igc_semanas || '__'}s ${vitalsData.igc_dias || '_'}d.\nMedicações em uso: ${vitalsData.medicacoes || 'Nenhuma'}.\nObservações: ${vitalsData.observacoes || 'Nenhuma'}\n\nEvolução diária:\nDieta: ${dadosEvolucaoNormal.dieta}\nDiurese: ${dadosEvolucaoNormal.diurese}\nEvacuação: ${dadosEvolucaoNormal.evacuacao}`;
        const textoObjetivo = `Dados Vitais:\nPeso: ${vitalsData.peso || '___'} g\nCompr: ${vitalsData.comprimento || '___'} cm\nPC: ${vitalsData.pc || '___'} cm\n\nExame Físico:\nBom Estado Geral (BEG). Ativo. Reativo. Corado. Hidratado. Afebril ao toque. Pele íntegra, sem lesões. Fontanela anterior normotensa. Suturas cranianas normais. Pescoço livre, sem massas. Pupilas isocóricas. Conjuntivas coradas. Sem secreção ocular. Reflexo vermelho presente. Orofaringe normal, palato íntegro. Eupneico, boa expansibilidade. MV presente bilateralmente, sem ruídos adventícios. BRNF em 2T. Sem sopros. Perfusão periférica < 3s. Abdome plano. RHA presentes. Abdome flácido, indolor. Sem visceromegalias. Genitália tópica, sem alterações. Ânus pérvio. Membros e coluna sem alterações. Ortolani negativo. Pulsos simétricos e cheios. Tônus normal, ativo. Sinais meníngeos ausentes. Moro presente. Refl. Cócleo-Palpebral presente. Refl. Sucção presente. Preensão Palmar presente. Preensão Plantar presente. Refl. Cutâneo Plantar extensor. Refl. Marcha presente. Refl. Galant presente. Refl. ATNR presente.`;

        setExameFisicoData(dadosExameNormal);
        setEvolucaoDiaria(dadosEvolucaoNormal);
        setSoapData(prev => ({
            ...prev,
            notas_subjetivas: textoSubjetivo,
            notas_objetivas: textoObjetivo,
            avaliacao: 'RN hígido, em bom estado geral, sem queixas.',
            plano: 'Alta da consulta. Orientações de puericultura.'
        }));
        showSnackbar('Exame físico preenchido com padrão normal.', 'info');
     };

    // --- handleLimparConsultaAtual (Atualizado) ---
    const handleLimparConsultaAtual = () => {
        setExameFisicoData({});
        // Não limpa os vitais carregados da API
        // setVitalsData({}); 
        setEvolucaoDiaria({ dieta: '', diurese: '', evacuacao: '' });
        setSoapData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
        showSnackbar('Campos da consulta atual limpos.', 'info');
    };

    // --- handleSubmit (CORRIGIDO) ---
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            const soapPayload = { 
                ...soapData,
                peso: vitalsData.peso ? (parseFloat(vitalsData.peso) / 1000).toFixed(3) : null,
                altura: vitalsData.comprimento ? (parseFloat(vitalsData.comprimento) / 100).toFixed(2) : null,
                
                // --- ★★★ MUDANÇA 1: ADICIONE O ID DO AGENDAMENTO ★★★
                agendamento: agendamentoId || null, 
            };

            // --- ★★★ MUDANÇA 2: VOLTE PARA A URL ÚNICA ★★★
            
            // ANTES:
            // const res = await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes-neonatologia/`, soapPayload);
            
            // DEPOIS:
            const res = await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes/`, soapPayload);
            
            // --- FIM DAS MUDANÇAS ---
            
            showSnackbar('Evolução salva com sucesso!', 'success');
            
            if(onEvolucaoSalva) onEvolucaoSalva(res.data.id);
            
            handleLimparConsultaAtual();
        } catch (error) {
             console.error("Erro ao salvar evolução:", error.response?.data);
             showSnackbar(`Erro ao salvar evolução: ${error.response?.data?.detail || error.message}`, 'error');
        }
        finally { setIsSubmitting(false); }
    };

    // --- 6. FUNÇÃO PARA RENDERIZAR OS INDICADORES DE STATUS ---
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

    // --- 7. JSX (ATUALIZADO) ---
    return (
        <Paper sx={{ mb: 2, overflow: 'hidden' }}>
            
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
                        Atendimento Neonatal 
                    </Typography>
                    {renderStatusBadges()} 
                </Box>
                {tabIndex === 0 && (
                    <Button variant="outlined" size="small" onClick={preencherNormalidade} sx={{flexShrink: 0}}> 
                        Preencher Normalidade 
                    </Button>
                )}
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, mt: 1 }}>
                <Tabs value={tabIndex} onChange={handleTabChange} aria-label="Abas prontuário neonatal" variant="scrollable" scrollButtons="auto">
                    <Tab label="Consulta Atual" id="neo-tab-0" />
                    <Tab label="Histórico" id="neo-tab-1" />
                    <Tab label="DNPM" id="neo-tab-2" />
                    <Tab label="Vacinação" id="neo-tab-3" />
                </Tabs>
            </Box>

            <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
                
                <TabPanel value={tabIndex} index={0}>
                    <Paper component="form" onSubmit={handleSubmit} variant="outlined" sx={{ p: 2, borderColor: 'primary.main' }}>
                         <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Consulta Atual (SOAP)</Typography>

                         <Typography variant="body1" sx={{ mt: 1, fontWeight: 'medium' }}>Dados da Consulta e Evolução (S)</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, my: 1.5 }}>
                            <TextField label="Dias de Vida" name="dias_vida" type="number" value={vitalsData.dias_vida || ''} onChange={handleVitalsChange} size="small" sx={{minWidth: '80px', flex: '1 1 80px'}}/>
                            <TextField label="IGC (Sem)" name="igc_semanas" type="number" value={vitalsData.igc_semanas || ''} onChange={handleVitalsChange} size="small" sx={{minWidth: '80px', flex: '1 1 80px'}}/>
                            <TextField label="IGC (Dias)" name="igc_dias" type="number" value={vitalsData.igc_dias || ''} onChange={handleVitalsChange} size="small" sx={{minWidth: '80px', flex: '1 1 80px'}}/>
                            <TextField label="Medicações em Uso" name="medicacoes" value={vitalsData.medicacoes || ''} onChange={handleVitalsChange} size="small" sx={{minWidth: '150px', flex: '1 1 150px'}}/>
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, my: 1.5 }}>
                            <TextField name="dieta" label="Dieta" fullWidth value={evolucaoDiaria.dieta} onChange={handleEvolucaoDiariaChange} size="small" sx={{minWidth: 150, flex: '1 1 150px'}} placeholder="Tipo, Volume, Aceitação"/>
                            <TextField select label="Diurese" name="diurese" value={evolucaoDiaria.diurese || ''} onChange={handleEvolucaoDiariaChange} size="small" sx={{minWidth: 150, flex: '1 1 150px'}}>
                                <MenuItem value="">-</MenuItem>
                                <MenuItem value="Adequada">Adequada</MenuItem>
                                <MenuItem value="Diminuída">Diminuída</MenuItem>
                                <MenuItem value="Aumentada">Aumentada</MenuItem>
                            </TextField>
                             <TextField select label="Evacuação" name="evacuacao" value={evolucaoDiaria.evacuacao || ''} onChange={handleEvolucaoDiariaChange} size="small" sx={{minWidth: 150, flex: '1 1 150px'}}>
                                <MenuItem value="">-</MenuItem>
                                <MenuItem value="Presente">Presente</MenuItem>
                                <MenuItem value="Ausente">Ausente</MenuItem>
                            </TextField>
                        </Box>
                        <TextField label="Observações (Queixas da Mãe, etc.)" name="observacoes" value={vitalsData.observacoes || ''} onChange={handleVitalsChange} size="small" fullWidth multiline rows={2} />
                        
                        <TextField name="notas_subjetivas" label="Subjetivo (Gerado / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_subjetivas || ''} onChange={handleSoapChange} size="small" sx={{mt: 1.5}}/>

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Exame Físico (O)</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, my: 1.5 }}>
                            <TextField label="Peso (g)" name="peso" type="number" value={vitalsData.peso || ''} onChange={handleVitalsChange} size="small" sx={{minWidth: '80px', flex: '1 1 80px'}}/>
                            <TextField label="Compr. (cm)" name="comprimento" type="number" value={vitalsData.comprimento || ''} onChange={handleVitalsChange} size="small" sx={{minWidth: '80px', flex: '1 1 80px'}}/>
                            <TextField label="PC (cm)" name="pc" type="number" value={vitalsData.pc || ''} onChange={handleVitalsChange} size="small" sx={{minWidth: '80px', flex: '1 1 80px'}}/>
                        </Box>
                        
                        <FormGroup sx={{ p: { xs: 1, sm: 2 }, border: '1px solid #ddd', borderRadius: 1 }}>
                            {(() => {
                                const secoes = [
                                    { titulo: 'Geral e Pele', ids: ['avaliacao_geral', 'atividade', 'reatividade', 'cor', 'hidratacao', 'estado_febril', 'pele_lesoes'] },
                                    { titulo: 'Cabeça, Pescoço e ORL', ids: ['fontanela', 'suturas', 'pescoco', 'olhos_estado', 'olhos_secrecao', 'reflexo_vermelho', 'orofaringe'] },
                                    { titulo: 'Respiratório e Cardiovascular', ids: ['respiratorio_padrao', 'respiratorio_ausculta', 'cardio_ritmo', 'cardio_sopros', 'cardio_perfusao'] },
                                    { titulo: 'Abdome e Genitália', ids: ['abdome_forma', 'abdome_rha', 'abdome_palpacao', 'abdome_viscero', 'cordao', 'genitalia', 'anus'] },
                                    { titulo: 'Membros e Neurológico (Geral)', ids: ['membros_coluna', 'pulsos', 'neuro_tonus', 'sinais_meningeos'] },
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

                                const secoesHtml = secoes.map((secao, index) => (
                                    <Box key={secao.titulo}>
                                        {index > 0 && <Divider sx={{ my: 2 }} />}
                                        <Typography variant="overline" color="textSecondary" sx={{ display: 'block', mb: 1.5, mt: index > 0 ? 1 : 0 }}>
                                            {secao.titulo}
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                            {exameFisicoNeoGroups
                                                .filter(group => secao.ids.includes(group.id))
                                                .map(group => renderSelect(group))
                                            }
                                        </Box>
                                    </Box>
                                ));
                                
                                secoesHtml.push(
                                    <Box key="reflexos">
                                        <Divider sx={{ my: 2 }} />
                                        <Typography variant="overline" color="textSecondary" sx={{ display: 'block', mb: 1.5, mt: 1 }}>
                                            Reflexos Primitivos
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                            {reflexosPrimitivosGroups.map(group => renderSelect(group))}
                                        </Box>
                                    </Box>
                                );

                                return secoesHtml;
                            })()}
                        </FormGroup>
                        
                        <TextField name="notas_objetivas" label="Objetivo (Gerado / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_objetivas || ''} onChange={handleSoapChange} size="small" sx={{mt: 1.5}}/>
                        <Divider sx={{ my: 2 }} />

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField name="avaliacao" label="Avaliação / Hipóteses (A)" multiline rows={3} fullWidth value={soapData.avaliacao || ''} onChange={handleSoapChange} size="small" />
                            <TextField name="plano" label="Plano / Conduta (P)" multiline rows={3} fullWidth value={soapData.plano || ''} onChange={handleSoapChange} size="small" />
                             <Box sx={{ textAlign: 'right', mt: 1, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                <Button onClick={handleLimparConsultaAtual} variant="outlined" disabled={isSubmitting}> Limpar Consulta </Button>
                                <Button type="submit" variant="contained" disabled={isSubmitting}>
                                    {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Evolução'}
                                </Button>
                            </Box>
                        </Box>
                    </Paper>
                </TabPanel>

                <TabPanel value={tabIndex} index={1}>
                    <HistoricoNeonatologia pacienteId={pacienteId} />
                </TabPanel>

                <TabPanel value={tabIndex} index={2}>
                    <DnpmDetalhado pacienteId={pacienteId} onDataChange={fetchStatusResumos} />
                </TabPanel>

                <TabPanel value={tabIndex} index={3}>
                    <VacinacaoTab pacienteId={pacienteId} onDataChange={fetchStatusResumos} />
                </TabPanel>

            </Suspense>
        </Paper>
    );
}