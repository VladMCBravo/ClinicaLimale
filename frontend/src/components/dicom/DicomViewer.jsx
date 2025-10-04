// src/components/dicom/DicomViewer.jsx

import React, { useEffect, useRef } from 'react';
import { Box, Typography, CircularProgress, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// Importações do Cornerstone
import cornerstone from 'cornerstone-core';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import dicomParser from 'dicom-parser';

// Configuração inicial do Cornerstone (executada apenas uma vez)
try {
  cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
  cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
  cornerstoneWADOImageLoader.configure({
    beforeSend: function(xhr) {
      // Se seu servidor Orthanc precisar de autenticação no futuro,
      // você pode adicionar os headers aqui.
    }
  });
} catch (error) {
  console.error("Erro ao configurar o cornerstoneWADOImageLoader:", error);
}


export default function DicomViewer({ exame, onClose }) {
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !exame) return;

    // A URL para carregar a imagem via WADO (Web Access to DICOM Objects)
    // Precisaremos obter a lista de imagens (instances) do estudo.
    // Por enquanto, vamos deixar um placeholder.
    const imageId = `wadouri:http://localhost:8042/studies/${exame.orthanc_study_id}/series/..../instances/....`;
    // OBS: A URL acima é apenas um exemplo, vamos construir a URL correta no próximo passo.

    cornerstone.enable(element);

    const loadImage = async () => {
      try {
        const image = await cornerstone.loadImage(imageId);
        cornerstone.displayImage(element, image);
      } catch (error) {
        console.error('Erro ao carregar a imagem DICOM:', error);
      }
    };

    loadImage();

    // Limpeza ao desmontar o componente
    return () => {
      if (element) {
        cornerstone.disable(element);
      }
    };
  }, [exame]);


  return (
    <Box sx={{ p: 2, position: 'relative' }}>
        <IconButton
            onClick={onClose}
            sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
        >
            <CloseIcon />
        </IconButton>
        <Typography variant="h6">
            Visualizador DICOM: {exame?.study_description}
        </Typography>
        <Box 
            ref={elementRef}
            sx={{
                width: '100%',
                height: '512px', // Altura padrão para visualizadores DICOM
                backgroundColor: 'black',
                color: 'white',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}
        >
            Carregando imagem...
        </Box>
    </Box>
  );
}