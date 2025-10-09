// src/components/prontuario/PainelAcoes.jsx - VERSÃO CORRIGIDA

import React from 'react';
import { Box, Button, Typography, Paper, Divider } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ImageIcon from '@mui/icons-material/Image'; // 1. CORREÇÃO: Ícone importado aqui

// 2. CORREÇÃO: Adicionado "onVerExames" na lista de props
export default function PainelAcoes({ onNovaPrescricao, onEmitirAtestado, onAnexarDocumento, onVerExames }) {
    return (
        <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Ações Rápidas</Typography>
            <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={onNovaPrescricao} size="small">
                Nova Prescrição
            </Button>
            <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={onEmitirAtestado} size="small">
                Emitir Atestado
            </Button>
            <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={onAnexarDocumento} size="small">
                Anexar Documento
            </Button>
            
            <Button 
                variant="contained" 
                color="secondary" 
                startIcon={<ImageIcon />} 
                onClick={onVerExames} 
                size="small"
            >
                Ver Exames de Imagem
            </Button>

            <Divider sx={{ my: 1 }} />
            <Box><Typography variant="subtitle2">Prescrições Recentes:</Typography></Box>
            <Box><Typography variant="subtitle2">Anexos Recentes:</Typography></Box>
        </Paper>
    );
}