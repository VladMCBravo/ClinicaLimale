// src/pages/TelemedicinaPage.jsx 
import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

export default function TelemedicinaPage() {
    // No futuro, esta página irá buscar e listar as consultas de telemedicina
    return (
        <Paper sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>
                Consultas de Telemedicina
            </Typography>
            <Typography>
                Aqui será exibida a lista de agendamentos futuros que são de telemedicina, com links para aceder às salas de videochamada.
            </Typography>
        </Paper>
    );
}