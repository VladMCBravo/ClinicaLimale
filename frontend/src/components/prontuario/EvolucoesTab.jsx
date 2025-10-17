// src/components/prontuario/EvolucoesTab.jsx

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

// 1. Receba a 'especialidade' diretamente via props
export default function EvolucoesTab({ pacienteId, onEvolucaoSalva, especialidade }) {
    
    const renderAtendimentoForm = () => {
        switch (especialidade) {
            case 'Pediatria': return <AtendimentoPediatria pacienteId={pacienteId} onEvolucaoSalva={onEvolucaoSalva} />;
            case 'Neonatologia': return <AtendimentoNeonatologia pacienteId={pacienteId} onEvolucaoSalva={onEvolucaoSalva} />;
            case 'Cardiologia': return <AtendimentoCardiologia pacienteId={pacienteId} onEvolucaoSalva={onEvolucaoSalva} />;
            case 'Ginecologia': return <AtendimentoGinecologia pacienteId={pacienteId} onEvolucaoSalva={onEvolucaoSalva} />;
            case 'Obstetricia': return <AtendimentoObstetricia pacienteId={pacienteId} onEvolucaoSalva={onEvolucaoSalva} />;
            case 'Ortopedia': return <AtendimentoOrtopedia pacienteId={pacienteId} onEvolucaoSalva={onEvolucaoSalva} />;
            case 'Reumatologia Pediátrica': return <AtendimentoReumatologia pacienteId={pacienteId} onEvolucaoSalva={onEvolucaoSalva} />;
            default: return null;
        }
    };

    return (
        <Box>
            {renderAtendimentoForm()}
        </Box>
    );
}