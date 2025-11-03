// src/components/prontuario/AtendimentoNeonatologia.jsx
// VERSÃO FINAL (Baseada nos rascunhos e vídeos)

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import {
    Paper, Typography, TextField, Box, Button, CircularProgress, Tabs, Tab,
    Grid, FormGroup, FormControlLabel, Checkbox, Divider,
    FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

// --- IMPORT DA ABA DE HISTÓRICO ---
const HistoricoNeonatologia = lazy(() => import('./neonatologia/HistoricoNeonatologia'));

// --- ESTRUTURA DO EXAME FÍSICO (Baseado nos Rascunhos) ---
// 100% ComboBoxes de Seleção Única
const exameFisicoNeoGroups = [
    // --- GERAL ---
    { id: 'avaliacao_geral', label: 'Avaliação Geral', options: [{ value: 'BEG', label: 'BEG', template: 'Bom Estado Geral (BEG).'}, { value: 'REG', label: 'REG', template: 'Regular Estado Geral (REG).'}, { value: 'MEG', label: 'MEG', template: 'Mau Estado Geral (MEG).'}] },
    { id: 'cor', label: 'Coloração', options: [{ value: 'Corado', label: 'Corado', template: 'Corado.'}, { value: 'Descorado', label: 'Descorado', template: 'Descorado.'}, { value: 'Icterico', label: 'Ictérico', template: 'Ictérico (Zona ___).'}, { value: 'Cianotico', label: 'Cianótico', template: 'Cianótico.'}] },
    { id: 'hidratacao', label: 'Hidratação', options: [{ value: 'Hidratado', label: 'Hidratado', template: 'Hidratado.'}, { value: 'Desidratado', label: 'Desidratado', template: 'Desidratado.'}] },
    { id: 'estado_febril', label: 'Temperatura', options: [{ value: 'Afebril', label: 'Afebril', template: 'Afebril ao toque.'}, { value: 'Febril', label: 'Febril', template: 'Febril ao toque.'}] },
    { id: 'atividade', label: 'Atividade', options: [{ value: 'Ativo', label: 'Ativo', template: 'Ativo.'}, { value: 'Hipoativo', label: 'Hipoativo', template: 'Hipoativo.'}, { value: 'Letargico', label: 'Letárgico', template: 'Letárgico.'}] },
    { id: 'reatividade', label: 'Reatividade', options: [{ value: 'Reativo', label: 'Reativo', template: 'Reativo.'}, { value: 'Hiporreativo', label: 'Hiporreativo', template: 'Hiporreativo.'}, { value: 'Irritado', label: 'Irritado', template: 'Irritado.'}] },
    // --- PELE ---
    { id: 'pele_lesoes', label: 'Pele (Lesões)', options: [{ value: 'Integra', label: 'Íntegra / Sem Lesões', template: 'Pele íntegra, sem lesões.'}, { value: 'Eritema', label: 'Eritema Tóxico', template: 'Eritema tóxico neonatal.'}, { value: 'Petequias', label: 'Petéquias', template: 'Petéquias presentes.'}, { value: 'Outras', label: 'Outras Lesões', template: 'Lesões cutâneas (descrever).'}] },
    // --- CABEÇA E PESCOÇO ---
    { id: 'fontanela', label: 'Fontanela Anterior', options: [{ value: 'Normotensa', label: 'Normotensa', template: 'Fontanela anterior normotensa.'}, { value: 'Abaulada', label: 'Abaulada', template: 'Fontanela anterior abaulada.'}, { value: 'Deprimida', label: 'Deprimida', template: 'Fontanela anterior deprimida.'}] },
    { id: 'suturas', label: 'Suturas', options: [{ value: 'Normais', label: 'Normais', template: 'Suturas cranianas normais.'}, { value: 'Acavalgadas', label: 'Acavalgadas', template: 'Suturas acavalgadas.'}, { value: 'Diastase', label: 'Diástase', template: 'Diástase de suturas.'}] },
    { id: 'pescoco', label: 'Pescoço', options: [{ value: 'Livre', label: 'Livre / Indolor', template: 'Pescoço livre, sem massas.'}, { value: 'Massas', label: 'Massas / Gânglios', template: 'Massas ou gânglios palpáveis.'}, { value: 'Retracoes', label: 'Retrações', template: 'Retrações cervicais.'}] },
    // --- OLHOS ---
    { id: 'olhos_estado', label: 'Olhos (Estado)', options: [{ value: 'Normal', label: 'Normal', template: 'Pupilas isocóricas. Conjuntivas coradas.'}, { value: 'Hiperemia', label: 'Hiperemia Conjuntival', template: 'Hiperemia conjuntival.'}, { value: 'Edema', label: 'Edema Palpebral', template: 'Edema palpebral.'}] },
    { id: 'olhos_secrecao', label: 'Secreção Ocular', options: [{ value: 'Ausente', label: 'Ausente', template: 'Sem secreção ocular.'}, { value: 'Presente', label: 'Presente', template: 'Secreção ocular presente.'}] },
    { id: 'reflexo_vermelho', label: 'Reflexo Vermelho', options: [{ value: 'Presente', label: 'Presente', template: 'Reflexo vermelho presente.'}, { value: 'Ausente', label: 'Ausente', template: 'Reflexo vermelho ausente.'}] },
    // --- ORL ---
    { id: 'orofaringe', label: 'Orofaringe', options: [{ value: 'Normal', label: 'Normal', template: 'Orofaringe normal, palato íntegro.'}, { value: 'Frenulo_curto', label: 'Frênulo Curto', template: 'Frênulo lingual curto.'}, { value: 'Outros', label: 'Alterada', template: 'Orofaringe alterada (descrever).'}] },
    // --- RESPIRATÓRIO ---
    { id: 'respiratorio_padrao', label: 'Padrão Respiratório', options: [{ value: 'Eupneico', label: 'Eupneico', template: 'Eupneico, boa expansibilidade.'}, { value: 'Dispneico', label: 'Dispneico/Taquipneico', template: 'Dispneico/Taquipneico, com retrações.'}] },
    { id: 'respiratorio_ausculta', label: 'Ausculta Respiratória', options: [{ value: 'Normal', label: 'MV+ s/ RA', template: 'MV presente bilateralmente, sem ruídos adventícios.'}, { value: 'Roncos', label: 'Roncos', template: 'Roncos.'}, { value: 'Sibilos', label: 'Sibilos', template: 'Sibilos.'}, { value: 'Estertores', label: 'Estertores', template: 'Estertores.'}] },
    // --- CARDIOVASCULAR ---
    { id: 'cardio_ritmo', label: 'Ritmo Cardíaco', options: [{ value: 'Normal', label: 'BRNF 2T', template: 'BRNF em 2T.'}, { value: 'Arritmia', label: 'Arritmia', template: 'Ritmo arrítmico.'}] },
    { id: 'cardio_sopros', label: 'Sopros', options: [{ value: 'Ausentes', label: 'Ausentes', template: 'Sem sopros.'}, { value: 'Presentes', label: 'Presentes', template: 'Sopro (descrever /6+).'}] },
    { id: 'cardio_perfusao', label: 'Perfusão', options: [{ value: 'Normal', label: 'Perfusão < 3s', template: 'Perfusão periférica < 3s.'}, { value: 'Lenta', label: 'Perfusão > 3s', template: 'Perfusão lentificada.'}] },
    // --- ABDOME ---
    { id: 'abdome_forma', label: 'Abdome (Forma)', options: [{ value: 'Plano', label: 'Plano', template: 'Abdome plano.'}, { value: 'Globoso', label: 'Globoso', template: 'Abdome globoso.'}, { value: 'Distendido', label: 'Distendido', template: 'Abdome distendido.'}] },
    { id: 'abdome_rha', label: 'Abdome (RHA)', options: [{ value: 'Presentes', label: 'RHA Presentes', template: 'RHA presentes.'}, { value: 'Aumentados', label: 'RHA Aumentados', template: 'RHA aumentados.'}, { value: 'Diminuidos', label: 'RHA Diminuídos', template: 'RHA diminuídos.'}, { value: 'Ausentes', label: 'RHA Ausentes', template: 'RHA ausentes.'}] },
    { id: 'abdome_palpacao', label: 'Abdome (Palpação)', options: [{ value: 'Flacido', label: 'Flácido/Indolor', template: 'Abdome flácido, indolor.'}, { value: 'Doloroso', label: 'Doloroso', template: 'Abdome doloroso à palpação.'}, { value: 'Massas', label: 'Massas Palpáveis', template: 'Massa palpável em ___.'}] },
    { id: 'abdome_viscero', label: 'Abdome (Viscerom.)', options: [{ value: 'Ausentes', label: 'Ausentes', template: 'Sem visceromegalias.'}, { value: 'Hepatomegalia', label: 'Hepatomegalia', template: 'Hepatomegalia.'}, { value: 'Esplenomegalia', label: 'Esplenomegalia', template: 'Esplenomegalia.'}] },
    // --- CORDÃO UMBILICAL ---
    { id: 'cordao', label: 'Cordão Umbilical', options: [{ value: 'NaoAplica', label: 'Não se aplica', template: ''}, { value: 'Normal', label: 'Seco, sem sinais flogísticos', template: 'Coto umbilical seco, sem sinais flogísticos.'}, { value: 'Alterado', label: 'Alterado (Eritema/Secreção)', template: 'Coto umbilical com hiperemia/secreção.'}] },
    // --- GENITÁLIA E ÂNUS ---
    { id: 'genitalia', label: 'Genitália', options: [{ value: 'Normal', label: 'Normal/Tópica', template: 'Genitália tópica, sem alterações.'}, { value: 'Anormal', label: 'Anormal', template: 'Genitália anormal (descrever).'}] },
    { id: 'anus', label: 'Ânus', options: [{ value: 'Pervio', label: 'Pérvio', template: 'Ânus pérvio.'}, { value: 'Imperfurado', label: 'Imperfurado', template: 'Ânus imperfurado.'}] },
    // --- MEMBROS E COLUNA ---
    { id: 'membros_coluna', label: 'Membros e Coluna', options: [{ value: 'Normal', label: 'Normais, alinhados', template: 'Membros e coluna sem alterações. Ortolani negativo.'}, { value: 'Fosseta', label: 'Fosseta Sacral', template: 'Fosseta sacral.'}, { value: 'Alterado', label: 'Alterado', template: 'Alteração em membros/coluna (descrever).'}] },
    { id: 'pulsos', label: 'Pulsos (Membros)', options: [{ value: 'Simetricos', label: 'Simétricos/Cheios', template: 'Pulsos simétricos e cheios.'}, { value: 'Assimetricos', label: 'Assimétricos/Diminuídos', template: 'Pulsos assimétricos ou diminuídos.'}] },
    // --- NEUROLÓGICO ---
    { id: 'neuro_tonus', label: 'Tônus', options: [{ value: 'Normal', label: 'Tônus Normal', template: 'Tônus normal, ativo.'}, { value: 'Hipotonia', label: 'Hipotonia', template: 'Hipotonia.'}, { value: 'Hipertonia', label: 'Hipertonia', template: 'Hipertonia.'}] },
    { id: 'neuro_reflexos', label: 'Reflexos Primitivos', options: [{ value: 'Normais', label: 'Normais/Presentes', template: 'Reflexos primitivos presentes.'}, { value: 'Anormais', label: 'Anormais/Ausentes', template: 'Reflexos primitivos alterados ou ausentes.'}] },
    { id: 'sinais_meningeos', label: 'Sinais Meníngeos', options: [{ value: 'Ausentes', label: 'Ausentes', template: 'Sinais meníngeos ausentes.'}, { value: 'Presentes', label: 'Presentes', template: 'Sinais meníngeos presentes.'}] },
];
// --- FIM EXAME FÍSICO ---


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
        return `RN com ${vitalsData.dias_vida || '___'} dias de vida, IGC ${vitalsData.igc_semanas || '__'}s ${vitalsData.igc_dias || '_'}d.\nMedicações em uso: ${vitalsData.medicacoes || 'Nenhuma'}.\nObservações: ${vitalsData.observacoes || 'Nenhuma'}\n\nEvolução diária:\nDieta: ${evolucaoDiaria.dieta || 'Não informado'}\nDiurese: ${evolucaoDiaria.diurese || 'Não informado'}\nEvacuação: ${evolucaoDiaria.evacuacao || 'Não informado'}`;
    }, [vitalsData, evolucaoDiaria]);

    const generateObjetivo = useCallback(() => {
        let texto = `Dados Vitais:\nPeso: ${vitalsData.peso || '___'} g\nCompr: ${vitalsData.comprimento || '___'} cm\nPC: ${vitalsData.pc || '___'} cm\n\nExame Físico:\n`;
        
        // Loop sobre os grupos de ComboBox
        const achados = exameFisicoNeoGroups.map(group => {
            const selectedValue = exameFisicoData[group.id];
            if (!selectedValue || selectedValue === 'Nenhum' || selectedValue === 'NaoAplica') return null;
            
            const option = group.options.find(opt => opt.value === selectedValue);
            return option ? option.template : '';
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
    const handleExameChange = (e) => setExameFisicoData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    // Botão Normalidade (Baseado no PDF e Rascunhos)
    const preencherNormalidade = () => {
        setExameFisicoData({
            avaliacao_geral: 'BEG',
            cor: 'Corado',
            hidratacao: 'Hidratado',
            estado_febril: 'Afebril',
            atividade: 'Ativo',
            reatividade: 'Reativo',
            pele_lesoes: 'Integra',
            fontanela: 'Normotensa',
            suturas: 'Normais',
            pescoco: 'Livre',
            olhos_estado: 'Normal',
            olhos_secrecao: 'Ausente',
            reflexo_vermelho: 'Presente',
            orofaringe: 'Normal',
            respiratorio_padrao: 'Eupneico',
            respiratorio_ausculta: 'Normal',
            cardio_ritmo: 'Normal',
            cardio_sopros: 'Ausentes',
            cardio_perfusao: 'Normal',
            abdome_forma: 'Plano',
            abdome_rha: 'Presentes',
            abdome_palpacao: 'Flacido',
            abdome_viscero: 'Ausentes',
            cordao: 'NaoAplica',
            genitalia: 'Normal',
            anus: 'Pervio',
            membros_coluna: 'Normal',
            pulsos: 'Simetricos',
            neuro_tonus: 'Normal',
            neuro_reflexos: 'Normais',
            sinais_meningeos: 'Ausentes',
        });
        setVitalsData(prev => ({ ...prev })); // Mantém vitais já digitados
        setEvolucaoDiaria({ dieta: 'Seno materno sob livre demanda', diurese: 'Presente', evacuacao: 'Presente' });
        showSnackbar('Exame físico preenchido com padrão normal.', 'info');
     };

    // Botão Limpar
    const handleLimparConsultaAtual = () => {
        setExameFisicoData({});
        setVitalsData({}); // Limpa também os vitais da consulta
        setEvolucaoDiaria({ dieta: '', diurese: '', evacuacao: '' });
        setSoapData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
        showSnackbar('Campos da consulta atual limpos.', 'info');
    };

    // handleSubmit
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            const soapPayload = { 
                ...soapData,
                // Converte g para kg e cm para m, se o modelo Evolucao esperar assim
                peso: vitalsData.peso ? (parseFloat(vitalsData.peso) / 1000).toFixed(3) : null,
                altura: vitalsData.comprimento ? (parseFloat(vitalsData.comprimento)).toFixed(2) : null, // Assumindo que Evolucao.altura é cm
                // Se Evolucao.altura for metros, use: (parseFloat(vitalsData.comprimento) / 100).toFixed(2)
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

                         {/* Subjetivo (Seção V do PDF  + Evolução Diária) */}
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

                        {/* Objetivo (Seção V - Vitals + Seção VII - Exame) */}
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Exame Físico (O)</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, my: 1.5 }}>
                            <TextField label="Peso (g)" name="peso" type="number" value={vitalsData.peso || ''} onChange={handleVitalsChange} size="small" sx={{minWidth: '80px', flex: '1 1 80px'}}/>
                            <TextField label="Compr. (cm)" name="comprimento" type="number" value={vitalsData.comprimento || ''} onChange={handleVitalsChange} size="small" sx={{minWidth: '80px', flex: '1 1 80px'}}/>
                            <TextField label="PC (cm)" name="pc" type="number" value={vitalsData.pc || ''} onChange={handleVitalsChange} size="small" sx={{minWidth: '80px', flex: '1 1 80px'}}/>
                        </Box>
                        
                        {/* Exame Físico 100% ComboBox, SEPARADO POR SEÇÕES */}
                        <FormGroup sx={{ p: { xs: 1, sm: 2 }, border: '1px solid #ddd', borderRadius: 1 }}>
                            {(() => {
                                const secoes = [
                                    { titulo: 'Geral e Pele', ids: ['avaliacao_geral', 'cor', 'hidratacao', 'estado_febril', 'atividade', 'reatividade', 'pele_lesoes'] },
                                    { titulo: 'Cabeça, Pescoço e ORL', ids: ['fontanela', 'suturas', 'pescoco', 'olhos_estado', 'olhos_secrecao', 'reflexo_vermelho', 'orofaringe'] },
                                    { titulo: 'Respiratório e Cardiovascular', ids: ['respiratorio_padrao', 'respiratorio_ausculta', 'cardio_ritmo', 'cardio_sopros', 'cardio_perfusao'] },
                                    { titulo: 'Abdome e Genitália', ids: ['abdome_forma', 'abdome_rha', 'abdome_palpacao', 'abdome_viscero', 'cordao', 'genitalia', 'anus'] },
                                    { titulo: 'Membros e Neurológico', ids: ['membros_coluna', 'pulsos', 'neuro_tonus', 'neuro_reflexos', 'sinais_meningeos'] },
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
                                            {exameFisicoNeoGroups
                                                .filter(group => secao.ids.includes(group.id))
                                                .map(group => renderSelect(group))
                                            }
                                        </Box>
                                    </Box>
                                ));
                            })()}
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