// src/components/prontuario/LayoutEvolucaoPadrao.jsx

import React from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';

export default function LayoutEvolucaoPadrao({
    titulo,
    indicadoresExtras = null, 
    botaoNormalidade = null,
    onLimpar,
    onSalvar,
    isSubmitting,
    textoBotaoSalvar = 'Salvar Atendimento',
    formularioSOAP
}) {
    return (
        // Aplicamos a classe tasy-workspace para herdar o CSS global das barras de rolagem
        <Box className="tasy-workspace" sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            {/* CABEÇALHO DO FORMULÁRIO (Fixo) */}
            <Box sx={{ 
                display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', 
                p: 2, borderBottom: '1px solid #e0e0e0', bgcolor: '#ffffff', flexShrink: 0 
            }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1976d2', textTransform: 'uppercase' }}>
                        {titulo}
                    </Typography>
                    {indicadoresExtras}
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {botaoNormalidade}
                    <Button onClick={onLimpar} variant="outlined" size="small" disabled={isSubmitting} sx={{ borderRadius: 0 }}>
                        Limpar
                    </Button>
                    <Button onClick={onSalvar} variant="contained" size="small" disabled={isSubmitting} sx={{ borderRadius: 0, boxShadow: 'none' }}>
                        {isSubmitting ? <CircularProgress size={20} color="inherit" /> : textoBotaoSalvar}
                    </Button>
                </Box>
            </Box>

            {/* ÁREA DO FORMULÁRIO (Rolável) */}
            <Box className="tasy-compact-input" sx={{ flexGrow: 1, overflowY: 'auto', p: 3, bgcolor: '#ffffff' }}>
                {formularioSOAP}
            </Box>
            
        </Box>
    );
}