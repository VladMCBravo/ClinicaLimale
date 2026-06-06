// src/components/prontuario/AtendimentoClinicaGeral.jsx

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Typography, TextField, Box, Button, CircularProgress, FormGroup, FormControlLabel, Checkbox, Divider } from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import apiClient from '../../api/axiosConfig';

// Importando o nosso novo Layout Base
import LayoutEvolucaoPadrao from './LayoutEvolucaoPadrao';

const HistoricoClinicaGeral = lazy(() => import('./clinica_geral/HistoricoClinicaGeral'));

// (MANTENHA SUAS CONSTANTES AQUI: sintomasGeraisOptions, exameFisicoGeralOptions)
// ...

export default function AtendimentoClinicaGeral({ pacienteId, onEvolucaoSalva, agendamentoId }) {
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // MANTENHA SEUS ESTADOS DE DADOS INTACTOS
    const [sintomasConsulta, setSintomasConsulta] = useState({});
    const [exameFisicoData, setExameFisicoData] = useState({});
    const [vitalsData, setVitalsData] = useState({}); 
    const [soapData, setSoapData] = useState({ notas_subjetivas: '', notas_objetivas: '', avaliacao: '', plano: '' });

    // MANTENHA SEUS useEffects E FUNÇÕES DE GERAR TEXTO (generateSubjetivo, generateObjetivo)
    // ...
    
    // MANTENHA SEUS HANDLERS DE MUDANÇA (handleSintomasChange, handleExameChange, handleVitalsChange)
    // ...

    // MANTENHA AS FUNÇÕES handleSubmit, preencherNormalidade E handleLimparConsultaAtual
    // ...

    // O QUE MUDA É APENAS O RETURN:
    return (
        <LayoutEvolucaoPadrao
            titulo="Atendimento Clínica Geral"
            onLimpar={handleLimparConsultaAtual}
            onSalvar={handleSubmit}
            isSubmitting={isSubmitting}
            // textoBotaoSalvar={evolucaoIdSessao ? 'Atualizar Atendimento' : 'Salvar Atendimento'} // Se você usar lógica de sessão aqui
            
            botaoNormalidade={
                <Button variant="outlined" size="small" onClick={preencherNormalidade} disabled={isSubmitting}> 
                    Preencher Normalidade 
                </Button>
            }
            
            abasApoio={[
                { label: 'Histórico', component: <HistoricoClinicaGeral pacienteId={pacienteId} /> }
            ]}

            formularioSOAP={
                <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column' }}>
                     <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Consulta Atual (SOAP)</Typography>

                     <Typography variant="body1" sx={{ mt: 1, fontWeight: 'medium' }}>Queixa Atual (S)</Typography>
                     {/* Aqui entram os seus Checkboxes de Sintomas */}
                     {/* ... (código dos seus Checkboxes mantido) ... */}
                     <TextField name="notas_subjetivas" label="Subjetivo (HDA / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_subjetivas || ''} onChange={handleSoapChange} size="small" />

                     <Divider sx={{ my: 2 }} />

                     <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Exame Físico (O)</Typography>
                     {/* Aqui entram os seus TextFields de Vitais e Checkboxes de Exame Físico */}
                     {/* ... (código dos seus Vitais mantido) ... */}
                     <TextField name="notas_objetivas" label="Objetivo (Gerado / Anotações Livres)" multiline rows={4} fullWidth value={soapData.notas_objetivas || ''} onChange={handleSoapChange} size="small" sx={{mt: 1.5}}/>

                     <Divider sx={{ my: 2 }} />

                     <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField name="avaliacao" label="Avaliação / Hipóteses Diagnósticas (A)" multiline rows={3} fullWidth value={soapData.avaliacao || ''} onChange={handleSoapChange} size="small" />
                        <TextField name="plano" label="Plano / Conduta (P)" multiline rows={3} fullWidth value={soapData.plano || ''} onChange={handleSoapChange} size="small" />
                     </Box>
                </Box>
            }
        />
    );
}