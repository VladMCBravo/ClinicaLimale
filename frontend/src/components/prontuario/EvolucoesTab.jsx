// src/components/prontuario/EvolucoesTab.jsx
// ARQUIVO CORRIGIDO: Corrigido o 'return' para chamar a função correta

import React, { Suspense, lazy } from 'react'; // Removido useMemo
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

    // --- CORREÇÃO: Removido o useMemo que recriava o componente ---
    // Renderizamos o componente diretamente. O React cuidará da memoização.
    
    const renderEspecialidadeComponent = () => {
        switch (especialidade) {
            case 'Pediatria':
                return <AtendimentoPediatria pacienteId={pacienteId} onEvolucoesSalva={onEvolucaoSalva} />;
            case 'Cardiologia':
                return <AtendimentoCardiologia pacienteId={pacienteId} onEvolucoesSalva={onEvolucaoSalva} />;
            case 'Neonatologia':
                return <AtendimentoNeonatologia pacienteId={pacienteId} onEvolucoesSalva={onEvolucaoSalva} />;
            case 'Ginecologia':
                return <AtendimentoGinecologia pacienteId={pacienteId} onEvolucoesSalva={onEvolucaoSalva} />;
            case 'Obstetrícia': 
                return <AtendimentoObstetricia pacienteId={pacienteId} onEvolucoesSalva={onEvolucaoSalva} />;
            case 'Ortopedia': 
                return <AtendimentoOrtopedia pacienteId={pacienteId} onEvolucoesSalva={onEvolucaoSalva} />;
            case 'Reumatologia': 
                return <AtendimentoReumatologia pacienteId={pacienteId} onEvolucoesSalva={onEvolucaoSalva} />;
            case 'Neurologia': 
                return <AtendimentoNeurologia pacienteId={pacienteId} onEvolucoesSalva={onEvolucaoSalva} />;
            case 'Clínica Médica':
            case 'ClinicaGeral':
            default: 
                 return <AtendimentoClinicaGeral pacienteId={pacienteId} onEvolucoesSalva={onEvolucaoSalva} />;
        }
    };
    // --- FIM DA CORREÇÃO ---

    return (
        <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
            {/* --- CORREÇÃO APLICADA AQUI --- */}
            {renderEspecialidadeComponent()}
        </Suspense>
    );
}