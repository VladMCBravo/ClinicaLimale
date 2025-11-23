// src/components/laudos/EstacaoLaudo.jsx
import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Button, Typography, CircularProgress } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import SaveIcon from '@mui/icons-material/Save';

// Seus componentes existentes
import DicomViewer from '../dicom/DicomViewer'; 
import EditorLaudo from './EditorLaudo';
import apiClient from '../../api/axiosConfig';
import { useSnackbar } from '../../contexts/SnackbarContext';

export default function EstacaoLaudo({ pacienteId, agendamento }) {
  const [textoLaudo, setTextoLaudo] = useState('');
  const [exameOrthanc, setExameOrthanc] = useState(null);
  const [loading, setLoading] = useState(false);
  const { showSnackbar } = useSnackbar();

  // 1. Buscar imagens no Orthanc ao abrir a aba
  useEffect(() => {
    const carregarImagens = async () => {
        try {
            setLoading(true);
            // Usa sua rota existente de integração
            const res = await apiClient.get(`/integracao/pacientes/${pacienteId}/exames/`);
            
            if (res.data && res.data.length > 0) {
                // Pega o exame mais recente (índice 0) automaticamente
                // Futuramente podemos deixar o usuário escolher qual exame da lista
                setExameOrthanc(res.data[0]);
            }
        } catch (error) {
            console.error("Erro ao buscar imagens:", error);
        } finally {
            setLoading(false);
        }
    };
    if (pacienteId) carregarImagens();
  }, [pacienteId]);

  // 2. Salvar o Laudo
  const handleSalvar = async () => {
      try {
          const payload = {
              paciente: pacienteId,
              agendamento_id: agendamento?.id,
              titulo_exame: agendamento?.procedimento_nome || 'Exame Avulso',
              conteudo_laudo: textoLaudo, // Envia o HTML/JSON do editor
              status: 'RASCUNHO'
          };
          
          await apiClient.post('/laudos/laudos/', payload);
          showSnackbar('Laudo salvo com sucesso!', 'success');
      } catch (error) {
          console.error("Erro ao salvar:", error);
          showSnackbar('Erro ao salvar laudo.', 'error');
      }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1, p: 1 }}>
      
      <Grid container spacing={2} sx={{ flexGrow: 1, height: '100%' }}>
        
        {/* ESQUERDA: Visualizador (Orthanc) */}
        <Grid item xs={12} md={6} sx={{ height: '100%' }}>
          <Paper elevation={3} sx={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle2" sx={{ p: 1, bgcolor: '#212121', color: 'white' }}>
              Imagens do Paciente
            </Typography>
            
            <Box sx={{ flexGrow: 1, bgcolor: 'black', position: 'relative' }}>
                {loading ? (
                    <CircularProgress sx={{ position: 'absolute', top: '50%', left: '50%' }} />
                ) : exameOrthanc ? (
                    <DicomViewer 
                        exame={exameOrthanc} 
                        onClose={() => {}} // Removemos o fechar pois é fixo
                    />
                ) : (
                    <Box sx={{ color: 'white', p: 3, textAlign: 'center' }}>
                        Nenhum exame de imagem encontrado para hoje.
                    </Box>
                )}
            </Box>
          </Paper>
        </Grid>

        {/* DIREITA: Editor de Laudo (TipTap) */}
        <Grid item xs={12} md={6} sx={{ height: '100%' }}>
          <Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#e3f2fd' }}>
                <Typography variant="subtitle1" fontWeight="bold">
                    {agendamento?.procedimento_nome || 'Laudo Médico'}
                </Typography>
                <Box>
                    <Button startIcon={<SaveIcon />} onClick={handleSalvar} sx={{ mr: 1 }}>Salvar</Button>
                    <Button variant="contained" startIcon={<PrintIcon />}>Imprimir</Button>
                </Box>
            </Box>
            
            <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
              <EditorLaudo 
                // Passa o código do procedimento para ele tentar achar o template sozinho
                procedimentoCodigo={agendamento?.procedimento_codigo} 
                onChange={(html) => setTextoLaudo(html)}
              />
            </Box>
          </Paper>
        </Grid>

      </Grid>
    </Box>
  );
}