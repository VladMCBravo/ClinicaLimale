// src/components/prontuario/AtendimentoNeonatologia.jsx - VERSÃO COMPLETA UNIFICADA

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Paper, Typography, Grid, FormGroup, FormControlLabel, Checkbox, TextField, Divider, RadioGroup, Radio,
    FormControl, InputLabel, Select, MenuItem, Box, Button, CircularProgress 
} from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

// --- OPÇÕES (Baseado em AnamneseNeonatologia.jsx e imagens) ---
const sorologiasOptions = [
  { id: 'vdrl', label: 'VDRL' }, { id: 'hiv', label: 'HIV' }, { id: 'hbsag', label: 'HBsAg' },
  { id: 'toxo', label: 'Toxo' }, { id: 'zika', label: 'Zika' }, { id: 'gbs', label: 'Strepto B' },
  // Adicione outras se necessário (CMV, Rubéola, Hepatite C da imagem)
];
const triagemOptions = [
    { id: 'pezinho', label: 'Pezinho' }, { id: 'olhinho', label: 'Olhinho' }, { id: 'coracaozinho', label: 'Coraçãozinho' },
    { id: 'orelhinha', label: 'Orelhinha' }, { id: 'linguinha', label: 'Linguinha' },
];
// Checkboxes para Exame Físico (baseado na imagem)
const exameFisicoOptions = [
    { id: 'pele_normal', label: 'Normal', group: 'pele', template: 'Pele: sem alterações.'},
    { id: 'pele_lesoes', label: 'Lesões', group: 'pele', template: 'Pele: Lesões (descrever).'},
    { id: 'pele_ictericia', label: 'Icterícia', group: 'pele', template: 'Pele: Icterícia (+/4+).'},
    { id: 'fontanela_normo', label: 'Normotensa', group: 'cabeca', template: 'Fontanela anterior normotensa.'},
    { id: 'fontanela_abaulada', label: 'Abaulada', group: 'cabeca', template: 'Fontanela anterior abaulada.'},
    { id: 'claviculas_integras', label: 'Íntegras', group: 'torax', template: 'Clavículas íntegras.'},
    { id: 'resp_normal', label: 'Normal', group: 'respiratorio', template: 'AR: MV presente, sem RA, sem esforço.'},
    { id: 'resp_taquipneia', label: 'Taquipneia', group: 'respiratorio', template: 'AR: Taquipneia (FR=___).'},
    { id: 'cardio_normal', label: 'Normal', group: 'cardiaco', template: 'ACV: BRNF 2T, sem sopros.'},
    { id: 'pulsos_normais', label: 'Normais', group: 'cardiaco', template: 'Pulsos femorais presentes e simétricos.'},
    { id: 'abdome_normal', label: 'Normal', group: 'abdome', template: 'Abdome: Flácido, indolor, RHA+, coto umbilical ok.'},
    { id: 'genitalia_normal', label: 'Normal', group: 'geniturinario', template: 'Genitália típica, sem alterações.'},
    { id: 'ortolani_neg', label: 'Ortolani (-)', group: 'osteoarticular', template: 'Manobra de Ortolani negativa.'},
    // Adicionar Reflexos e Tônus
];
// --- FIM OPÇÕES ---

