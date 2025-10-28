// src/components/prontuario/EvolucoesTab.jsx
// ESTE É O COMPONENTE "ROTEADOR"

import React, { Suspense, lazy } from 'react';
// --- CORREÇÃO AQUI ---
import { Box, CircularProgress, Typography, Paper } from '@mui/material';

// Importa os formulários de especialidade com lazy loading
const AtendimentoPediatria = lazy(() => import('./AtendimentoPediatria'));
const AtendimentoCardiologia = lazy(() => import('./AtendimentoCardiologia'));
const AtendimentoNeonatologia = lazy(() => import('./AtendimentoNeonatologia')); // Sem a subpasta
const AtendimentoGinecologia = lazy(() => import('./AtendimentoGinecologia')); // Sem subpasta
const AtendimentoClinicaGeral = lazy(() => import('./AtendimentoClinicaGeral')); // <-- ADICIONE O IMPORT

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
            case 'Neonatologia':
                return <AtendimentoNeonatologia pacienteId={pacienteId} onEvolucoesSalva={onEvolucoesSalva} />;
            case 'Ginecologia':
            case 'Obstetrícia': // Pode usar o mesmo form? Avaliar.
                return <AtendimentoGinecologia pacienteId={pacienteId} onEvolucoesSalva={onEvolucoesSalva} />;
            case 'Clínica Médica': // Ou o nome que você usa
            // Adicione outras especialidades que usarão o form geral
            // case 'Dermatologia':
            // case 'Endocrinologia':
                return <AtendimentoClinicaGeral pacienteId={pacienteId} onEvolucaoSalva={onEvolucoesSalva} />;

            default: // Fallback final usa o genérico ou o de Clínica Geral
                // return <GenericFallback especialidadeNome={especialidade} />;
                 return <AtendimentoClinicaGeral pacienteId={pacienteId} onEvolucaoSalva={onEvolucoesSalva} />; // Ou usa Clínica Geral como default
        }
    };

    return (
        <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
            {renderEspecialidadeComponent()}
        </Suspense>
    );
}