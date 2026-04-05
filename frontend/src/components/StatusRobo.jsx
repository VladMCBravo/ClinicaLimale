import React, { useState, useEffect } from 'react';
import { FaRobot, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaWifi } from 'react-icons/fa';
import { 
    Badge, Popover, Box, Typography, List, ListItem, ListItemText, Divider, Tooltip 
} from '@mui/material';
import apiClient from '../api/axiosConfig';

export default function StatusRobo() {
    const [roboHistory, setRoboHistory] = useState([]);
    const [roboStatus, setRoboStatus] = useState('carregando'); // 'online', 'offline', 'ocioso'
    const [anchorElRobo, setAnchorElRobo] = useState(null);

    useEffect(() => {
        const fetchDados = async () => {
            try {
                // Dispara as duas requisições ao mesmo tempo para não perder tempo
                const [resExames, resHeartbeat] = await Promise.all([
                    apiClient.get('/exames/recentes/'),
                    apiClient.get('/exames/heartbeat/') // Rota nova no Django
                ]);

                setRoboHistory(resExames.data);

                // A Lógica do Heartbeat domina o status visual principal
                if (resHeartbeat.data.online === false) {
                    setRoboStatus('offline');
                } else {
                    setRoboStatus(resExames.data.length > 0 ? 'online' : 'ocioso');
                }
            } catch (e) {
                setRoboStatus('offline'); // Se a API do Render cair, o robô está offline também
            }
        };

        fetchDados();
        const interval = setInterval(fetchDados, 15000);
        return () => clearInterval(interval);
    }, []);

    const getStatusConfig = (item) => {
        if (item.status === 'ERRO') {
            return {
                color: '#d32f2f',
                icon: FaTimesCircle,
                tooltip: `Falha na importação: ${item.erro_msg || 'Erro desconhecido'}`,
            };
        } else if (item.paciente === 'Desconhecido' || item.status === 'PENDENTE') {
            return {
                color: '#ed6c02',
                icon: FaExclamationTriangle,
                tooltip: 'Paciente não identificado. Vincule no painel.',
            };
        } else {
            return {
                color: '#4CAF50',
                icon: FaCheckCircle,
                tooltip: 'Importado com sucesso.',
            };
        }
    };

    return (
        <>
            <Box 
                onClick={(e) => setAnchorElRobo(e.currentTarget)}
                sx={{ 
                    display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', 
                    background: 'rgba(255,255,255,0.08)', padding: '6px 12px', 
                    borderRadius: '20px', transition: '0.2s',
                    border: roboStatus === 'offline' ? '1px solid #d32f2f' : '1px solid transparent',
                    '&:hover': { background: 'rgba(255,255,255,0.15)'} 
                }}
            >
                <Badge 
                    color={roboStatus === 'online' ? 'success' : roboStatus === 'offline' ? 'error' : 'default'} 
                    variant="dot"
                    sx={{ '& .MuiBadge-badge': { animation: roboStatus === 'online' ? 'pulse-green 1.5s infinite' : 'none' } }}
                >
                    <Tooltip 
                        title={roboStatus === 'offline' 
                            ? '⚠ O computador do ultrassom parece estar desligado ou sem internet.' 
                            : 'Robô comunicando perfeitamente'} 
                        arrow
                    >
                        <span>
                            <FaRobot size={16} color={roboStatus === 'online' ? '#4CAF50' : roboStatus === 'offline' ? '#d32f2f' : '#9e9e9e'} />
                        </span>
                    </Tooltip>
                </Badge>
                
                <span style={{ fontSize: '0.75rem', color: '#e0e0e0', fontWeight: 600 }}>
                    {roboStatus === 'carregando' ? '...' : 
                     roboStatus === 'offline' ? 'Desconectado' :
                     roboStatus === 'online' && roboHistory.length > 0 
                        ? `USG: ${roboHistory[0]?.paciente?.split(' ')[0] || 'Novo'}` 
                        : 'USG Ocioso'}
                </span>
            </Box>

            <Popover
                open={Boolean(anchorElRobo)} anchorEl={anchorElRobo}
                onClose={() => setAnchorElRobo(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Box sx={{ p: 2, width: 350 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: '#1C2E4A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FaRobot /> Últimos Exames Processados
                        </span>
                        {roboStatus === 'offline' && (
                            <Tooltip title="Robô não se comunica há mais de 5 minutos">
                                <span style={{ color: '#d32f2f', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <FaWifi /> Offline
                                </span>
                            </Tooltip>
                        )}
                    </Typography>
                    <Divider sx={{ mb: 1 }} />
                    <List dense>
                        {roboHistory.length === 0 ? (
                            <Typography variant="body2" sx={{ textAlign: 'center', color: '#757575', mt: 2 }}>
                                Nenhum histórico recente.
                            </Typography>
                        ) : (
                            roboHistory.map((item, idx) => {
                                const config = getStatusConfig(item);
                                const Icone = config.icon;

                                return (
                                    <ListItem key={idx} sx={{ borderBottom: '1px solid #f0f0f0', px: 0 }}>
                                        <ListItemText 
                                            primary={
                                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: config.color }}>
                                                    {item.paciente}
                                                </span>
                                            }
                                            secondary={
                                                <span style={{ fontSize: '10px', color: '#757575' }}>
                                                    {item.data_envio} • Pasta: {item.nome_pasta}
                                                </span>
                                            }
                                        />
                                        <Tooltip title={config.tooltip} placement="left" arrow>
                                            <div style={{ cursor: 'help', display: 'flex', alignItems: 'center', padding: '4px' }}>
                                                <Icone color={config.color} size={16} />
                                            </div>
                                        </Tooltip>
                                    </ListItem>
                                );
                            })
                        )}
                    </List>
                </Box>
            </Popover>
        </>
    );
}