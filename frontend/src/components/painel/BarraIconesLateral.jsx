// src/components/painel/BarraIconesLateral.jsx
import React from 'react';
import { Box, IconButton, Tooltip, Divider } from '@mui/material';
import CakeIcon from '@mui/icons-material/Cake';
import TodayIcon from '@mui/icons-material/Today';
import SmartToyIcon from '@mui/icons-material/SmartToy';

// Componente placeholder para a barra de ícones
export default function BarraIconesLateral() {
    return (
        <Box
            sx={{
                width: 56, // Largura padrão para barras de ícones
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                py: 1,
                borderLeft: '1px solid',
                borderColor: 'divider'
            }}
        >
            <Tooltip title="Aniversariantes do Mês" placement="left">
                <IconButton>
                    <CakeIcon />
                </IconButton>
            </Tooltip>
            <Tooltip title="Agendas do Dia" placement="left">
                <IconButton>
                    <TodayIcon />
                </IconButton>
            </Tooltip>
            <Tooltip title="Chatbot" placement="left">
                <IconButton>
                    <SmartToyIcon />
                </IconButton>
            </Tooltip>
            <Divider sx={{ my: 1, width: '60%' }} />
            {/* Adicione outros ícones conforme necessário */}
        </Box>
    );
}