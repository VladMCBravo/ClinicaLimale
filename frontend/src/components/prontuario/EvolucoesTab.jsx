// src/components/prontuario/EvolucoesTab.jsx
// ARQUIVO ATUALIZADO (Roteador de Especialidades)

import React, { Suspense, lazy, useMemo } from 'react';
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

// --- CORRIGIDO NOME DA PROP para onEvolucaoSalva (singular) ---
export default function EvolucaoTab({ pacienteId, especialidade, onEvolucaoSalva }) {
    
    // 2. MOVA A FUNÇÃO PARA DENTRO DO 'useMemo' OU MANTENHA-A E MEMOIZE A CHAMADA
    // (Vamos memoizar a chamada, é mais limpo)
    
    // A função que decide o componente
    const renderEspecialidadeComponent = () => {
        // (Todo o seu 'switch case' permanece exatamente igual)
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
                 return <AtendimentoClinicaGeral pacienteId={pacienteId} onEvolucaoSalva={onEvolucaoSalva} />;
        }
    };

    // --- 3. A CORREÇÃO ESTÁ AQUI ---
    // Use 'useMemo' para guardar o componente.
    // Ele só vai chamar 'renderEspecialidadeComponent' de novo se o paciente ou a especialidade mudarem.
    // Qualquer outra re-renderização no componente pai não vai recriá-lo.
    const memoizedComponent = useMemo(() => {
        return renderEspecialidadeComponent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pacienteId, especialidade, onEvolucaoSalva]); // Depende das props que o afetam
    // --- FIM DA CORREÇÃO ---

    return (
        <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
            {memoizedComponent} {/* <-- 4. RENDERIZE O COMPONENTE MEMOIZADO */}
        </Suspense>
    );
}