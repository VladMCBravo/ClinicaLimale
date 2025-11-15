/ src/components/prontuario/AtendimentoCardiologia.jsx
// VERSÃO CORRIGIDA: Usando caminhos de importação absolutos

import React, { useState, useEffect, useCallback, Suspense, lazy, useRef } from 'react';
import {
    Paper, Typography, FormGroup, FormControlLabel, Checkbox, TextField, Divider,
    Box, Button, CircularProgress, Tabs, Tab
} from '@mui/material';

// --- CORREÇÃO DE IMPORT ---
// ../../contexts/SnackbarContext  ->  contexts/SnackbarContext
import { useSnackbar } from 'contexts/SnackbarContext';
// ../../api/axiosConfig         ->  api/axiosConfig
import apiClient from 'api/axiosConfig';

// O lazy import usa um caminho relativo normal, o que está correto
const HistoricoCardiologia = lazy(() => import('./cardiologia/HistoricoCardiologia'));

// --- (O restante do arquivo AtendimentoCardiologia.jsx é idêntico ao anterior) ---
// --- (Constantes, Helper TabPanel, e toda a lógica do componente) ---

// Helper TabPanel
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} id={`cardio-tabpanel-${index}`} {...other} style={{ display: value !== index ? 'none' : 'block' }}>
            <Box sx={{ p: { xs: 1, sm: 2 } }}>{children}</Box>
        </div>
    );
}

export default function AtendimentoCardiologia({ pacienteId, onEvolucaoSalva }) {
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

    // ... (generateHda, generateExameFisico, handlers, preencherNormalidade, handleLimparConsultaAtual) ...
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

    const handleTabChange = (event, newIndex) => { setTabIndex(newIndex); };
    const handleSoapChange = (e) => setSoapData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSintomasChange = (e) => {
        const newSintomas = { ...sintomasConsulta, [e.target.name]: e.target.checked };
        setSintomasConsulta(newSintomas);
        const hdaText = generateHda(newSintomas);
        setSoapData(prev => ({ ...prev, notas_subjetivas: hdaText }));
    };
    const handleExameChange = (event) => {
        const { name, value, type, checked } = event.target;
        const newExameData = { ...exameFisicoData, [name]: type === 'checkbox' ? checked : value };
        setExameFisicoData(newExameData);
        const exameText = generateExameFisico(newExameData);
        setSoapData(prev => ({ ...prev, notas_objetivas: exameText }));
    };
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
        setSoapData({ notas_subjetivas: '', notas_objetivas: 'PA: \nFC: \n', avaliacao: '', plano: '' });
        showSnackbar('Campos da consulta atual limpos.', 'info');
    };

    // --- Lógica de Salvamento (Sem alterações) ---
    const handleSaveSOAPAndVitals = async () => {
        let evolucaoId;
        
        if (evolucaoIdSessao) {
            evolucaoId = evolucaoIdSessao;
            try {
                await apiClient.patch(`/prontuario/pacientes/${pacienteId}/evolucoes/${evolucaoId}/`, soapData);
            } catch (error) {
                console.error("Erro ao ATUALIZAR evolução (SOAP):", error.response?.data || error);
                showSnackbar('Erro ao atualizar a consulta atual (SOAP).', 'error');
                throw error;
            }
        } else {
            try {
                const res = await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes/`, soapData);
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


    // --- 5. JSX (Sem alterações) ---
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

            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, mt: 1 }}>
                <Tabs value={tabIndex} onChange={handleTabChange} aria-label="Abas do prontuário cardiológico" variant="scrollable" scrollButtons="auto">
                    <Tab label="Consulta Atual" id="cardio-tab-0" />
                    <Tab label="Histórico" id="cardio-tab-1" />
                    <Tab label="Exames (ECG/ECO)" id="cardio-tab-2" />
                </Tabs>
            </Box>

            <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
                
                <TabPanel value={tabIndex} index={0}>
                    <Paper variant="outlined" sx={{ p: 2, borderColor: 'primary.main' }}>
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
                           {/* (Grupos de Exame Físico - sem alterações) */}
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
                        ref={historicoRef} // <-- Passando a ref
                    />
                </TabPanel>
                
                <TabPanel value={tabIndex} index={2}>
                    <Typography>Em breve: Visualizador de Exames (ECG, ECO, Laudos).</Typography>
                </TabPanel>
            </Suspense>
        </Paper>
    );
}