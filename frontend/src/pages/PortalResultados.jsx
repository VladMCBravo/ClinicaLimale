import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Paper, 
  TextField, 
  Typography, 
  Grid, 
  Card, 
  CardMedia, 
  Alert,
  AppBar,
  Toolbar,
  Container,
  IconButton
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import DownloadIcon from '@mui/icons-material/Download';
import logoImage from '../assets/logo.png'; // Garanta que o logo está aqui
import { acessarExame } from '../services/exames';

export default function PortalResultados() {
  // Estados
  const [step, setStep] = useState('LOGIN'); // LOGIN ou RESULTADOS
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Dados
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [exame, setExame] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const dados = await acessarExame(codigo, senha);
      setExame(dados);
      setStep('RESULTADOS');
    } catch (err) {
      setError(err.message || 'Erro ao acessar exame.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setExame(null);
    setCodigo('');
    setSenha('');
    setStep('LOGIN');
  };

  // --- TELA DE LOGIN (ESTILO PADRÃO DO SISTEMA) ---
  if (step === 'LOGIN') {
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
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            width: '100%', 
            maxWidth: '400px', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center' 
          }}
        >
          <Box sx={{ mb: 2 }}>
            <img src={logoImage} alt="Logo da Clínica" style={{ height: '80px' }} />
          </Box>
          
          <Typography component="h1" variant="h5" sx={{ mb: 1, color: '#1976d2', fontWeight: 'bold' }}>
            Portal de Resultados
          </Typography>
          
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Digite o código e a senha do seu exame
          </Typography>

          <Box component="form" onSubmit={handleLogin} sx={{ width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Código do Exame"
              placeholder="Ex: EX-A1B2"
              autoFocus
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              inputProps={{ style: { textTransform: 'uppercase' } }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
            
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mt: 3, mb: 2 }}
            >
              {loading ? 'Buscando...' : 'Acessar Resultados'}
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  // --- TELA DE RESULTADOS (Visual Clean e Responsivo) ---
  const videos = exame?.arquivos.filter(a => a.tipo === 'VIDEO') || [];
  const imagens = exame?.arquivos.filter(a => a.tipo === 'IMAGEM') || [];
  const laudos = exame?.arquivos.filter(a => a.tipo === 'LAUDO') || [];

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Barra Superior */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <img src={logoImage} alt="Logo" style={{ height: '40px', marginRight: '15px' }} />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
              {exame.paciente}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Data do Exame: {new Date(exame.data_exame).toLocaleDateString('pt-BR')}
            </Typography>
          </Box>
          <Button 
            color="error" 
            onClick={handleLogout} 
            startIcon={<LogoutIcon />}
          >
            Sair
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, pb: 8 }}>
        
        {/* Botão de Laudo PDF */}
        {laudos.length > 0 && (
          <Button
            variant="contained"
            color="success"
            fullWidth
            size="large"
            href={laudos[0].url}
            target="_blank"
            startIcon={<DownloadIcon />}
            sx={{ mb: 4, py: 2, fontSize: '1.1rem' }}
          >
            Baixar Laudo Completo (PDF)
          </Button>
        )}

        {/* Seção de Vídeos */}
        {videos.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ mb: 2, borderLeft: '4px solid #1976d2', pl: 2 }}>
              Vídeos do Exame
            </Typography>
            <Grid container spacing={2}>
              {videos.map((vid) => (
                <Grid item xs={12} md={6} key={vid.id}>
                  <Card elevation={3} sx={{ bgcolor: 'black' }}>
                    <video controls style={{ width: '100%', height: 'auto', display: 'block' }}>
                      <source src={vid.url} type="video/mp4" />
                      Seu navegador não suporta vídeos.
                    </video>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Seção de Imagens */}
        {imagens.length > 0 && (
          <Box>
            <Typography variant="h5" sx={{ mb: 2, borderLeft: '4px solid #1976d2', pl: 2 }}>
              Imagens Capturadas
            </Typography>
            <Grid container spacing={2}>
              {imagens.map((img) => (
                <Grid item xs={6} sm={4} md={3} key={img.id}>
                  <Card 
                    elevation={2}
                    sx={{ 
                      cursor: 'pointer', 
                      transition: '0.2s',
                      '&:hover': { transform: 'scale(1.03)', boxShadow: 6 } 
                    }}
                    onClick={() => window.open(img.url, '_blank')}
                  >
                    <CardMedia
                      component="img"
                      image={img.url}
                      alt="Imagem do exame"
                      sx={{ height: 200, objectFit: 'cover' }}
                    />
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Container>
    </Box>
  );
}