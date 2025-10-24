// src/components/prontuario/AtendimentoCardiologia.jsx - VERSÃO UNIFICADA (MODELO PEDIATRIA)

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Paper, Typography, Grid, FormGroup, FormControlLabel, Checkbox, TextField, Divider, 
    Box, Button, CircularProgress 
} from '@mui/material'; // Removido imports não usados (Radio, Select, etc.)
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

// --- OPÇÕES E TEMPLATES (Cardiologia - Adaptado do seu AnamneseCardiologia.jsx) ---
const sintomasOpcoes = [
  { id: 'dor_toracica', label: 'Dor torácica' }, { id: 'dispneia', label: 'Dispneia' },
  { id: 'palpitacoes', label: 'Palpitações' }, { id: 'sincope_tontura', label: 'Síncope/Tontura' },
  { id: 'edema_membros', label: 'Edema MMII' }, { id: 'claudicacao', label: 'Claudicação' },
  { id: 'fadiga', label: 'Fadiga' },
];
const fatoresRiscoOpcoes = [
    { id: 'has', label: 'HAS' }, { id: 'dm', label: 'DM' }, { id: 'dislipidemia', label: 'Dislipidemia' },
    { id: 'tabagismo', label: 'Tabagismo' }, { id: 'sedentarismo', label: 'Sedentarismo' },
    { id: 'historia_familiar_dac', label: 'Hist. Familiar DAC' }, { id: 'obesidade', label: 'Obesidade' },
];
const sintomaTemplates = {
  dor_toracica: "Dor torácica: Início/Tipo/Local/Irradiação/Intensidade/Fatores.",
  dispneia: "Dispneia: CF (I-IV)/Ortopneia(S/N)/DPN(S/N).",
  palpitacoes: "Palpitações: Início/Ritmo/Duração/Frequência/Fatores.",
  // ... (Complete com templates mais detalhados se desejar)
};
const exameFisicoQualitativoOptions = [
    { id: 'acv_brnf', label: 'BRNF 2T s/ sopros', group: 'cardiaco', template: "ACV: BRNF em 2T, sem sopros." },
    { id: 'acv_sopros', label: 'Sopros', group: 'cardiaco', template: "ACV: Sopro ___ /6+ em foco ___." },
    { id: 'pulsos_cheios', label: 'Pulsos Cheios/Simétricos', group: 'vascular', template: "Pulsos periféricos cheios e simétricos." },
    { id: 'pulsos_diminuidos', label: 'Pulsos Diminuídos', group: 'vascular', template: "Pulsos ___ diminuídos." },
    { id: 'sem_edema', label: 'Sem Edema MMII', group: 'vascular', template: "MMII sem edema, panturrilhas livres." },
    { id: 'com_edema', label: 'Edema MMII', group: 'vascular', template: "MMII com edema ___ /4+." },
    { id: 'ictus_normal', label: 'Ictus Normal', group: 'cardiaco', template: "Ictus cordis não visível/palpável ou palpável em LHE 5º EIC." },
    // Adicione mais opções conforme necessário
];
// --- FIM OPÇÕES ---

