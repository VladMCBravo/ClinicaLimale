// src/components/prontuario/AnamneseTab.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, CircularProgress, Paper, TextField, Typography, Grid } from '@mui/material';

// Estes são os campos padrão de uma anamnese. Podemos ajustar se os seus forem diferentes.
const anamneseFields = [
  { key: 'queixa_principal', label: 'Queixa Principal' },
  { key: 'historia_doenca_atual', label: 'História da Doença Atual (HDA)' },
  { key: 'historico_medico_pregresso', label: 'Histórico Médico Pregresso' },
  { key: 'historico_familiar', label: 'Histórico Familiar' },
  { key: 'alergias', label: 'Alergias' },
  { key: 'medicamentos_em_uso', label: 'Medicamentos em Uso' },
];

export default function AnamneseTab({ pacienteId }) {
  const [anamnese, setAnamnese] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Usamos useCallback para evitar recriar a função em cada renderização
  const fetchAnamnese = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const token = sessionStorage.getItem('authToken');
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/pacientes/${pacienteId}/anamnese/`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      if (response.status === 404) {
        // Não existe anamnese, então entramos direto no modo de criação
        setAnamnese({});
        setIsEditing(true);
      } else if (response.ok) {
        const data = await response.json();
        setAnamnese(data);
        setIsEditing(false);
      } else {
        throw new Error('Falha ao buscar dados da anamnese.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [pacienteId]);

  useEffect(() => {
    fetchAnamnese();
  }, [fetchAnamnese]);

  const handleSave = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const dataToSave = Object.fromEntries(formData.entries());
    
    const token = sessionStorage.getItem('authToken');
    const method = anamnese.id ? 'PUT' : 'POST'; // Se tem ID, atualiza (PUT), senão, cria (POST)
    const url = `http://127.0.0.1:8000/api/pacientes/${pacienteId}/anamnese/`;

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
            body: JSON.stringify(dataToSave)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(JSON.stringify(errorData));
        }
        fetchAnamnese(); // Recarrega os dados após salvar
    } catch (err) {
        alert(`Erro ao salvar: ${err.message}`);
    }
  };

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Typography color="error">Erro: {error}</Typography>;
  }

  return (
    <Box>
      {isEditing ? (
        // MODO DE EDIÇÃO / CRIAÇÃO
        <Box component="form" onSubmit={handleSave}>
          <Grid container spacing={2}>
            {anamneseFields.map(field => (
              <Grid xs={12} key={field.key}>
                <TextField
                  name={field.key}
                  label={field.label}
                  defaultValue={anamnese?.[field.key] || ''}
                  multiline
                  rows={4}
                  fullWidth
                  variant="outlined"
                />
              </Grid>
            ))}
          </Grid>
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button type="submit" variant="contained">Salvar</Button>
            {anamnese.id && ( // Só mostra o botão Cancelar se já existir uma anamnese
              <Button onClick={() => setIsEditing(false)}>Cancelar</Button>
            )}
          </Box>
        </Box>
      ) : (
        // MODO DE VISUALIZAÇÃO
        <Box>
          <Button onClick={() => setIsEditing(true)} sx={{ mb: 2 }}>Editar</Button>
          {anamneseFields.map(field => (
            <Paper key={field.key} sx={{ p: 2, mb: 2 }} variant="outlined">
              <Typography variant="subtitle2" color="textSecondary">{field.label}</Typography>
              <Typography sx={{ whiteSpace: 'pre-wrap' }}>{anamnese?.[field.key] || '(Não preenchido)'}</Typography>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
}