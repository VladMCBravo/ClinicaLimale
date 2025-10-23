// src/components/prontuario/EvolucoesTab.jsx - VERSÃO CORRIGIDA

import React from 'react';
import { Box } from '@mui/material';

// Importe TODOS os seus formulários
import AtendimentoPediatria from './AtendimentoPediatria';
import AtendimentoNeonatologia from './AtendimentoNeonatologia';
import AtendimentoCardiologia from './AtendimentoCardiologia';
import AtendimentoGinecologia from './AtendimentoGinecologia';
import AtendimentoObstetricia from './AtendimentoObstetricia';
import AtendimentoOrtopedia from './AtendimentoOrtopedia';
import AtendimentoReumatologia from './AtendimentoReumatologia';
import AtendimentoGenerico from './AtendimentoGenerico';

// 1. A prop recebida é 'onEvolucoesSalva' (plural)
export default function EvolucoesTab({ pacienteId, onEvolucoesSalva, especialidade }) {
    
    const renderAtendimentoForm = () => {
        switch (especialidade) {
            // 2. CORREÇÃO: Use 'onEvolucoesSalva' (plural) em todos os componentes filhos
            case 'Pediatria': return <AtendimentoPediatria pacienteId={pacienteId} onEvolucaoSalva={onEvolucoesSalva} />;
            case 'Neonatologia': return <AtendimentoNeonatologia pacienteId={pacienteId} onEvolucaoSalva={onEvolucoesSalva} />;
            case 'Cardiologia': return <AtendimentoCardiologia pacienteId={pacienteId} onEvolucaoSalva={onEvolucoesSalva} />;
            case 'Ginecologia': return <AtendimentoGinecologia pacienteId={pacienteId} onEvolucaoSalva={onEvolucoesSalva} />;
            case 'Obstetricia': return <AtendimentoObstetricia pacienteId={pacienteId} onEvolucaoSalva={onEvolucoesSalva} />;
            case 'Ortopedia': return <AtendimentoOrtopedia pacienteId={pacienteId} onEvolucaoSalva={onEvolucoesSalva} />;
            case 'Reumatologia Pediátrica': return <AtendimentoReumatologia pacienteId={pacienteId} onEvolucaoSalva={onEvolucoesSalva} />;
            
            default: 
                return <AtendimentoGenerico 
                          pacienteId={pacienteId} 
                          onEvolucaoSalva={onEvolucoesSalva} // <-- CORREÇÃO AQUI TAMBÉM
                          especialidade={especialidade} 
                       />;
        }
    };

    return (
        <Box>
            {renderAtendimentoForm()}
        </Box>
    );
}