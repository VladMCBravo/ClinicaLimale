import React from 'react';
import { Paper, Typography, Box, Button } from '@mui/material';

export default function ProcedimentosPage() {
    return (
        <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">Procedimentos</Typography>
                <Button variant="contained">Novo Procedimento</Button>
            </Box>
            <Typography>
                Página para gerenciamento de procedimentos. Implementação pendente.
            </Typography>
            {/* Aqui você vai adicionar sua tabela e lógica de API */}
        </Paper>
    );
}