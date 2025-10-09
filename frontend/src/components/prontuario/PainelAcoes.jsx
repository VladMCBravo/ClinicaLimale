import React from 'react';
import { Box, Button, Typography, Paper, Divider } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

export default function PainelAcoes({ onNovaPrescricao, onEmitirAtestado, onAnexarDocumento }) {
    return (
        <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 'bold' }}>Ações Rápidas</Typography>
            <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={onNovaPrescricao}>Nova Prescrição</Button>
            <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={onEmitirAtestado}>Emitir Atestado</Button>
            <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={onAnexarDocumento}>Anexar Documento</Button>
            <Divider sx={{ my: 1 }} />
            <Box><Typography variant="subtitle2">Prescrições Recentes:</Typography></Box>
            <Box><Typography variant="subtitle2">Anexos Recentes:</Typography></Box>
        </Paper>
    );
}