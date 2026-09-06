import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, List, ListItem, ListItemAvatar, ListItemText, 
  Avatar, Badge, CircularProgress, Divider, Tabs, Tab 
} from '@mui/material';
import { Groups as GroupsIcon } from '@mui/icons-material';
import apiClient from '../../api/axiosConfig';

export default function ChatSidebarEsquerda({ 
  currentUser, contatoAtivo, setContatoAtivo, naoLidas, setNaoLidas, ultimaAtividade = {}
}) {
  const [abaAtiva, setAbaAtiva] = useState(0);
  const [equipe, setEquipe] = useState([]);
  const [salas, setSalas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Busca Equipe e Salas na inicialização
  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiClient.get('/usuarios/usuarios/'),
      apiClient.get('/chat/rooms/') // Nossa nova rota da API!
    ])
    .then(([resEquipe, resSalas]) => {
      // Formata Equipe
      const usuariosValidos = resEquipe.data.filter(u => 
        u.is_active && u.id !== currentUser?.id &&
        (u.cargo === 'admin' || u.cargo === 'recepcao' || u.cargo === 'medico') && 
        (u.first_name && u.first_name.trim() !== '')
      ).map(u => ({ ...u, nome_exibicao: `${u.first_name} ${u.last_name || ''}`.trim() }));
      setEquipe(usuariosValidos);

      // Salva Salas
      setSalas(resSalas.data || []);

      console.log(`[CHAT-SIDEBAR] Equipe carregada (${usuariosValidos.length}):`, usuariosValidos.map(u => `${u.id}:${u.nome_exibicao}`));
      console.log(`[CHAT-SIDEBAR] Salas carregadas (${(resSalas.data || []).length}):`, (resSalas.data || []).map(s => `${s.id}:${s.nome_exibicao}`));
    })
    .catch(err => console.error("[CHAT-SIDEBAR] Erro ao buscar dados da sidebar:", err))
    .finally(() => setLoading(false));
  }, [currentUser]);

  // A MÁGICA DA ORDENAÇÃO (estilo WhatsApp):
  // 1º quem trocou mensagem mais recentemente sobe pro topo;
  // 2º em caso de empate (ex: nenhum dos dois teve atividade ainda), quem tem mais não lidas fica na frente;
  // 3º por fim, ordem alfabética.
  //
  // OBS: "ultimaAtividade" só é preenchida a partir de mensagens trocadas NESTA sessão do socket.
  // Se quiser que a ordem já venha correta logo ao abrir o chat (antes de qualquer mensagem nova
  // chegar), o backend precisa passar a devolver a data da última mensagem em /usuarios/usuarios/
  // e /chat/rooms/ — hoje esses endpoints não trazem esse dado.
  const ordenarLista = (lista, prefixo) => {
    const ordenada = [...lista].sort((a, b) => {
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

    console.log(
      `[CHAT-SIDEBAR] Ordem final (${prefixo}):`,
      ordenada.map(i => ({
        nome: i.nome_exibicao || i.name,
        naoLidas: naoLidas[`${prefixo}_${i.id}`] || 0,
        ultimaAtividade: ultimaAtividade[`${prefixo}_${i.id}`] || null,
      }))
    );

    return ordenada;
  };

  const handleSelecionar = (item, prefixo) => {
    console.log(`[CHAT-SIDEBAR] Selecionado: ${prefixo}_${item.id} (${item.nome_exibicao || item.name})`);
    setContatoAtivo(item);
    // Zera a bolinha vermelha ao clicar
    setNaoLidas(prev => {
      const newState = { ...prev };
      delete newState[`${prefixo}_${item.id}`]; 
      return newState;
    });
  };

  const listaExibida = abaAtiva === 0 ? ordenarLista(equipe, 'user') : ordenarLista(salas, 'room');
  const prefixoAtivo = abaAtiva === 0 ? 'user' : 'room';

  return (
    <Box sx={{ width: '25%', display: 'flex', flexDirection: 'column', borderRight: '1px solid #e0e0e0', bgcolor: '#fff' }}>
      <Box sx={{ p: 2, bgcolor: '#1a233b', color: '#fff', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="subtitle1" fontWeight="bold">Comunicação</Typography>
      </Box>
      
      <Tabs value={abaAtiva} onChange={(e, val) => setAbaAtiva(val)} variant="fullWidth" sx={{ minHeight: 40 }}>
        <Tab label="Membros" sx={{ minHeight: 40, fontWeight: 'bold' }} />
        <Tab label="Consultórios" sx={{ minHeight: 40, fontWeight: 'bold' }} />
      </Tabs>

      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={30} /></Box>
        ) : (
          <List disablePadding>
            {listaExibida.map((item) => {
              const chaveNaoLida = `${prefixoAtivo}_${item.id}`;
              const isSelected = contatoAtivo?.id === item.id && contatoAtivo?.is_room === item.is_room;

              return (
                <React.Fragment key={chaveNaoLida}>
                  <ListItem 
                    button selected={isSelected}
                    onClick={() => handleSelecionar(item, prefixoAtivo)} 
                    sx={{ 
                      '&.Mui-selected': { bgcolor: '#e3f2fd', borderLeft: '4px solid #1976d2' },
                      '&:hover': { bgcolor: '#f5f5f5' },
                      borderLeft: '4px solid transparent'
                    }}
                  >
                    <ListItemAvatar>
                      <Badge badgeContent={naoLidas[chaveNaoLida] || 0} color="error" overlap="circular">
                        <Avatar sx={{ bgcolor: item.is_room ? '#ef6c00' : (item.cargo === 'medico' ? '#0288d1' : '#7b1fa2') }}>
                          {item.is_room ? <GroupsIcon /> : (item.nome_exibicao?.charAt(0) || '?')}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={item.nome_exibicao || item.name} 
                      secondary={item.is_room ? "Grupo" : item.cargo}
                      primaryTypographyProps={{ fontWeight: (isSelected || naoLidas[chaveNaoLida]) ? 'bold' : 'normal', fontSize: '0.9rem' }}
                      secondaryTypographyProps={{ textTransform: 'capitalize', fontSize: '0.75rem' }}
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