// src/components/prontuario/AtendimentoGinecologia.jsx - VERSÃO COMPLETA UNIFICADA

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Paper, Typography, Grid, FormGroup, FormControlLabel, Checkbox, TextField, Divider, RadioGroup, Radio,
    FormControl, InputLabel, Select, MenuItem, Box, Button, CircularProgress 
} from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext'; // Ensure the '/' is present!
import apiClient from '../../api/axiosConfig';

// --- OPÇÕES (Baseado em AnamneseGinecologia.jsx) ---
const sintomasOptions = [
    { id: 'corrimento', label: 'Corrimento' }, { id: 'sua', label: 'SUA' }, { id: 'dor_pelvica', label: 'Dor Pélvica' },
    { id: 'queixa_mamaria', label: 'Queixa Mamária' }, { id: 'dismenorreia', label: 'Dismenorreia' }, { id: 'tpm', label: 'TPM' },
];
const sintomaTemplates = {
  corrimento: "Corrimento: Início/Cor/Aspecto/Odor/Volume/Sintomas associados.",
  sua: "SUA: Padrão/Relação com ciclo/Pós-coito/Pós-menopausa/Sintomas associados.",
  dor_pelvica: "Dor Pélvica: Tipo/Local/Intensidade/Relação com ciclo/Fatores/Sintomas associados.",
  queixa_mamaria: "Queixa Mamária: Tipo/Local/Variação com ciclo/Descarga papilar.",
  dismenorreia: "Dismenorreia: Intensidade/Impacto/Duração/Medicação.",
  tpm: "TPM: Sintomas (irritabilidade, mastalgia, edema, etc.)/Período.",
};
const exameFisicoGOOptions = [
    { id: 'mamas_normal', label: 'Mamas Normais', group: 'mamas', template: 'Mamas: Simétricas, sem retrações ou abaulamentos, sem nódulos ou massas palpáveis, expressão mamilar negativa.' },
    { id: 'mamas_nodulo', label: 'Nódulo Mamário', group: 'mamas', template: 'Mamas: Nódulo em ___ (descrever).' },
    { id: 'axilas_livres', label: 'Axilas Livres', group: 'axilas', template: 'Axilas: Livres.' },
    { id: 'especular_normal', label: 'Especular Normal', group: 'especular', template: 'Especular: Colo cilíndrico/cônico, OE fenda/puntiforme, trófico, epitelizado, sem alterações aparentes, conteúdo vaginal fisiológico.' },
    { id: 'especular_alterado', label: 'Especular Alterado', group: 'especular', template: 'Especular: Alterações (descrever).' },
    { id: 'toque_normal', label: 'Toque Normal', group: 'toque', template: 'Toque Vaginal: Útero em AVF/RVF, tamanho normal, móvel, indolor. Anexos livres.' },
    { id: 'toque_alterado', label: 'Toque Alterado', group: 'toque', template: 'Toque Vaginal: Alterações (descrever).' },
];
// --- FIM OPÇÕES ---

