import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, IconButton, Grid, Paper } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

// --- CORREÇÃO APLICADA AQUI ---
// Removemos o "import.meta.env" que causou o erro.
// Usamos o IP fixo do Orthanc (PC da Clínica).
const orthancBaseUrl = 'http://192.168.0.4:8042'; 

export default function DicomViewer({ exame, onClose, onCapture, modoLaudo = false }) {
  const [imagens, setImagens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [capturadas, setCapturadas] = useState([]); // IDs das imagens selecionadas

  // Buscar a lista de TODAS as imagens do exame
  useEffect(() => {
    if (!exame?.orthanc_study_id) return;

    const fetchImagens = async () => {
      setLoading(true);
      try {
        // 1. Pega dados do estudo
        const resStudy = await fetch(`${orthancBaseUrl}/studies/${exame.orthanc_study_id}`);
        const studyData = await resStudy.json();

        // 2. Pega a primeira série (Ultrassom geralmente tem 1 série com várias fotos)
        const seriesId = studyData.Series?.[0];
        if (!seriesId) throw new Error("Sem séries");

        // 3. Pega todas as instâncias (fotos) dessa série
        const resSeries = await fetch(`${orthancBaseUrl}/series/${seriesId}`);
        const seriesData = await resSeries.json();
        
        // Salva a lista de IDs das fotos
        setImagens(seriesData.Instances || []);
      } catch (error) {
        console.error("Erro ao carregar galeria:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchImagens();
  }, [exame]);

  const toggleCaptura = (instanceId) => {
    if (!onCapture) return;

    // Cria a URL do preview (PNG leve) para salvar no laudo
    const urlImagem = `${orthancBaseUrl}/instances/${instanceId}/preview`;
    
    // Lógica visual de seleção
    if (capturadas.includes(instanceId)) {
        setCapturadas(prev => prev.filter(id => id !== instanceId));
    } else {
        setCapturadas(prev => [...prev, instanceId]);
        onCapture(urlImagem); // Envia para o EditorLaudo
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'black', overflow: 'hidden' }}>
        {/* Barra Superior */}
        <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#333' }}>
            <Typography variant="subtitle2" sx={{ color: 'white' }}>
                {exame?.study_description || 'Imagens do Exame'} ({imagens.length} fotos)
            </Typography>
            {!modoLaudo && (
                <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
                    <CloseIcon />
                </IconButton>
            )}
        </Box>

        {/* Área de Galeria (Scrollável) */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Grid container spacing={1}>
                    {imagens.map((instanceId) => (
                        <Grid item xs={6} sm={4} md={modoLaudo ? 6 : 3} key={instanceId}>
                            <Paper 
                                sx={{ 
                                    position: 'relative', 
                                    cursor: 'pointer',
                                    border: capturadas.includes(instanceId) ? '3px solid #00e676' : '1px solid #555',
                                    lineHeight: 0
                                }}
                                onClick={() => modoLaudo && toggleCaptura(instanceId)}
                            >
                                {/* Imagem Preview (Rápida) */}
                                <img 
                                    src={`${orthancBaseUrl}/instances/${instanceId}/preview`} 
                                    alt="USG" 
                                    style={{ width: '100%', height: 'auto', display: 'block' }}
                                    loading="lazy"
                                />
                                
                                {/* Ícone de Seleção (Só aparece no modo Laudo) */}
                                {modoLaudo && (
                                    <Box sx={{ position: 'absolute', top: 5, right: 5 }}>
                                        {capturadas.includes(instanceId) 
                                            ? <CheckCircleIcon sx={{ color: '#00e676', bgcolor:'black', borderRadius:'50%' }} />
                                            : <RadioButtonUncheckedIcon sx={{ color: 'white', bgcolor:'rgba(0,0,0,0.3)', borderRadius:'50%' }} />
                                        }
                                    </Box>
                                )}
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    </Box>
  );
}