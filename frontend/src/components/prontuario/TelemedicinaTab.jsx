// src/components/prontuario/TelemedicinaTab.jsx

import React, { useState, useEffect } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';

export default function TelemedicinaTab({ agendamento }) {
  const { showSnackbar } = useSnackbar();
  const [linkSala, setLinkSala] = useState(agendamento?.link_telemedicina || null);
  const [criandoSala, setCriandoSala] = useState(false);

  // Atualiza o link se o agendamento mudar
  useEffect(() => {
    setLinkSala(agendamento?.link_telemedicina || null);
  }, [agendamento]);

  const handleCriarSala = async () => {
    if (!agendamento) return;
    setCriandoSala(true);
    try {
      const response = await apiClient.post(`/agendamentos/${agendamento.id}/criar-telemedicina/`);
      setLinkSala(response.data.roomUrl);
      showSnackbar('Sala criada com sucesso!', 'success');
    } catch (error) {
      console.error("Erro ao criar sala:", error);
      showSnackbar('Erro ao criar a sala de telemedicina.', 'error');
    } finally {
      setCriandoSala(false);
    }
  };

  const handleCopiarLink = () => {
    if (linkSala) {
      navigator.clipboard.writeText(linkSala);
      showSnackbar('Link copiado para a área de transferência!', 'info');
    }
  };

  return (
    <Box className="tasy-compact-input" sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
      
      {/* CABEÇALHO PADRÃO */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography className="tasy-section-header">Sala de Videoconferência</Typography>
        {linkSala && (
          <Button size="small" startIcon={<ContentCopyIcon />} onClick={handleCopiarLink}>
            Copiar Link
          </Button>
        )}
      </Box>

      {/* ÁREA DA CÂMERA OU BOTÃO DE CRIAR */}
      {!linkSala ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', border: '2px dashed #ccc', borderRadius: 2, bgcolor: '#fff' }}>
          <Button variant="contained" onClick={handleCriarSala} disabled={criandoSala} disableElevation>
            {criandoSala ? <CircularProgress size={24} color="inherit" /> : 'Criar e Entrar na Sala'}
          </Button>
        </Box>
      ) : (
        <Box sx={{ flexGrow: 1, minHeight: '60vh', borderRadius: 2, overflow: 'hidden', bgcolor: 'grey.900' }}>
          <iframe 
            src={linkSala} 
            allow="camera; microphone; fullscreen; speaker; display-capture" 
            style={{ width: '100%', height: '100%', border: 'none' }} 
            title="Sala de Telemedicina"
          />
        </Box>
      )}
    </Box>
  );
}