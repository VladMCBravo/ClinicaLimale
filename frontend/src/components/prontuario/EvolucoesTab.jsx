// src/components/prontuario/EvolucoesTab.jsx
// VERSÃO CORRIGIDA: Renderiza o tipo de componente dinamicamente para preservar o estado

import React, { Suspense, lazy } from 'react';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';

// (Imports lazy... AtendimentoPediatria, AtendimentoCardiologia, etc.)
const AtendimentoPediatria = lazy(() => import('./AtendimentoPediatria'));
const AtendimentoCardiologia = lazy(() => import('./AtendimentoCardiologia'));
const AtendimentoNeonatologia = lazy(() => import('./AtendimentoNeonatologia'));
const AtendimentoGinecologia = lazy(() => import('./AtendimentoGinecologia'));
const AtendimentoClinicaGeral = lazy(() => import('./AtendimentoClinicaGeral'));
const AtendimentoObstetricia = lazy(() => import('./AtendimentoObstetricia'));
const AtendimentoOrtopedia = lazy(() => import('./AtendimentoOrtopedia'));
const AtendimentoReumatologia = lazy(() => import('./AtendimentoReumatologia'));
const AtendimentoNeurologia = lazy(() => import('./AtendimentoNeurologia'));

// (GenericFallback... sem alterações)
const GenericFallback = ({ especialidadeNome }) => (
    <Paper sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6">Prontuário (Em Desenvolvimento)</Typography>
        <Typography>Especialidade: {especialidadeNome}</Typography>
        <Typography color="text.secondary">Formulário específico não implementado.</Typography>
    </Paper>
);

export default function EvolucaoTab({ pacienteId, especialidade, onEvolucaoSalva }) {
    
    // --- DEBUG: Log de render do PAI ---
    console.log(`🔄 [RENDER PAI] EvolucoesTab renderizou. Especialidade: ${especialidade}`);

    // --- CORREÇÃO: Define o *TIPO* de componente a ser renderizado ---
    let ComponenteDaEspecialidade;

    switch (especialidade) {
        case 'Pediatria':
            ComponenteDaEspecialidade = AtendimentoPediatria;
            break;
        case 'Cardiologia':
            ComponenteDaEspecialidade = AtendimentoCardiologia;
            break;
        case 'Neonatologia':
            ComponenteDaEspecialidade = AtendimentoNeonatologia;
            break;
        case 'Ginecologia':
            ComponenteDaEspecialidade = AtendimentoGinecologia;
            break;
        case 'Obstetrícia': 
            ComponenteDaEspecialidade = AtendimentoObstetricia;
            break;
        case 'Ortopedia': 
            ComponenteDaEspecialidade = AtendimentoOrtopedia;
            break;
        case 'Reumatologia': 
            ComponenteDaEspecialidade = AtendimentoReumatologia;
            break;
        case 'Neurologia': 
            ComponenteDaEspecialidade = AtendimentoNeurologia;
            break;
        case 'Clínica Médica':
        case 'ClinicaGeral':
        default: 
             ComponenteDaEspecialidade = AtendimentoClinicaGeral;
    }
    // --- FIM DA CORREÇÃO ---

    return (
        <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
            {/* Renderiza o TIPO de componente. 
              Agora o React vai gerenciar o ciclo de vida corretamente 
              e não vai destruir o componente a cada renderização do pai.
            */}
            <ComponenteDaEspecialidade pacienteId={pacienteId} onEvolucoesSalva={onEvolucaoSalva} />
        </Suspense>
    );
}