import React, { useState, useEffect } from 'react';
import { 
    FaRobot, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, 
    FaWifi, FaTools, FaBolt, FaGlobe, FaTasks, FaSpinner
} from 'react-icons/fa';
import { 
    Badge, Popover, Box, Typography, List, ListItem, ListItemText, 
    Divider, Tooltip, Alert, AlertTitle
} from '@mui/material';
import apiClient from '../api/axiosConfig';

export default function StatusRobo() {
    const [roboHistory, setRoboHistory] = useState([]);
    const [roboStatus, setRoboStatus] = useState('carregando'); // 'online', 'offline', 'ocioso'
    const [roboErrorMsg, setRoboErrorMsg] = useState(''); // <--- NOVO ESTADO
    const [anchorElRobo, setAnchorElRobo] = useState(null);

    useEffect(() => {
    const fetchDados = async () => {
        try {
            const [resExames, resHeartbeat] = await Promise.all([
                apiClient.get('/exames/recentes/'),
                apiClient.get('/exames/heartbeat/') 
            ]);

            setRoboHistory(resExames.data);

            if (resHeartbeat.data.online === false) {
                setRoboStatus('offline');
                setRoboErrorMsg(resHeartbeat.data.erro || ''); // <--- SALVA O ERRO DO BACKEND
            } else {
                setRoboStatus(resExames.data.length > 0 ? 'online' : 'ocioso');
                setRoboErrorMsg('');
            }
        } catch (e) {
            setRoboStatus('offline'); 
            setRoboErrorMsg('Falha na conexão com a API do servidor.');
        }
    };

    fetchDados();
    const interval = setInterval(fetchDados, 15000);
    return () => clearInterval(interval);
}, []);

    const getStatusConfig = (item) => {
        if (item.status === 'ERRO') {
            const partes = item.nome_pasta.split('| ERRO:');
            const erroLimpo = partes.length > 1 ? partes[1].trim() : item.nome_pasta;
            return {
                color: '#d32f2f',
                icon: FaTimesCircle,
                tooltip: `Falha na importação: ${erroLimpo}`,
            };
        } else if (item.status === 'PENDENTE' && item.paciente !== 'Desconhecido') {
            // 🚀 NOVA REGRA: A pasta existe, mas o laudo está na malha fina do Claude ou assinando
            return {
                color: '#0288d1', // Azul de processamento
                icon: FaSpinner,
                tooltip: 'Auditoria em andamento / Aguardando assinatura do laudo...',
                isSpinning: true // Flag para fazer o ícone girar
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
                tooltip: 'Finalizado e importado com sucesso.',
            };
        }
    };

    const formatarDataBR = (dataString) => {
    if (!dataString) return '';
    try {
        const data = new Date(dataString);
        return new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(data);
    } catch (e) {
        return dataString; // Retorna original se falhar
    }
};

    return (
        <>
            <Box 
                onClick={(e) => setAnchorElRobo(e.currentTarget)}
                sx={{ 
                    display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', 
                    background: roboStatus === 'offline' ? 'rgba(211, 47, 47, 0.15)' : 'rgba(255,255,255,0.08)', 
                    padding: '6px 16px', 
                    borderRadius: '20px', transition: 'all 0.3s ease',
                    border: roboStatus === 'offline' ? '1px solid #d32f2f' : '1px solid rgba(255,255,255,0.1)',
                    '&:hover': { 
                        background: roboStatus === 'offline' ? 'rgba(211, 47, 47, 0.25)' : 'rgba(255,255,255,0.15)',
                        transform: 'translateY(-1px)'
                    } 
                }}
            >
                <Badge 
                    color={roboStatus === 'online' ? 'success' : roboStatus === 'offline' ? 'error' : 'warning'} 
                    variant="dot"
                    sx={{ '& .MuiBadge-badge': { animation: roboStatus === 'online' ? 'pulse-green 1.5s infinite' : 'none' } }}
                >
                    <Tooltip 
                        title={roboStatus === 'offline' 
                            ? 'Atenção: Comunicação com o Ultrassom perdida. Clique para resolver.' 
                            : 'Robô comunicando perfeitamente'} 
                        arrow
                    >
                        <span>
                            <FaRobot size={18} color={roboStatus === 'online' ? '#4CAF50' : roboStatus === 'offline' ? '#ff5252' : '#ffb74d'} />
                        </span>
                    </Tooltip>
                </Badge>
                
                <span style={{ fontSize: '0.8rem', color: roboStatus === 'offline' ? '#ff5252' : '#e0e0e0', fontWeight: 600 }}>
                    {roboStatus === 'carregando' ? 'Aguardando Robô...' : 
                     roboStatus === 'offline' ? 'USG Offline' :
                     roboStatus === 'online' && roboHistory.length > 0 
                        ? `Processando: ${roboHistory[0]?.paciente?.split(' ')[0] || 'Novo'}` 
                        : 'USG Ocioso / Pronto'}
                </span>
            </Box>

            <Popover
                open={Boolean(anchorElRobo)} anchorEl={anchorElRobo}
                onClose={() => setAnchorElRobo(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{
                    sx: { mt: 1.5, width: 400, borderRadius: 2, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }
                }}
            >
                <Box sx={{ p: 2 }}>
                    {/* CABEÇALHO DO POPOVER */}
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1C2E4A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FaRobot size={20} color="#1C2E4A" /> Central de Diagnóstico
                        </span>
                        {roboStatus === 'offline' ? (
                            <span style={{ color: '#d32f2f', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, background: '#ffebee', padding: '4px 8px', borderRadius: '12px' }}>
                                <FaWifi /> Desconectado
                            </span>
                        ) : (
                            <span style={{ color: '#4CAF50', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, background: '#e8f5e9', padding: '4px 8px', borderRadius: '12px' }}>
                                <FaWifi /> Online
                            </span>
                        )}
                    </Typography>

                    {/* GUIA DE SOLUÇÃO (Aparece apenas se offline) */}
                    {roboStatus === 'offline' && (
                        <Alert severity="error" icon={<FaTools />} sx={{ mb: 2, '& .MuiAlert-message': { width: '100%' } }}>
                            <AlertTitle sx={{ fontWeight: 'bold' }}>Como Resolver?</AlertTitle>

                            {/* EXIBIÇÃO DINÂMICA DO LOG DE ERRO */}
                            {roboErrorMsg && (
                                <Typography variant="body2" sx={{ mb: 1.5, color: '#d32f2f', background: 'rgba(211, 47, 47, 0.1)', p: 1, borderRadius: 1, fontWeight: 'bold', border: '1px solid rgba(211, 47, 47, 0.3)' }}>
                                    Causa provável: {roboErrorMsg}
                                </Typography>
                            )}

                            <Typography variant="body2" sx={{ mb: 1 }}>
                                O computador da sala de exames parou de enviar sinal de vida. Verifique:
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1.5 }}>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                    <FaBolt size={14} style={{ marginTop: '3px', color: '#d32f2f' }} />
                                    <Typography variant="caption"><strong>1. Energia:</strong> PC Desligado, suspenso ou nobreak apitou.</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                    <FaTasks size={14} style={{ marginTop: '3px', color: '#d32f2f' }} />
                                    <Typography variant="caption"><strong>2. Agendador (0x800710E0):</strong> Abra o Agendador de Tarefas no PC local, clique em "Finalizar" e "Executar" na tarefa do Robô.</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                    <FaGlobe size={14} style={{ marginTop: '3px', color: '#d32f2f' }} />
                                    <Typography variant="caption"><strong>3. Internet:</strong> Verifique se o Wi-Fi ou cabo de rede local está conectado.</Typography>
                                </Box>
                            </Box>
                        </Alert>
                    )}

                    <Divider sx={{ my: 1.5 }} />

                    {/* LISTA DE EXAMES */}
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#546e7a', mb: 1, fontSize: '0.8rem', textTransform: 'uppercase' }}>
                        Últimos Envios de Imagem
                    </Typography>
                    
                    <List dense sx={{ maxHeight: 250, overflowY: 'auto' }}>
                        {roboHistory.length === 0 ? (
                            <Typography variant="body2" sx={{ textAlign: 'center', color: '#9e9e9e', mt: 2, fontStyle: 'italic' }}>
                                Nenhum arquivo processado hoje.
                            </Typography>
                        ) : (
                            roboHistory.map((item, idx) => {
                                const config = getStatusConfig(item);
                                const Icone = config.icon;

                                return (
                                    <ListItem key={idx} sx={{ borderBottom: '1px solid #f0f0f0', px: 1, borderRadius: 1, '&:hover': { background: '#f5f5f5' } }}>
                                        <ListItemText 
                                            primary={
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#37474f' }}>
                                                    {item.paciente}
                                                </span>
                                            }
                                            secondary={
                                                <span style={{ fontSize: '11px', color: '#757575', display: 'block', marginTop: '2px' }}>
                                                    {formatarDataBR(item.data_envio)} • Pasta: {item.nome_pasta}
                                                </span>
                                            }
                                        />
                                        <Tooltip title={config.tooltip} placement="left" arrow>
                                            <div style={{ cursor: 'help', display: 'flex', alignItems: 'center', padding: '6px' }}>
                                                <Icone 
                                                    color={config.color} 
                                                    size={18} 
                                                    className={config.isSpinning ? "spin" : ""} 
                                                />
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