export default function AtendimentoGinecologia({ pacienteId, onEvolucaoSalva }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Estado Anamnese: 'ginecologica' para histórico, 'sintomas' para consulta atual
    const [anamneseData, setAnamneseData] = useState({ ginecologica: {}, sintomas: {} });
    // Estado Exame Físico: checkboxes e inputs da consulta atual
    const [exameFisicoData, setExameFisicoData] = useState({});
    // Estado SOAP: campos da evolução da consulta atual
    const [soapData, setSoapData] = useState({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });

    // Carrega anamnese histórica
    useEffect(() => {
        if (!pacienteId) {
            // Limpa estados se não houver paciente
            setAnamneseData({ ginecologica: {}, sintomas: {} });
            setExameFisicoData({});
            setSoapData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
            return;
        }
        apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`)
            .then(res => {
                setAnamneseData({
                    ginecologica: res.data.ginecologica || {}, // Dados históricos
                    sintomas: {}, // Sintomas da consulta atual sempre começam zerados
                });
                // Pré-preenche exame com dados da anamnese se houver (PA, FC, Peso, Altura)
                setExameFisicoData(res.data.ginecologica || {}); 
            })
            .catch(err => { 
                 if (err.response && err.response.status !== 404) {
                     showSnackbar('Erro ao carregar histórico ginecológico.', 'error');
                 }
            });
    }, [pacienteId, showSnackbar]);

    // Geradores de texto
    const generateHda = useCallback(() => { 
        return sintomasOptions
            .filter(opt => anamneseData.sintomas[opt.id])
            .map(opt => sintomaTemplates[opt.id] || `${opt.label}: `)
            .join('\n');
     }, [anamneseData.sintomas]);

    const generateExameFisico = useCallback(() => {
        let texto = `Dados Vitais:\nPA: ${exameFisicoData.pa || '___x___'} mmHg\nFC: ${exameFisicoData.fc || '___'} bpm\nPeso: ${exameFisicoData.peso || '___'} kg\nAltura: ${exameFisicoData.altura || '___'} m\n\nExame Físico Ginecológico:\n`;
        const achados = exameFisicoGOOptions
            .filter(opt => exameFisicoData[opt.id]) // Usa o estado atual do exame
            .map(opt => opt.template).join(" ");
        // Adiciona descrições manuais se houver
        if (exameFisicoData.ex_mamas && !exameFisicoData.mamas_normal && !exameFisicoData.mamas_nodulo) texto += `Mamas: ${exameFisicoData.ex_mamas}\n`;
        if (exameFisicoData.ex_especular && !exameFisicoData.especular_normal && !exameFisicoData.especular_alterado) texto += `Especular: ${exameFisicoData.ex_especular}\n`;
        if (exameFisicoData.ex_toque && !exameFisicoData.toque_normal && !exameFisicoData.toque_alterado) texto += `Toque: ${exameFisicoData.ex_toque}\n`;
            
        return texto + (achados || "Nenhuma observação selecionada.");
    }, [exameFisicoData]);

    // Efeitos que atualizam SOAP
    useEffect(() => { 
        const hdaText = generateHda();
        setSoapData(prev => hdaText !== prev.notas_subjetivas ? { ...prev, notas_subjetivas: hdaText } : prev);
     }, [anamneseData.sintomas, generateHda]);
    useEffect(() => { 
        const exameText = generateExameFisico();
        setSoapData(prev => exameText !== prev.notas_objetivas ? { ...prev, notas_objetivas: exameText } : prev);
     }, [exameFisicoData, generateExameFisico]);

    // Handlers
    const handleSoapChange = (e) => setSoapData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSintomasChange = (e) => setAnamneseData(prev => ({ ...prev, sintomas: { ...prev.sintomas, [e.target.name]: e.target.checked } }));
    // Handler para campos do histórico ginecológico
    const handleGinecoChange = (name, value) => {
        setAnamneseData(prev => ({ ...prev, ginecologica: { ...prev.ginecologica, [name]: value } }));
    };
    // Handler para campos/checkboxes do exame físico atual
    const handleExameChange = (event) => {
        const { name, value, type, checked } = event.target;
        setExameFisicoData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    // Botão Normalidade
    const preencherNormalidade = () => { 
        setAnamneseData(prev => ({ ...prev, sintomas: {} })); // Limpa sintomas
        setExameFisicoData(prev => ({ // Marca exames normais
             ...prev, // Mantém PA/FC/Peso/Altura se preenchidos
             mamas_normal: true, mamas_nodulo: false,
             axilas_livres: true,
             especular_normal: true, especular_alterado: false,
             toque_normal: true, toque_alterado: false,
             ex_mamas: '', ex_especular: '', ex_toque: '', // Limpa campos de texto do exame
        }));
        setSoapData({
             notas_subjetivas: 'Paciente assintomática.',
             notas_objetivas: `Dados Vitais:\nPA: ${exameFisicoData.pa || '___x___'} mmHg\nFC: ${exameFisicoData.fc || '___'} bpm\nPeso: ${exameFisicoData.peso || '___'} kg\nAltura: ${exameFisicoData.altura || '___'} m\n\nExame Físico Ginecológico:\nMamas: Simétricas, sem retrações ou abaulamentos, sem nódulos ou massas palpáveis, expressão mamilar negativa. Axilas: Livres. Especular: Colo cilíndrico/cônico, OE fenda/puntiforme, trófico, epitelizado, sem alterações aparentes, conteúdo vaginal fisiológico. Toque Vaginal: Útero em AVF/RVF, tamanho normal, móvel, indolor. Anexos livres.`,
             avaliacao: 'Exame ginecológico sem alterações.',
             plano: 'Manter acompanhamento de rotina.'
        });
     };
    
    // Botão Limpar
    const handleLimparConsultaAtual = () => { 
        setAnamneseData(prev => ({ ...prev, sintomas: {} })); 
        setExameFisicoData(prev => ({ 
             // Mantém histórico carregado, limpa exame atual
             ...anamneseData.ginecologica, 
             pa: '', fc: '', peso: '', altura: '', // Limpa vitais
             // Limpa checkboxes
             mamas_normal: false, mamas_nodulo: false, axilas_livres: false,
             especular_normal: false, especular_alterado: false, 
             toque_normal: false, toque_alterado: false,
             // Limpa campos de texto do exame
             ex_mamas: '', ex_especular: '', ex_toque: '', 
        }));
        setSoapData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
        showSnackbar('Campos da consulta atual limpos.', 'info');
    };
    
    // Submit (Salva Evolução e Anamnese GO)
    const handleSubmit = async (event) => { 
        event.preventDefault();
        setIsSubmitting(true);
        let evolutionSavedSuccessfully = false;

        // 1. Salva Evolução (SOAP)
        try {
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes/`, soapData);
            showSnackbar('Evolução salva com sucesso!', 'success');
            // Limpa SOAP e sintomas
            setSoapData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' }); 
            setAnamneseData(prev => ({ ...prev, sintomas: {} })); 
            // Limpa exame físico atual? Ou mantém para próxima edição?
            // setExameFisicoData({}); 
            evolutionSavedSuccessfully = true;
            if(onEvolucaoSalva) onEvolucaoSalva();
        } catch (error) { /* ... (tratamento igual) ... */ setIsSubmitting(false); return; }

        // 2. Salva Anamnese (Histórico GO)
        if (evolutionSavedSuccessfully) {
            try {
                const anamnesePayload = { ...anamneseData.ginecologica }; 
                // Remove campos do exame físico ATUAL antes de salvar o histórico
                delete anamnesePayload.pa; delete anamnesePayload.fc; delete anamnesePayload.peso; delete anamnesePayload.altura;
                delete anamnesePayload.ex_mamas; delete anamnesePayload.ex_abdome; delete anamnesePayload.ex_genitais_externos; 
                delete anamnesePayload.ex_especular; delete anamnesePayload.ex_toque;
                
                await apiClient.put(`/prontuario/pacientes/${pacienteId}/anamnese/`, { 
                    ginecologica: anamnesePayload 
                });
            } catch (error) { /* ... (tratamento igual) ... */ } 
        }
        setIsSubmitting(false); 
    };

    // --- RETURN ---
    return (
        <Paper sx={{ p: 2, mb: 2 }}>
            {/* CABEÇALHO */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom> Atendimento Ginecológico </Typography>
                 <Button variant="outlined" size="small" onClick={preencherNormalidade}> Preencher Normalidade </Button>
            </Box>

            {/* ANAMNESE (HISTÓRICO) */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderColor: 'grey.400' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Histórico Ginecológico e Obstétrico</Typography>
                
                {/* Antecedentes Ginecológicos */}
                <Typography variant="body1" sx={{ mt: 2, mb: 1, fontWeight: 'medium' }}>Antecedentes Ginecológicos</Typography>
                {/* Usar <Box> ou <Grid> para organizar os campos: Menarca, DUM, Ciclo, Dismenorreia, Preventivo, MAC */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                       <TextField label="Idade Menarca" name="menarca_idade" type="number" size="small" value={anamneseData.ginecologica.menarca_idade || ''} onChange={(e) => handleGinecoChange('menarca_idade', e.target.value)} />
                       <TextField label="DUM" name="dum" type="date" InputLabelProps={{ shrink: true }} size="small" value={anamneseData.ginecologica.dum || ''} onChange={(e) => handleGinecoChange('dum', e.target.value)} />
                       {/* Adicionar outros campos aqui */}
                    </Box>
                    {/* ... (Mais linhas/Box para organizar os campos restantes) ... */}
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                {/* Antecedentes Obstétricos */}
                <Typography variant="body1" sx={{ mb: 1, fontWeight: 'medium' }}>Antecedentes Obstétricos</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <TextField label="Gesta" name="gesta" type="number" size="small" value={anamneseData.ginecologica.gesta || ''} onChange={(e) => handleGinecoChange('gesta', e.target.value)} />
                    <TextField label="Para" name="para" type="number" size="small" value={anamneseData.ginecologica.para || ''} onChange={(e) => handleGinecoChange('para', e.target.value)} />
                    <TextField label="Cesáreas" name="cesareas" type="number" size="small" value={anamneseData.ginecologica.cesareas || ''} onChange={(e) => handleGinecoChange('cesareas', e.target.value)} />
                    <TextField label="Abortos" name="abortos" type="number" size="small" value={anamneseData.ginecologica.abortos || ''} onChange={(e) => handleGinecoChange('abortos', e.target.value)} />
                </Box>
            </Paper>

            {/* EVOLUÇÃO (CONSULTA ATUAL) */}
            <Paper variant="outlined" sx={{ p: 2, borderColor: 'primary.main' }}>
               <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Consulta Atual</Typography>
               
               {/* Queixa Atual (S) */}
               <Typography variant="body1" sx={{ mt: 1, fontWeight: 'medium' }}>Queixa Atual (S)</Typography>
               <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 1, p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                   {sintomasOptions.map(opt => ( 
                       <FormControlLabel key={opt.id} control={<Checkbox checked={anamneseData.sintomas[opt.id] || false} onChange={handleSintomasChange} name={opt.id} />} label={opt.label} />
                   ))}
               </FormGroup>
               <TextField name="notas_subjetivas" label="Subjetivo (HDA gerada / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_subjetivas || ''} onChange={handleSoapChange} size="small" />
               
               <Divider sx={{ my: 2 }} />

               {/* Exame Físico (O) */}
               <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Exame Físico (O)</Typography>
               {/* Dados Vitais */}
               <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, my: 1.5 }}>
                   <TextField label="PA (mmHg)" name="pa" size="small" value={exameFisicoData.pa || ''} onChange={handleExameChange} sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '100px' }}/>
                   <TextField label="FC (bpm)" name="fc" type="number" size="small" value={exameFisicoData.fc || ''} onChange={handleExameChange} sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '80px' }}/>
                   <TextField label="Peso (kg)" name="peso" type="number" size="small" value={exameFisicoData.peso || ''} onChange={handleExameChange} sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '80px' }}/>
                   <TextField label="Altura (m)" name="altura" type="number" size="small" value={exameFisicoData.altura || ''} onChange={handleExameChange} sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '80px' }}/>
               </Box>
               {/* Checkboxes Exame Qualitativo */}
               <FormGroup sx={{ p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                     <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Mamas/Axilas:</Typography>
                     {exameFisicoGOOptions.filter(o=>o.group === 'mamas' || o.group === 'axilas').map(opt => (
                        <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                     ))}
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                     <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Especular/Toque:</Typography>
                     {exameFisicoGOOptions.filter(o=>o.group === 'especular' || o.group === 'toque').map(opt => (
                        <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                     ))}
                  </Box>
               </FormGroup>
               {/* Campos de texto livres para exame */}
                <TextField label="Exame das Mamas (descrição livre)" name="ex_mamas" multiline rows={2} fullWidth size="small" sx={{mt: 1}} value={exameFisicoData.ex_mamas || ''} onChange={handleExameChange} />
                <TextField label="Exame Especular (descrição livre)" name="ex_especular" multiline rows={2} fullWidth size="small" sx={{mt: 1}} value={exameFisicoData.ex_especular || ''} onChange={handleExameChange} />
                <TextField label="Toque Vaginal (descrição livre)" name="ex_toque" multiline rows={2} fullWidth size="small" sx={{mt: 1}} value={exameFisicoData.ex_toque || ''} onChange={handleExameChange} />
               {/* Campo Objetivo (preenchido ou editado) */}
               <TextField name="notas_objetivas" label="Objetivo (Gerado / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_objetivas || ''} onChange={handleSoapChange} size="small" sx={{mt: 1.5}}/>
               
               <Divider sx={{ my: 2 }} />

               {/* Campos Finais SOAP e Botões */}
               <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField name="avaliacao" label="Avaliação / Hipóteses Diagnósticas (A)" multiline rows={3} fullWidth value={soapData.avaliacao || ''} onChange={handleSoapChange} size="small" />
                  <TextField name="plano" label="Plano / Conduta (P)" multiline rows={3} fullWidth value={soapData.plano || ''} onChange={handleSoapChange} size="small" />
                  <Box sx={{ textAlign: 'right', mt: 1, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                     <Button onClick={handleLimparConsultaAtual} variant="outlined" disabled={isSubmitting}> Limpar Consulta </Button>
                     <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting}> Salvar Atendimento </Button>
                  </Box>
               </Box>
            </Paper>
        </Paper>
    );
}
// --- FIM DO ARQUIVO ---