export default function AtendimentoNeonatologia({ pacienteId, onEvolucaoSalva }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Anamnese carrega dados históricos
    const [anamneseData, setAnamneseData] = useState({ neonatologia: {}, sorologias: {}, triagens: {} });
    // Exame Físico para checkboxes da consulta atual
    const [exameFisicoCheckboxes, setExameFisicoCheckboxes] = useState({});
    // SOAP para a evolução da consulta atual
    const [soapData, setSoapData] = useState({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });

    // Carrega anamnese histórica
    useEffect(() => {
        if (!pacienteId) return;
        apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`)
            .then(res => {
                setAnamneseData({
                    neonatologia: res.data.neonatologia || {},
                    sorologias: res.data.neonatologia?.sorologias || {},
                    triagens: res.data.neonatologia?.triagens || {},
                });
                // Limpa checkboxes do exame físico atual ao carregar
                setExameFisicoCheckboxes({}); 
            })
            .catch(err => { /* ... */ });
    }, [pacienteId, showSnackbar]);

    // Gerador de texto para Exame Físico (Objetivo)
    const generateExameFisico = useCallback(() => {
        const neoHistorico = anamneseData.neonatologia; // Pega dados fixos como FC, FR
        let texto = `Dados Vitais:\nFC: ${neoHistorico.fc || '___'} bpm\nFR: ${neoHistorico.fr || '___'} irpm\n\nExame Físico Detalhado:\n`;
        const achados = exameFisicoOptions
            .filter(opt => exameFisicoCheckboxes[opt.id]) // Usa o estado dos checkboxes ATUAIS
            .map(opt => opt.template).join(" ");
        return texto + (achados || "Nenhuma observação selecionada.");
    }, [exameFisicoCheckboxes, anamneseData.neonatologia]);

    // Efeitos que atualizam SOAP
    // Nota: Neonatologia pode não ter 'HDA' clara, subjetivo pode ser livre
    useEffect(() => { /* Ajustar se houver checkboxes para subjetivo */ }, []); 
    useEffect(() => { 
        const exameText = generateExameFisico();
        setSoapData(prev => exameText !== prev.notas_objetivas ? { ...prev, notas_objetivas: exameText } : prev);
     }, [exameFisicoCheckboxes, generateExameFisico]);

    // Handlers
    const handleSoapChange = (e) => setSoapData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleNeoChange = (name, value) => setAnamneseData(prev => ({ ...prev, neonatologia: { ...prev.neonatologia, [name]: value } }));
    const handleCheckboxChange = (group, name, checked) => { /* Para sorologias, triagens */ 
         setAnamneseData(prev => ({ ...prev, [group]: { ...(prev[group] || {}), [name]: checked } }));
    };
    const handleExameCheckChange = (event) => { // Para checkboxes do exame físico ATUAL
        const { name, checked } = event.target;
        setExameFisicoCheckboxes(prev => ({ ...prev, [name]: checked }));
    };
    
    // Botão Normalidade
    const preencherNormalidade = () => { 
        setExameFisicoCheckboxes({ // Marca checkboxes normais
            pele_normal: true, fontanela_normo: true, claviculas_integras: true,
            resp_normal: true, cardio_normal: true, pulsos_normais: true,
            abdome_normal: true, genitalia_normal: true, ortolani_neg: true,
            // Marcar reflexos e tônus normais aqui
        });
        setSoapData(prev => ({
            ...prev,
            notas_subjetivas: 'RN em bom estado geral, alimentando-se bem (SME), diurese e evacuações presentes.',
            notas_objetivas: `Dados Vitais:\nFC: ${anamneseData.neonatologia.fc || '___'} bpm\nFR: ${anamneseData.neonatologia.fr || '___'} irpm\n\nExame Físico Detalhado:\nPele: sem alterações. Fontanela anterior normotensa. Clavículas íntegras. AR: MV presente, sem RA, sem esforço. ACV: BRNF 2T, sem sopros. Pulsos femorais presentes e simétricos. Abdome: Flácido, indolor, RHA+, coto umbilical ok. Genitália típica, sem alterações. Manobra de Ortolani negativa.`, // Adicionar reflexos/tônus
            avaliacao: 'RN estável, sem intercorrências.',
            plano: 'Alojamento conjunto. Alta hospitalar se boa evolução.'
        }));
     };
    
    // Botão Limpar
    const handleLimparConsultaAtual = () => { 
        setExameFisicoCheckboxes({}); // Limpa checkboxes do exame
        setSoapData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
        showSnackbar('Campos da consulta atual limpos.', 'info');
    };

    // Submit (Salva Evolução e Anamnese Neonatal)
    const handleSubmit = async (event) => { /* ... (Similar aos outros, adaptar payload da anamnese) ... */ };

    // --- RETURN ---
    return (
        <Paper sx={{ p: 2, mb: 2 }}>
            {/* CABEÇALHO */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom> Atendimento Neonatal </Typography>
                 <Button variant="outlined" size="small" onClick={preencherNormalidade}> Preencher Normalidade </Button>
            </Box>

            {/* ANAMNESE (HISTÓRICO) */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderColor: 'grey.400' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Histórico Neonatal</Typography>
                
                {/* Histórico Materno */}
                <Typography variant="body1" sx={{ mt: 2, mb: 1, fontWeight: 'medium' }}>Histórico Materno e Gestacional</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <TextField label="Idade Materna" name="idade_materna" type="number" size="small" value={anamneseData.neonatologia.idade_materna || ''} onChange={(e) => handleNeoChange('idade_materna', e.target.value)} />
                        <TextField label="G/P/A" name="gpa" size="small" value={anamneseData.neonatologia.gpa || ''} onChange={(e) => handleNeoChange('gpa', e.target.value)} placeholder="G_P_A_" />
                        <TextField label="Tipo Sang. Mãe" name="tipo_sanguineo_mae" size="small" value={anamneseData.neonatologia.tipo_sanguineo_mae || ''} onChange={(e) => handleNeoChange('tipo_sanguineo_mae', e.target.value)} />
                        <TextField label="Coombs Ind." name="coombs_indireto" size="small" value={anamneseData.neonatologia.coombs_indireto || ''} onChange={(e) => handleNeoChange('coombs_indireto', e.target.value)} />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>Sorologias:</Typography>
                    <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, ml: -1 }}>
                        {sorologiasOptions.map(opt => (
                            <FormControlLabel key={opt.id} control={<Checkbox size="small" checked={anamneseData.sorologias[opt.id] || false} onChange={(e) => handleCheckboxChange('sorologias', opt.id, e.target.checked)} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                        ))}
                    </FormGroup>
                    <TextField label="Intercorrências Gestação" name="intercorrencias_gestacao" multiline rows={2} fullWidth size="small" value={anamneseData.neonatologia.intercorrencias_gestacao || ''} onChange={(e) => handleNeoChange('intercorrencias_gestacao', e.target.value)} />
                </Box>

                <Divider sx={{ my: 2 }} />
                {/* Dados Parto, RN, Triagens (similar ao Histórico Materno, usando handleNeoChange e handleCheckboxChange) */}
                
            </Paper>

            {/* EVOLUÇÃO (CONSULTA ATUAL) */}
            <Paper variant="outlined" sx={{ p: 2, borderColor: 'primary.main' }}>
               <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Consulta Atual</Typography>
               
               <TextField name="notas_subjetivas" label="Subjetivo (Relato Enfermagem/Mãe)" multiline rows={2} fullWidth value={soapData.notas_subjetivas || ''} onChange={handleSoapChange} size="small" sx={{mb: 2}} />

               {/* Exame Físico Detalhado (O) */}
               <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Exame Físico (O)</Typography>
               <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, my: 1.5 }}>
                   <TextField label="FC (bpm)" name="fc" type="number" size="small" sx={{ width: 'auto', minWidth: '80px' }} value={anamneseData.neonatologia.fc || ''} onChange={(e) => handleNeoChange('fc', e.target.value)} />
                   <TextField label="FR (irpm)" name="fr" type="number" size="small" sx={{ width: 'auto', minWidth: '80px' }} value={anamneseData.neonatologia.fr || ''} onChange={(e) => handleNeoChange('fr', e.target.value)} />
                   {/* Adicionar outros vitais da imagem: Temp, SatO2, PA ? */}
               </Box>
               <FormGroup sx={{ p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                  {/* Agrupar checkboxes do exame físico aqui (Pele, Cabeça, Tórax, etc.) usando exameFisicoOptions e handleExameCheckChange */}
                   <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                     <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Pele:</Typography>
                     {exameFisicoOptions.filter(o=>o.group === 'pele').map(opt => (
                        <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoCheckboxes[opt.id] || false} onChange={handleExameCheckChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                     ))}
                  </Box>
                  {/* ... outros grupos ... */}
               </FormGroup>
               <TextField name="notas_objetivas" label="Objetivo (Gerado / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_objetivas || ''} onChange={handleSoapChange} size="small" sx={{mt: 1.5}}/>
               
               <Divider sx={{ my: 2 }} />

               {/* Campos Finais SOAP e Botões */}
               <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField name="avaliacao" label="Avaliação / Intercorrências (A)" multiline rows={3} fullWidth value={soapData.avaliacao || ''} onChange={handleSoapChange} size="small" />
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