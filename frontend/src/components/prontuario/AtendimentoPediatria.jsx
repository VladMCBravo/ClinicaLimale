// src/components/prontuario/AtendimentoPediatria.jsx - VERSÃO UNIFICADA ("SUPER-FORMULÁRIO")

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Paper, Typography, Grid, FormGroup, FormControlLabel, Checkbox, TextField, Divider, RadioGroup, Radio,
    FormControl, InputLabel, Select, MenuItem, Box, Button, CircularProgress 
} from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

// 1. COPIAMOS A LÓGICA DE TEMPLATES DO AnamnesePediatria.jsx
const dnpmOptions = [
  { id: 'sustenta_cabeca', label: 'Sustenta a cabeça (~3m)' },
  { id: 'sorri_social', label: 'Sorriso social (~3m)' },
  { id: 'senta_com_apoio', label: 'Senta com apoio (~6m)' },
  { id: 'engatinha', label: 'Engatinha (~9m)' },
  { id: 'anda', label: 'Anda (~12-15m)' },
  { id: 'primeiras_palavras', label: 'Primeiras palavras (~12m)' },
  { id: 'frases_simples', label: 'Frases simples (~24m)' },
  { id: 'controle_esfincter', label: 'Controle de esfíncteres' },
];

const sintomasOptions = [
    { id: 'febre', label: 'Febre' },
    { id: 'tosse', label: 'Tosse' },
    { id: 'coriza', label: 'Coriza' },
    { id: 'vomitos', label: 'Vômitos' },
    { id: 'diarreia', label: 'Diarreia' },
    { id: 'irritabilidade', label: 'Irritabilidade / Choro' },
    { id: 'prostracao', label: 'Prostração / Sonolência' },
    { id: 'exantema', label: 'Exantema (Manchas)' },
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
// NOVO: Opções para o Exame Físico detalhado
const exameFisicoQualitativoOptions = [
    { id: 'estado_geral_bom', label: 'Bom', group: 'estado_geral', template: "BEG (Bom Estado Geral)." },
    { id: 'estado_geral_regular', label: 'Regular', group: 'estado_geral', template: "REG (Regular Estado Geral)." },
    { id: 'estado_geral_ruim', label: 'Ruim', group: 'estado_geral', template: "MEG (Mau Estado Geral)." },
    { id: 'corado', label: 'Corado', group: 'pele', template: "Corado." },
    { id: 'hidratado', label: 'Hidratado', group: 'pele', template: "Hidratado." },
    { id: 'eupneico', label: 'Eupneico', group: 'respiratorio', template: "Eupneico, FR=___." },
    { id: 'oroscopia_normal', label: 'Normal', group: 'oroscopia', template: "Oroscopia sem alterações." },
    { id: 'oroscopia_hiperemia', label: 'Hiperemia', group: 'oroscopia', template: "Oroscopia: Hiperemia de orofaringe." },
    { id: 'acv_brnf', label: 'BRNF s/ sopros', group: 'cardiaco', template: "ACV: BRNF em 2T, sem sopros." },
    { id: 'ar_mv_presente', label: 'MV presente s/ RA', group: 'respiratorio', template: "AR: MV presente universalmente, sem ruídos adventícios." },
    { id: 'abdome_flacido', label: 'Flácido/Indolor', group: 'abdome', template: "Abdome: Flácido, indolor à palpação, RHA+." },
    // Adicione mais opções conforme a imagem
];
// --- FIM DAS OPÇÕES ---

export default function AtendimentoPediatria({ pacienteId, onEvolucaoSalva }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Estado para Anamnese (Histórico)
    const [anamneseData, setAnamneseData] = useState({ pediatrica: {}, dnpm: {}, sintomas: {} });
    // NOVO: Estado para Exame Físico Detalhado
    const [exameFisicoData, setExameFisicoData] = useState({});
    
    // Estado para SOAP (Evolução)
    const [soapData, setSoapData] = useState({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });

    // Carrega anamnese histórica
    useEffect(() => {
        // ... (lógica igual à anterior para buscar anamnese) ...
        apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`)
            .then(res => {
                setAnamneseData({
                    pediatrica: res.data.pediatrica || {},
                    dnpm: res.data.pediatrica?.dnpm || {},
                    sintomas: {}, 
                });
                // NOVO: Pré-preenche Exame Físico se houver dados na anamnese
                setExameFisicoData(res.data.pediatrica || {});
            })
            .catch(err => {
                // 404 é normal, só significa que não há histórico
                if (err.response && err.response.status !== 404) {
                    showSnackbar('Erro ao carregar histórico de anamnese.', 'error');
                }
            });
    }, [pacienteId, showSnackbar]);


    // Gerador de HDA (Subjetivo)
    const generateHda = useCallback(() => {
        return sintomasOptions
            .filter(opt => anamneseData.sintomas[opt.id])
            .map(opt => sintomaTemplates[opt.id])
            .join('\n');
    }, [anamneseData.sintomas]);
// NOVO: Gerador de Exame Físico (Objetivo)
    const generateExameFisico = useCallback(() => {
        let texto = `Dados Vitais:\nPeso: ${exameFisicoData.peso || '___'} kg\nAltura: ${exameFisicoData.altura || '___'} cm\nPC: ${exameFisicoData.pc || '___'} cm\nT: ${exameFisicoData.temperatura || '___'} °C\n\nExame Físico:\n`;
        
        const achados = exameFisicoQualitativoOptions
            .filter(opt => exameFisicoData[opt.id])
            .map(opt => opt.template)
            .join(" ");
        
        return texto + (achados || "Nenhuma observação selecionada.");
    }, [exameFisicoData]);
    // Efeito que ATUALIZA o SOAP quando os checkboxes mudam
    useEffect(() => {
        const hdaText = generateHda();
        setSoapData(prev => ({
            ...prev,
            notas_subjetivas: hdaText || (prev.notas_subjetivas || '')
        }));
    }, [anamneseData.sintomas, generateHda]);
    // NOVO: Efeito que atualiza notas_objetivas
    useEffect(() => {
        const exameText = generateExameFisico();
        setSoapData(prev => ({ ...prev, notas_objetivas: exameText }));
    }, [exameFisicoData, generateExameFisico]);

    // Handlers para os campos
    const handleSoapChange = (e) => {
        setSoapData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSintomasChange = (event) => {
        const { name, checked } = event.target;
        setAnamneseData(prev => ({ ...prev, sintomas: { ...prev.sintomas, [name]: checked } }));
    };
    
    // Handlers para os campos de ANAMNESE (Histórico)
    const handlePediatricaChange = (name, value) => {
        setAnamneseData(prev => ({ ...prev, pediatrica: { ...prev.pediatrica, [name]: value } }));
    };
    
    const handleDnpmChange = (event) => {
        const { name, checked } = event.target;
        setAnamneseData(prev => ({ ...prev, dnpm: { ...prev.dnpm, [name]: checked } }));
    };
    // NOVO: Handler para Exame Físico (inputs e checkboxes)
    const handleExameChange = (event) => {
        const { name, value, type, checked } = event.target;
        setExameFisicoData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };
    // Botão de Normalidade (Agora preenche o SOAP)
    const preencherNormalidade = () => {
        setAnamneseData(prev => ({ ...prev, sintomas: {} })); 
        // NOVO: Marca checkboxes normais do exame
        setExameFisicoData(prev => ({
            ...prev, // Mantém peso/altura digitados
            estado_geral_bom: true, estado_geral_regular: false, estado_geral_ruim: false,
            corado: true, hidratado: true, eupneico: true,
            oroscopia_normal: true, oroscopia_hiperemia: false,
            acv_brnf: true, ar_mv_presente: true, abdome_flacido: true,
        }));
        // Atualiza SOAP com texto normal
        setSoapData({
            notas_subjetivas: 'Mãe nega queixas. Criança ativa, reativa, alimentando-se bem (SME), diurese e evacuações presentes.',
            notas_objetivas: `Dados Vitais:\nPeso: ${exameFisicoData.peso || '___'} kg\nAltura: ${exameFisicoData.altura || '___'} cm\nPC: ${exameFisicoData.pc || '___'} cm\nT: ${exameFisicoData.temperatura || '___'} °C\n\nExame Físico:\nBEG (Bom Estado Geral). Corado. Hidratado. Eupneico, FR=___. Oroscopia sem alterações. ACV: BRNF em 2T, sem sopros. AR: MV presente universalmente, sem ruídos adventícios. Abdome: Flácido, indolor à palpação, RHA+.`,
            avaliacao: 'Criança hígida, sem sinais de alarme. Desenvolvimento adequado para a idade.',
            plano: 'Sigo com orientações gerais, manutenção do aleitamento materno. Alta da consulta.'
        });
    };

    // Submit (Salva AMBOS os formulários)
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        
        // 1. Salva a EVOLUÇÃO (SOAP)
        try {
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes/`, soapData);
            showSnackbar('Evolução salva com sucesso!', 'success');
            
            // Limpa o SOAP para a próxima
            setSoapData({
                notas_subjetivas: '',
                notas_objetivas: 'BEG, corado, hidratado, eupneico. Oroscopia sem alterações. ACV: BRNF 2T, sem sopros. AR: MVU presente, sem RA. Abdome: Flácido, indolor, RHA+.',
                avaliacao: '',
                plano: ''
            });
            setAnamneseData(prev => ({ ...prev, sintomas: {} })); // Limpa checkboxes
            if(onEvolucaoSalva) onEvolucaoSalva();

        } catch (error) {
            showSnackbar('Erro ao salvar evolução.', 'error');
            setIsSubmitting(false);
            return; // Para se a evolução falhar
        }

        // 2. Salva a ANAMNESE (Histórico) - (POST ou PUT)
        try {
            // Prepara os dados da anamnese para salvar
            const anamnesePayload = {
                ...anamneseData.pediatrica, // Campos como tipo_parto, etc.
                dnpm: anamneseData.dnpm,
                // Não salvamos 'sintomas' no histórico, apenas na evolução
            };

            // Tenta dar PUT (atualizar) se já existe, ou POST (criar) se for a primeira vez
            // (Esta lógica depende do seu AnamneseSerializer no backend)
            // Vamos simplificar e usar o POST (que o AnamneseTab usava)
            
            // ATENÇÃO: Esta parte depende da sua view de Anamnese (PUT ou POST)
            // Vamos assumir que a view de Anamnese aceita um POST para criar/atualizar
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/anamnese/`, {
                pediatrica: anamnesePayload
            });
            showSnackbar('Histórico de anamnese atualizado.', 'info');

        } catch (error) {
            showSnackbar('Erro ao salvar histórico de anamnese.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        // Usamos Paper, mas sem 'component="form"' pois o botão de submit está no final
        <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Evolução do Dia (Pediatria/Neonatologia)
                </Typography>
                 <Button variant="outlined" size="small" onClick={preencherNormalidade}>
                    Preencher Normalidade
                </Button>
            </Box>

            {/* --- FORMULÁRIO DE ANAMNESE (HISTÓRICO) --- */}
            {/* Copiado do AnamnesePediatria.jsx e layout corrigido com <Box> */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderColor: 'primary.main' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Anamnese Pediátrica (Histórico)</Typography>
                
                <Typography variant="body1" sx={{ mt: 2, fontWeight: 'medium' }}>Histórico Gestacional e Nascimento</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1.5 }}>
                    {/* Linha 1 */}
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel id="tipo-parto-label">Tipo de Parto</InputLabel>
                            <Select
                                labelId="tipo-parto-label"
                                label="Tipo de Parto"
                                name="tipo_parto"
                                value={anamneseData.pediatrica.tipo_parto || ''}
                                onChange={(e) => handlePediatricaChange('tipo_parto', e.target.value)}
                            >
                                <MenuItem value="Normal">Normal</MenuItem>
                                <MenuItem value="Cesárea">Cesárea</MenuItem>
                                <MenuItem value="Fórceps">Fórceps</MenuItem>
                                <MenuItem value="Não sabe">Não sabe</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField label="Idade Gestacional" name="idade_gestacional" placeholder="semanas" type="number" value={anamneseData.pediatrica.idade_gestacional || ''} onChange={(e) => handlePediatricaChange('idade_gestacional', e.target.value)} fullWidth size="small" />
                    </Box>
                    {/* Linha 2 */}
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                        <TextField label="Peso ao nascer" placeholder="gramas" name="peso_nascimento" type="number" value={anamneseData.pediatrica.peso_nascimento || ''} onChange={(e) => handlePediatricaChange('peso_nascimento', e.target.value)} fullWidth size="small" />
                        <TextField label="APGAR (1º/5º)" name="apgar" value={anamneseData.pediatrica.apgar || ''} onChange={(e) => handlePediatricaChange('apgar', e.target.value)} fullWidth size="small" />
                    </Box>
                    {/* Linha 3 */}
                    <TextField label="Intercorrências na gestação ou parto" name="intercorrencias_gestacao_parto" value={anamneseData.pediatrica.intercorrencias_gestacao_parto || ''} onChange={(e) => handlePediatricaChange('intercorrencias_gestacao_parto', e.target.value)} multiline rows={2} fullWidth size="small" />
                </Box>
                
                {/* ... (Outros campos da Anamnese: Aleitamento, Vacinação, DNPM) ... */}

            </Paper>

            {/* --- FORMULÁRIO DE EVOLUÇÃO (SOAP) --- */}
            <Paper variant="outlined" sx={{ p: 2, borderColor: 'secondary.main' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Evolução do Dia</Typography>

                {/* Checkboxes da 'Queixa Atual (S)' */}
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Queixa Atual (S)</Typography>
                <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 1, p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                    {sintomasOptions.map(opt => (
                    <FormControlLabel key={opt.id} control={<Checkbox checked={anamneseData.sintomas[opt.id] || false} onChange={handleSintomasChange} name={opt.id} />} label={opt.label} />
                    ))}
                </FormGroup>

                {/* Campos do SOAP (Layout corrigido com Box) */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <TextField name="notas_subjetivas" label="Subjetivo (HDA gerada pelos cliques)" multiline rows={4} fullWidth value={soapData.notas_subjetivas || ''} onChange={handleSoapChange} size="small" />
                    <TextField name="notas_objetivas" label="Objetivo (Exame Físico)" multiline rows={4} fullWidth value={soapData.notas_objetivas || ''} onChange={handleSoapChange} size="small" />
                    <TextField name="avaliacao" label="Avaliação / Hipóteses Diagnósticas" multiline rows={3} fullWidth value={soapData.avaliacao || ''} onChange={handleSoapChange} size="small" />
                    <TextField name="plano" label="Plano / Conduta" multiline rows={3} fullWidth value={soapData.plano || ''} onChange={handleSoapChange} size="small" />
                    
                    <Box sx={{ textAlign: 'right' }}>
                        <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting}>
                            {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Evolução e Anamnese'}
                        </Button>
                    </Box>
                </Box>
            </Paper>

        </Paper>
    );
}