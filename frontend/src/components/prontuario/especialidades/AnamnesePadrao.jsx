// src/components/prontuario/especialidades/AnamnesePadrao.jsx

import React from 'react';
import { Box, Button, CircularProgress, TextField, Typography, Paper, FormGroup, FormControlLabel, Checkbox } from '@mui/material';

// Componente "burro" que apenas renderiza a UI e chama as funções que recebe via props.
export default function AnamnesePadrao({
  formData,
  opcoesHDA,
  selecoesHDA,
  isSaving,
  initialAnamnese,
  handleFieldChange,
  handleHdaCheckboxChange,
  handleSave,
  children // <-- AQUI ENTRARÃO OS CAMPOS DA ESPECIALIDADE
}) {
  return (
    <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField 
        label="Queixa Principal (QP)" 
        name="queixa_principal" 
        value={formData.queixa_principal || ''} 
        onChange={handleFieldChange} 
        multiline 
        rows={3} 
        required 
      />
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>Opções para História da Doença Atual (HDA)</Typography>
        <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {opcoesHDA.length > 0 ? opcoesHDA.map((opcao) => (
            <FormControlLabel
              key={opcao.id}
              control={
                <Checkbox checked={selecoesHDA.has(opcao.id)} onChange={handleHdaCheckboxChange} name={String(opcao.id)} />
              }
              label={opcao.descricao}
            />
          )) : <Typography variant="body2" color="text.secondary">Nenhuma opção rápida encontrada para esta especialidade.</Typography>}
        </FormGroup>
        <TextField 
          label="Texto da História da Doença Atual (HDA)" 
          name="historia_doenca_atual" 
          value={formData.historia_doenca_atual || ''}
          onChange={handleFieldChange}
          multiline 
          rows={6} 
          required 
          fullWidth 
        />
      </Paper>      
      <TextField 
        label="História Médica Pregressa (HMP)" 
        name="historico_medico_pregresso" 
        value={formData.historico_medico_pregresso || ''}
        onChange={handleFieldChange}
        multiline 
        rows={4} 
      />
      
      {/* Slot para os campos da especialidade */}
      {children}

      <Box>
        <Button variant="contained" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <CircularProgress size={24} /> : (initialAnamnese ? 'Atualizar Anamnese' : 'Salvar Anamnese')}
        </Button>
      </Box>
    </Box>
  );
}
