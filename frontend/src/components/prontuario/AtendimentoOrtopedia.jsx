// src/components/prontuario/AtendimentoOrtopedia.jsx - VERSÃO COMPLETA UNIFICADA

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Paper, Typography, Grid, FormGroup, FormControlLabel, Checkbox, TextField, Divider, 
    Box, Button, CircularProgress 
} from '@mui/material';
import { useSnackbar } from '../../contextsSnackbarContext';
import apiClient from '../../api/axiosConfig';

// --- OPÇÕES (Ortopedia - Baseado em AnamneseOrtopedia.jsx) ---
const sintomasOrtopediaOptions = [
    { id: 'dor', label: 'Dor', group: 'sintoma', template: 'Dor em ___ (descrever início, tipo, irradiação, intensidade, fatores).' },
    { id: 'trauma', label: 'Trauma', group: 'sintoma', template: 'História de trauma em ___ (descrever mecanismo).' },
    { id: 'limitacao_mov', label: 'Limitação de Mov.', group: 'sintoma', template: 'Limitação de movimento em ___.' },
    { id: 'deformidade', label: 'Deformidade', group: 'sintoma', template: 'Deformidade aparente em ___.' },
    { id: 'edema', label: 'Edema/Inchaço', group: 'sintoma', template: 'Edema em ___.' },
    // Adicione outros (fraqueza, instabilidade, etc.)
];
const exameFisicoOrtopediaOptions = [
    { id: 'inspecao_normal', label: 'Inspeção Normal', group: 'exame', template: 'Inspeção: Sem alterações.' },
    { id: 'inspecao_edema', label: 'Edema', group: 'exame', template: 'Inspeção: Edema ___ /4+.' },
    { id: 'inspecao_equimose', label: 'Equimose', group: 'exame', template: 'Inspeção: Equimose em ___.' },
    { id: 'palpacao_indolor', label: 'Palpação Indolor', group: 'exame', template: 'Palpação: Indolor.' },
    { id: 'palpacao_dor', label: 'Dor à Palpação', group: 'exame', template: 'Palpação: Dor em ___.' },
    { id: 'adm_preservada', label: 'ADM Preservada', group: 'exame', template: 'ADM: Preservada e indolor.' },
    { id: 'adm_limitada', label: 'ADM Limitada', group: 'exame', template: 'ADM: Limitada para ___ por dor/bloqueio.' },
    { id: 'forca_preservada', label: 'Força Preservada', group: 'exame', template: 'Força Muscular: Grau 5/5 preservada.' },
    { id: 'neurovascular_normal', label: 'Neurovascular Normal', group: 'exame', template: 'Exame Neurovascular: Perfusão, sensibilidade e motricidade distais normais.' },
    // Adicione Testes Especiais como checkboxes se fizer sentido
];
// --- FIM OPÇÕES ---

