import React, { useState, useEffect } from 'react';
import { useSnackbar } from '../contexts/SnackbarContext';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField,
  Select, MenuItem, FormControl, InputLabel, Box, CircularProgress
} from '@mui/material';

export default function AgendamentoModal({ open, onClose, onSave, initialData, editingEvent }) {
  const { showSnackbar } = useSnackbar();
  const [pacientes, setPacientes] = useState([]);
  const [pacienteId, setPacienteId] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [isLoadingPacientes, setIsLoadingPacientes] = useState(false);

  useEffect(() => {
    if (open) {
      const fetchPacientes = async () => {
        setIsLoadingPacientes(true);
        const token = sessionStorage.getItem('authToken');
        try {
          const response = await fetch('http://127.0.0.1:8000/api/pacientes/', { headers: { 'Authorization': `Token ${token}` } });
          const data = await response.json();
          setPacientes(data);
        } catch (error) { console.error("Falha ao carregar pacientes:", error); } 
        finally { setIsLoadingPacientes(false); }
      };
      fetchPacientes();
      
      if (editingEvent) {
        setPacienteId(editingEvent.extendedProps.pacienteId || '');
        setStart(new Date(editingEvent.start).toISOString().slice(0, 16));
        setEnd(new Date(editingEvent.end).toISOString().slice(0, 16));
      } else if (initialData) {
        setPacienteId('');
        setStart(initialData.startStr || '');
        setEnd(initialData.endStr || '');
      }
    }
  }, [open, editingEvent, initialData]);

  const handleDelete = async () => { /* ... (código existente) ... */ };

  const handleSubmit = async () => {
    // ==================================================================
    // NOVA VALIDAÇÃO
    // ==================================================================
    if (!pacienteId || !start || !end) {
      showSnackbar('Por favor, preencha todos os campos: Paciente, Início e Fim.', 'warning');
      return; // Interrompe a função aqui se algo estiver faltando
    }

    const agendamentoData = {
      paciente: pacienteId,
      data_hora_inicio: new Date(start).toISOString(),
      data_hora_fim: new Date(end).toISOString(),
    };

    const token = sessionStorage.getItem('authToken');
    const isEditing = editingEvent && editingEvent.id;
    const url = isEditing ? `http://127.0.0.1:8000/api/agendamentos/${editingEvent.id}/` : 'http://127.0.0.1:8000/api/agendamentos/';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify(agendamentoData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData));
      }
      showSnackbar(isEditing ? 'Agendamento atualizado!' : 'Agendamento criado!', 'success');
      onSave();
      onClose();
    } catch (error) { 
      console.error("Falha ao salvar agendamento:", error);
      showSnackbar(`Erro ao salvar: ${error.message}`, 'error');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{editingEvent ? 'Editar Agendamento' : 'Novo Agendamento'}</DialogTitle>
      <DialogContent>
         <Box sx={{ mt: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="paciente-select-label">Paciente</InputLabel>
            {isLoadingPacientes ? <CircularProgress size={24} /> : (
              <Select
                labelId="paciente-select-label"
                id="paciente-select"
                value={pacienteId}
                label="Paciente"
                onChange={(e) => setPacienteId(e.target.value)}
                required
              >
                {pacientes.map((p) => (<MenuItem key={p.id} value={p.id}>{p.nome_completo}</MenuItem>))}
              </Select>
            )}
          </FormControl>
          <TextField label="Início do Agendamento" type="datetime-local" fullWidth value={start} onChange={(e) => setStart(e.target.value)} sx={{ mt: 2 }} InputLabelProps={{ shrink: true }} required />
          <TextField label="Fim do Agendamento" type="datetime-local" fullWidth value={end} onChange={(e) => setEnd(e.target.value)} sx={{ mt: 2 }} InputLabelProps={{ shrink: true }} required />
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between' }}>
        {editingEvent && (
          <Button onClick={handleDelete} color="error">Deletar</Button>
        )}
        <Box>
          <Button onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">Salvar</Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}