// src/components/prontuario/AtendimentoCardiologia.jsx
// VERSÃO CORRIGIDA: handlers de checkbox consertados para não apagar dados

import React, { useState, useEffect, useCallback, Suspense, lazy, useRef } from 'react';
import {
    Paper, Typography, FormGroup, FormControlLabel, Checkbox, TextField, Divider,
    Box, Button, CircularProgress, Tabs, Tab
} from '@mui/material';
import { useSnackbar } from 'contexts/SnackbarContext';
import apiClient from 'api/axiosConfig';

const HistoricoCardiologia = lazy(() => import('./cardiologia/HistoricoCardiologia'));

// --- (Constantes de Opções - sem alterações) ---
const sintomasOpcoes = [ { id: 'dor_toracica', label: 'Dor torácica' }, { id: 'dispneia', label: 'Dispneia' }, { id: 'palpitacoes', label: 'Palpitações' }, { id: 'sincope_tontura', label: 'Síncope/Tontura' }, { id: 'edema_membros', label: 'Edema MMII' }, { id: 'claudicacao', label: 'Claudicação' }, { id: 'fadiga', label: 'Fadiga' }, ];
const sintomaTemplates = { dor_toracica: "Dor torácica: Início/Tipo/Local/Irradiação/Intensidade/Fatores.", dispneia: "Dispneia: CF (I-IV)/Ortopneia(S/N)/DPN(S/N).", palpitacoes: "Palpitações: Início/Ritmo/Duração/Frequência/Fatores.", };
const exameFisicoQualitativoOptions = [ { id: 'ictus_normal', label: 'Ictus Normo', group: 'inspecao', template: "Ictus cordis não visível/palpável ou em LHE 5º EIC." }, { id: 'ictus_desviado', label: 'Ictus Desviado', group: 'inspecao', template: "Ictus cordis desviado para ___." }, { id: 'tjp_negativa', label: 'TJP Negativa', group: 'pescoco', template: "Turgência Jugular Patológica negativa a 45º." }, { id: 'tjp_positiva', label: 'TJP Positiva', group: 'pescoco', template: "Turgência Jugular Patológica positiva." }, { id: 'brnf_2t', label: 'BRNF 2T s/ sopros', group: 'ausculta_card', template: "ACV: Ritmo regular, BRNF em 2T, sem sopros." }, { id: 'bar_2t_sopros', label: 'Sopro', group: 'ausculta_card', template: "ACV: Ritmo ___, Sopro ___ /6+ em foco ___." }, { id: 'b3', label: 'B3', group: 'ausculta_card', template: "Presença de B3." }, { id: 'b4', label: 'B4', group: 'ausculta_card', template: "Presença de B4." }, { id: 'mv_presente', label: 'AR: MV s/ RA', group: 'ausculta_pulm', template: "AR: MV presente universalmente, sem ruídos adventícios." }, { id: 'estertores', label: 'AR: Estertores', group: 'ausculta_pulm', template: "AR: Estertores creptantes em bases." }, { id: 'pulsos_cheios', label: 'Pulsos Cheios/Simétricos', group: 'vascular', template: "Pulsos periféricos cheios e simétricos." }, { id: 'pulsos_diminuidos', label: 'Pulsos Diminuídos', group: 'vascular', template: "Pulsos ___ diminuídos." }, { id: 'sem_edema', label: 'Sem Edema MMII', group: 'vascular', template: "MMII sem edema, panturrilhas livres." }, { id: 'com_edema', label: 'Edema MMII', group: 'vascular', template: "MMII com edema ___ /4+." }, ];
// --- FIM OPÇÕES ---

// Helper TabPanel (sem alterações)
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} id={`cardio-tabpanel-${index}`} {...other} style={{ display: value !== index ? 'none' : 'block' }}>
            <Box sx={{ p: { xs: 1, sm: 2 } }}>{children}</Box>
        </div>
    );
}