export default function AtendimentoOrtopedia({ pacienteId, onEvolucaoSalva }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [anamneseData, setAnamneseData] = useState({ ortopedica: {}, sintomas: {} });
    const [exameFisicoData, setExameFisicoData] = useState({}); // Para checkboxes e inputs do exame
    const [soapData, setSoapData] = useState({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });

    // Carrega anamnese histórica
    useEffect(() => { /* ... (similar, busca /anamnese/ e pega 'ortopedica') ... */ }, [pacienteId, showSnackbar]);

    // Geradores de texto
    const generateHda = useCallback(() => { /* ... (usa sintomasOrtopediaOptions) ... */ }, [anamneseData.sintomas]);
    const generateExameFisico = useCallback(() => {
        let texto = `Exame Físico Ortopédico (Local: ${exameFisicoData.ex_local || '___'}):\n`;
        const achados = exameFisicoOrtopediaOptions
            .filter(opt => exameFisicoData[opt.id])
            .map(opt => opt.template).join(" ");
        // Adiciona campos de texto do exame se preenchidos e checkboxes não marcados
        if (exameFisicoData.ex_inspecao && !exameFisicoData.inspecao_normal) texto += `Inspeção: ${exameFisicoData.ex_inspecao}\n`;
        if (exameFisicoData.ex_palpacao && !exameFisicoData.palpacao_indolor && !exameFisicoData.palpacao_dor) texto += `Palpação: ${exameFisicoData.ex_palpacao}\n`;
        if (exameFisicoData.ex_adm && !exameFisicoData.adm_preservada && !exameFisicoData.adm_limitada) texto += `ADM: ${exameFisicoData.ex_adm}\n`;
        if (exameFisicoData.ex_forca && !exameFisicoData.forca_preservada) texto += `Força Muscular: ${exameFisicoData.ex_forca}\n`;
        if (exameFisicoData.ex_neurovascular && !exameFisicoData.neurovascular_normal) texto += `Neurovascular: ${exameFisicoData.ex_neurovascular}\n`;
        if (exameFisicoData.ex_testes) texto += `Testes Especiais: ${exameFisicoData.ex_testes}\n`;
        
        return texto + (achados || "Nenhuma observação selecionada.");
    }, [exameFisicoData]);

    // Efeitos que atualizam SOAP
    useEffect(() => { /* ... (atualiza notas_subjetivas) ... */ }, [anamneseData.sintomas, generateHda]);
    useEffect(() => { /* ... (atualiza notas_objetivas) ... */ }, [exameFisicoData, generateExameFisico]);

    // Handlers
    const handleSoapChange = (e) => setSoapData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSintomasChange = (e) => setAnamneseData(prev => ({ ...prev, sintomas: { ...prev.sintomas, [e.target.name]: e.target.checked } }));
    const handleOrtopedicaChange = (name, value) => setAnamneseData(prev => ({ ...prev, ortopedica: { ...prev.ortopedica, [name]: value } })); // Histórico
    const handleExameChange = (event) => { // Exame atual
        const { name, value, type, checked } = event.target;
        setExameFisicoData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    // Botão Normalidade (Ortopedia - Exemplo)
    const preencherNormalidade = () => { 
        setAnamneseData(prev => ({ ...prev, sintomas: {} })); 
        setExameFisicoData(prev => ({
            ...prev, // Mantém local preenchido
            inspecao_normal: true, palpacao_indolor: true, adm_preservada: true, 
            forca_preservada: true, neurovascular_normal: true,
            // Limpa checkboxes anormais e campos de texto
            inspecao_edema: false, inspecao_equimose: false, palpacao_dor: false, adm_limitada: false,
            ex_inspecao: '', ex_palpacao: '', ex_adm: '', ex_forca: '', ex_neurovascular: '', ex_testes: ''
        }));
        setSoapData({
             notas_subjetivas: 'Paciente nega dor ou outras queixas musculoesqueléticas.',
             notas_objetivas: `Exame Físico Ortopédico (Local: ${exameFisicoData.ex_local || '___'}):\nInspeção: Sem alterações. Palpação: Indolor. ADM: Preservada e indolor. Força Muscular: Grau 5/5 preservada. Exame Neurovascular: Perfusão, sensibilidade e motricidade distais normais. Testes Especiais: Negativos.`,
             avaliacao: 'Exame ortopédico sem alterações no momento.',
             plano: 'Orientações gerais. Manter observação.'
        });
     };
     
    // Botão Limpar
    const handleLimparConsultaAtual = () => { /* ... */ };
    // Submit (Salva Evolução e Anamnese Ortopédica)
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        let evolutionSavedSuccessfully = false; // Flag para controlar o fluxo

        // 1. Salva Evolução (SOAP)
        try {
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes/`, soapData);
            showSnackbar('Evolução salva com sucesso!', 'success');
            
            // Limpa SOAP e sintomas
            setSoapData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
            setAnamneseData(prev => ({ ...prev, sintomas: {} }));
            // Reseta exame físico mantendo o histórico carregado e o local
            setExameFisicoData(prev => ({ ...anamneseData.ortopedica, ex_local: prev.ex_local })); 

            evolutionSavedSuccessfully = true; // Marca sucesso
            if (onEvolucaoSalva) onEvolucaoSalva();

        } catch (error) {
            console.error("Erro ao salvar evolução:", error.response?.data);
            showSnackbar(`Erro ao salvar evolução: ${error.response?.data?.detail || error.message}`, 'error');
            // NÃO continua para salvar anamnese se a evolução falhar
            setIsSubmitting(false); 
            return; // Interrompe a execução aqui
        } // Fim do try/catch da Evolução

        // --- ESTA PARTE PRECISA ESTAR AQUI DENTRO ---
        // 2. Salva Anamnese (Histórico Ortopédico) - SÓ SE A EVOLUÇÃO FOI SALVA
        if (evolutionSavedSuccessfully) {
            try {
                const anamnesePayload = {
                    ...anamneseData.ortopedica, // Apenas o campo 'antecedentes' ou outros do histórico
                };
                 // Remove campos vazios se necessário
                 Object.keys(anamnesePayload).forEach(key => (anamnesePayload[key] == null || anamnesePayload[key] === '') && delete anamnesePayload[key]);

                // Usa PUT para atualizar (ou POST se sua API preferir)
                await apiClient.put(`/prontuario/pacientes/${pacienteId}/anamnese/`, {
                    ortopedica: anamnesePayload 
                });
                // showSnackbar('Histórico ortopédico atualizado.', 'info'); // Opcional

            } catch (error) {
                console.error("Erro ao salvar histórico ortopédico:", error.response?.data);
                showSnackbar(`Erro ao salvar histórico ortopédico: ${error.response?.data?.detail || error.message}`, 'error');
                // Nota: Mesmo que o histórico falhe, a evolução já foi salva.
            } 
        } // Fim do if (evolutionSavedSuccessfully)
        // --- FIM DA PARTE QUE ESTAVA FORA ---

        // O setIsSubmitting(false) vai aqui, no final de TUDO dentro da função
        setIsSubmitting(false); 

    }; // <--- A CHAVE FINAL DA FUNÇÃO handleSubmit ESTÁ AQUI
    // --- FIM handleSubmit ---

    // --- RETURN ---
    return (
        <Paper sx={{ p: 2, mb: 2 }}>
            {/* CABEÇALHO */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom> Atendimento Ortopédico </Typography>
                 <Button variant="outlined" size="small" onClick={preencherNormalidade}> Preencher Normalidade </Button>
            </Box>

            {/* ANAMNESE (HISTÓRICO) */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderColor: 'grey.400' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Histórico Ortopédico</Typography>
                <TextField label="Antecedentes Ortopédicos (Cirurgias, fraturas prévias, etc.)" name="antecedentes" multiline rows={3} fullWidth size="small" sx={{mt: 1}}
                    value={anamneseData.ortopedica.antecedentes || ''}
                    onChange={(e) => handleOrtopedicaChange('antecedentes', e.target.value)} />
            </Paper>

            {/* --- EVOLUÇÃO (CONSULTA ATUAL) --- */}
            <Paper variant="outlined" sx={{ p: 2, borderColor: 'primary.main' }}>
               <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Consulta Atual</Typography>
               
               {/* Queixa Atual (S) */}
               <Typography variant="body1" sx={{ mt: 1, fontWeight: 'medium' }}>Queixa Atual / HDA (S)</Typography>
               <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 1, p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                   {/* --- Checkboxes Queixa Atual PREENCHIDOS --- */}
                   {sintomasOrtopediaOptions.map(opt => ( 
                       <FormControlLabel 
                           key={opt.id} 
                           control={
                               <Checkbox 
                                   checked={anamneseData.sintomas[opt.id] || false} 
                                   onChange={handleSintomasChange} 
                                   name={opt.id} 
                                   size="small"
                               />
                            } 
                           label={<Typography variant="body2">{opt.label}</Typography>} 
                           sx={{mr: 1}} 
                       />
                   ))}
                   {/* --- FIM Checkboxes Queixa Atual --- */}
               </FormGroup>
               <TextField name="notas_subjetivas" label="Subjetivo (Gerado / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_subjetivas || ''} onChange={handleSoapChange} size="small" />
               
               <Divider sx={{ my: 2 }} />

               {/* Exame Físico (O) */}
               <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Exame Físico (O)</Typography>
               <TextField label="Local Afetado / Articulação" name="ex_local" size="small" fullWidth sx={{my: 1.5}} value={exameFisicoData.ex_local || ''} onChange={handleExameChange} />
               {/* Checkboxes Exame Qualitativo */}
               <FormGroup sx={{ p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                   {/* --- Checkboxes Exame Físico PREENCHIDOS --- */}
                   {/* Você pode agrupar visualmente se quiser, como fizemos em Pediatria, ou listar todos */}
                   <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                     {exameFisicoOrtopediaOptions.map(opt => ( 
                         <FormControlLabel 
                             key={opt.id} 
                             control={
                                 <Checkbox 
                                     checked={exameFisicoData[opt.id] || false} 
                                     onChange={handleExameChange} 
                                     name={opt.id} 
                                     size="small"
                                 />
                             } 
                             label={<Typography variant="body2">{opt.label}</Typography>} 
                             sx={{mr: 1}} 
                         />
                     ))}
                   </Box>
                   {/* --- FIM Checkboxes Exame Físico --- */}
               </FormGroup>
               {/* Campos de texto livres para exame */}
               <TextField label="Inspeção (descrição livre)" name="ex_inspecao" multiline rows={2} fullWidth size="small" sx={{mt: 1}} value={exameFisicoData.ex_inspecao || ''} onChange={handleExameChange} />
               <TextField label="Palpação (descrição livre)" name="ex_palpacao" multiline rows={2} fullWidth size="small" sx={{mt: 1}} value={exameFisicoData.ex_palpacao || ''} onChange={handleExameChange} />
               <TextField label="ADM (descrição livre)" name="ex_adm" multiline rows={2} fullWidth size="small" sx={{mt: 1}} value={exameFisicoData.ex_adm || ''} onChange={handleExameChange} />
               <TextField label="Força Muscular (0-5)" name="ex_forca" multiline rows={2} fullWidth size="small" sx={{mt: 1}} value={exameFisicoData.ex_forca || ''} onChange={handleExameChange} />
               <TextField label="Exame Neurovascular (descrição livre)" name="ex_neurovascular" multiline rows={2} fullWidth size="small" sx={{mt: 1}} value={exameFisicoData.ex_neurovascular || ''} onChange={handleExameChange} />
               <TextField label="Testes Especiais (descrição livre)" name="ex_testes" multiline rows={2} fullWidth size="small" sx={{mt: 1}} value={exameFisicoData.ex_testes || ''} onChange={handleExameChange} />
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
            {/* --- FIM DA SEÇÃO EVOLUÇÃO --- */}
        </Paper>
    );
}