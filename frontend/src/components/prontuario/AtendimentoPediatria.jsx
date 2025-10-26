// src/components/prontuario/AtendimentoPediatria.jsx - VERSÃO COMPLETA FINAL

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Paper, Typography, Grid, FormGroup, FormControlLabel, Checkbox, TextField, Divider, RadioGroup, Radio,
    FormControl, InputLabel, Select, MenuItem, Box, Button, CircularProgress 
} from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext'; // Ensure the '/' is present!
import apiClient from '../../api/axiosConfig';

// --- OPÇÕES E TEMPLATES ---
const dnpmOptions = [
  { id: 'sustenta_cabeca', label: 'Sustenta a cabeça (~3m)' }, { id: 'sorri_social', label: 'Sorriso social (~3m)' },
  { id: 'senta_com_apoio', label: 'Senta com apoio (~6m)' }, { id: 'engatinha', label: 'Engatinha (~9m)' },
  { id: 'anda', label: 'Anda (~12-15m)' }, { id: 'primeiras_palavras', label: 'Primeiras palavras (~12m)' },
  { id: 'frases_simples', label: 'Frases simples (~24m)' }, { id: 'controle_esfincter', label: 'Controle de esfíncteres' },
];
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

export default function AtendimentoPediatria({ pacienteId, onEvolucaoSalva }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Estado para Anamnese (Histórico)
    const [anamneseData, setAnamneseData] = useState({ pediatrica: {}, dnpm: {}, sintomas: {} });
    // NOVO: Estado para Exame Físico Detalhado
    const [exameFisicoData, setExameFisicoData] = useState({});
    
    // Estado para SOAP (Evolução)
    const [soapData, setSoapData] = useState({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });

    // --- 1. CARREGA ANAMNESE HISTÓRICA ---
    useEffect(() => {
        apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`)
            .then(res => {
                setAnamneseData({
                    pediatrica: res.data.pediatrica || {},
                    dnpm: res.data.pediatrica?.dnpm || {},
                    sintomas: {}, 
                });
            })
            .catch(err => {
                if (err.response && err.response.status !== 404) {
                    showSnackbar('Erro ao carregar histórico de anamnese.', 'error');
                }
            });
    }, [pacienteId, showSnackbar]);

    // --- 2. CARREGA DADOS VITAIS DO PACIENTE (Peso e Altura) ---
    useEffect(() => {
        if (pacienteId) {
            apiClient.get(`/pacientes/${pacienteId}/`)
                .then(res => {
                    // Popula os campos de exame físico com os dados mais recentes do paciente
                    setExameFisicoData(prev => ({
                        ...prev, // Mantém dados já existentes (ex: temperatura digitada)
                        peso: res.data.peso || '',
                        altura: res.data.altura || '', // Já vem em CM do backend
                        // 'pc' não é mais buscado do cadastro principal
                    }));
                })
                .catch(err => {
                    console.error("Erro ao carregar dados do paciente:", err);
                    showSnackbar('Erro ao carregar dados vitais do paciente.', 'error');
                });
        }
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
    const handleLimparConsultaAtual = () => {
    // Limpa apenas os dados da consulta atual (sintomas e SOAP)
    setAnamneseData(prev => ({ ...prev, sintomas: {} })); 
    setSoapData({
        notas_subjetivas: '',
        // Mantém um texto padrão no objetivo ou limpa também
        notas_objetivas: 'BEG, corado, hidratado, eupneico...', 
        avaliacao: '',
        plan: ''
    });
    // Você pode limpar o exameFisicoData também se preferir
    // setExameFisicoData({}); 
    showSnackbar('Campos da consulta atual limpos.', 'info');
};
    // --- 3. SUBMIT (Salva Evolução, Anamnese e VITAIS Pesso/Altura) ---
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        
        // 1. Prepara os dados vitais para salvar no Paciente (APENAS Peso e Altura)
        const vitaisData = {
            peso: exameFisicoData.peso || null,
            altura: exameFisicoData.altura || null,
            // 'perimetro_cefalico' (pc) não é enviado de volta ao cadastro
        };

        // 2. Salva a EVOLUÇÃO (SOAP)
        // O PC digitado será salvo aqui, dentro de 'notas_objetivas' (via generateExameFisico)
        try {
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes/`, soapData);
            showSnackbar('Evolução salva com sucesso!', 'success');
            
            // ... (Limpa o SOAP para a próxima)
            if(onEvolucaoSalva) onEvolucaoSalva();

        } catch (error) {
            showSnackbar('Erro ao salvar evolução.', 'error');
            setIsSubmitting(false);
            return; // Para se a evolução falhar
        }

        // 3. Salva a ANAMNESE (Histórico)
        try {
            const anamnesePayload = {
                ...anamneseData.pediatrica,
                dnpm: anamneseData.dnpm,
            };
            
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/anamnese/`, {
                pediatrica: anamnesePayload
            });
            showSnackbar('Histórico de anamnese atualizado.', 'info');

        } catch (error) {
            showSnackbar('Erro ao salvar histórico de anamnese.', 'error');
        } 
        
        // 4. ATUALIZA OS VITAIS (Peso/Altura) DO PACIENTE
        try {
            // Usamos PATCH para atualizar apenas os campos de vitais no Paciente
            await apiClient.patch(`/pacientes/${pacienteId}/`, vitaisData);
            showSnackbar('Peso e Altura do paciente atualizados.', 'info');
        } catch (error) {
             showSnackbar('Erro ao atualizar peso/altura do paciente.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <Paper sx={{ p: 2, mb: 2 }}>
            {/* --- CABEÇALHO --- */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom> Atendimento Pediátrico </Typography>
                 <Button variant="outlined" size="small" onClick={preencherNormalidade}> Preencher Normalidade </Button>
            </Box>

            {/* --- ANAMNESE (HISTÓRICO) --- */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderColor: 'grey.400' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Histórico do Paciente</Typography>
                
                {/* Histórico Gestacional (Layout corrigido com Box) */}
                <Typography variant="body1" sx={{ mt: 2, fontWeight: 'medium' }}>Histórico Gestacional e Nascimento</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1.5 }}>
                   <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                       <FormControl fullWidth size="small">
                            <InputLabel id="tipo-parto-label">Tipo de Parto</InputLabel>
                            <Select labelId="tipo-parto-label" label="Tipo de Parto" name="tipo_parto"
                                value={anamneseData.pediatrica.tipo_parto || ''}
                                onChange={(e) => handlePediatricaChange('tipo_parto', e.target.value)}>
                                <MenuItem value="Normal">Normal</MenuItem>
                                <MenuItem value="Cesárea">Cesárea</MenuItem>
                                <MenuItem value="Fórceps">Fórceps</MenuItem>
                                <MenuItem value="Não sabe">Não sabe</MenuItem>
                            </Select>
                       </FormControl>
                       <FormControl fullWidth size="small">
                        <InputLabel id="idade-gestacional-label">Idade Gestacional</InputLabel>
                        <Select
                            labelId="idade-gestacional-label"
                            label="Idade Gestacional"
                            name="idade_gestacional"
                            value={anamneseData.pediatrica.idade_gestacional || ''}
                            onChange={(e) => handlePediatricaChange('idade_gestacional', e.target.value)}
                    >
                        {/* Adicione opções relevantes */}
                        <MenuItem value="A termo">A termo ({'>='} 37 sem)</MenuItem>
    <MenuItem value="Pré-termo tardio">Pré-termo tardio (34 a 36+6 sem)</MenuItem>
    <MenuItem value="Pré-termo moderado">Pré-termo moderado (32 a 33+6 sem)</MenuItem>
    <MenuItem value="Muito pré-termo">Muito pré-termo (28 a 31+6 sem)</MenuItem>
    <MenuItem value="Pré-termo extremo">Pré-termo extremo ({'<'} 28 sem)</MenuItem>
    <MenuItem value="Pós-termo">Pós-termo ({'>='} 42 sem)</MenuItem>
    <MenuItem value="Não sabe">Não sabe</MenuItem>
</Select>
                        </FormControl>
                   </Box>
                   <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                        <TextField label="Peso ao nascer" placeholder="gramas" name="peso_nascimento" type="number" 
                            value={anamneseData.pediatrica.peso_nascimento || ''} 
                            onChange={(e) => handlePediatricaChange('peso_nascimento', e.target.value)} fullWidth size="small"/>
                        <TextField label="APGAR (1º/5º)" name="apgar" 
                            value={anamneseData.pediatrica.apgar || ''} 
                            onChange={(e) => handlePediatricaChange('apgar', e.target.value)} fullWidth size="small" />
                   </Box>
                   <TextField label="Intercorrências na gestação ou parto" name="intercorrencias_gestacao_parto" 
                       value={anamneseData.pediatrica.intercorrencias_gestacao_parto || ''} 
                       onChange={(e) => handlePediatricaChange('intercorrencias_gestacao_parto', e.target.value)} multiline rows={2} fullWidth size="small" />
                </Box>
                
                <Divider sx={{ my: 2 }} />

                {/* Aleitamento e Vacinação */}
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Aleitamento</Typography>
                        <RadioGroup row name="aleitamento" 
                            value={anamneseData.pediatrica.aleitamento || ''} 
                            onChange={(e) => handlePediatricaChange('aleitamento', e.target.value)}>
                            <FormControlLabel value="SME" control={<Radio size="small" />} label="Materno Exclusivo" />
                            <FormControlLabel value="Formula" control={<Radio size="small" />} label="Fórmula" />
                            <FormControlLabel value="Misto" control={<Radio size="small" />} label="Misto" />
                        </RadioGroup>
                        <TextField label="Introdução Alimentar" name="introducao_alimentar" 
                            value={anamneseData.pediatrica.introducao_alimentar || ''} 
                            onChange={(e) => handlePediatricaChange('introducao_alimentar', e.target.value)} fullWidth size="small" sx={{mt: 1}}/>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Vacinação</Typography>
                        <RadioGroup row name="vacinacao" 
                            value={anamneseData.pediatrica.vacinacao || ''} 
                            onChange={(e) => handlePediatricaChange('vacinacao', e.target.value)}>
                            <FormControlLabel value="Em dia" control={<Radio size="small" />} label="Em dia" />
                            <FormControlLabel value="Atrasada" control={<Radio size="small" />} label="Atrasada" />
                        </RadioGroup>
                        <TextField label="Observações sobre vacinação" name="vacinacao_obs" 
                            value={anamneseData.pediatrica.vacinacao_obs || ''} 
                            onChange={(e) => handlePediatricaChange('vacinacao_obs', e.target.value)} fullWidth size="small" sx={{mt: 1}}/>
                    </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                {/* DNPM */}
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Desenvolvimento Neuropsicomotor (DNPM)</Typography>
                <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                    {dnpmOptions.map(opt => (
                        <FormControlLabel key={opt.id} control={<Checkbox checked={anamneseData.dnpm[opt.id] || false} onChange={handleDnpmChange} name={opt.id} />} label={opt.label} />
                    ))}
                </FormGroup>
            </Paper>

            {/* --- EVOLUÇÃO (CONSULTA ATUAL) --- */}
            <Paper variant="outlined" sx={{ p: 2, borderColor: 'primary.main' }}>
               <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Consulta Atual</Typography>
               
               {/* Queixa Atual (S) - Checkboxes */}
               <Typography variant="body1" sx={{ mt: 1, fontWeight: 'medium' }}>Queixa Atual (S)</Typography>
               <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 1, p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                   {sintomasOptions.map(opt => ( 
                       <FormControlLabel key={opt.id} control={<Checkbox checked={anamneseData.sintomas[opt.id] || false} onChange={handleSintomasChange} name={opt.id} />} label={opt.label} />
                   ))}
               </FormGroup>
               {/* Campo Subjetivo (preenchido ou editado) */}
               <TextField name="notas_subjetivas" label="Subjetivo (HDA gerada / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_subjetivas || ''} onChange={handleSoapChange} size="small" />
               
               <Divider sx={{ my: 2 }} />

               {/* Exame Físico Detalhado (O) */}
               <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Exame Físico (O)</Typography>
               
               {/* Inputs Dados Vitais */}
               <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, my: 1.5 }}>
                   <TextField label="Peso (kg)" name="peso" value={exameFisicoData.peso || ''} onChange={handleExameChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '80px' }}/>
                   <TextField label="Altura (cm)" name="altura" value={exameFisicoData.altura || ''} onChange={handleExameChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '80px' }}/>
                   {/* Este campo "pc" está ligado ao 'exameFisicoData' do React, 
                     e NÃO mais ao 'models.py' do Django. Está correto.
                   */}
                   <TextField label="PC (cm)" name="pc" value={exameFisicoData.pc || ''} onChange={handleExameChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '80px' }}/>
                   <TextField label="T (°C)" name="temperatura" value={exameFisicoData.temperatura || ''} onChange={handleExameChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '80px' }}/>
               </Box>
               {/* Checkboxes Achados Qualitativos */}
               <FormGroup sx={{ p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                  {/* Agrupando por sistema para melhor visualização */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                     <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Geral:</Typography>
                     {exameFisicoQualitativoOptions.filter(o=>o.group === 'estado_geral' || o.group === 'pele').map(opt => (
                        <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                     ))}
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                     <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Respiratório:</Typography>
                     {exameFisicoQualitativoOptions.filter(o=>o.group === 'respiratorio').map(opt => (
                        <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                     ))}
                  </Box>
                   <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                     <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Cardíaco:</Typography>
                     {exameFisicoQualitativoOptions.filter(o=>o.group === 'cardiaco').map(opt => (
                        <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                     ))}
                  </Box>
                   <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                     <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Abdome:</Typography>
                     {exameFisicoQualitativoOptions.filter(o=>o.group === 'abdome').map(opt => (
                        <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                     ))}
                  </Box>
                   <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                     <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Oroscopia:</Typography>
                     {exameFisicoQualitativoOptions.filter(o=>o.group === 'oroscopia').map(opt => (
                        <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                     ))}
                  </Box>
                  {/* Adicione outros grupos aqui */}
               </FormGroup>
               {/* Campo Objetivo (preenchido ou editado) */}
               <TextField name="notas_objetivas" label="Objetivo (Gerado / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_objetivas || ''} onChange={handleSoapChange} size="small" sx={{mt: 1.5}}/>
               
               <Divider sx={{ my: 2 }} />

               {/* Campos Finais do SOAP */}
               <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField name="avaliacao" label="Avaliação / Hipóteses Diagnósticas (A)" multiline rows={3} fullWidth value={soapData.avaliacao || ''} onChange={handleSoapChange} size="small" />
                  <TextField name="plano" label="Plano / Conduta (P)" multiline rows={3} fullWidth value={soapData.plano || ''} onChange={handleSoapChange} size="small" />
                  <Box>                
                  <Box sx={{ textAlign: 'right', mt: 1, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Button onClick={handleLimparConsultaAtual} variant="outlined" disabled={isSubmitting}>
                        Limpar Consulta
                        </Button>
                        <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting}>
                        {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Atendimento'}
                        </Button>
                    </Box>
                  </Box>
               </Box>
            </Paper>
        </Paper>
    );
}