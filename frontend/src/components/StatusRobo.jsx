// src/components/StatusRobo.jsx
import React, { useState, useEffect } from 'react';
import { FaRobot, FaCheckCircle } from 'react-icons/fa';
import { 
    Badge, Popover, Box, Typography, List, ListItem, ListItemText, Divider 
} from '@mui/material';
import apiClient from '../api/axiosConfig';

export default function StatusRobo() {
    const [roboHistory, setRoboHistory] = useState([]);
    const [roboStatus, setRoboStatus] = useState('carregando');
    const [anchorElRobo, setAnchorElRobo] = useState(null);

    useEffect(() => {
        const fetchRobo = async () => {
            try {
                const res = await apiClient.get('/exames/recentes/');
                setRoboHistory(res.data);
                setRoboStatus(res.data.length > 0 ? 'online' : 'ocioso');
            } catch (e) {
                setRoboStatus('offline');
            }
        };

        fetchRobo();
        const interval = setInterval(fetchRobo, 15000);
        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <Box 
                onClick={(e) => setAnchorElRobo(e.currentTarget)}
                sx={{ 
                    display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', 
                    background: 'rgba(255,255,255,0.08)', padding: '6px 12px', 
                    borderRadius: '20px', transition: '0.2s',
                    '&:hover': { background: 'rgba(255,255,255,0.15)'} 
                }}
            >
                <Badge 
                    color={roboStatus === 'online' ? 'success' : roboStatus === 'offline' ? 'error' : 'default'} 
                    variant="dot"
                    sx={{ '& .MuiBadge-badge': { animation: roboStatus === 'online' ? 'pulse-green 1.5s infinite' : 'none' } }}
                >
                    <FaRobot size={16} color={roboStatus === 'online' ? '#4CAF50' : '#9e9e9e'} />
                </Badge>
                <span style={{ fontSize: '0.75rem', color: '#e0e0e0', fontWeight: 600 }}>
                    {roboStatus === 'carregando' ? '...' : 
                     roboStatus === 'online' && roboHistory.length > 0 ? `USG: ${roboHistory[0].paciente.split(' ')[0]}` : 'USG Ocioso'}
                </span>
            </Box>

            <Popover
                open={Boolean(anchorElRobo)} anchorEl={anchorElRobo}
                onClose={() => setAnchorElRobo(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Box sx={{ p: 2, width: 320 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: '#1C2E4A', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FaRobot /> Últimos Exames Enviados
                    </Typography>
                    <Divider sx={{ mb: 1 }} />
                    <List dense>
                        {roboHistory.map((item, idx) => (
                            <ListItem key={idx} sx={{ borderBottom: '1px solid #f0f0f0', px: 0 }}>
                                <ListItemText 
                                    primary={<span style={{fontSize: '11px', fontWeight: 'bold'}}>{item.paciente}</span>}
                                    secondary={<span style={{fontSize: '10px'}}>{item.data_envio}</span>}
                                />
                                <FaCheckCircle color="#4CAF50" size={14} />
                            </ListItem>
                        ))}
                    </List>
                </Box>
            </Popover>
        </>
    );
}