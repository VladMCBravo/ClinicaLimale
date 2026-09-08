import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, List, ListItem, ListItemAvatar, ListItemText, 
  Avatar, Badge, CircularProgress, Divider, IconButton, Tooltip
} from '@mui/material';
import { Groups as GroupsIcon, ExitToApp as ExitIcon, SupportAgent as SupportIcon } from '@mui/icons-material';
import apiClient from '../../api/axiosConfig';
import { useAuth } from '../../hooks/useAuth'; // Para fazer o Logout

export default function ChatSidebarEsquerda({ 
  currentUser, contatoAtivo, setContatoAtivo, naoLidas, setNaoLidas, ultimaAtividade = {}, width = '25%'
}) {
  const [salas, setSalas] = useState([]);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth(); // Gancho de logout

  useEffect(() => {
    setLoading(true);
    apiClient.get('/chat/rooms/')
      .then(resSalas => setSalas(resSalas.data || []))
      .catch(err => console.error("[CHAT-SIDEBAR] Erro ao buscar dados da sidebar:", err))
      .finally(() => setLoading(false));
  }, [currentUser]);

  const ordenarLista = (lista) => {
    const prefixo = 'room';
    return [...lista].sort((a, b) => {
      const chaveA = `${prefixo}_${a.id}`;
      const chaveB = `${prefixo}_${b.id}`;

      const tempoA = ultimaAtividade[chaveA] ? new Date(ultimaAtividade[chaveA]).getTime() : 0;
      const tempoB = ultimaAtividade[chaveB] ? new Date(ultimaAtividade[chaveB]).getTime() : 0;

      if (tempoA !== tempoB) return tempoB - tempoA;

      const naoLidasA = naoLidas[chaveA] || 0;
      const naoLidasB = naoLidas[chaveB] || 0;
      if (naoLidasA !== naoLidasB) return naoLidasB - naoLidasA;

      return (a.nome_exibicao || a.name).localeCompare(b.nome_exibicao || b.name);
    });
  };

  const handleSelecionar = (item) => {
    setContatoAtivo(item);
    setNaoLidas(prev => {
      const newState = { ...prev };
      delete newState[`room_${item.id}`]; 
      return newState;
    });
  };

  const abrirSuporte = () => {
    // Altere para o seu número de suporte real com código de país e DDD
    const numero = '5513991338944'; 
    const mensagem = encodeURIComponent(`Olá, sou o(a) ${currentUser?.first_name || 'colaborador'} e preciso de suporte no Sistema Clínica Limalé.`);
    window.open(`https://wa.me/${numero}?text=${mensagem}`, '_blank');
  };

  const listaExibida = ordenarLista(salas);

  return (
    <Box sx={{ width: width, display: 'flex', flexDirection: 'column', height: '100%', borderRight: '1px solid #e0e0e0', bgcolor: '#fff' }}>
      
      {/* CABEÇALHO FIXO COM BOTÕES DE AÇÃO */}
      <Box sx={{ p: 2, pb: 1.5, bgcolor: '#1a233b', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight="bold" lineHeight={1.2}>Clínica Limalé</Typography>
          <Typography variant="caption" color="rgba(255,255,255,0.7)">Grupos de Atendimento</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Suporte via WhatsApp">
            <IconButton size="small" onClick={abrirSuporte} sx={{ color: '#4caf50' }}>
              <SupportIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Sair do Sistema">
            <IconButton size="small" onClick={logout} sx={{ color: '#ef5350' }}>
              <ExitIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ÁREA DE LISTA COM SCROLL SUAVE PARA IOS */}
      <Box sx={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={30} /></Box>
        ) : (
          <List disablePadding>
            {listaExibida.map((item) => {
              const chaveNaoLida = `room_${item.id}`;
              const isSelected = contatoAtivo?.id === item.id && contatoAtivo?.is_room;

              return (
                <React.Fragment key={chaveNaoLida}>
                  <ListItem 
                    button selected={isSelected}
                    onClick={() => handleSelecionar(item)} 
                    sx={{ 
                      '&.Mui-selected': { bgcolor: '#e3f2fd', borderLeft: '4px solid #1976d2' },
                      '&:hover': { bgcolor: '#f5f5f5' },
                      borderLeft: '4px solid transparent'
                    }}
                  >
                    <ListItemAvatar>
                      <Badge badgeContent={naoLidas[chaveNaoLida] || 0} color="error" overlap="circular">
                        <Avatar sx={{ bgcolor: '#ef6c00' }}>
                          <GroupsIcon />
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={item.nome_exibicao || item.name} 
                      secondary="Consultório Médico" 
                      primaryTypographyProps={{ fontWeight: (isSelected || naoLidas[chaveNaoLida]) ? 'bold' : 'normal', fontSize: '0.9rem' }}
                      secondaryTypographyProps={{ fontSize: '0.75rem' }}
                    />
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              );
            })}
          </List>
        )}
      </Box>
    </Box>
  );
}