// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import { Box, Button, Container, Paper, TextField, Typography } from '@mui/material';
import logoImage from '../assets/logo.png'; // 1. IMPORTE A IMAGEM DO LOGO

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await apiClient.post('/auth/login/', {
        username: username,
        password: password,
      });
      const token = response.data.key;
      sessionStorage.setItem('authToken', token);
      
      // Salva os dados do usuário para usar na Navbar
      sessionStorage.setItem('userData', JSON.stringify(response.data.user));

      navigate('/');
    } catch (err) {
      console.error("Erro no login:", err);
      setError('Usuário ou senha inválidos.');
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ mt: 8, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* 2. ADICIONE O LOGO AQUI */}
        <Box sx={{ mb: 2 }}>
            <img src={logoImage} alt="Logo da Clínica Limalé" style={{ height: '80px' }} />
        </Box>

        <Typography component="h1" variant="h5">
          Acesso ao Sistema
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Nome de Usuário"
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Senha"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <Typography color="error" align="center" sx={{ mt: 2 }}>{error}</Typography>}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Entrar
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}