// src/pages/LoginPage.jsx - VERSÃO REATORADA E SIMPLIFICADA

import { useState } from 'react';
import { Box, Button, Paper, TextField, Typography } from '@mui/material';
import logoImage from '../assets/logo.png';
import { useAuth } from '../hooks/useAuth'; // Importamos o hook

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // Usamos a função de login diretamente do nosso hook
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // A lógica complexa foi abstraída para dentro do hook
    const success = await login(username, password);

    if (!success) {
      setError('Usuário ou senha inválidos.');
    }
  };

  return (
    <Box
        sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: '#f0f2f5',
        }}
    >
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