export default function AtendimentoCardiologia({ pacienteId, onEvolucaoSalva }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [anamneseData, setAnamneseData] = useState({ cardiologica: {}, sintomas: {}, fatores_risco: {} });
    const [exameFisicoData, setExameFisicoData] = useState({});
    const [soapData, setSoapData] = useState({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });

    // Carrega anamnese histórica
    useEffect(() => {
        // Assegura que pacienteId existe antes de buscar
        if (!pacienteId) {
             setAnamneseData({ cardiologica: {}, sintomas: {}, fatores_risco: {} });
             setExameFisicoData({});
             return;
        };

        apiClient.get(`/prontuario/pacientes/${pacienteId}/anamnese/`)
            .then(res => {
                setAnamneseData({
                    cardiologica: res.data.cardiologica || {},
                    fatores_risco: res.data.cardiologica?.fatores_risco || {}, 
                    sintomas: {}, 
                });
                // Garante que não sobrescreva dados do exame atual se já preenchidos
                setExameFisicoData(prev => ({ ...(res.data.cardiologica || {}), ...prev })); 
            })
            .catch(err => { 
                 if (err.response && err.response.status !== 404) {
                     showSnackbar('Erro ao carregar histórico cardiológico.', 'error');
                 }
             });
    }, [pacienteId, showSnackbar]);

    // Geradores de texto
    const generateHda = useCallback(() => { 
        return sintomasOpcoes
            .filter(opt => anamneseData.sintomas[opt.id]) // << CORREÇÃO: Usar anamneseData.sintomas
            .map(opt => sintomaTemplates[opt.id] || `${opt.label}: `) // Fallback template
            .join('\n');
     }, [anamneseData.sintomas]);

    const generateExameFisico = useCallback(() => {
        let texto = `Dados Vitais:\nPA: ${exameFisicoData.pa || '___x___'} mmHg\nFC: ${exameFisicoData.fc || '___'} bpm\n\nExame Físico:\n`;
        const achados = exameFisicoQualitativoOptions
            .filter(opt => exameFisicoData[opt.id])
            .map(opt => opt.template).join(" ");
        return texto + (achados || "Nenhuma observação selecionada.");
    }, [exameFisicoData]);

    // Efeitos que atualizam SOAP
    useEffect(() => { 
        const hdaText = generateHda();
        // Apenas atualiza se o texto gerado for diferente, evita loop
        setSoapData(prev => hdaText !== prev.notas_subjetivas ? { ...prev, notas_subjetivas: hdaText } : prev);
     }, [anamneseData.sintomas, generateHda]);

    useEffect(() => { 
        const exameText = generateExameFisico();
        setSoapData(prev => exameText !== prev.notas_objetivas ? { ...prev, notas_objetivas: exameText } : prev);
     }, [exameFisicoData, generateExameFisico]);

    // Handlers
    const handleSoapChange = (e) => setSoapData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSintomasChange = (e) => setAnamneseData(prev => ({ ...prev, sintomas: { ...prev.sintomas, [e.target.name]: e.target.checked } }));
    const handleCardiologicaChange = (name, value) => setAnamneseData(prev => ({ ...prev, cardiologica: { ...prev.cardiologica, [name]: value } }));
    // Handler para fatores de risco (usa o estado separado 'fatores_risco')
    const handleFatoresRiscoChange = (event) => {
        const { name, checked } = event.target;
        setAnamneseData(prev => ({ ...prev, fatores_risco: { ...prev.fatores_risco, [name]: checked } }));
    };
    // Handler para Exame Físico (inputs e checkboxes)
    const handleExameChange = (event) => {
        const { name, value, type, checked } = event.target;
        setExameFisicoData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    // Botão Normalidade (Cardiologia)
    const preencherNormalidade = () => {
        setAnamneseData(prev => ({ ...prev, sintomas: {} })); 
        setExameFisicoData(prev => ({
            ...prev, // Mantém PA/FC digitados se houver
            acv_brnf: true, acv_sopros: false, // Marca normal
            pulsos_cheios: true, pulsos_diminuidos: false,
            sem_edema: true, com_edema: false,
            ictus_normal: true,
        }));
        setSoapData({
            notas_subjetivas: 'Paciente assintomático do ponto de vista cardiovascular.',
            notas_objetivas: `Dados Vitais:\nPA: ${exameFisicoData.pa || '___x___'} mmHg\nFC: ${exameFisicoData.fc || '___'} bpm\n\nExame Físico:\nACV: BRNF em 2T, sem sopros. Pulsos periféricos cheios e simétricos. MMII sem edema, panturrilhas livres. Ictus cordis não visível/palpável ou palpável em LHE 5º EIC.`,
            avaliacao: 'Exame cardiovascular sem alterações.',
            plano: 'Manter acompanhamento regular. Orientações gerais.'
        });
    };
    const handleLimparConsultaAtual = () => {
    // Limpa apenas os dados da consulta atual (sintomas, exame físico atual e SOAP)
    setAnamneseData(prev => ({ ...prev, sintomas: {} })); 
    setExameFisicoData(prev => ({ 
        ...anamneseData.cardiologica, // Mantém dados carregados do histórico?
        pa: '', fc: '', // Limpa vitais
        // Limpa checkboxes qualitativos
        acv_brnf: false, acv_sopros: false, pulsos_cheios: false, 
        pulsos_diminuidos: false, sem_edema: false, com_edema: false, 
        ictus_normal: false 
    }));
    setSoapData({
        notas_subjetivas: '',
        notas_objetivas: 'PA: \nFC: \n', // Pode manter um template base
        avaliacao: '',
        plano: ''
    });
    showSnackbar('Campos da consulta atual limpos.', 'info');
};
    // --- handleSubmit CORRIGIDO ---
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        let evolutionSavedSuccessfully = false; // Flag para controlar o fluxo

        // 1. Salva Evolução (SOAP)
        try {
            await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes/`, soapData); // << CORREÇÃO: usar soapData
            showSnackbar('Evolução salva com sucesso!', 'success');
            
            // Limpa SOAP e sintomas para a próxima
            setSoapData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' }); 
            setAnamneseData(prev => ({ ...prev, sintomas: {} })); 
            setExameFisicoData(prev => ({ ...anamneseData.cardiologica, pa: '', fc: '' })); // Reseta exame físico mantendo histórico? Ou limpa tudo?

            evolutionSavedSuccessfully = true; // Marca sucesso
            if(onEvolucaoSalva) onEvolucaoSalva();

        } catch (error) {
            console.error("Erro ao salvar evolução:", error.response?.data);
            showSnackbar(`Erro ao salvar evolução: ${error.response?.data?.detail || error.message}`, 'error');
            // NÃO continua para salvar anamnese se a evolução falhar
            setIsSubmitting(false); 
            return; 
        }

        // 2. Salva Anamnese (Histórico Cardiológico) - SÓ SE A EVOLUÇÃO FOI SALVA
        if (evolutionSavedSuccessfully) {
            try {
                const anamnesePayload = {
                    ...anamneseData.cardiologica, 
                    fatores_risco: anamneseData.fatores_risco, 
                    // NÃO envia dados do exame físico AQUI
                };
                // Remove campos vazios ou nulos se necessário pelo backend
                Object.keys(anamnesePayload).forEach(key => (anamnesePayload[key] == null || anamnesePayload[key] === '') && delete anamnesePayload[key]);
                
                // Usa PUT para atualizar a anamnese existente (requer view de update no backend)
                // Se a view aceita POST para criar/atualizar, mantenha o POST.
                await apiClient.put(`/prontuario/pacientes/${pacienteId}/anamnese/`, { 
                    cardiologica: anamnesePayload 
                });
                // showSnackbar('Histórico cardiológico atualizado.', 'info'); // Opcional, pode poluir

            } catch (error) {
                console.error("Erro ao salvar histórico:", error.response?.data);
                showSnackbar(`Erro ao salvar histórico: ${error.response?.data?.detail || error.message}`, 'error');
                // Mesmo que o histórico falhe, a evolução foi salva.
            } finally {
                // O finally SEMPRE executa, então colocamos fora do if
            }
        }
        
        // O setIsSubmitting(false) vai aqui, no final de tudo
        setIsSubmitting(false); 
    };
    // --- FIM handleSubmit ---


    // --- RETURN (Sem alterações, apenas confirmação) ---
    return (
        <Paper sx={{ p: 2, mb: 2 }}>
            {/* CABEÇALHO */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom> Atendimento Cardiológico </Typography>
                 <Button variant="outlined" size="small" onClick={preencherNormalidade}> Preencher Normalidade </Button>
            </Box>

            {/* ANAMNESE (HISTÓRICO) */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderColor: 'grey.400' }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Histórico Cardiológico</Typography>
                
                {/* Fatores de Risco */}
                <Typography variant="body1" sx={{ mt: 2, fontWeight: 'medium' }}>Fatores de Risco</Typography>
                <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
                    {fatoresRiscoOpcoes.map(opt => (
                        <FormControlLabel key={opt.id} control={<Checkbox checked={anamneseData.fatores_risco[opt.id] || false} onChange={handleFatoresRiscoChange} name={opt.id} />} label={opt.label} />
                    ))}
                </FormGroup>

                <Divider sx={{ my: 2 }} />

                {/* Campos de Texto do Histórico */}
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
    <TextField 
        label="Medicamentos em Uso (Contínuo)" 
        name="medicamentos_em_uso" 
        multiline rows={3} fullWidth size="small"
        value={anamneseData.cardiologica.medicamentos_em_uso || ''}
        onChange={(e) => handleCardiologicaChange('medicamentos_em_uso', e.target.value)} 
        sx={{ flex: 1 }} // Ocupa metade do espaço em telas maiores
    />
    <TextField 
        label="Histórico Familiar Relevante" 
        name="historico_familiar" 
        multiline rows={3} fullWidth size="small"
        value={anamneseData.cardiologica.historico_familiar || ''}
        onChange={(e) => handleCardiologicaChange('historico_familiar', e.target.value)}
        placeholder="Ex: Pai IAM aos 50a" 
        sx={{ flex: 1 }} // Ocupa metade do espaço em telas maiores
    />
</Box>
            </Paper>

            {/* EVOLUÇÃO (CONSULTA ATUAL) */}
            <Paper variant="outlined" sx={{ p: 2, borderColor: 'primary.main' }}>
               <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Consulta Atual</Typography>
               
               {/* Queixa Atual (S) */}
               <Typography variant="body1" sx={{ mt: 1, fontWeight: 'medium' }}>Queixa Atual (S)</Typography>
               <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 1, p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                   {sintomasOpcoes.map(opt => ( 
                       <FormControlLabel key={opt.id} control={<Checkbox checked={anamneseData.sintomas[opt.id] || false} onChange={handleSintomasChange} name={opt.id} />} label={opt.label} />
                   ))}
               </FormGroup>
               <TextField name="notas_subjetivas" label="Subjetivo (HDA gerada / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_subjetivas || ''} onChange={handleSoapChange} size="small" />
               
               <Divider sx={{ my: 2 }} />

               {/* Exame Físico (O) */}
               <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Exame Físico (O)</Typography>
               <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, my: 1.5 }}>
                   <TextField label="PA (mmHg)" name="pa" value={exameFisicoData.pa || ''} onChange={handleExameChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '100px' }}/>
                   <TextField label="FC (bpm)" name="fc" type="number" value={exameFisicoData.fc || ''} onChange={handleExameChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '80px' }}/>
               </Box>
               <FormGroup sx={{ p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                     <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Cardíaco/Vascular:</Typography>
                     {exameFisicoQualitativoOptions.map(opt => (
                        <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                     ))}
                  </Box>
               </FormGroup>
               <TextField name="notas_objetivas" label="Objetivo (Gerado / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_objetivas || ''} onChange={handleSoapChange} size="small" sx={{mt: 1.5}}/>
               
               <Divider sx={{ my: 2 }} />

               {/* Campos Finais SOAP e Botão Salvar */}
               <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField name="avaliacao" label="Avaliação / Hipóteses Diagnósticas (A)" multiline rows={3} fullWidth value={soapData.avaliacao || ''} onChange={handleSoapChange} size="small" />
                  <TextField name="plano" label="Plano / Conduta (P)" multiline rows={3} fullWidth value={soapData.plano || ''} onChange={handleSoapChange} size="small" />
                  <Box sx={{ textAlign: 'right', mt: 1, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
     <Button onClick={handleLimparConsultaAtual} variant="outlined" disabled={isSubmitting}>
         Limpar Consulta
     </Button>
     <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting}>
         {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Atendimento'}
     </Button>
 </Box>
               </Box>
            </Paper>
        </Paper>
    );
}
// --- FIM DO ARQUIVO ---