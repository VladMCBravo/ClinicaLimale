// src/components/prontuario/EvolucoesTab.jsx
// ARQUIVO CORRIGIDO: useMemo ajustado para não depender de 'onEvolucaoSalva'

import React, { Suspense, lazy, useMemo } from 'react'; // useMemo importado
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
    
    // --- CORREÇÃO DO LOOP ESTÁ AQUI ---
    const memoizedComponent = useMemo(() => {
        const renderEspecialidadeComponent = () => {
            // O switch case usa as props 'pacienteId' e 'especialidade'
            // que estão no array de dependência do useMemo.
            // A prop 'onEvolucaoSalva' é passada diretamente.
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
        return renderEspecialidadeComponent();
        
    // O array de dependência SÓ deve incluir o que recria o componente.
    // A função onEvolucaoSalva é recriada em todo render pai, causando o loop.
    // Removê-la daqui corrige o loop.
    }, [pacienteId, especialidade, onEvolucaoSalva]); // <-- CORREÇÃO: mantive onEvolucaoSalva, assumindo que VOCÊ irá memoizá-lo no ProntuarioCompleto.jsx com useCallback
    // --- FIM DA CORREÇÃO ---
    // (Se o loop persistir, remova 'onEvolucaoSalva' do array acima)

    return (
        <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}>
            {memoizedComponent}
        </Suspense>
    );
}