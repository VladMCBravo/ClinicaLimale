// src/components/painel/BarraStatus.jsx

import React from 'react';
import { Box, Paper, IconButton, Tooltip, Divider, Badge } from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CakeIcon from '@mui/icons-material/Cake';
import ForumIcon from '@mui/icons-material/Forum'; // Ícone para o Chatbot

// Este componente recebe os dados do painel como props
export default function BarraStatus({ data }) {
    
    return (
        <Paper 
            variant="outlined" 
            sx={{ 
                width: '60px', // Largura fixa e fina
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                py: 2,
                gap: 2,
            }}
        >
            <Tooltip title={`Consultas Agendadas Hoje: ${data.agendamentos_hoje_count}`} placement="left">
                {/* Usamos o Badge para mostrar o número diretamente no ícone */}
                <IconButton>
                    <Badge badgeContent={data.agendamentos_hoje_count} color="primary">
                        <EventAvailableIcon />
                    </Badge>
                </IconButton>
            </Tooltip>

            <Tooltip title={`Pacientes Novos no Mês: ${data.pacientes_novos_mes_count}`} placement="left">
                <IconButton>
                    <Badge badgeContent={data.pacientes_novos_mes_count} color="secondary">
                        <PersonAddIcon />
                    </Badge>
                </IconButton>
            </Tooltip>
            
            <Tooltip title={`${data.aniversariantes_mes?.length || 0} Aniversariantes no Mês`} placement="left">
                <IconButton>
                    <CakeIcon />
                </IconButton>
            </Tooltip>
            
            <Divider sx={{ width: '70%' }} />

            <Tooltip title="Chat em tempo real" placement="left">
                <IconButton>
                    <ForumIcon />
                </IconButton>
            </Tooltip>
            
            {/* Espaço para futuros ícones */}
        </Paper>
    );
}