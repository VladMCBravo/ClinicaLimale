// src/pages/LoginPage.jsx - VERSÃO COM LAYOUT CENTRALIZADO

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import { Box, Button, Paper, TextField, Typography } from '@mui/material';
import logoImage from '../assets/logo.png';

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

      const token = response.data.token;
      const userData = response.data.user;

      if (token && userData) {
        sessionStorage.setItem('authToken', token);
        sessionStorage.setItem('userData', JSON.stringify(userData));
        navigate('/');
      } else {
        throw new Error("Resposta da API de login está incompleta.");
      }

    } catch (err) {
      console.error("Erro no login:", err);
      setError('Usuário ou senha inválidos.');
    }
  };

  return (
    // 1. Este Box ocupa a tela inteira e centraliza o seu conteúdo
    <Box
        sx={{
            display: 'flex',
            alignItems: 'center',       // Alinha verticalmente
            justifyContent: 'center',   // Alinha horizontalmente
            minHeight: '100vh',         // Altura mínima igual à da tela
            backgroundColor: '#f0f2f5', // Cor de fundo suave
        }}
    >
        {/* 2. O Paper agora está perfeitamente centrado */}
        <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box sx={{ mb: 2 }}>
                <img src={logoImage} alt="Logo da Clínica Limalé" style={{ height: '80px' }} />
            </Box>
            <Typography component="h1" variant="h5">
                Acesso ao Sistema
            </Typography>
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
                <TextField
                    margin="normal"
                    required
                    fullWidth
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
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                {error && <Typography color="error" align="center" sx={{ mt: 2 }}>{error}</Typography>}
                <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
                    Entrar
                </Button>
            </Box>
        </Paper>
    </Box>
  );
}