// src/components/PatientHeader.jsx - VERSÃO COM SINAIS VITAIS

import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';

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

    // Tenta puxar dos sinais vitais da última evolução, se não tiver, tenta do cadastro, se não, N/A.
    const pesoExibicao = paciente?.sinais_vitais?.peso || paciente.peso || 'N/A';
    const alturaExibicao = paciente?.sinais_vitais?.altura || paciente.altura || 'N/A';
    const paExibicao = paciente?.sinais_vitais?.pa || 'N/A';
    const fcExibicao = paciente?.sinais_vitais?.fc || 'N/A';

    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid #eee' }}>
            <Box>
                <Typography variant="h5">{paciente.nome_completo}</Typography>
                
                {/* 🔥 LINHA ATUALIZADA COM PA E FC */}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    <b>Idade:</b> {calcularIdade(paciente.data_nascimento)} anos  |  
                    <b> Peso:</b> {pesoExibicao} kg  |  
                    <b> Altura:</b> {alturaExibicao} m  |  
                    <b> PA:</b> {paExibicao} mmHg  |  
                    <b> FC:</b> {fcExibicao} bpm
                </Typography>
            </Box>
            
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