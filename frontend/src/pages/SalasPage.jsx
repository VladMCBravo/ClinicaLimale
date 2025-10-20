import React from 'react';
import { Paper, Typography, Box, Button } from '@mui/material';

export default function SalasPage() {
    return (
        <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">Gestão de Salas</Typography>
                <Button variant="contained">Nova Sala</Button>
            </Box>
            <Typography>
                Página para gerenciamento de salas de agendamento. Implementação pendente.
            </Typography>
            {/* Aqui você vai adicionar sua tabela e lógica de API */}
        </Paper>
    );
}