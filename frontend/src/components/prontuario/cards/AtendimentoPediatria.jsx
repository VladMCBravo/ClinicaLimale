// src/components/prontuario/AtendimentoPediatria.jsx

import React from 'react';
import FormularioEvolucaoBase from './FormularioEvolucaoBase';
import CardHistoriaPerinatal from './cards/CardHistoriaPerinatal';
// Poderíamos criar um CardSOAP.jsx também para reutilizar os campos de S.O.A.P.

export default function AtendimentoPediatria({ pacienteId, onEvolucaoSalva }) {
    return (
        <FormularioEvolucaoBase 
            pacienteId={pacienteId} 
            onEvolucaoSalva={onEvolucaoSalva} 
            titulo="Evolução - Pediatria"
        >
            {/* Aqui você simplesmente lista os cards que compõem este formulário */}
            <CardHistoriaPerinatal />
            {/* Poderíamos adicionar <CardSOAP /> aqui, <CardVacinas />, etc. */}
        </FormularioEvolucaoBase>
    );
}