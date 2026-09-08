import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, List, ListItem, ListItemAvatar, ListItemText, 
  Avatar, Badge, CircularProgress, Divider 
} from '@mui/material';
import { Groups as GroupsIcon } from '@mui/icons-material';
import apiClient from '../../api/axiosConfig';

export default function ChatSidebarEsquerda({ 
  currentUser, contatoAtivo, setContatoAtivo, naoLidas, setNaoLidas, ultimaAtividade = {}, width = '25%'
}) {
  // Removido o state de 'equipe' e 'abaAtiva'
  const [salas, setSalas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Busca apenas Salas na inicialização
  useEffect(() => {
    setLoading(true);
    apiClient.get('/chat/rooms/')
      .then(resSalas => {
        setSalas(resSalas.data || []);
      })
      .catch(err => console.error("[CHAT-SIDEBAR] Erro ao buscar dados da sidebar:", err))
      .finally(() => setLoading(false));
  }, [currentUser]);

  // A mesma lógica de ordenação, mas simplificada, pois agora só há "room"
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

  const listaExibida = ordenarLista(salas);

  return (
    <Box sx={{ width: width, display: 'flex', flexDirection: 'column', borderRight: '1px solid #e0e0e0', bgcolor: '#fff' }}>
      
      {/* 2. Modificado de 'Comunicação' para 'Clínica Limalé' */}
      <Box sx={{ p: 2, pb: 1.5, bgcolor: '#1a233b', color: '#fff', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="subtitle1" fontWeight="bold">Clínica Limalé</Typography>
        <Typography variant="caption" color="rgba(255,255,255,0.7)">Grupos de Atendimento</Typography>
      </Box>
      
      {/* 3. A barra <Tabs> foi completamente removida daqui */}

      <Box sx={{ flex: 1, overflowY: 'auto' }}>
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
                      // Modificado 'Grupo' para algo mais limpo ou apenas removido
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