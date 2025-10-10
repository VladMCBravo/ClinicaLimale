// src/components/telemedicina/VideoCallView.jsx

import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export default function VideoCallView({ roomUrl, onClose }) {
    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid #ddd' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, backgroundColor: '#f5f5f5' }}>
                <Typography variant="subtitle2">Atendimento por Vídeo</Typography>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </Box>
            <Box sx={{ flexGrow: 1 }}>
                <iframe
                    src={roomUrl}
                    allow="camera; microphone; fullscreen; speaker; display-capture"
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title="Sala de Telemedicina"
                />
            </Box>
        </Box>
    );
}