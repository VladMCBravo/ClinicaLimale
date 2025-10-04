// src/components/dicom/DicomViewer.jsx

import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, CircularProgress, IconButton, Alert } from '@mui/material';
import CloseIcon from '@mui/icons-to-do/Close';

// Importações do Cornerstone
import cornerstone from 'cornerstone-core';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import dicomParser from 'dicom-parser';

// Configuração inicial do Cornerstone
try {
  cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
  cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
  cornerstoneWADOImageLoader.configure({
    beforeSend: function(xhr) {
      // Configurações futuras de autenticação podem ir aqui
    }
  });
} catch (error) {
  console.error("Erro ao configurar o cornerstoneWADOImageLoader:", error);
}


export default function DicomViewer({ exame, onClose }) {
  const elementRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !exame) return;

    // Coloque a URL base do seu servidor Orthanc aqui.
    // Em um projeto real, isso viria de uma variável de ambiente (.env).
    const orthancBaseUrl = 'http://localhost:8042';

    const loadImage = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // --- INÍCIO DA LÓGICA PRINCIPAL ---

        // 1. Buscar os detalhes do estudo na API do Orthanc
        const studyResponse = await fetch(`${orthancBaseUrl}/studies/${exame.orthanc_study_id}`);
        if (!studyResponse.ok) {
          throw new Error(`Falha ao buscar detalhes do estudo no Orthanc: ${studyResponse.statusText}`);
        }
        const studyData = await studyResponse.json();

        // 2. Extrair o ID da primeira imagem (instância) do estudo.
        // A estrutura é: Estudo -> contém Séries -> que contêm Instâncias
        const firstInstanceId = studyData?.Series?.[0]?.Instances?.[0];

        if (!firstInstanceId) {
          throw new Error("Nenhuma imagem (instância) foi encontrada neste estudo DICOM.");
        }

        // 3. Construir a URL final que o Cornerstone entende (WADO-URI)
        // Esta URL aponta diretamente para o arquivo da imagem DICOM.
        const imageId = `wadouri:${orthancBaseUrl}/instances/${firstInstanceId}/file`;

        // 4. Habilitar o elemento HTML e pedir ao Cornerstone para carregar e exibir a imagem.
        cornerstone.enable(element);
        const image = await cornerstone.loadImage(imageId);
        cornerstone.displayImage(element, image);

        // --- FIM DA LÓGICA PRINCIPAL ---

      } catch (err) {
        console.error('Erro detalhado ao carregar imagem DICOM:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();

    // Função de limpeza: desabilita o elemento quando o componente for desmontado.
    return () => {
      if (element) {
        try { cornerstone.disable(element); } catch(e) { /* ignora erro se já desabilitado */ }
      }
    };
  }, [exame]);


  return (
    <Box sx={{ p: 2, position: 'relative' }}>
        <IconButton
            onClick={onClose}
            sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1, color: 'white', backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
            <CloseIcon />
        </IconButton>
        <Typography variant="h6" sx={{ mb:1 }}>
            {exame?.study_description}
        </Typography>
        <Box 
            sx={{
                width: '100%',
                height: '512px',
                backgroundColor: 'black',
                color: 'white',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative' // Para posicionar o conteúdo interno
            }}
        >
            {/* O ref é para o cornerstone saber onde desenhar a imagem */}
            <div ref={elementRef} style={{width: '100%', height: '100%', position: 'absolute'}} />
            
            {/* Mensagens de estado para o usuário */}
            {isLoading && <CircularProgress color="inherit" />}
            {error && <Alert severity="error" sx={{width: '100%'}}>{error}</Alert>}
        </Box>
    </Box>
  );
}