export default function AtendimentoCardiologia({ pacienteId, agendamentoId, onEvolucaoSalva }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tabIndex, setTabIndex] = useState(0);

    const [sintomasConsulta, setSintomasConsulta] = useState({});
    const [exameFisicoData, setExameFisicoData] = useState({});
    const [soapData, setSoapData] = useState({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });

    const [evolucaoIdSessao, setEvolucaoIdSessao] = useState(null);
    const historicoRef = useRef(null);

    // Reseta estados ao trocar de paciente
    useEffect(() => {
        setSoapData({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });
        setSintomasConsulta({});
        setExameFisicoData({});
        setTabIndex(0);
        setEvolucaoIdSessao(null); 
    }, [pacienteId]);

    // --- (generateHda e generateExameFisico - sem alterações) ---
    const generateHda = useCallback((sintomas) => { 
        const currentSintomas = sintomas || sintomasConsulta;
        return sintomasOpcoes
            .filter(opt => currentSintomas[opt.id])
            .map(opt => sintomaTemplates[opt.id] || `${opt.label}: `)
            .join('\n');
     }, [sintomasConsulta]);

    const generateExameFisico = useCallback((data) => {
        const currentData = data || exameFisicoData;
        let texto = `Dados Vitais:\nPA: ${currentData.pa || '___x___'} mmHg\nFC: ${currentData.fc || '___'} bpm\n\nExame Físico:\n`;
        const achados = exameFisicoQualitativoOptions
            .filter(opt => currentData[opt.id])
            .map(opt => opt.template).join(" ");
        return texto + (achados || "Nenhuma observação selecionada.");
    }, [exameFisicoData]);

    // Handlers
    const handleTabChange = (event, newIndex) => { setTabIndex(newIndex); };
    const handleSoapChange = (e) => setSoapData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    
    // ★★★ CORREÇÃO AQUI (Bug #3) ★★★
    // Esta função agora ADICIONA o template, em vez de REGERAR o texto todo.
    const handleSintomasChange = (e) => {
        const { name, checked } = e.target;
        setSintomasConsulta(prev => ({ ...prev, [name]: checked }));

        // Se marcou, adicione o template. Se desmarcou, não faça nada.
        if (checked) {
            const template = sintomaTemplates[name] || `${sintomasOpcoes.find(o => o.id === name)?.label}: `;
            
            setSoapData(prev => {
                // Só adiciona se o template exato ainda não existir
                if (prev.notas_subjetivas.includes(template)) {
                    return prev; 
                }
                // Adiciona o template ao final do texto existente
                return { ...prev, notas_subjetivas: (prev.notas_subjetivas + '\n' + template).trim() };
            });
        }
    };

    // ★★★ CORREÇÃO AQUI (Bug #3) ★★★
    // Esta função REGERA o texto do Exame Físico, o que é o CORRETO para ela.
    // O problema é que o texto do SOAP (notas_objetivas) não estava sendo
    // inicializado corretamente no useEffect.
    const handleExameChange = (event) => {
        const { name, value, type, checked } = event.target;
        // Atualiza o estado dos campos (PA, FC, checkboxes)
        const newExameData = { ...exameFisicoData, [name]: type === 'checkbox' ? checked : value };
        setExameFisicoData(newExameData);
        
        // Gera o texto COMPLETO do exame físico com base no NOVO estado
        const exameText = generateExameFisico(newExameData);
        // ATUALIZA o campo notas_objetivas com o texto recém-gerado
        setSoapData(prev => ({ ...prev, notas_objetivas: exameText }));
    };
    
    // --- (preencherNormalidade, handleLimparConsultaAtual - sem alterações) ---
    const preencherNormalidade = () => {
        const dadosExameNormal = {
            pa: exameFisicoData.pa || '___x___',
            fc: exameFisicoData.fc || '___',
            ictus_normal: true, ictus_desviado: false,
            tjp_negativa: true, tjp_positiva: false,
            brnf_2t: true, bar_2t_sopros: false, b3: false, b4: false,
            mv_presente: true, estertores: false,
            pulsos_cheios: true, pulsos_diminuidos: false,
            sem_edema: true, com_edema: false,
        };
        const textoExameNormal = `Dados Vitais:\nPA: ${dadosExameNormal.pa} mmHg\nFC: ${dadosExameNormal.fc} bpm\n\nExame Físico:\nIctus cordis não visível/palpável ou em LHE 5º EIC. Turgência Jugular Patológica negativa a 45º. ACV: Ritmo regular, BRNF em 2T, sem sopros. AR: MV presente universalmente, sem ruídos adventícios. Pulsos periféricos cheios e simétricos. MMII sem edema, panturrilhas livres.`;
        setSintomasConsulta({}); 
        setExameFisicoData(dadosExameNormal);
        setSoapData({
            notas_subjetivas: 'Paciente assintomático do ponto de vista cardiovascular.',
            notas_objetivas: textoExameNormal,
            avaliacao: 'Exame cardiovascular sem alterações.',
            plano: 'Manter acompanhamento regular. Orientações gerais.'
        });
    };
    const handleLimparConsultaAtual = () => {
        setSintomasConsulta({}); 
        setExameFisicoData({});
        // ★★★ CORREÇÃO AQUI ★★★
        // Ao limpar, re-inicializa o texto do exame físico
        const textoExameVazio = generateExameFisico({});
        setSoapData({ 
            notas_subjetivas: '', 
            notas_objetivas: textoExameVazio, // <-- Garante que o template de vitais apareça
            avaliacao: '', 
            plano: '' 
        });
        showSnackbar('Campos da consulta atual limpos.', 'info');
    };

    // --- Lógica de Salvamento (CORRIGIDA) ---
    const handleSaveSOAPAndVitals = async () => {
        // ★★★ 1. Crie o payload que inclui o agendamentoId ★★★
        const soapPayload = {
            ...soapData,
            agendamento: agendamentoId || null,

            // ★★★ ADICIONE ESTA LINHA ★★★
            especialidade_nome_fornecida: "Cardiologia"
        };

        let evolucaoId;
        
        if (evolucaoIdSessao) {
            evolucaoId = evolucaoIdSessao;
            try {
                // ★★★ 2. Envie o payload completo no PATCH ★★★
                await apiClient.patch(`/prontuario/pacientes/${pacienteId}/evolucoes/${evolucaoId}/`, soapPayload);
            } catch (error) {
                console.error("Erro ao ATUALIZAR evolução (SOAP):", error.response?.data || error);
                showSnackbar('Erro ao atualizar a consulta atual (SOAP).', 'error');
                throw error;
            }
        } else {
            try {
                // ★★★ 3. Use a URL genérica e envie o payload completo ★★★
                
                // ANTES:
                // const res = await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes-cardiologia/`, soapData);
                
                // DEPOIS:
                const res = await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes/`, soapPayload);

                evolucaoId = res.data.id;
                setEvolucaoIdSessao(evolucaoId);
            } catch (error) {
                console.error("Erro ao CRIAR evolução (SOAP):", error.response?.data || error);
                showSnackbar('Erro ao salvar a consulta atual (SOAP).', 'error');
                throw error;
            }
        }
        return evolucaoId;
    };
    const handleSaveAtendimentoCompleto = async (event) => {
        if (event) event.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        const isSessaoIniciada = evolucaoIdSessao !== null;
        console.log("--- INICIANDO SALVAMENTO COMPLETO (CARDIO) ---");

        try {
            const evolucaoId = await handleSaveSOAPAndVitals();
            
            if (historicoRef.current) {
                await historicoRef.current.saveData();
            } else {
                console.warn("Ref do Histórico (Cardio) não encontrada.");
            }

            showSnackbar(
                isSessaoIniciada ? 'Atendimento atualizado com sucesso!' : 'Atendimento salvo com sucesso!',
                'success'
            );
            
            if(onEvolucaoSalva) {
                onEvolucaoSalva(evolucaoId); 
            }

        } catch (error) {
            console.error("--- ERRO NO SALVAMENTO COMPLETO (CARDIO) ---", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- (JSX - sem alterações) ---
    return (
        <Paper sx={{ mb: 2, overflow: 'hidden' }}>
            {/* (Cabeçalho com botões mestres) */}
            <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between', 
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: 1,
                p: 2, pb: 0 
            }}>
                <Typography variant="h6" gutterBottom sx={{mb: 0}}> 
                    Atendimento Cardiológico 
                </Typography>
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
                        {isSubmitting ? <CircularProgress size={20} /> : (evolucaoIdSessao ? 'Atualizar Atendimento' : 'Salvar Atendimento')}
                    </Button>
                </Box>
            </Box>

            {/* (Abas) */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, mt: 1 }}>
                <Tabs value={tabIndex} onChange={handleTabChange} aria-label="Abas do prontuário cardiológico" variant="scrollable" scrollButtons="auto">
                    <Tab label="Consulta Atual" id="cardio-tab-0" />
                    <Tab label="Histórico" id="cardio-tab-1" />
                    <Tab label="Exames (ECG/ECO)" id="cardio-tab-2" />
                </Tabs>
            </Box>

            {/* (Conteúdo das Abas) */}
            <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
                
                <TabPanel value={tabIndex} index={0}>
                    <Paper variant="outlined" sx={{ p: 2, borderColor: 'primary.main' }}>
                        {/* (Botão Preencher Normalidade) */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 0 }}>
                                Consulta Atual (SOAP)
                            </Typography>
                            <Button 
                                variant="outlined" 
                                size="small" 
                                onClick={preencherNormalidade}
                                disabled={isSubmitting}
                            > 
                                Preencher Normalidade 
                            </Button>
                        </Box>
                        
                        {/* (Formulário SOAP) */}
                        <Typography variant="body1" sx={{ mt: 1, fontWeight: 'medium' }}>Queixa Atual (S)</Typography>
                        <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 1, p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                            {sintomasOpcoes.map(opt => ( 
                                <FormControlLabel key={opt.id} control={<Checkbox checked={sintomasConsulta[opt.id] || false} onChange={handleSintomasChange} name={opt.id} />} label={opt.label} />
                            ))}
                        </FormGroup>
                        <TextField name="notas_subjetivas" label="Subjetivo (HDA gerada / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_subjetivas || ''} onChange={handleSoapChange} size="small" />
                        
                        <Divider sx={{ my: 2 }} />

                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Exame Físico (O)</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, my: 1.5 }}>
                            <TextField label="PA (mmHg)" name="pa" value={exameFisicoData.pa || ''} onChange={handleExameChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '100px' }}/>
                            <TextField label="FC (bpm)" name="fc" type="number" value={exameFisicoData.fc || ''} onChange={handleExameChange} size="small" sx={{ width: { xs: '45%', sm: 'auto' }, minWidth: '80px' }}/>
                        </Box>
                        <FormGroup sx={{ p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                           {/* (Grupos de Exame Físico) */}
                           <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Inspeção/Pescoço:</Typography>
                                {exameFisicoQualitativoOptions.filter(o=>o.group === 'inspecao' || o.group === 'pescoco').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                                ))}
                            </Box>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Ausculta Cardíaca:</Typography>
                                {exameFisicoQualitativoOptions.filter(o=>o.group === 'ausculta_card').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                                ))}
                            </Box>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Ausculta Pulmonar:</Typography>
                                {exameFisicoQualitativoOptions.filter(o=>o.group === 'ausculta_pulm').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                                ))}
                            </Box>
                             <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                <Typography variant="caption" sx={{width: '100%', mb: -0.5, fontWeight: 'bold'}}>Vascular/MMII:</Typography>
                                {exameFisicoQualitativoOptions.filter(o=>o.group === 'vascular').map(opt => (
                                    <FormControlLabel sx={{mr:1}} key={opt.id} control={<Checkbox size="small" checked={exameFisicoData[opt.id] || false} onChange={handleExameChange} name={opt.id} />} label={<Typography variant="body2">{opt.label}</Typography>} />
                                ))}
                            </Box>
                        </FormGroup>

                        <TextField name="notas_objetivas" label="Objetivo (Gerado / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_objetivas || ''} onChange={handleSoapChange} size="small" sx={{mt: 1.5}}/>
                        
                        <Divider sx={{ my: 2 }} />

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField name="avaliacao" label="Avaliação / Hipóteses Diagnósticas (A)" multiline rows={3} fullWidth value={soapData.avaliacao || ''} onChange={handleSoapChange} size="small" />
                            <TextField name="plano" label="Plano / Conduta (P)" multiline rows={3} fullWidth value={soapData.plano || ''} onChange={handleSoapChange} size="small" />
                        </Box>
                    </Paper>
                </TabPanel>

                <TabPanel value={tabIndex} index={1}>
                    <HistoricoCardiologia 
                        pacienteId={pacienteId} 
                        ref={historicoRef}
                    />
                </TabPanel>
                
                <TabPanel value={tabIndex} index={2}>
                    <Typography>Em breve: Visualizador de Exames (ECG, ECO, Laudos).</Typography>
                </TabPanel>
            </Suspense>
        </Paper>
    );
}