import React, { useState, useEffect } from 'react';
import { FaRobot, FaCheckCircle, FaExclamationTriangle, FaTimesCircle } from 'react-icons/fa';
import { 
    Badge, Popover, Box, Typography, List, ListItem, ListItemText, Divider, Tooltip 
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

    // Função auxiliar para definir Cor, Ícone e Mensagem do Tooltip
    const getStatusConfig = (item) => {
        // 1. Erro Crítico (Vermelho) - Exige ação técnica
        if (item.status === 'ERRO') {
            return {
                color: '#d32f2f', // Vermelho
                icon: FaTimesCircle,
                tooltip: 'Falha na importação. Arquivos podem estar corrompidos ou a conexão caiu.',
            };
        }
        // 2. Alerta de Vínculo (Laranja) - Exige ação da recepção
        else if (item.paciente === 'Desconhecido' || item.status === 'PENDENTE') {
            return {
                color: '#ed6c02', // Laranja
                icon: FaExclamationTriangle,
                tooltip: 'Exame importado, mas paciente não identificado. Clique em "Vincular" no painel.',
            };
        }
        // 3. Sucesso Absoluto (Verde) - Tudo certo
        else {
            return {
                color: '#4CAF50', // Verde
                icon: FaCheckCircle,
                tooltip: 'Importado e vinculado ao paciente com sucesso.',
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
                    '&:hover': { background: 'rgba(255,255,255,0.15)'} 
                }}
            >
                <Badge 
                    color={roboStatus === 'online' ? 'success' : roboStatus === 'offline' ? 'error' : 'default'} 
                    variant="dot"
                    sx={{ '& .MuiBadge-badge': { animation: roboStatus === 'online' ? 'pulse-green 1.5s infinite' : 'none' } }}
                >
                    <Tooltip title={roboStatus === 'offline' ? 'Servidor indisponível' : 'Robô operante'} arrow>
                        <span>
                            <FaRobot size={16} color={roboStatus === 'online' ? '#4CAF50' : '#9e9e9e'} />
                        </span>
                    </Tooltip>
                </Badge>
                <span style={{ fontSize: '0.75rem', color: '#e0e0e0', fontWeight: 600 }}>
                    {roboStatus === 'carregando' ? '...' : 
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
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: '#1C2E4A', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FaRobot /> Últimos Exames Processados
                    </Typography>
                    <Divider sx={{ mb: 1 }} />
                    <List dense>
                        {roboHistory.map((item, idx) => {
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
                        })}
                    </List>
                </Box>
            </Popover>
        </>
    );
}