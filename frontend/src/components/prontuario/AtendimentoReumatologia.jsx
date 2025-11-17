// src/components/prontuario/AtendimentoReumatologia.jsx
// VERSÃO REFATORADA COM ABAS E LÓGICA DE SALVAMENTO CORRIGIDA

import React, { useState, Suspense, lazy } from 'react';
import { Box, Button, CircularProgress, Grid, TextField, Typography, Paper, Tabs, Tab } from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

// 1. IMPORTAR A NOVA ABA DE HISTÓRICO
const HistoricoReumatologia = lazy(() => import('./reumatologia/HistoricoReumatologia'));

// Helper TabPanel
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} id={`reumato-tabpanel-${index}`} {...other}>
            {value === index && (<Box sx={{ p: { xs: 1, sm: 2 } }}>{children}</Box>)}
        </div>
    );
}

export default function AtendimentoReumatologia({ pacienteId, onEvolucaoSalva, agendamentoId }) {
    const [formData, setFormData] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showSnackbar } = useSnackbar();
    const [tabIndex, setTabIndex] = useState(0);

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleTabChange = (event, newIndex) => { setTabIndex(newIndex); };

    const handleLimparConsultaAtual = () => {
        setFormData({});
        showSnackbar('Campos da consulta atual limpos.', 'info');
    };
    
    // --- ★★★ handleSubmit (CORRIGIDO) ★★★ ---
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            // 1. Criar o payload completo
            // O 'formData' já contém 'notas_subjetivas', 'notas_objetivas', etc.
            const payload = {
                ...formData,
                
                // 2. Adicionar o agendamentoId
                agendamento: agendamentoId || null,
            
                // ★★★ ADICIONE ESTA LINHA ★★★
                especialidade_nome_fornecida: "Reumatologia"
            };

            // 3. Usar a URL genérica e enviar o novo 'payload'
            const res = await apiClient.post(`/prontuario/pacientes/${pacienteId}/evolucoes/`, payload);
            
            showSnackbar('Evolução salva com sucesso!', 'success');
            setFormData({}); 
            
            // 4. Chamar o callback (singular)
            if(onEvolucaoSalva) onEvolucaoSalva(res.data.id);
            
        } catch (error) { 
            console.error("Erro ao salvar evolução:", error.response?.data);
            showSnackbar('Erro ao salvar evolução.', 'error'); 
        }
        finally { setIsSubmitting(false); }
    };
    
    return (
        <Paper sx={{ mb: 2, overflow: 'hidden' }}>
            {/* CABEÇALHO */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 0 }}>
                <Typography variant="h6" gutterBottom> Atendimento Reumatológico </Typography>
                {/* (Opcional: Adicionar botão "Preencher Normalidade") */}
            </Box>

             {/* NAVEGAÇÃO DAS ABAS */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                <Tabs value={tabIndex} onChange={handleTabChange} aria-label="Abas prontuário reumatológico" variant="scrollable" scrollButtons="auto">
                    <Tab label="Consulta Atual" id="reumato-tab-0" />
                    <Tab label="Histórico" id="reumato-tab-1" />
                </Tabs>
            </Box>
            
            {/* CONTEÚDO DAS ABAS */}
            <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
                
                {/* ABA 1: CONSULTA ATUAL (SOAP) */}
                <TabPanel value={tabIndex} index={0}>
                    <Paper component="form" onSubmit={handleSubmit} variant="outlined" sx={{ p: 2, borderColor: 'primary.main' }}>
                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Consulta Atual (SOAP)</Typography>
                        <Grid container spacing={2}>
                            {/* O 'formData' já mapeia diretamente para os campos do SOAP */}
                            <Grid item xs={12}><TextField name="notas_subjetivas" label="Subjetivo (Padrão da dor, rigidez matinal, HDA)" multiline rows={4} fullWidth value={formData.notas_subjetivas || ''} onChange={handleChange} size="small" /></Grid>
                            <Grid item xs={12}><TextField name="notas_objetivas" label="Objetivo (Contagem articular, sinais flogísticos)" multiline rows={4} fullWidth value={formData.notas_objetivas || ''} onChange={handleChange} size="small" /></Grid>
                            <Grid item xs={12}><TextField name="avaliacao" label="Avaliação / Hipóteses" multiline rows={3} fullWidth value={formData.avaliacao || ''} onChange={handleChange} size="small" /></Grid>
                            <Grid item xs={12}><TextField name="plano" label="Plano / Conduta" multiline rows={3} fullWidth value={formData.plano || ''} onChange={handleChange} size="small" /></Grid>
                            <Grid item xs={12} sx={{ textAlign: 'right', display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                <Button onClick={handleLimparConsultaAtual} variant="outlined" disabled={isSubmitting}> Limpar Consulta </Button>
                                <Button type="submit" variant="contained" disabled={isSubmitting}>
                                    {isSubmitting ? <CircularProgress size={24} /> : 'Salvar Evolução'}
                                </Button>
                            </Grid>
                        </Grid>
                    </Paper>
                </TabPanel>
                
                {/* ABA 2: HISTÓRICO REUMATOLÓGICO */}
                <TabPanel value={tabIndex} index={1}>
                    <HistoricoReumatologia pacienteId={pacienteId} />
                </TabPanel>
            </Suspense>
        </Paper>
    );
}