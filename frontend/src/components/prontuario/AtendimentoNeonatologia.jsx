// src/components/prontuario/AtendimentoNeonatologia.jsx
// VERSÃO COMPLETA E REFEITA (Baseada no PDF [cite: 101-154])

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import {
    Paper, Typography, TextField, Box, Button, CircularProgress, Tabs, Tab,
    Grid, FormGroup, FormControlLabel, Checkbox, Divider,
    FormControl, InputLabel, Select, MenuItem, OutlinedInput, Chip // Para ComboBox
} from '@mui/material';
// --- CORREÇÃO DE CAMINHO ---
import { useSnackbar } from '../../contexts/SnackbarContext'; // Caminho para src/contexts
import apiClient from '../../api/axiosConfig'; // Caminho para src/api
// --- FIM DA CORREÇÃO ---

// --- IMPORT DA ABA DE HISTÓRICO ---
const HistoricoNeonatologia = lazy(() => import('./neonatologia/HistoricoNeonatologia'));

// --- ESTRUTURA DO EXAME FÍSICO (Baseado no PDF, Página 3 ) ---
// Usaremos Multi-Select ComboBox, pois o PDF indica "Itens clicáveis" [cite: 117]
const exameFisicoNeoGroups = [
    {
        id: 'avaliacao_geral', label: 'Avaliação Geral',
        options: [
            { id: 'normal', label: 'Normal', template: 'BEG, Ativo, Reativo, Corado, Hidratado, Afebril, Eupneico.'},
            { id: 'BEG', label: 'BEG', template: 'Bom Estado Geral.'},
            { id: 'REG', label: 'REG', template: 'Regular Estado Geral.'},
            { id: 'MEG', label: 'MEG', template: 'Mau Estado Geral.'},
            { id: 'corado', label: 'Corado', template: 'Corado.'},
            { id: 'descorado', label: 'Descorado', template: 'Descorado.'},
            { id: 'hidratado', label: 'Hidratado', template: 'Hidratado.'},
            { id: 'desidratado', label: 'Desidratado', template: 'Desidratado.'},
            { id: 'afebril', label: 'Afebril', template: 'Afebril.'},
            { id: 'febril', label: 'Febril', template: 'Febril.'},
            { id: 'eupneico', label: 'Eupneico', template: 'Eupneico.'},
            { id: 'dispneico', label: 'Dispneico', template: 'Dispneico.'},
            { id: 'taquipneico', label: 'Taquipneico', template: 'Taquipneico.'},
            { id: 'ativo', label: 'Ativo', template: 'Ativo.'},
            { id: 'hipoativo', label: 'Hipoativo', template: 'Hipoativo.'},
            { id: 'reativo', label: 'Reativo', template: 'Reativo.'},
            { id: 'hiporreativo', label: 'Hiporreativo', template: 'Hiporreativo.'},
            { id: 'irritado', label: 'Irritado', template: 'Irritado.'},
            { id: 'letargico', label: 'Letárgico', template: 'Letárgico.'},
        ]
    },
    {
        id: 'pele', label: 'Pele',
        options: [
            { id: 'normal', label: 'Normal', template: 'Pele íntegra, sem lesões.'},
            { id: 'integra', label: 'Íntegra', template: 'Pele íntegra.'},
            { id: 'lesoes', label: 'Lesões', template: 'Lesões cutâneas (descrever).'},
            { id: 'icterica', label: 'Ictérica', template: 'Ictérico (Zona ___ / Kramer).'},
            { id: 'petequias', label: 'Petéquias', template: 'Petéquias presentes.'},
            { id: 'eritema_toxico', label: 'Eritema Tóxico', template: 'Eritema tóxico neonatal.'},
        ]
    },
    {
        id: 'cabeca', label: 'Cabeça e Fontanelas',
        options: [
            { id: 'normal', label: 'Normal', template: 'Normocefalia, fontanelas normotensas.'},
            { id: 'normocefalia', label: 'Normocefalia', template: 'Normocefalia.'},
            { id: 'dolicocefalia', label: 'Dolicocefalia', template: 'Dolicocefalia.'},
            { id: 'fa_normotensa', label: 'Fontanela Normotensa', template: 'Fontanela anterior normotensa.'},
            { id: 'fa_abaulada', label: 'Fontanela Abaulada', template: 'Fontanela anterior abaulada.'},
            { id: 'fa_deprimida', label: 'Fontanela Deprimida', template: 'Fontanela anterior deprimida.'},
        ]
    },
    {
        id: 'olhos', label: 'Olhos',
        options: [
            { id: 'normal', label: 'Normal', template: 'Pupilas isocóricas, reflexo vermelho presente.'},
            { id: 'pupilas_isocoricas', label: 'Pupilas Isocóricas', template: 'Pupilas isocóricas.'},
            { id: 'reflexo_vermelho', label: 'Reflexo Vermelho', template: 'Reflexo vermelho presente.'},
            { id: 'secrecao', label: 'Secreção', template: 'Secreção ocular.'},
            { id: 'edema', label: 'Edema Palpebral', template: 'Edema palpebral.'},
        ]
    },
    {
        id: 'orofaringe', label: 'Orofaringe',
        options: [
            { id: 'normal', label: 'Normal', template: 'Palato íntegro, língua normal.'},
            { id: 'palato_integro', label: 'Palato Íntegro', template: 'Palato íntegro.'},
            { id: 'frenulo_curto', label: 'Frênulo Curto', template: 'Frênulo lingual curto.'},
            { id: 'lingua_normal', label: 'Língua Normal', template: 'Língua normal.'},
        ]
    },
    {
        id: 'pescoco', label: 'Pescoço',
        options: [
            { id: 'normal', label: 'Normal', template: 'Livre, sem massas ou retrações.'},
            { id: 'livre', label: 'Livre', template: 'Pescoço livre.'},
            { id: 'retracoes', label: 'Retrações', template: 'Retrações cervicais.'},
            { id: 'massas', label: 'Massas', template: 'Massas palpáveis.'},
            { id: 'ganglios', label: 'Gânglios', template: 'Gânglios palpáveis.'},
        ]
    },
    {
        id: 'respiratorio', label: 'Respiratório',
        options: [
            { id: 'normal', label: 'Normal', template: 'Tórax simétrico, MV+ bilateralmente, sem RAs.'},
            { id: 'torax_simetrico', label: 'Tórax Simétrico', template: 'Tórax simétrico.'},
            { id: 'mv_presente', label: 'MV + Bilateral', template: 'MV presente bilateralmente.'},
            { id: 'sibilos', label: 'Sibilos', template: 'Sibilos.'},
            { id: 'estertores', label: 'Estertores', template: 'Estertores.'},
            { id: 'roncos', label: 'Roncos', template: 'Roncos.'},
        ]
    },
    {
        id: 'cardiovascular', label: 'Cardiovascular',
        options: [
            { id: 'normal', label: 'Normal', template: 'Bulhas normais, sem sopros, pulsos simétricos, perfusão < 3s.'},
            { id: 'bulhas_normais', label: 'Bulhas Normais', template: 'Bulhas normais.'},
            { id: 'sopros', label: 'Sopros', template: 'Sopro (descrever).'},
            { id: 'pulsos_simetricos', label: 'Pulsos Simétricos', template: 'Pulsos simétricos.'},
            { id: 'perfusao_normal', label: 'Perfusão < 3s', template: 'Perfusão < 3s.'},
            { id: 'perfusao_lenta', label: 'Perfusão > 3s', template: 'Perfusão > 3s.'},
        ]
    },
    {
        id: 'abdome', label: 'Abdome',
        options: [
            { id: 'normal', label: 'Normal', template: 'Abdome plano, flácido, indolor.'},
            { id: 'plano', label: 'Plano', template: 'Abdome plano.'},
            { id: 'globoso', label: 'Globoso', template: 'Abdome globoso.'},
            { id: 'doloroso', label: 'Doloroso', template: 'Doloroso à palpação.'},
            { id: 'hepatomegalia', label: 'Hepatomegalia', template: 'Hepatomegalia.'},
            { id: 'massa_palpavel', label: 'Massa Palpável', template: 'Massa palpável.'},
        ]
    },
    {
        id: 'cordao_umbilical', label: 'Cordão Umbilical',
        options: [
            { id: 'normal', label: 'Normal', template: 'Coto umbilical seco, sem sinais flogísticos.'},
            { id: 'seco', label: 'Seco', template: 'Coto umbilical seco.'},
            { id: 'humido', label: 'Húmido', template: 'Coto umbilical húmido.'},
            { id: 'eritema', label: 'Eritema', template: 'Eritema de coto.'},
            { id: 'secrecao', label: 'Secreção', template: 'Secreção em coto.'},
        ]
    },
    {
        id: 'genitalia_anus', label: 'Genitália e Ânus',
        options: [
            { id: 'normal', label: 'Normal', template: 'Genitália normal, ânus pérvio.'},
            { id: 'genitalia_normal', label: 'Genitália Normal', template: 'Genitália normal (Masc/Fem).'},
            { id: 'ambigua', label: 'Ambigua', template: 'Genitália ambígua.'},
            { id: 'anus_pervio', label: 'Ânus Pérvio', template: 'Ânus pérvio.'},
        ]
    },
    {
        id: 'extremidades', label: 'Extremidades',
        options: [
            { id: 'normal', label: 'Normal', template: 'Extremidades normais, sem cianose ou edema.'},
            { id: 'normais', label: 'Normais', template: 'Extremidades normais.'},
            { id: 'cianose_ext', label: 'Cianose', template: 'Cianose de extremidades.'},
            { id: 'polidactilia', label: 'Polidactilia', template: 'Polidactilia.'},
            { id: 'edema_ext', label: 'Edema', template: 'Edema de extremidades.'},
        ]
    },
    {
        id: 'coluna', label: 'Coluna',
        options: [
            { id: 'normal', label: 'Normal', template: 'Alinhada, sem fosseta.'},
            { id: 'alinhada', label: 'Alinhada', template: 'Coluna alinhada.'},
            { id: 'fosseta_sacral', label: 'Fosseta Sacral', template: 'Fosseta sacral.'},
            { id: 'abaulamento', label: 'Abaulamento', template: 'Abaulamento (descrever).'},
        ]
    },
    {
        id: 'neurologico', label: 'Neurológico (Estado)',
        options: [
            { id: 'normal', label: 'Normal', template: 'Reativo, tônus normal.'},
            { id: 'reativo_neuro', label: 'Reativo', template: 'Reativo.'},
            { id: 'hipotonico', label: 'Hipotônico', template: 'Hipotônico.'},
            { id: 'hipertonico', label: 'Hipertônico', template: 'Hipertônico.'},
            { id: 'convulsao', label: 'Convulsão', template: 'Convulsão.'},
        ]
    },
    {
        id: 'reflexos', label: 'Reflexos Primitivos',
        options: [
            { id: 'normal', label: 'Normal', template: 'Reflexos primitivos presentes e simétricos.'},
            { id: 'moro', label: 'Moro Presente', template: 'Reflexo de Moro presente.'},
            { id: 'succao', label: 'Sucção Presente', template: 'Reflexo de Sucção presente.'},
            { id: 'procura', label: 'Procura Presente', template: 'Reflexo de Procura presente.'},
            { id: 'preensao_palmar', label: 'Preensão Palmar', template: 'Reflexo de Preensão Palmar presente.'},
            { id: 'preensao_plantar', label: 'Preensão Plantar', template: 'Reflexo de Preensão Plantar presente.'},
            { id: 'marcha', label: 'Marcha Presente', template: 'Reflexo da Marcha presente.'},
            { id: 'babinski', label: 'Babinski Presente', template: 'Reflexo de Babinski presente.'},
            { id: 'galant', label: 'Galant Presente', template: 'Reflexo de Galant presente.'},
            { id: 'atnr', label: 'ATNR Presente', template: 'Reflexo Tônico Cervical Assimétrico (ATNR) presente.'},
        ]
    },
];

