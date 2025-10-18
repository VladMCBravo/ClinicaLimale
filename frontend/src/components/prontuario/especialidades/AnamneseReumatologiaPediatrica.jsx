// src/components/prontuario/especialidades/AnamneseReumatologiaPediatrica.jsx - VERSÃO FUNCIONAL

import React from 'react';
import { Typography, Paper, Divider, Box } from '@mui/material';

// Reutilize os componentes de outras especialidades!
import AnamnesePediatria from './AnamnesePediatria';
import AnamneseReumatologia from './AnamneseReumatologia';

export default function AnamneseReumatologiaPediatrica({ formData, onChange }) {
  
  // Função para "traduzir" o evento de um componente filho para o formato esperado
  const handleChildChange = (childFormData) => {
    // A lógica exata aqui depende de como você quer combinar os dados,
    // mas a ideia é mesclar os dados de pediatria e reumato em um único objeto.
    const mergedData = {
        ...formData.reumatologia_pediatrica,
        ...childFormData,
    };
    onChange({ target: { name: 'reumatologia_pediatrica', value: mergedData }});
  };

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Anamnese de Reumatologia Pediátrica
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Este formulário combina os campos pediátricos gerais com a investigação reumatológica específica.
        </Typography>
      </Paper>
      
      {/* Componente de Reumatologia com os sintomas principais */}
      <AnamneseReumatologia formData={{ reumatologia: formData.reumatologia_pediatrica }} onChange={handleChildChange} />
      
      <Divider sx={{ my: 2 }}>Dados Pediátricos</Divider>
      
      {/* Componente de Pediatria com DNPM, vacinas, etc. */}
      <AnamnesePediatria formData={{ pediatrica: formData.reumatologia_pediatrica }} onChange={handleChildChange} />
    </Box>
  );
}