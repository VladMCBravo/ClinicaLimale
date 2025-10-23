// src/components/prontuario/EvolucoesTab.jsx - VERSÃO ATUALIZADA

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

// 1. ADICIONE A IMPORTAÇÃO DO NOVO COMPONENTE GENÉRICO
import AtendimentoGenerico from './AtendimentoGenerico';

export default function EvolucoesTab({ pacienteId, onEvolucoesSalva, especialidade }) {
    
    const renderAtendimentoForm = () => {
        // O seu switch case está perfeito.
        switch (especialidade) {
            case 'Pediatria': return <AtendimentoPediatria pacienteId={pacienteId} onEvolucaoSalva={onEvolucaoSalva} />;
            case 'Neonatologia': return <AtendimentoNeonatologia pacienteId={pacienteId} onEvolucaoSalva={onEvolucaoSalva} />;
            case 'Cardiologia': return <AtendimentoCardiologia pacienteId={pacienteId} onEvolucaoSalva={onEvolucaoSalva} />;
            case 'Ginecologia': return <AtendimentoGinecologia pacienteId={pacienteId} onEvolucaoSalva={onEvolucaoSalva} />;
            case 'Obstetricia': return <AtendimentoObstetricia pacienteId={pacienteId} onEvolucaoSalva={onEvolucaoSalva} />;
            case 'Ortopedia': return <AtendimentoOrtopedia pacienteId={pacienteId} onEvolucaoSalva={onEvolucaoSalva} />;
            case 'Reumatologia Pediátrica': return <AtendimentoReumatologia pacienteId={pacienteId} onEvolucaoSalva={onEvolucaoSalva} />;
            
            // 2. ALTERE O "default"
            // Em vez de 'null', retornamos o formulário Genérico.
            // Passamos a 'especialidade' para ele exibir o título correto.
            default: 
                return <AtendimentoGenerico 
                          pacienteId={pacienteId} 
                          onEvolucaoSalva={onEvolucaoSalva} 
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