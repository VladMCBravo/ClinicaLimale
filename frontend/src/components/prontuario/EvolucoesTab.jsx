// src/components/prontuario/EvolucoesTab.jsx
// ARQUIVO ATUALIZADO (Roteador de Especialidades)

import React, { Suspense, lazy } from 'react';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';

// Importa os formulários de especialidade com lazy loading
const AtendimentoPediatria = lazy(() => import('./AtendimentoPediatria'));
const AtendimentoCardiologia = lazy(() => import('./AtendimentoCardiologia'));
const AtendimentoNeonatologia = lazy(() => import('./AtendimentoNeonatologia'));
const AtendimentoGinecologia = lazy(() => import('./AtendimentoGinecologia'));
const AtendimentoClinicaGeral = lazy(() => import('./AtendimentoClinicaGeral'));

// --- 1. ADICIONANDO NOVAS ESPECIALIDADES ---
const AtendimentoObstetricia = lazy(() => import('./AtendimentoObstetricia'));
const AtendimentoOrtopedia = lazy(() => import('./AtendimentoOrtopedia'));
const AtendimentoReumatologia = lazy(() => import('./AtendimentoReumatologia'));
const AtendimentoNeurologia = lazy(() => import('./AtendimentoNeurologia'));
// --- FIM DA ADIÇÃO ---


// Componente "Fallback" genérico
const GenericFallback = ({ especialidadeNome }) => (
    <Paper sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6">Prontuário (Em Desenvolvimento)</Typography>
        <Typography>Especialidade: {especialidadeNome}</Typography>
        <Typography color="text.secondary">Formulário específico não implementado.</Typography>
    </Paper>
);

// --- 2. CORRIGIDO NOME DA PROP para onEvolucaoSalva (singular) ---
export default function EvolucaoTab({ pacienteId, especialidade, onEvolucaoSalva }) {
    
    // Função para renderizar o componente da especialidade correta
    const renderEspecialidadeComponent = () => {
        
        // --- 3. ATUALIZANDO O 'switch' E PADRONIZANDO A PROP ---
        switch (especialidade) {
            // --- Módulos Antigos ---
            case 'Pediatria':
                return <AtendimentoPediatria pacienteId={pacienteId} onEvolucoesSalva={onEvolucaoSalva} />;
            case 'Cardiologia':
                return <AtendimentoCardiologia pacienteId={pacienteId} onEvolucoesSalva={onEvolucaoSalva} />;
            case 'Neonatologia':
                return <AtendimentoNeonatologia pacienteId={pacienteId} onEvolucoesSalva={onEvolucaoSalva} />;
            case 'Ginecologia':
                return <AtendimentoGinecologia pacienteId={pacienteId} onEvolucoesSalva={onEvolucaoSalva} />;
            
            // --- Módulos Novos e Corrigidos ---
            case 'Obstetrícia': // <-- CORRIGIDO
                return <AtendimentoObstetricia pacienteId={pacienteId} onEvolucoesSalva={onEvolucaoSalva} />;
            case 'Ortopedia': // <-- ADICIONADO
                return <AtendimentoOrtopedia pacienteId={pacienteId} onEvolucoesSalva={onEvolucaoSalva} />;
            case 'Reumatologia': // <-- ADICIONADO
                return <AtendimentoReumatologia pacienteId={pacienteId} onEvolucoesSalva={onEvolucaoSalva} />;
            case 'Neurologia': // <-- ADICIONADO (Conforme solicitado)
                return <AtendimentoNeurologia pacienteId={pacienteId} onEvolucoesSalva={onEvolucaoSalva} />;

            // --- Módulo Padrão/Default ---
            case 'Clínica Médica':
            case 'ClinicaGeral': // Adicionando alias
            default: 
                 // Usa o Clínica Geral como padrão
                 return <AtendimentoClinicaGeral pacienteId={pacienteId} onEvolucaoSalva={onEvolucaoSalva} />;
        }
    };

    return (
        <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
            {renderEspecialidadeComponent()}
        </Suspense>
    );
}