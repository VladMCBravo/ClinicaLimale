// src/components/prontuario/EvolucoesTab.jsx
// ESTE É O COMPONENTE "ROTEADOR"

import React, { Suspense, lazy } from 'react';
// --- CORREÇÃO AQUI ---
import { Box, CircularProgress, Typography, Paper } from '@mui/material';

// Importa os formulários de especialidade com lazy loading
const AtendimentoPediatria = lazy(() => import('./AtendimentoPediatria'));
const AtendimentoCardiologia = lazy(() => import('./AtendimentoCardiologia'));
// const AtendimentoGinecologia = lazy(() => import('./AtendimentoGinecologia')); // (Futuro)
// const AtendimentoClinicaGeral = lazy(() => import('./AtendimentoClinicaGeral')); // (Futuro)

// Componente "Fallback" genérico
const GenericFallback = ({ especialidadeNome }) => (
    // --- ESTA LINHA CAUSOU O ERRO ---
    <Paper sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6">Prontuário (Em Desenvolvimento)</Typography>
        <Typography>Especialidade: {especialidadeNome}</Typography>
        <Typography color="text.secondary">Formulário específico não implementado.</Typography>
    </Paper>
);

export default function EvolucaoTab({ pacienteId, especialidade, onEvolucoesSalva }) {
    
    // Função para renderizar o componente da especialidade correta
    const renderEspecialidadeComponent = () => {
        switch (especialidade) {
            case 'Pediatria':
                return <AtendimentoPediatria pacienteId={pacienteId} onEvolucoesSalva={onEvolucoesSalva} />;
            case 'Cardiologia':
                return <AtendimentoCardiologia pacienteId={pacienteId} onEvolucoesSalva={onEvolucoesSalva} />;
            // case 'Ginecologia':
            //     return <AtendimentoGinecologia pacienteId={pacienteId} onEvolucoesSalva={onEvolucoesSalva} />;
            
            // Caso padrão (Clínica Geral ou outros)
            // case 'Clínica Médica':
            //     return <AtendimentoClinicaGeral pacienteId={pacienteId} onEvolucoesSalva={onEvolucoesSalva} />;
            default:
                // Passamos o nome da especialidade para o fallback
                return <GenericFallback especialidadeNome={especialidade} />;
        }
    };

    return (
        <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
            {renderEspecialidadeComponent()}
        </Suspense>
    );
}