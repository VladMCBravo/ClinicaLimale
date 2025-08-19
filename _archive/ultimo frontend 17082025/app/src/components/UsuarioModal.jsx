// src/components/UsuarioModal.jsx

import React, { useState } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Grid,
  Select, MenuItem, FormControl, InputLabel, FormControlLabel, Switch
} from '@mui/material';

export default function UsuarioModal({ open, onClose, onSave }) {
  // Estados para cada campo do formulário
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [cargo, setCargo] = useState('recepcao');
  const [isActive, setIsActive] = useState(true);

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setCargo('recepcao');
    setIsActive(true);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    const token = sessionStorage.getItem('authToken');
    const userData = {
      username,
      password,
      first_name: firstName,
      last_name: lastName,
      cargo,
      is_active: isActive
    };

    try {
      const response = await fetch('http://127.0.0.1:8000/api/usuarios/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData));
      }
      
      onSave(); // Avisa a página de configurações para recarregar a lista
      handleClose(); // Fecha o modal e limpa o formulário

    } catch (error) {
      console.error("Falha ao criar usuário:", error);
      alert(`Erro ao salvar: ${error.message}`);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Novo Usuário</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField autoFocus label="Nome" value={firstName} onChange={(e) => setFirstName(e.target.value)} fullWidth required />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Sobrenome" value={lastName} onChange={(e) => setLastName(e.target.value)} fullWidth required />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Username (para login)" value={username} onChange={(e) => setUsername(e.target.value)} fullWidth required />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth required />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel id="cargo-select-label">Cargo</InputLabel>
              <Select
                labelId="cargo-select-label"
                value={cargo}
                label="Cargo"
                onChange={(e) => setCargo(e.target.value)}
              >
                <MenuItem value="admin">Administrador</MenuItem>
                <MenuItem value="medico">Médico</MenuItem>
                <MenuItem value="recepcao">Recepção</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
              label="Usuário Ativo (pode fazer login)"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained">Salvar Usuário</Button>
      </DialogActions>
    </Dialog>
  );
}