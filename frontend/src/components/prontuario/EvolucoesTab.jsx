// src/components/prontuario/EvolucoesTab.jsx
// VERSÃO CORRIGIDA: Usando useRef para garantir uma prop 100% estável

import React, { Suspense, lazy, useCallback, useEffect, useRef } from 'react'; // 1. IMPORTAR useEffect e useRef
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
    
    console.log(`🔄 [RENDER PAI] EvolucoesTab renderizou. Especialidade: ${especialidade}`);

    // --- CORREÇÃO AVANÇADA: Estabilizando a prop com useRef ---
    const onEvolucaoSalvaRef = useRef(onEvolucaoSalva);
    useEffect(() => {
        onEvolucaoSalvaRef.current = onEvolucaoSalva;
    }, [onEvolucaoSalva]);

    // --- ★★★ CORREÇÃO CRÍTICA AQUI ★★★ ---
    // A função precisa ACEITAR o 'id' e PASSAR o 'id' para a ref.
    const stableOnEvolucaoSalva = useCallback((idDaEvolucao) => {
        if (onEvolucaoSalvaRef.current) {
            // Passe o ID recebido para a função original
            onEvolucaoSalvaRef.current(idDaEvolucao); 
        }
    }, []); // <-- Array vazio garante que esta função NUNCA mude.
    // --- ★★★ FIM DA CORREÇÃO ★★★ ---


    // --- Define o TIPO de componente a ser renderizado ---
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

    return (
        <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
            {/* 4. Passamos a função 100% estável para o filho */}
            <ComponenteDaEspecialidade 
                pacienteId={pacienteId} 
                onEvolucaoSalva={stableOnEvolucaoSalva} // Passa a função estável corrigida
            />
        </Suspense>
    );
}