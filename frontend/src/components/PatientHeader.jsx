// src/components/PatientHeader.jsx - VERSÃO CORRETA E FINAL

import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';

// O componente recebe 'paciente', 'agendamento' e a função 'onStartTelemedicina'
export default function PatientHeader({ paciente, agendamento, onStartTelemedicina }) {
    if (!paciente) {
        return (
            <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
                <Typography variant="h5">Carregando...</Typography>
            </Box>
        );
    }

    const isTelemedicina = agendamento?.modalidade === 'Telemedicina';

    const calcularIdade = (dataNascimento) => {
        if (!dataNascimento) return 'N/A';
        const hoje = new Date();
        const nascimento = new Date(dataNascimento);
        let idade = hoje.getFullYear() - nascimento.getFullYear();
        const m = hoje.getMonth() - nascimento.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
            idade--;
        }
        return idade;
    };

    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid #eee' }}>
            <Box>
                <Typography variant="h5">{paciente.nome_completo}</Typography>
                <Typography variant="body2" color="text.secondary">
                    Idade: {calcularIdade(paciente.data_nascimento)} anos  |  Peso: {paciente.peso || 'N/A'} kg  |  Altura: {paciente.altura || 'N/A'} m
                </Typography>
            </Box>
            
            {/* O botão de Telemedicina só aparece se o agendamento for dessa modalidade */}
            {isTelemedicina && (
                <Button 
                    variant="contained" 
                    startIcon={<VideocamIcon />}
                    onClick={onStartTelemedicina}
                >
                    Iniciar Telemedicina
                </Button>
            )}
        </Box>
    );
}