// src/pages/ProntuarioPage.jsx - NOVA VERSÃO (APENAS UM WRAPPER)

import React from 'react';
import { useParams } from 'react-router-dom';
import { Box } from '@mui/material';
import ProntuarioCompleto from '../components/prontuario/ProntuarioCompleto';

export default function ProntuarioPage() {
    const { pacienteId } = useParams();

    return (
        <Box sx={{ p: 2 }}>
            <ProntuarioCompleto pacienteId={pacienteId} />
        </Box>
    );
}