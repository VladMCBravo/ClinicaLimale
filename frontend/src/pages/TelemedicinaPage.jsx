// src/pages/TelemedicinaPage.jsx - VERSÃO COMPLETA E FUNCIONAL

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Paper, Typography, Button, CircularProgress } from '@mui/material';
import apiClient from '../api/axiosConfig';
import { useSnackbar } from '../contexts/SnackbarContext';

export default function TelemedicinaPage() {
  const [consultas, setConsultas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [criandoSalaId, setCriandoSalaId] = useState(null); // NOVO: Para mostrar loading no botão certo
  const { showSnackbar } = useSnackbar();

  // Função para buscar as consultas da API
  const fetchConsultas = useCallback(() => {
    setIsLoading(true);
    apiClient.get('/agendamentos/telemedicina/')
      .then(response => {
        // --- A CORREÇÃO CRÍTICA ESTÁ AQUI ---
        // Nós filtramos a lista ANTES de guardá-la no estado.
        const consultasAtivas = response.data.filter(consulta => consulta.status !== 'Cancelado');
        setConsultas(consultasAtivas);
      })
      .catch(err => {
        console.error("Erro ao buscar consultas de telemedicina:", err);
        showSnackbar('Erro ao carregar consultas.', 'error');
      })
      .finally(() => setIsLoading(false));
  }, [showSnackbar]);

  // Busca as consultas quando o componente monta
  useEffect(() => {
    fetchConsultas();
  }, [fetchConsultas]);


  // ALTERADO: Função para criar a sala agora atualiza a interface
  const handleCriarSala = (agendamentoId) => {
    setCriandoSalaId(agendamentoId); // Ativa o loading no botão específico
    
    apiClient.post(`/agendamentos/${agendamentoId}/criar-telemedicina/`)
      .then(response => {
        showSnackbar('Sala criada com sucesso!', 'success');
        
        // NOVO: Atualiza a lista de consultas em tempo real
        // Encontramos a consulta que foi atualizada e adicionamos o link nela
        setConsultas(prevConsultas => 
          prevConsultas.map(consulta => 
            consulta.id === agendamentoId 
              ? { ...consulta, link_telemedicina: response.data.roomUrl } 
              : consulta
          )
        );
      })
      .catch(err => {
        console.error("Erro ao criar sala:", err);
        showSnackbar('Erro ao criar a sala de telemedicina.', 'error');
      })
      .finally(() => {
        setCriandoSalaId(null); // Desativa o loading
      });
  };

  // NOVO: Função para copiar o link para a área de transferência
  const handleCopiarLink = (link) => {
    navigator.clipboard.writeText(link);
    showSnackbar('Link copiado para a área de transferência!', 'info');
  };

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Paper sx={{ p: 2, margin: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        Consultas de Telemedicina
      </Typography>
      
      {/* Tabela para listar as consultas */}
      <table width="100%" style={{ borderCollapse: 'collapse', marginTop: '20px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #ddd' }}>
            <th align="left" style={{ padding: '8px' }}>Data e Hora</th>
            <th align="left" style={{ padding: '8px' }}>Paciente</th>
            <th align="left" style={{ padding: '8px' }}>Status</th>
            <th align="left" style={{ padding: '8px' }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {consultas.length === 0 ? (
            <tr><td colSpan="4" align="center" style={{ padding: '16px' }}>Nenhuma consulta de telemedicina encontrada.</td></tr>
          ) : (
            consultas.map(consulta => (
              <tr key={consulta.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px' }}>{new Date(consulta.data_hora_inicio).toLocaleString('pt-BR')}</td>
                <td style={{ padding: '8px' }}>{consulta.paciente_nome}</td>
                <td style={{ padding: '8px' }}>{consulta.status}</td>
                <td style={{ padding: '8px' }}>
                  
                  {/* ALTERADO: Lógica condicional para os botões */}
                  {consulta.link_telemedicina ? (
                    // Se o link JÁ EXISTE, mostra os botões de ação
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button variant="contained" onClick={() => window.open(consulta.link_telemedicina, '_blank')}>
                        Entrar na Sala
                      </Button>
                      <Button variant="outlined" onClick={() => handleCopiarLink(consulta.link_telemedicina)}>
                        Copiar Link
                      </Button>
                    </Box>
                  ) : (
                    // Se o link NÃO EXISTE, mostra o botão para criar
                    <Button
                      variant="contained"
                      onClick={() => handleCriarSala(consulta.id)}
                      disabled={criandoSalaId === consulta.id}
                    >
                      {criandoSalaId === consulta.id ? <CircularProgress size={24} /> : 'Criar Sala'}
                    </Button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </Paper>
  );
}