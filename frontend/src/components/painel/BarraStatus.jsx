import React from 'react';
import { Box, Paper, IconButton, Tooltip, Divider, Badge } from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CakeIcon from '@mui/icons-material/Cake';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import ForumIcon from '@mui/icons-material/Forum';

// 1. Definimos a função do componente
function BarraStatus({ data, onListaEsperaClick, onChatClick }) {
    return (
        <Paper 
            variant="outlined" 
            sx={{ 
                width: '60px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                py: 2,
                gap: 2,
            }}
        >
            <Tooltip title={`Consultas Agendadas Hoje: ${data.agendamentos_hoje_count}`} placement="left">
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

            <Tooltip title="Ver Lista de Espera" placement="left">
                <IconButton onClick={onListaEsperaClick}>
                    <PlaylistPlayIcon />
                </IconButton>
            </Tooltip>
            
            <Tooltip title="Chat em tempo real" placement="left">
                {/* 2. Adicione o evento onClick */}
                <IconButton onClick={onChatClick}>
                    <ForumIcon />
                </IconButton>
            </Tooltip>
        </Paper>
    );
}

// 2. Exportamos a versão "memorizada" do componente
export default React.memo(BarraStatus);