// Dicionário para buscar templates e labels dos Multi-Selects
const allMultiSelectOptions = new Map(
    exameFisicoNeoGroups.flatMap(g => g.options.map(o => [o.id, { label: o.label, template: o.template }]))
);


// Helper TabPanel (Corrigido para manter estado)
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            style={{ display: value !== index ? 'none' : 'block' }} // Mantém estado
            hidden={value !== index}
            id={`neo-tabpanel-${index}`}
            {...other}
        >
            <Box sx={{ p: { xs: 1, sm: 2 } }}>{children}</Box>
        </div>
    );
}

// --- Componente Principal ---
export default function AtendimentoNeonatologia({ pacienteId, onEvolucaoSalva }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tabIndex, setTabIndex] = useState(0);

    // Estados da Consulta Atual
    const [vitalsData, setVitalsData] = useState({}); // Seção V do PDF
    const [evolucaoDiaria, setEvolucaoDiaria] = useState({ dieta: '', diurese: '', evacuacao: '' });
    const [exameFisicoData, setExameFisicoData] = useState({}); // Seção VII (JSON de arrays)
    const [soapData, setSoapData] = useState({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });

    // Reseta estados ao trocar de paciente
    useEffect(() => {
        setSoapData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
        setExameFisicoData({});
        setVitalsData({});
        setEvolucaoDiaria({ dieta: '', diurese: '', evacuacao: '' });
        setTabIndex(0);
    }, [pacienteId]);

    // --- Geradores de texto ATUALIZADOS ---
    const generateSubjetivo = useCallback(() => {
        // Usamos os campos da Seção V e a evolução diária
        return `RN com ${vitalsData.dias_vida || '___'} dias de vida, IGC ${vitalsData.igc_semanas || '__'}s ${vitalsData.igc_dias || '_'}d.\nMedicações em uso: ${vitalsData.medicacoes || 'Nenhuma'}.\nObservações: ${vitalsData.observacoes || 'Nenhuma'}\n\nDieta: ${evolucaoDiaria.dieta || 'Não informado'}\nDiurese: ${evolucaoDiaria.diurese || 'Não informado'}\nEvacuação: ${evolucaoDiaria.evacuacao || 'Não informado'}`;
    }, [vitalsData, evolucaoDiaria]);

    const generateObjetivo = useCallback(() => {
        let texto = `Dados Vitais:\nPeso: ${vitalsData.peso || '___'} g\nCompr: ${vitalsData.comprimento || '___'} cm\nPC: ${vitalsData.pc || '___'} cm\n\nExame Físico:\n`;
        
        // Loop sobre os grupos de Multi-Select (Pele, Olhos, etc.)
        const achados = exameFisicoNeoGroups.flatMap(group => {
            const selectedValues = exameFisicoData[group.id]; // Ex: ['normal', 'petequias']
            if (!selectedValues || selectedValues.length === 0) return [];
            
            // Mapeia cada valor (id) para seu template
            return selectedValues.map(valueId => {
                const option = allMultiSelectOptions.get(valueId);
                return option ? option.template : '';
            });
        }).filter(Boolean).join(" ");
        
        return texto + (achados || "Nenhuma observação selecionada.");
    }, [vitalsData, exameFisicoData]);

    // Efeitos que atualizam SOAP
    useEffect(() => {
        setSoapData(prev => ({ ...prev, notas_subjetivas: generateSubjetivo() }));
    }, [vitalsData, evolucaoDiaria, generateSubjetivo]);

    useEffect(() => {
        setSoapData(prev => ({ ...prev, notas_objetivas: generateObjetivo() }));
    }, [vitalsData, exameFisicoData, generateObjetivo]);

    // Handlers
    const handleTabChange = (event, newIndex) => { setTabIndex(newIndex); };
    const handleSoapChange = (e) => setSoapData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleVitalsChange = (e) => setVitalsData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleEvolucaoDiariaChange = (e) => setEvolucaoDiaria(prev => ({ ...prev, [e.target.name]: e.target.value }));

    // Handler para os Multi-Select ComboBoxes
    const handleExameChange = (event) => {
        const { name, value } = event.target;
        setExameFisicoData(prev => ({
            ...prev,
            [name]: typeof value === 'string' ? value.split(',') : value,
        }));
    };

    // Botão Normalidade (Baseado no PDF )
    const preencherNormalidade = () => {
        setExameFisicoData({
            avaliacao_geral: ['normal'],
            pele: ['normal'],
            cabeca: ['normal'],
            olhos: ['normal'],
            orofaringe: ['normal'],
            pescoco: ['normal'],
            respiratorio: ['normal'],
            cardiovascular: ['normal'],
            abdome: ['normal'],
            cordao_umbilical: ['normal'],
            genitalia_anus: ['normal'],
            extremidades: ['normal'],
            coluna: ['normal'],
            neurologico: ['normal'],
            reflexos: ['normal'],
        });
        setVitalsData(prev => ({ ...prev })); // Mantém vitais
        setEvolucaoDiaria({ dieta: 'Seno materno sob livre demanda', diurese: 'Presente', evacuacao: 'Presente' });
        showSnackbar('Exame físico preenchido com padrão normal.', 'info');
     };

    // Botão Limpar
    const handleLimparConsultaAtual = () => {
        setExameFisicoData({});
        setVitalsData({});
        setEvolucaoDiaria({ dieta: '', diurese: '', evacuacao: '' });
        setSoapData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
        showSnackbar('Campos da consulta atual limpos.', 'info');
    };

    // handleSubmit
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            // O modelo Evolucao tem campos para Peso e Altura (Compr).
            // O PDF [cite: 106-108] pede Peso (g) e Compr (cm). Ajuste seu backend se necessário.
            const soapPayload = { 
                ...soapData,
                peso: vitalsData.peso ? (parseFloat(vitalsData.peso) / 1000).toFixed(2) : null, // Converte g para kg
                altura: vitalsData.comprimento ? (parseFloat(vitalsData.comprimento) / 100).toFixed(2) : null, // Converte cm para m
            };

            await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes/`, soapPayload);
            showSnackbar('Evolução salva com sucesso!', 'success');
            if(onEvolucaoSalva) onEvolucaoSalva();
            handleLimparConsultaAtual();

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

                         {/* Subjetivo (Seção V do PDF [cite: 101-109] + Evolução Diária) */}
                         <Typography variant="body1" sx={{ mt: 1, fontWeight: 'medium' }}>Dados da Consulta e Evolução (S)</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, my: 1.5 }}>
                            <TextField label="Dias de Vida" name="dias_vida" type="number" value={vitalsData.dias_vida || ''} onChange={handleVitalsChange} size="small" sx={{minWidth: '80px', flex: '1 1 80px'}}/>
                            <TextField label="IGC (Sem)" name="igc_semanas" type="number" value={vitalsData.igc_semanas || ''} onChange={handleVitalsChange} size="small" sx={{minWidth: '80px', flex: '1 1 80px'}}/>
                            <TextField label="IGC (Dias)" name="igc_dias" type="number" value={vitalsData.igc_dias || ''} onChange={handleVitalsChange} size="small" sx={{minWidth: '80px', flex: '1 1 80px'}}/>
                            <TextField label="Medicações em Uso" name="medicacoes" value={vitalsData.medicacoes || ''} onChange={handleVitalsChange} size="small" sx={{minWidth: '150px', flex: '1 1 150px'}}/>
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, my: 1.5 }}>
                            <TextField name="dieta" label="Dieta" fullWidth value={evolucaoDiaria.dieta} onChange={handleEvolucaoDiariaChange} size="small" sx={{minWidth: 150, flex: '1 1 150px'}} placeholder="Tipo, Volume, Aceitação"/>
                            <TextField name="diurese" label="Diurese" fullWidth value={evolucaoDiaria.diurese} onChange={handleEvolucaoDiariaChange} size="small" sx={{minWidth: 150, flex: '1 1 150px'}} placeholder="Presente, Ausente, Fraldas"/>
                            <TextField name="evacuacao" label="Evacuação" fullWidth value={evolucaoDiaria.evacuacao} onChange={handleEvolucaoDiariaChange} size="small" sx={{minWidth: 150, flex: '1 1 150px'}} placeholder="Presente, Ausente, Aspecto"/>
                        </Box>
                        <TextField label="Observações (Queixas da Mãe, etc.)" name="observacoes" value={vitalsData.observacoes || ''} onChange={handleVitalsChange} size="small" fullWidth multiline rows={2} />
                        
                        {/* Campo S (Gerado) */}
                        <TextField name="notas_subjetivas" label="Subjetivo (Gerado / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_subjetivas || ''} onChange={handleSoapChange} size="small" sx={{mt: 1.5}}/>

                        <Divider sx={{ my: 2 }} />

                        {/* Objetivo (Seção V - Vitals + Seção VII - Exame [cite: 106, 117]) */}
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Exame Físico (O)</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, my: 1.5 }}>
                            <TextField label="Peso (g)" name="peso" type="number" value={vitalsData.peso || ''} onChange={handleVitalsChange} size="small" sx={{minWidth: '80px', flex: '1 1 80px'}}/>
                            <TextField label="Compr. (cm)" name="comprimento" type="number" value={vitalsData.comprimento || ''} onChange={handleVitalsChange} size="small" sx={{minWidth: '80px', flex: '1 1 80px'}}/>
                            <TextField label="PC (cm)" name="pc" type="number" value={vitalsData.pc || ''} onChange={handleVitalsChange} size="small" sx={{minWidth: '80px', flex: '1 1 80px'}}/>
                            {/* Pode adicionar FC, FR, Temp, SpO2 aqui se o médico medir na consulta */}
                        </Box>
                        
                        {/* Exame Físico Multi-Select (Seção VII ) */}
                        <FormGroup sx={{ p: { xs: 1, sm: 2 }, border: '1px solid #ddd', borderRadius: 1 }}>
                            {exameFisicoNeoGroups.map((group, index) => (
                                <Box key={group.id}>
                                    {index > 0 && <Divider sx={{ my: 1.5 }} />}
                                    <FormControl 
                                        size="small" 
                                        fullWidth 
                                        sx={{ mt: index > 0 ? 1.5 : 0 }}
                                    >
                                        <InputLabel id={`${group.id}-multi-select-label`}>{group.label}</InputLabel>
                                        <Select
                                            labelId={`${group.id}-multi-select-label`}
                                            id={`${group.id}-multi-select`}
                                            multiple
                                            name={group.id}
                                            value={exameFisicoData[group.id] || []}
                                            onChange={handleExameChange}
                                            label={group.label}
                                            input={<OutlinedInput label={group.label} />}
                                            renderValue={(selected) => (
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                    {selected.map((valueId) => (
                                                        <Chip 
                                                            key={valueId} 
                                                            label={(allMultiSelectOptions.get(valueId) || {}).label || valueId}
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
                                </Box>
                            ))}
                        </FormGroup>
                        
                        {/* Campo O (Gerado) */}
                        <TextField name="notas_objetivas" label="Objetivo (Gerado / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_objetivas || ''} onChange={handleSoapChange} size="small" sx={{mt: 1.5}}/>

                        <Divider sx={{ my: 2 }} />

                        {/* Avaliação e Plano */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField name="avaliacao" label="Avaliação / Hipóteses (A)" multiline rows={3} fullWidth value={soapData.avaliacao || ''} onChange={handleSoapChange} size="small" />
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